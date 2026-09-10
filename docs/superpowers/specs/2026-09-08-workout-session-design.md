# WorkoutSession Tasarımı — Oturumlar, Gün Sınırı, İlerleme

**Tarih:** 2026-09-08
**Kapsam:** PLAN.md Faz 7
**Durum:** ⏳ Onay bekliyor

## Bu Doküman Ne Değildir

CLAUDE.md oturumun neden gün bazlı bir `Date` yerine `StartedAt`/`EndedAt` taşıdığını, bir günde
birden fazla oturum olabileceğini, oturumu kapatmanın açık bir kullanıcı aksiyonu olduğunu ve
"açık oturum" ararken TR yerel gününün de kontrol edilmesi gerektiğini zaten söylüyor. Faz 5 ve 6
sahiplik desenini kurdu. Bu doküman onları tekrar etmez; yalnızca Faz 7'nin açık bıraktığı
kararları kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- `WorkoutSession.UserId` non-nullable → global oturum yok; görünür olan = sahip olunan.
  Faz 6'daki gibi 403 dalı YOKTUR, başkasının oturumu → **404**.
- `TemplateId` nullable — şablonsuz oturum meşru.
- `EndedAt` null → oturum açık. Otomatik zaman aşımıyla kapatma YOK.
- Zaman damgaları UTC saklanır; TR'ye çevirme yalnızca sorgu/görüntüleme katmanında.
- Faz 1'de konfigüre edilmiş, bu fazda uygulanmayacak yalnızca doğrulanacak:
  `SetEntry` → `WorkoutSession` **CASCADE**, `WorkoutSession` → `WorkoutTemplate` **SET NULL**,
  CHECK `"EndedAt" IS NULL OR "EndedAt" > "StartedAt"`, index `(UserId, StartedAt)`.
- Faz 2'de hazırlanmış repository metotları:
  `GetOpenSessionStartedBetweenAsync(userId, fromUtcInclusive, toUtcExclusive)` — doc'u açıkça
  "aralığı TR yerel gününden hesaplamak **servisin** işidir, saat dilimi politikası bu katmana
  ait değildir" diyor; ve `GetDistinctExerciseIdsForSessionAsync(sessionId)`.
