# SetEntry + PR Motoru Tasarımı — Set Kaydı, Rekor Tespiti, Yeniden Hesaplama

**Tarih:** 2026-09-10
**Kapsam:** PLAN.md Faz 8 ⭐ (projenin kalbi)
**Durum:** ✅ Onaylandı (2026-09-10) — dört sorunun da A seçeneği

## Bu Doküman Ne Değildir

CLAUDE.md rekor kurallarını (ağırlık rekoru / aynı ağırlıkta tekrar rekoru), `RecordType`'ın
neden satırda **bilinçli olarak** saklandığını (tarihsel anlık görüntü, normalizasyon ihlali
değil), silinen rekorlu setin `RecalculateRecords` tetiklemesini, `AddSet` ile yeniden
hesaplamanın **aynı yardımcı fonksiyonu** çağırması gerektiğini (DRY) ve set eklerken açık
oturumun bulunup yoksa açılacağını zaten söylüyor. Faz 5-7 sahiplik, DTO ve controller
desenlerini kurdu. Bu doküman onları tekrar etmez; yalnızca Faz 8'in açık bıraktığı kararları
kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- `SetEntry`'nin sahipliği **kendi sütununda değil**, `WorkoutSession.UserId` üzerinden gelir.
  Her sorgu `s.WorkoutSession.UserId == currentUserId` yüklemini taşımak zorunda — `Id` ile
  sorgulayıp bunu atlamak IDOR'dur. Başkasının seti → **404** (403 değil; oturumlardaki kural).
- Faz 1'de konfigüre edilmiş, bu fazda uygulanmayacak yalnızca doğrulanacak:
  `SetEntry` → `WorkoutSession` **CASCADE**, `SetEntry` → `Exercise` **RESTRICT**,
  CHECK `"Weight" >= 0`, CHECK `"Reps" > 0`, CHECK `"Rir" IS NULL OR "Rir" >= 0`,
  index `(ExerciseId, WorkoutSessionId)`, `Weight` precision (6,2),
  `RecordType` string olarak saklanıyor.
- `Weight = 0` **geçerlidir** — barfiks/dips gibi vücut ağırlığı hareketleri (entity yorumu).
- Faz 2'de hazır bekleyen repository metotları: `GetForUserAndExerciseAsync`,
  `GetDistinctExerciseIdsForSessionAsync`, `GetCompletedSetCountsAsync`.
- Faz 7'nin ilerleme hesabı (`SessionProgressResponse`) zaten gerçek `SetEntry` sayısını
  okuyor — bu faz o sayacı ilk kez sıfırdan farklı kılıyor, kodunu değiştirmiyor.
- Set ekleme akışı CLAUDE.md gereği **bugüne ait açık oturumu bulur, yoksa açar**. Bu
  tartışmaya açık değil; tartışmaya açık olan (aşağıda) bunun YANINDA açık bir oturuma
  doğrudan yazmanın da mümkün olup olmayacağı — ve o soruya YAGNI diye hayır deniyor.

## Deneyle / kanıtla doğrulanmış (varsayım değil)

- **`Dictionary<decimal, int>` ağırlık kovaları güvenli.** `100.0m` ile `100.00m` hem
  `Equals` hem `GetHashCode` bakımından aynı (ölçülerek doğrulandı: hash 1079574528 = 1079574528).
  Aksi halde EF'ten (6,2) ölçeğiyle dönen değerler ile testte yazılan literaller ayrı kovalara
  düşer ve tekrar rekoru sessizce yanlış hesaplanırdı.
- **"En iyi ağırlık ve en iyi tekrar her zaman rekor taşıyan bir sette bulunur"** — kanıt:
  bir set `None` ise, tanımı gereği kendisinden önce ağırlıkça ≥ ve (aynı ağırlıkta) tekrarca ≥
  bir set vardır. Dolayısıyla hiçbir maksimum yalnızca `None` setlerde yaşayamaz. §8.4'ün
  özet ucu bu yüzden yalnızca `RecordType != None` satırlarını okuyabilir — ve bu invaryant
  testle sabitlenecek (tüm setlerden hesaplanan maksimumlar = ucun döndürdüğü değerler).

---

## Karar bekleyen dört soru

### Soru 1 — Daha önce hiç kullanılmamış bir ağırlıkta yapılan ilk set rekor sayılır mı?

Kural metni "**aynı ağırlıkta** önceki maksimum tekrarı geçerse". Peki o ağırlıkta hiç
önceki set yoksa? İki tutarlı okuma var ve fark, kullanıcının ekranında her gün görünüyor.

