# Vücut Ağırlığı Takibi Tasarımı — Tartı Kaydı ve Kilo/Hacim Karşılaştırması

**Tarih:** 2026-09-11
**Kapsam:** PLAN.md Faz 10 (10.1 CRUD + tarih aralığı sorgusu, 10.2 hacim/performansla aynı zaman
ekseninde karşılaştırma)
**Durum:** ✅ Onaylandı (2026-09-11) — dört sorunun da A seçeneği; kalan kararlar kullanıcının açık
talimatıyla ("soru sorma, kararları al") tasarım sırasında alındı ve aşağıda gerekçeleriyle kayıtlı.

## Bu Doküman Ne Değildir

CLAUDE.md `BodyWeightLog`'un alanlarını (`Id`, `UserId`, `Weight`, `RecordedAt`), antrenman
verisinden bağımsız ayrı bir kayıt olduğunu, karşılaştırmanın "basit bir sorgu/join, yeni hesaplama
mantığı gerektirmeyen" bir iş olduğunu, sahiplik kuralını ve UTC saklama + TR gününe görüntüleme
katmanında çevirme kuralını zaten söylüyor. Faz 8 PATCH desenini ve ağırlık ölçeği kuralını, Faz 9
sayfalama zarfını (`PagedResponse<T>`), tarih aralığı çözümünü (`LocalDayRange`) ve günlük hacim
hesabını kurdu. Bu doküman onları tekrar etmez; yalnızca Faz 10'un açık bıraktığı kararları kayda
geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- **Migration YOK.** `BodyWeightLog` tablosu Faz 1'de oluşturuldu: `Weight` numeric(6,2),
  CHECK `"Weight" > 0`, index `(UserId, RecordedAt)`, `User`'a RESTRICT.
- **Sahiplik** `BodyWeightLog.UserId` üzerinden, doğrudan. Başkasının kaydı → 404, id içermeyen
  nötr mesajla. `IRepository<T>.GetByIdAsync` bu tip için de sahiplik kontrolü yapmaz (arayüz
  dokümanı bunu açıkça söylüyor) — kullanmak IDOR'dur.
- **Bir tartının günü**, `RecordedAt`'in düştüğü **TR günüdür** (`TurkeyDay.LocalDateOf`). Faz 9'daki
  gün sınırı kuralı aynen geçerli; SQL'de `AT TIME ZONE` ile ikinci bir kopya yazılmaz.
- **Tarih parametreleri** Faz 9'daki gibi: `from`/`to` TR yerel günü (`DateOnly`), iki ucu da dahil,
  opsiyonel; `from > to` → 400. Çözümü `LocalDayRange.Resolve` yapar.
- **Zaman** enjekte edilen `TimeProvider`'dan gelir.

---

## Kararlar

### Karar 1 — Aynı gün birden fazla tartı serbest; günlük değer ortalamadır

Her tartı ayrı bir kayıt, tam zaman damgasıyla. Bir günü temsil eden değer (karşılaştırma ucunda)
o TR gününün tartılarının **ortalamasıdır**, iki ondalığa yuvarlanır (`MidpointRounding.AwayFromZero`
— kilo gösteriminde beklenen "yarım yukarı" yuvarlama; .NET'in varsayılanı olan banker's rounding
kullanıcıya tutarsız görünürdü). Gün satırı kaç tartıdan hesaplandığını da taşır (`ReadingCount`).

Reddedilenler: "günün son tartısı" (sabah/akşam tartılan kullanıcıda akşam kilosu — su/yemek etkisi —
baskın gelirdi) ve "günde tek kayıt / upsert" (ikinci tartı birincisini sessizce silerdi).

### Karar 2 — `recordedAt` istemciden gelebilir, yoksa şimdi

Gövdede opsiyonel `recordedAt`; verilmezse sunucu saati. Sabah tartılıp akşam girilen, ya da unutulup
ertesi gün girilen kayıt doğru güne düşer.