- Şablon referansı doğrulanırken `IWorkoutTemplateRepository.GetOwnedByIdAsync` kullanılacak —
  miras alınan `GetByIdAsync` sahiplik kontrolü YAPMAZ (Faz 6'dan devreden uyarı).

## Deneyle doğrulanmış (varsayım değil)

- `TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul")` **Windows'ta da çözülüyor**
  (.NET'in IANA↔Windows eşlemesi), Linux'ta zaten yerel — CI güvenli.
- Türkiye'de kış ve yaz ofseti **ikisi de +03:00** (DST 2016'da kaldırıldı).
- Gün aralığı hesabı doğru: UTC 2026-03-10 20:30 → TR 23:30, aralık
  `[2026-03-09 21:00Z, 2026-03-10 21:00Z)`.
- `TimeProvider` (.NET 8+) mevcut ve `TimeProvider.System` çalışıyor.

---

## Karar bekleyen altı soru

### Soru 1 — Saat, koda gömülü mü olsun yoksa enjekte mi edilsin?

7.5 "gün sınırı (gece 23:00 / ertesi gün)" testini şart koşuyor. `DateTime.UtcNow` doğrudan
çağrılırsa bu test **yazılamaz**: sonucu, testin çalıştığı gerçek saate bağlı olur.

**A — `TimeProvider` enjekte edilsin (önerim).** .NET 8+ ile gelen standart soyutlama;
`TimeProvider.System` üretimde, testte sahte bir sağlayıcı. Bu fazın manşet testleri (23:00'te
açılan oturum ertesi gün "bugünün açık oturumu" SAYILMAMALI) ancak böyle deterministik olur.
Maliyeti: servis kurucusuna bir parametre.

**B — `DateTime.UtcNow` doğrudan kullanılsın.** Daha az parça. Bedeli: 7.5'in istediği sınır
testleri ya yazılamaz ya da "testi gece 23:00'te çalıştırırsan kırılır" cinsinden kırılgan
olur — yani projenin tekrar tekrar yakaladığı "boş test" sınıfının yenisi.

### Soru 2 — TR günü nasıl hesaplansın?

**A — `TimeZoneInfo` ile `"Europe/Istanbul"` (önerim).** Kural değişirse (Türkiye DST'ye
dönerse) uygulama kendiliğinden uyar. Deneyle her iki platformda da çözüldüğü doğrulandı.
Bedeli: çalışma ortamında saat dilimi veritabanı (tzdata/ICU) bulunmalı — çok ince bir
container imajında `TimeZoneNotFoundException` çıkabilir; bu bir dağıtım notu olarak
kaydedilecek.

**B — Sabit +03:00 ofset.** Hiçbir dış veriye bağımlı değil, en ince imajda bile çalışır.
Bedeli: Türkiye yeniden DST'ye geçerse yılda iki kez sessizce yanlış güne düşer — ve bu tam
olarak CLAUDE.md'nin önlemek istediği hata.

### Soru 3 — Oturum silme bu fazda mı yapılsın?

7.3 "silme → etkilenen egzersizler için `RecalculateRecords`" diyor, ama `RecalculateRecords`
**Faz 8'in işi** ve henüz yok.

**A — Silme şimdi yapılsın (önerim).** Bugün hiçbir `SetEntry` oluşturulamıyor (onu üreten
endpoint Faz 8'de geliyor), yani silinen oturumda yeniden hesaplanacak rekor **yok** — silme
bugün eksiksiz doğru. Faz 8'in planına "silme akışına yeniden hesaplamayı bağla" açık bir görev
olarak yazılır ve `PLAN.md`'ye devreden not düşülür.

**B — Silme Faz 8'e ertelensin.** Yarım tanımlı bir işlemi göndermemiş oluruz. Bedeli: Faz 7'nin
controller'ı eksik kalır ve Faz 8 hem endpoint'i hem yeniden hesaplamayı birlikte eklemek
zorunda kalır.

### Soru 4 — Açık bir oturum varken `POST /api/sessions` ne yapsın?

**A — Var olanı döndürsün, 200 (önerim).** CLAUDE.md'nin kuralı zaten "bugüne ait açık oturumu
bul; yoksa yeni aç". Endpoint böylece idempotent olur: iki kez tıklanan "Antrenmana Başla"
düğmesi hata değil aynı oturumu verir. Yeni açıldıysa **201**, var olan döndüyse **200** —
istemci ikisini ayırt edebilir.

**B — 409 Conflict.** Daha açık bir "zaten açık oturumun var" mesajı. Bedeli: en sık kullanıcı
akışında (uygulamayı açıp başlamak) hata dönmek, ve istemcinin önce sorup sonra yaratması
gerekmesi (yarış durumu).

### Soru 5 — Zaten bitmiş bir oturumu tekrar bitirmek?

**A — 409 Conflict (önerim).** Bitirme bir durum geçişi. Sessizce izin vermek `EndedAt`'i
ileri kaydırır ve gerçek bitiş zamanını **kalıcı olarak kaybettirir** — geçmiş veriyi bozan
sessiz bir yazma.

**B — İdempotent: hiçbir şey yapma, mevcut hâli döndür.** İstemci için daha yumuşak. Bedeli:
"bitirdim" ile "zaten bitmişti" ayrımı kaybolur.

### Soru 6 — İlerleme (7.4) nerede görünsün?

**A — Oturum detayında, yalnızca şablonlu oturumlarda (önerim).**
`GET /api/sessions/{id}` yanıtı, şablon varsa her egzersiz için
`{ exerciseId, exerciseName, plannedSets, completedSets }` listesi taşır. `completedSets`
o oturumdaki gerçek `SetEntry` sayısıdır. Şablonsuz oturumda liste boş.
CLAUDE.md'nin kuralı gereği önceden boş `SetEntry` satırı OLUŞTURULMAZ.

**B — Ayrı bir `GET /api/sessions/{id}/progress` ucu.** Detay yanıtı sade kalır. Bedeli: arayüz
oturum ekranını çizmek için iki istek atar.

---

## Önerilen tasarım (A + A + A + A + A + A)

```
src/Grind.Api/
├─ Common/Time/
│  └─ TurkeyDay.cs                 TR yerel gününü UTC aralığına çeviren saf yardımcı
├─ Models/Dtos/Session/
│  ├─ StartSessionRequest.cs       TemplateId?, Notes?
│  ├─ UpdateSessionNotesRequest.cs Notes?
│  ├─ SessionResponse.cs           Id, StartedAt, EndedAt, IsOpen, TemplateId?, TemplateName?, Notes, Progress[]
│  └─ SessionProgressResponse.cs   ExerciseId, ExerciseName, PlannedSets, CompletedSets
├─ Services/
│  ├─ IWorkoutSessionService.cs
│  └─ WorkoutSessionService.cs
└─ Controllers/
   └─ SessionsController.cs
```

**Endpoint'ler** (hepsi `[Authorize]`):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| GET | `/api/sessions` | kullanıcının oturumları, yeniden eskiye | — |
| GET | `/api/sessions/{id}` | tek oturum + ilerleme | 404 |
| GET | `/api/sessions/open` | bugüne ait açık oturum (yoksa 404) | 404 |
| POST | `/api/sessions` | başlat — açık varsa onu döner | 200/201, 400, 404 (şablon) |
| POST | `/api/sessions/{id}/finish` | bitir | 404, 409 (zaten bitmiş) |
| PATCH | `/api/sessions/{id}` | not güncelle | 400, 404 |
| DELETE | `/api/sessions/{id}` | sil (SetEntry CASCADE) | 404 |

**"Bugüne ait açık oturum" kuralı — bu fazın çekirdeği.** `EndedAt IS NULL` **yetmez**:
`StartedAt` TR yerel saatiyle bugün de olmalı. Kullanıcı bir oturumu kapatmayı unutursa,
günler sonra girdiği yeni bir set o eski oturuma (ve eski tarihe) düşmemeli. Eski açık oturum
zorla kapatılmaz, öylece kalır — sadece "bugünün açık oturumu" sayılmaz.

**Şablon referansı doğrulaması.** `StartSessionRequest.TemplateId` doluysa
`GetOwnedByIdAsync(templateId, currentUserId)` ile doğrulanır; başkasının şablonu → **404**,
nötr mesajla.

**Test:** IDOR (başkasının oturumu → 404, her fiilde); başkasının şablonuyla oturum açmak → 404;
**gün sınırı** (TR 23:00'te açılan oturum, ertesi gün TR 00:30'da "bugünün açık oturumu" DEĞİL);
aynı gün ikinci `POST` var olanı döndürür; bitmiş oturumu tekrar bitirmek → 409; bitmiş bir
oturum "açık oturum" sayılmaz; ilerleme hesabı (`PlannedSets` vs gerçek `SetEntry` sayısı);
silmede `SetEntry` satırlarının CASCADE ile gitmesi. Bu testler veritabanı ve sahte bir saat ister.

---

## Onay

Altı sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını yazıp
görev görev ilerleyeceğim.