**A — Hayır; tekrar rekoru için o ağırlıkta en az bir önceki set gerekir (önerim).**
İlk set-ever yine de rekordur, ama **ağırlık rekoru** olarak (önceki maksimum ağırlık yok →
"çıtayı sen koydun"). Buna karşılık 100 kg'lık bir rekordan sonra atılan 60 kg × 15'lik bir
indirme (backoff) seti **rekor değildir** — çünkü karşılaştırılacak bir 60 kg geçmişi yok.
Gerekçe: ağırlık rekoru egzersizin BÜTÜNÜNE ait tek bir maksimumdur, tekrar rekoru ise belirli
bir ağırlık kovasına aittir ve o kovada bir kıyas noktası olmadan "geçmek" tanımsızdır.

**B — Evet; hiçbir şeyi geçmek de geçmektir.** Her yeni ağırlık kovasındaki ilk set tekrar
rekoru olur. Bedeli: her ısınma seti, her indirme seti, her yeni ara ağırlık "PR" rozeti alır.
Rozet enflasyonu, rozetin bilgi değerini sıfırlar — ve bu tam olarak kullanıcının bakacağı şey.

### Soru 2 — Arşivlenmiş bir egzersize set girilebilir mi?

Faz 7'den devreden açık soru. Faz 6'nın karşılığı "**yazarken katı, okurken hoşgörülü**"ydü.

**A — Hayır, 400 (önerim).** CLAUDE.md: "arşivlenen egzersiz sadece yeni seçim listelerinde
görünmez" — bir set girmek tam olarak yeni bir seçimdir. Geçmiş setler ve şablon satırları
arşivlenmiş egzersizi göstermeye devam eder (okurken hoşgörülü). Ayrıca kısıtı sonradan
gevşetmek güvenli, sıkmak değil. Bedeli: içinde arşivlenmiş egzersiz kalmış bir şablonla
antrenman yapan kullanıcı o satırda takılır — çözümü egzersizi arşivden çıkarmak.

**B — Evet, izin verilir.** Set, "yeni bir seçim" değil "gerçekleşmiş performans" verisidir;
arşivleme yalnızca listeleri sadeleştirmelidir. Bedeli: arşivleme kavramı Faz 6'da katı,
Faz 8'de gevşek olur — aynı API'de iki farklı arşiv anlamı.

### Soru 3 — Set düzeltmesi hangi fiil?

Faz 5 ve 6'da `PUT`'un tam-değiştirme oluşu gerçek veri kaybı üretti (Swagger gövdeyi
`"name": "string"` diye ön-doldurunca isim siliniyordu). `SetEntry`'de aynı tuzağın karşılığı
`Rir`: `PUT` gövdesinde gönderilmezse **sessizce null'lanır**.