- **Tip `DateTimeOffset`**, `DateTime` değil. Sebep: Npgsql `timestamptz` sütununa `Kind=Unspecified`
  bir `DateTime` yazmayı reddeder ve JSON'da offset'siz gelen bir `DateTime` tam olarak öyle bağlanır —
  istemci `"2026-03-10T08:00:00"` gönderdiğinde 500 alırdı. `DateTimeOffset` offset'i taşır; servis
  `.UtcDateTime` ile UTC'ye çevirir. İstemci offset göndermelidir (`+03:00` veya `Z`); offset'siz bir
  değer serileştiricinin sunucu yerel saat dilimiyle yorumlanır — bu DTO dokümanında yazılır.
- **Gelecek zaman reddedilir (400)**, ama saat kaymasına karşı **5 dakikalık tolerans** ile: istemci
  saati birkaç saniye ileride diye "şimdi"yi gönderen bir tartı 400 almamalı. Tolerans adlandırılmış bir
  sabit olarak yaşar.

### Karar 3 — Karşılaştırma ucu tek yanıtta iki ayrı seri döndürür

`GET /api/stats/body-weight-trend?from&to` →

```json
{
  "from": "2026-03-01", "to": "2026-03-31",
  "bodyWeight": [ { "date": "2026-03-01", "weight": 82.40, "readingCount": 1 } ],
  "volume":     [ { "date": "2026-03-02", "volume": 4820, "setCount": 14, "sessionCount": 1 } ]
}
```

Her seri yalnızca kendi verisi olan günleri taşır; **null alan yok**. İstemci ikisini aynı tarih
ekseninde çizer. "Gün gün birleşik satır" reddedildi: tartı olmayan günde `weight`, antrenman
olmayan günde `volume` sürekli null olurdu — Faz 9'un Karar 4'te reddettiği yarısı null satır.

Hacim serisi için **Faz 9'un `DailyVolumeResponse`'u aynen kullanılır** ve aynı hesap yolundan
(`StatsService`'in günlük gruplaması) gelir. Bu, karşılaştırma ucundaki hacmin
`GET /api/stats/volume/daily` ile **birebir aynı** olmasını yapısal olarak garanti eder — Faz 7 ve
Faz 8'deki "aynı veri iki uçta farklı" hatalarının bu fazda tekrar etmemesi için. Bir test bunu
sabitler.

### Karar 4 — Tartı listesi sayfalıdır (`PagedResponse`)

`GET /api/body-weights?from&to&page&pageSize`, yeniden eskiye (`RecordedAt` azalan, eşitlikte `Id`
azalan). Faz 9'da kurulan zarfın aynısı. Faz 9'un devreden notu sayfalamasız `GET /api/sessions`'ı bir
sorun olarak işaretliyor; yeni bir liste ucunda aynısını tekrarlamıyoruz.

---

## Tasarım sırasında alınan kararlar

### Karar 5 — Düzeltme yalnızca `PATCH`

`PATCH /api/body-weights/{id}` `{ weight?, recordedAt? }`, en az bir alan zorunlu. Faz 8'in `SetEntry`
deseninin aynısı (API'de en yeni kaynakla tutarlılık). Burada `PUT`'un veri kaybı tuzağı yok (iki alan
da zorunlu, opsiyonel alan yok) ama iki fiil deseni yerine tek desen daha az öğrenilecek şey demek.

### Karar 6 — Ağırlık kuralları

- `weight` zorunlu, **0,01 ile 999,99 arası**. Alt sınır veritabanındaki `"Weight" > 0` kısıtıyla
  hizalı (kısıt ihlali 400 yerine 500 üretirdi); üst sınır `numeric(6,2)`'nin gerçekçi bir alt kümesi.
- **En fazla iki ondalık** — Faz 8'in set ağırlığı kuralının aynısı: fazlası PostgreSQL tarafından
  sessizce yuvarlanır ve kullanıcının girdiğiyle saklanan değer ayrışır; yuvarlamak yerine reddedilir.
  Bu kural bugün `SetEntryService` içinde **özel** bir metot; ikinci bir yerde yazmak yerine
  `Common/Validation/WeightScale`'e taşınır ve iki servis de onu çağırır (DRY).

### Karar 7 — Sayfalı sorgu parametreleri ortak bir tabanda

Faz 9'un `HistoryQuery`'si `From`, `To`, `Page`, `PageSize` taşıyor ve `WorkoutHistoryService` Faz 9
final incelemesinde düzeltilen **taşma korumalı** `skip` hesabını yapıyor. Tartı listesi bunların
hepsine ihtiyaç duyuyor. Kopyalamak, taşma düzeltmesinin bir gün yalnızca bir kopyada kalması demek
olurdu. Bu yüzden:

- `Models/Dtos/Common/PagedRangeQuery` — `From`, `To`, `Page` (`[Range(1, int.MaxValue)]`, varsayılan 1),
  `PageSize` (`[Range(1, 100)]`, varsayılan 20) ve türetilmiş, taşma korumalı `Skip`.
- `HistoryQuery : PagedRangeQuery` yalnızca `ExerciseId` ekler; `WorkoutHistoryService` `query.Skip`'i
  kullanır. Davranış değişmez — Faz 9 testleri regresyon ağıdır.

### Karar 8 — Salt okuma sorguları izlemesiz

Faz 9 final incelemesi, okuma yollarında `AsNoTracking` olmadığını not etti ve proje çapında bir
geçişi bu faza bıraktı. Karar: **bu fazın yeni okuma sorguları** (liste, karşılaştırma) `AsNoTracking`
kullanır; düzeltme/silme için kaydı getiren sorgu izlemeli kalır (değiştirilecek). Faz 5-9'un mevcut
okuma yollarına dokunulmaz — onlar ayrı bir incelemeyi hak eden, bu fazın kapsamı dışında bir
değişiklik; devreden not olarak kalır.

---

## Tasarım

```
src/Grind.Api/
├─ Common/Validation/
│  └─ WeightScale.cs                   (SetEntryService'ten taşınan iki-ondalık kuralı)
├─ Models/Dtos/Common/
│  └─ PagedRangeQuery.cs               From, To, Page, PageSize, Skip (taşma korumalı)
├─ Models/Dtos/History/
│  └─ HistoryQuery.cs                  (artık PagedRangeQuery'den türer; yalnızca ExerciseId)
├─ Models/Dtos/BodyWeight/
│  ├─ CreateBodyWeightRequest.cs       Weight, RecordedAt? (DateTimeOffset)
│  ├─ PatchBodyWeightRequest.cs        Weight?, RecordedAt? (en az biri)
│  └─ BodyWeightLogResponse.cs         Id, Weight, RecordedAt
│  (liste sorgusu için ayrı bir tip YOK — ek alanı olmayan boş bir alt sınıf açmak yerine
│   PagedRangeQuery doğrudan kullanılır, YAGNI)
├─ Models/Dtos/Stats/
│  ├─ BodyWeightTrendResponse.cs       From, To, BodyWeight, Volume
│  └─ DailyBodyWeightResponse.cs       Date, Weight (günlük ortalama), ReadingCount
├─ Repositories/
│  └─ IBodyWeightLogRepository.cs / BodyWeightLogRepository.cs
├─ Services/
│  ├─ IBodyWeightLogService.cs / BodyWeightLogService.cs
│  └─ StatsService.cs                  (+ GetBodyWeightTrendAsync)
└─ Controllers/
   ├─ BodyWeightsController.cs
   └─ StatsController.cs               (+ body-weight-trend ucu)
```

**Endpoint'ler** (hepsi `[Authorize]`):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| POST | `/api/body-weights` | tartı kaydet | 201, 400 |
| GET | `/api/body-weights` | liste, sayfalı, yeniden eskiye | 200, 400 |
| GET | `/api/body-weights/{id}` | tek kayıt | 200, 404 |
| PATCH | `/api/body-weights/{id}` | düzelt | 200, 400, 404 |
| DELETE | `/api/body-weights/{id}` | sil | 204, 404 |
| GET | `/api/stats/body-weight-trend` | kilo + hacim, iki seri | 200, 400 |

### Repository

- `GetOwnedByIdAsync(id, userId)` — başkasının kaydında null (IDOR). İzlemeli (düzeltme için).
- `GetPageAsync(userId, fromUtc?, toUtcExclusive?, skip, take)` → `(Items, TotalCount)`, sayfa ve sayım
  tek filtreden (Faz 9 Karar 2'nin dersi). Belirli sıra: `RecordedAt` azalan, eşitlikte `Id` azalan.
  `AsNoTracking`.
- `GetInRangeAsync(userId, fromUtc?, toUtcExclusive?)` → aralıktaki tüm tartılar, `AsNoTracking`.
  Karşılaştırma ucu bunları TR gününe göre bellekte gruplar — satır sayısı tartı sayısıyla sınırlı
  (günde birkaç).

### Servisler

- `BodyWeightLogService` — ekleme, listeleme, tek kayıt, düzeltme, silme. Her yazma işlemi tek
  `SaveChangesAsync`. Ağırlık ölçeğini `WeightScale`, gelecek zamanı enjekte edilen saate göre
  5 dakika toleransla kontrol eder.
- `StatsService.GetBodyWeightTrendAsync` — hacim serisini mevcut günlük gruplamadan (Faz 9'un
  `DailyBucketsAsync`'i), kilo serisini tartıların TR günü ortalamasından üretir. Salt okuma.

### Hata durumları

| Durum | Sonuç |
|---|---|
| `weight` yok / aralık dışı / 2'den fazla ondalık | 400 |
| `recordedAt` şimdiden 5 dakikadan fazla ileride | 400 |
| Boş PATCH gövdesi | 400 |
| `from > to`, geçersiz sayfa | 400 |
| Başkasının / olmayan kaydı | 404, nötr mesaj |
| Sonuç yok | 200 + boş liste |
| Token yok | 401 |

---

## Test yüzeyi

1. **Saf birim:** `WeightScale` (iki ondalık kabul, üç ondalık red, 0 ve tam sayı kabul);
   `PagedRangeQuery.Skip` (ilk sayfa 0, ikinci sayfa pageSize, `int.MaxValue` sayfasında taşmadan
   `int.MaxValue`).
2. **Repository (DB'li):** sahiplik (başkasının kaydı null / listede yok), sayfa + toplam sayı, tarih
   aralığı, belirli sıra.
3. **Servis (DB'li):** ekleme (recordedAt verilmezse saat; verilirse UTC'ye çevrilmiş hali; offset'li
   değer doğru UTC ana düşer), gelecek zaman 400 ama tolerans içindeki değer kabul, üç ondalık 400,
   PATCH (tek alan değişir, diğeri korunur; boş PATCH 400), silme, IDOR her fiilde 404; karşılaştırma
   (günlük ortalama + yuvarlama + `ReadingCount`, TR gün sınırı, **hacim serisinin günlük hacim ucuyla
   birebir aynı olması**, başkasının tartısı görünmez).
4. **Uçtan uca:** altı uçta 401; oluştur → 201 + Location; liste zarfı; PATCH/DELETE; başkasının kaydı
   404; 400 durumları; karşılaştırma ucunun iki seriyi döndürmesi.

---

## Bilinçli olarak kapsam dışı

- Proje çapında `AsNoTracking` geçişi (Faz 5-9 okuma yolları) — devreden not.
- Hedef kilo, BMI, kilo değişim hızı gibi türetilmiş metrikler — istenmedi (YAGNI).
- Haftalık/aylık kilo ortalaması — Faz 9'un haftalık hacim notuyla aynı gerekçe.
- Export — Faz 11.