**A — Yalnızca `PATCH` (önerim).** `{ weight?, reps?, rir? }`, en az bir alan zorunlu
(`PatchExerciseRequest`'te kurulu desen). Tuzak fiziksel olarak oluşamaz. Bedeli: `Rir`'i
temizlemenin yolu kalmaz (null = "dokunma"), ve API'de üçüncü bir fiil deseni doğar
(Exercise/Template: PUT+PATCH, Session: PATCH, SetEntry: PATCH).

**B — `PUT` + `PATCH`, Exercise/Template ile aynı.** Öğrenilebilirlik: aynı API'de aynı desen.
`PUT` `Rir`'i temizlemenin açık yolu olur. Bedeli: iki kez ısırmış olan tuzağın üçüncü kez
kurulması — ve bir setin üç alanı da "form'u baştan gönder" akışına yetecek kadar az.

### Soru 4 — Bir oturumun setleri nerede okunur?

Antrenman ekranı hem hedefleri (ilerleme) hem girilmiş setleri gösterecek.

**A — Ayrı uç: `GET /api/sessions/{id}/sets` (önerim).** Faz 7'nin `SessionResponse` DTO'suna
hiç dokunulmaz (yeni merge edilmiş, incelemeden geçmiş kod). Liste ucu (`GET /api/sessions`)
N+1'e girmez. Bedeli: antrenman ekranı iki istek atar.

**B — `SessionResponse` içine `sets[]` gömülsün.** Ekran tek istekle çizilir. Bedeli: Faz 7
DTO'su değişir; `GET /api/sessions` listesinde ya N+1 doğar ya da "burada dolu, orada boş"
tipinde ikinci bir tutarsızlık — ki Faz 7'nin bloklayıcı bulgusu tam olarak buydu
(`progress` bir uçta dolu, diğerinde boş).

---

## Önerilen tasarım (A + A + A + A)

```
src/Grind.Api/
├─ Common/Records/
│  └─ PersonalRecordCalculator.cs   saf, DB'siz karar çekirdeği (RecordTracker)
├─ Models/Dtos/Set/
│  ├─ CreateSetRequest.cs           ExerciseId, Weight, Reps, Rir?
│  ├─ PatchSetRequest.cs            Weight?, Reps?, Rir?  (en az biri)
│  └─ SetEntryResponse.cs           Id, SessionId, ExerciseId, ExerciseName, Weight, Reps, RecordType, Rir, CreatedAt
├─ Models/Dtos/Record/
│  └─ ExerciseRecordResponse.cs     ExerciseId, ExerciseName, Category, BestWeight, BestWeightReps,
│                                   BestWeightAt, BestReps, BestRepsWeight, BestRepsAt
├─ Repositories/  (ISetEntryRepository'ye ekler)
│  ├─ GetOwnedByIdAsync(id, userId)
│  ├─ GetForSessionAsync(sessionId, userId)
│  └─ GetRecordCarryingSetsAsync(userId)
├─ Services/
│  ├─ IPersonalRecordService.cs / PersonalRecordService.cs
│  ├─ ISetEntryService.cs / SetEntryService.cs
│  └─ WorkoutSessionService.cs      (+ GetOrOpenTodayAsync seam, + silmede yeniden hesap)
└─ Controllers/
   ├─ SetsController.cs
   └─ RecordsController.cs
```

**Endpoint'ler** (hepsi `[Authorize]`):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| POST | `/api/sets` | set kaydet — bugünün açık oturumunu bulur/açar | 201, 400, 404 (egzersiz) |
| GET | `/api/sessions/{id}/sets` | oturumun setleri, kronolojik | 404 |
| PATCH | `/api/sets/{id}` | düzelt → yeniden hesap | 400, 404 |
| DELETE | `/api/sets/{id}` | sil → yeniden hesap | 204, 404 |
| GET | `/api/records` | tüm zamanların rekorları | 200 |

### Rekor kuralı — tek karar noktası (8.1, DRY)

`AddSet` ile `RecalculateRecords`'un aynı fonksiyonu çağırması CLAUDE.md'nin açık emri.
Ortak çekirdek, DB bilmeyen, saf bir "yürüyen en iyiler" nesnesi:

```csharp
public sealed class RecordTracker
{
    private decimal? _maxWeight;
    private readonly Dictionary<decimal, int> _maxRepsByWeight = [];

    /// <summary>Sınıflandırır VE durumu ilerletir. Tek karar noktası — iki akış da bunu çağırır.</summary>
    public RecordType Apply(decimal weight, int reps);
}
```

- `weight > _maxWeight` (veya hiç `_maxWeight` yok) → **`Weight`**
- değilse, o ağırlıkta önceki bir kayıt VARSA ve `reps >` o kayıt → **`Reps`**
- değilse → **`None`**  *(eşitlik rekor değildir — CLAUDE.md 8.5)*

İki akış:
- **Ekleme:** geçmiş setler kronolojik sırada `Apply`'a verilir (sonuçlar atılır — geçmiş
  satırlar YENİDEN YAZILMAZ, `RecordType` tarihsel bir anlık görüntüdür), sonra yeni set için
  `Apply` çağrılır ve **yalnızca onun** `RecordType`'ı yazılır.
- **Yeniden hesaplama:** taze bir `RecordTracker` ile tüm setler baştan taranır ve **her
  satırın** `RecordType`'ı yeniden yazılır.

**Kronoloji ve eşitlik.** `GetForUserAndExerciseAsync` bugün yalnızca `CreatedAt`'e göre
sıralıyor. Aynı `TimeProvider` anında girilen iki set aynı `CreatedAt`'i taşır (testlerdeki
sahte saatte her zaman, üretimde nadiren) — ve o zaman sıralama **belirsiz** olur, yani rekor
sonucu sorgudan sorguya değişebilir. Sıralamaya `ThenBy(s => s.Id)` eklenecek.

### Yeniden hesaplama ne zaman tetiklenir

- **Set silme → her zaman.** CLAUDE.md yalnızca "rekor taşıyorsa" diyor; `None` bir setin
  silinmesinin hiçbir maksimumu düşüremeyeceği doğrudur (yukarıdaki kanıtın aynısı) — ama bu
  koşulun doğruluğu kuralların bugünkü hâline bağlı, kodda görünmeyen bir ispat. Kuralı gevşetip
  her silmede yeniden hesaplamak **daha fazlasını** yapar, asla yanlış olmaz ve bir avuç satırın
  tek sorgusuna mal olur. Bilinçli ve CLAUDE.md'nin üstüne çıkan bir sadeleştirme.
- **Set düzeltme → her zaman.** Burada koşullu davranmak zaten YANLIŞ olurdu: `None` bir setin
  ağırlığını yükseltmek onu rekor yapabilir.
- **Oturum silme → etkilenen her egzersiz için BİR KEZ** (Faz 7'den devreden zorunluluk),
  her set için ayrı ayrı değil.

### Oturum silme neden `excludeSessionId` alıyor

`RecalculateAsync`, CASCADE **henüz veritabanına gitmemişken** çalışmak zorunda: aksi halde
"önce sil + kaydet, sonra hesapla + kaydet" iki ayrı `SaveChangesAsync` demek olur ve
CLAUDE.md'nin "bir iş operasyonu = tek `SaveChangesAsync`" kuralı kırılır. Bu yüzden imza:

```csharp
Task RecalculateAsync(long userId, long exerciseId, long? excludeSessionId = null, CancellationToken ct = default);
```

Alternatif — `IUnitOfWork`'e açık transaction eklemek — bilinçli olarak REDDEDİLDİ: mevcut test
altyapısı zaten her testi bir transaction içinde çalıştırıyor, dolayısıyla iç içe transaction'a
karşı bir `CurrentTransaction is null` dalı gerekirdi ve **o dal testlerde hiç çalışmazdı** —
projenin tekrar tekrar yakaladığı "boş test" sınıfının yenisi.

### Oturum seam'i (Faz 7'den devreden zorunluluk #5)

`IWorkoutSessionService`'e, **DTO değil entity** döndüren ve **`SaveChangesAsync` ÇAĞIRMAYAN**
bir seam eklenir; `StartAsync` de bunu kullanır, böylece "bugünün açık oturumunu bul/aç"
mantığı tek yerde kalır (DRY):

```csharp
Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(
    long? templateId, string? notes, CancellationToken ct = default);
```

`SetEntryService.CreateAsync` bunu çağırır, `SetEntry`'yi ekler ve **tek** `SaveChangesAsync`
yapar — böylece "seti olmayan boş oturum" penceresi hiç oluşmaz.

**Bilinçli davranış:** bitmiş bir oturumdan sonra set girmek yeni bir oturum açar (bitmiş
oturum "açık" değildir). Açık bir oturuma doğrudan yazan `POST /api/sessions/{id}/sets` YAGNI
diye eklenmiyor — geçmişe dönük veri girişi bir ihtiyaç olarak ortaya çıkarsa eklenir.

### Rekor özeti (8.4) yalnızca rekor taşıyan satırları okur

Yukarıda kanıtlanan invaryant sayesinde `GET /api/records`, kullanıcının `RecordType != None`
setlerini (bir egzersizde onlarca satır, binlerce değil) tek sorguyla çeker ve gruplamayı
bellekte yapar. `BestWeight` = en büyük ağırlık (eşitlikte en çok tekrar, sonra en erken tarih);
`BestReps` = en çok tekrar (eşitlikte en büyük ağırlık, sonra en erken tarih). Hiç seti olmayan
egzersiz listede yer almaz.

---

## Test yüzeyi

Bu fazın testi projenin en kapsamlısı (PLAN.md 8.5). Üç katman:

1. **Saf birim (DB'siz) — `RecordTracker`:** ilk set → `Weight`; ağırlık artışı → `Weight`;
   aynı ağırlıkta tekrar artışı → `Reps`; eşit ağırlık + eşit tekrar → `None`; eşit ağırlık,
   daha az tekrar → `None`; daha düşük ağırlıkta ilk set → `None` (Soru 1/A'nın manşeti);
   daha düşük ağırlıkta ikinci ve daha çok tekrar → `Reps`; `0` kg (vücut ağırlığı) bir
   ağırlık kovasıdır; `100.0` ile `100.00` aynı kovaya düşer.
2. **Servis (DB'li, transaction+rollback):** IDOR (başkasının seti → 404, her fiilde);
   arşivlenmiş egzersize set → 400; başkasının egzersizine set → 404; set eklemenin açık
   oturumu bulup yoksa açması ve **tek** `SaveChanges` altında commit etmesi; rekor taşıyan
   setin silinmesi → sonraki setin rekora terfi etmesi; ortadaki setin düzeltilmesinin hem
   kendisini hem sonrasını yeniden hesaplaması; oturum silmenin etkilenen her egzersiz için
   yeniden hesap yapması; rekor özeti invaryantı.
3. **Uçtan uca (`WebApplicationFactory`):** 401; `POST /api/sets` 201 + gövdedeki `recordType`;
   `GET /api/sessions/{id}/sets`; `PATCH`/`DELETE` 200/204 ve sonrasında rekorların değişmiş
   olması; `GET /api/records`; ilerleme sayacının (Faz 7) artık gerçekten arttığı.

---

## Onay

Dört sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını
yazıp görev görev ilerleyeceğim.
