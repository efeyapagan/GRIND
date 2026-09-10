# Sorgular Tasarımı — Antrenman Geçmişi, Hacim, Takvim/Seri

**Tarih:** 2026-09-10
**Kapsam:** PLAN.md Faz 9 (9.1 geçmiş, 9.2 takvim/katılım, 9.3 hacim, 9.4 test)
**Durum:** ✅ Onaylandı (2026-09-10) — beş sorunun da A seçeneği; kalan kararlar kullanıcının
açık talimatıyla ("kararları al başla") tasarım sırasında alındı ve aşağıda gerekçeleriyle kayıtlı.

## Bu Doküman Ne Değildir

CLAUDE.md zaman damgalarının UTC saklandığını, gün bazlı gruplamaların yalnızca sorgu/görüntüleme
katmanında TR yerel saatine çevrileceğini, katılım istatistikleri için **ayrı tablo açılmayacağını**
(`WorkoutSession.StartedAt` üzerinden sorgulanacağını), sahiplik kuralını (başkasının kaydı → 404)
ve katman kurallarını zaten söylüyor. Faz 5-8 DTO, controller, sahiplik ve test desenlerini kurdu.
Bu doküman onları tekrar etmez; yalnızca Faz 9'un açık bıraktığı kararları kayda geçirir. Çelişki
olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- **Yeni tablo YOK, migration YOK.** Bu fazın tamamı mevcut `WorkoutSession` / `SetEntry` /
  `Exercise` satırlarından sorgulanır (CLAUDE.md: ayrı istatistik tablosu ikinci bir doğruluk
  kaynağı yaratır).
- **Sahiplik:** her sorgu `UserId` (oturumda doğrudan, sette `WorkoutSession.UserId` üzerinden)
  yüklemini taşır. Başkasının kaydı → 404, id içermeyen nötr mesajla.
- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur; controller iş
  mantığı taşımaz, hata çevirisi `GlobalExceptionHandler`'da.
- **Zaman:** "bugün" enjekte edilen `TimeProvider`'dan gelir; `DateTime.UtcNow` çağrılmaz.
- **Faz 7'nin `GET /api/sessions` ucuna DOKUNULMAZ** (sayfalamasız kalır) — Faz 8'in "çalışan
  DTO'ya dokunma" kararının aynısı. Oturum sayısı büyürse devreden not olarak ele alınır.

---

## Kararlar

### Karar 1 — Geçmiş ucu oturum listesi döndürür, setler gömülü

`GET /api/history?from&to&exerciseId&page&pageSize` filtreye uyan oturumları, her biri kendi
setleriyle döndürür. `exerciseId` verilirse yalnızca o egzersizi içeren oturumlar gelir ve her
oturumda yalnızca o egzersizin setleri görünür.

Tek uç iki soruyu birden cevaplıyor: "martta ne yaptım" ve "bench nasıl gidiyor". Alternatifleri —
düz set listesi (oturum bağlamı kaybolur, istemci yeniden gruplar) ve iki ayrı uç (aynı veriyi iki
biçimde sunmanın bakım maliyeti) — reddedildi.

### Karar 2 — Sayfalama: `page` + `pageSize` + toplam sayı

Yanıt zarfı: `items`, `page`, `pageSize`, `totalCount`, `totalPages`. Projedeki ilk sayfalama
deseni; sonraki fazlar (export) aynı zarfı kullanır. Bedeli her istekte ikinci bir `COUNT`
sorgusu — kişisel ölçekte göz ardı edilebilir. Cursor tabanlı sayfalama reddedildi: çözdüğü
sorun (aralık kayması) tek kullanıcılı bir uygulamada pratikte oluşmuyor.

`PagedResponse<T>` generic bir zarf olarak `Models/Dtos/Common/` altında yaşar.

### Karar 3 — "Antrenman yapılmış gün" = en az bir set; bugün seriyi kırmaz

- Bir TR günü, o gün **en az bir set girilmişse** antrenman günü sayılır. Yanlışlıkla açılıp boş
  bırakılan oturum seriyi şişirmez.
- **Mevcut seri** bugün antrenman yapılmadıysa **bozulmaz**: seri dünden geriye sayılır, çünkü gün
  henüz bitmemiştir. Dün de yoksa seri 0.
- Alternatif ("bugün yoksa seri 0") reddedildi: sabah uygulamayı açan kullanıcıya, akşam yapacağı
  antrenmandan önce seriyi 0 göstermek yanıltıcı.

### Karar 4 — Hacim: geçmişte oturum toplamı + iki ayrı toplam ucu

Geçmiş yanıtındaki her oturum kendi `totalVolume` ve `setCount` değerini taşır. Aralık toplamları
için ayrı uçlar açılır (aşağıda). Set hacmi ayrıca alan olarak dönmez — `weight × reps` istemcide
hesaplanabilir, yanıtta taşımak veriyi büyütür.

**`groupBy` parametresinden vazgeçildi (tasarım sırasında alınan karar).** Tek uç + `groupBy=day|exercise`
tasarımında dönen satırın bazen `date`, bazen `exerciseId`+`exerciseName` taşıması gerekirdi; bu da
alanların yarısı sürekli `null` olan bir DTO demekti. Faz 7'nin bloklayıcı bulgusu tam olarak bu
türden bir belirsizlikti (boş `progress` listesinin iki ayrı anlama gelmesi). Bunun yerine iki uç:
`GET /api/stats/volume/daily` ve `GET /api/stats/volume/by-exercise` — her biri kendi net DTO'suyla.
Bedeli: ileride haftalık toplam istenirse üçüncü bir uç açılır.

### Karar 5 — Takvim ucu: aralık + gün listesi + seriler

`GET /api/stats/calendar?from&to` aralıktaki antrenman günlerini (set sayısı ve hacimle), aralıktaki
toplam antrenman günü sayısını ve serileri döndürür.

**Seriler aralıktan BAĞIMSIZ, her zaman tüm geçmişten hesaplanır.** Aksi halde "bu ay" filtresi
seriyi yapay olarak kırardı — kullanıcı 40 günlük serisini ayın 1'inde 1 olarak görürdü.

### Karar 6 — TR gününe gruplama bellekte, toplama SQL'de

SQL oturum başına toplar (`SessionId`, `StartedAt`, `SetCount`, `Volume`); servis bu satırları
`TurkeyDay` ile TR günlerine yerleştirir. Egzersiz bazlı toplamlar tamamen SQL'de (`GROUP BY`).

Gerekçe: gün sınırı politikası `TurkeyDay`'de yaşıyor ve Faz 7'den beri testli. Aynı kuralı SQL
diliyle (`date_trunc(... AT TIME ZONE 'Europe/Istanbul')`) ikinci kez yazmak DRY'ı ihlal ederdi ve
EF Core'un bu ifadeyi çevirip çeviremediği doğrulanmamış bir varsayım olurdu. Belleğe gelen satır
sayısı **oturum** sayısıyla sınırlı, set sayısıyla değil.

Her şeyi bellekte toplamak (setleri çekip serviste toplamak) da reddedildi: bu, `GET /api/records`'ta
final incelemede düzeltilen sorunun daha büyüğü olurdu.

### Karar 7 — Bir setin günü, oturumun `StartedAt`'i

Takvim ve günlük hacim, bir seti **oturumunun başladığı** TR gününe yazar; setin kendi `CreatedAt`'ine
değil. TR 23:00'te başlayan bir antrenmanda 00:30'da girilen set, antrenmanın gününe aittir. İki uç
aynı tanımı kullanır, aksi halde takvimde 14 set görünen bir gün, hacim ucunda 13 sete düşerdi.

### Karar 8 — `exerciseId` filtresinde toplamlar filtreye tabidir

`exerciseId` verildiğinde bir oturumun `totalVolume` ve `setCount` değerleri **yalnızca o egzersizin**
setlerini kapsar ve yanıtta dönen setlerle birebir tutarlıdır. Alternatifi (oturumun tüm
egzersizlerini kapsayan toplam) ekranda "14 set" yazarken listede 4 set göstermek olurdu. Bu kural
DTO doküman yorumuna yazılır.

---

## Tasarım

```
src/Grind.Api/
├─ Common/Time/
│  ├─ TurkeyDay.cs                    (+2 metot: DateOnly→UTC aralığı, UTC an→TR günü)
│  └─ StreakCalculator.cs             saf, DB'siz seri hesabı
├─ Models/Dtos/Common/
│  └─ PagedResponse.cs                Items, Page, PageSize, TotalCount, TotalPages
├─ Models/Dtos/History/
│  ├─ HistoryQuery.cs                 [FromQuery] from, to, exerciseId, page, pageSize
│  └─ HistorySessionResponse.cs       SessionId, StartedAt, EndedAt, TemplateName, Notes,
│                                     TotalVolume, SetCount, Sets (Faz 8'in SetEntryResponse'u)
├─ Models/Dtos/Stats/
│  ├─ VolumeSummaryResponse.cs        From, To, TotalVolume, Items
│  ├─ DailyVolumeResponse.cs          Date, Volume, SetCount, SessionCount
│  ├─ ExerciseVolumeResponse.cs       ExerciseId, ExerciseName, Volume, SetCount
│  ├─ CalendarResponse.cs             From, To, Days, TrainedDayCount, CurrentStreak, LongestStreak
│  └─ CalendarDayResponse.cs          Date, SessionCount, SetCount, Volume
├─ Models/Projections/
│  └─ SessionAggregate.cs             SessionId, StartedAt, SetCount, Volume (dışarı verilmez)
├─ Repositories/                      (mevcut arayüzlere ekler)
├─ Services/
│  ├─ IWorkoutHistoryService.cs / WorkoutHistoryService.cs
│  └─ IStatsService.cs / StatsService.cs
└─ Controllers/
   ├─ HistoryController.cs
   └─ StatsController.cs
```

**Endpoint'ler** (hepsi `[Authorize]`):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| GET | `/api/history` | oturumlar + setleri, sayfalı | 200, 400, 404 (egzersiz) |
| GET | `/api/stats/volume/daily` | TR günü bazında hacim | 200, 400 |
| GET | `/api/stats/volume/by-exercise` | egzersiz bazında hacim | 200, 400 |
| GET | `/api/stats/calendar` | antrenman günleri + seriler | 200, 400 |

### Parametreler

- `from` / `to`: **TR yerel günü** (`DateOnly`, `2026-03-01`), **iki ucu da dahil**. Servis
  `TurkeyDay` ile UTC aralığına çevirir: `from` gününün başlangıcı (dahil) ile `to` gününün ertesi
  başlangıcı (hariç). Saat bileşeni kabul edilmez — göndermek anlamsız ve yanıltıcı olurdu.
- İkisi de opsiyonel; verilmezse o yönde sınır yok.
- `page` varsayılan 1 (min 1), `pageSize` varsayılan 20 (1-100). Dışına çıkarsa 400.
- `exerciseId` opsiyonel; verilirse önce görünürlük kontrolü yapılır (başkasının özel egzersizi →
  404). Arşivlenmiş egzersizle filtrelemeye izin verilir — okurken hoşgörülü (Faz 6/8 deseni).

### Repository eklemeleri

- `IWorkoutSessionRepository.GetHistoryPageAsync(userId, fromUtc?, toUtcExclusive?, exerciseId?, skip, take)`
  → `(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)`. Sayfa ve sayım **tek metotta**:
  ayrı metotlar filtre ifadesini iki yerde tekrarlar ve biri değişince diğeri sessizce ayrışır.
  `Include(Template)` yalnızca ad için (tek LEFT JOIN). Sıralama: `StartedAt` azalan, eşitlikte `Id`
  azalan (belirli sıra — Faz 8'in `ThenBy(Id)` dersi).
- `IWorkoutSessionRepository.GetSessionAggregatesAsync(userId, fromUtc?, toUtcExclusive?)`
  → oturum başına `SessionAggregate`; toplama SQL'de, **seti olmayan oturumlar sorguda elenir**
  (Karar 3). Takvim ve günlük hacim bunu paylaşır.
- `IWorkoutSessionRepository.GetTrainedSessionStartsAsync(userId)` → seriler için, TÜM geçmişten
  yalnızca `StartedAt` listesi (en az bir seti olan oturumlar). Aralıktan bağımsız olduğu için ayrı
  ve mümkün olan en yalın sorgu.
- `ISetEntryRepository.GetVolumeByExerciseAsync(userId, fromUtc?, toUtcExclusive?)` → `GROUP BY`
  ile egzersiz başına hacim ve set sayısı, tamamen SQL'de.
- `ISetEntryRepository.GetForSessionsAsync(sessionIds, userId, exerciseId?)` → geçmiş sayfasındaki
  oturumların setleri **tek sorguda** (N+1 yok), `Exercise` include'lu, `CreatedAt`+`Id` sıralı.
  Sahiplik yüklemi burada da taşınır (oturumlar zaten doğrulanmış olsa bile — CLAUDE.md kuralı).

### `StreakCalculator` — saf çekirdek

```csharp
public static (int Current, int Longest) Calculate(IEnumerable<DateOnly> trainedDays, DateOnly today);
```

DB bilmez, zaman bilmez; girdisi antrenman yapılmış TR günleri ve "bugün". `RecordTracker`'la aynı
desen: kuralın tek karar noktası, testleri hızlı ve kesin. Mevcut seri bugünden geriye sayılır;
bugün yoksa dünden başlar (Karar 3). En uzun seri tüm geçmişte taranır. Yinelenen günler ve sırasız
girdi tolere edilir (küme + sıralama içeride).

### Servisler

- `WorkoutHistoryService`: aralığı çözer, `exerciseId` görünürlüğünü doğrular, sayfayı ve setleri
  iki sorguyla toplar, oturum toplamlarını dönen setlerden hesaplar (Karar 8).
- `StatsService`: günlük hacim ve takvim için oturum toplamlarını `TurkeyDay` ile TR günlerine
  yerleştirir; egzersiz hacmini doğrudan SQL'den alır; serileri `StreakCalculator`'a hesaplatır.

Hiçbiri yazma yapmaz — `SaveChangesAsync` çağrısı yok, `IUnitOfWork` bağımlılığı yok.

### Hata durumları

| Durum | Sonuç |
|---|---|
| `from > to` | 400 (`ValidationException`) |
| `page < 1`, `pageSize` 1-100 dışında | 400 (query DTO'da `Range`) |
| Erişilemeyen/olmayan `exerciseId` | 404, nötr mesaj (id söylenmez) |
| Sonuç yok | **200 + boş liste** (404 değil — sorgu geçerli, sonuç boş) |
| Token yok | 401 |

---

## Test yüzeyi

1. **Saf birim (DB'siz):**
   - `TurkeyDay`'in iki yeni metodu: `DateOnly` → UTC aralığı (TR gece yarısı = UTC 21:00), UTC an →
     TR günü (23:30 UTC → ertesi TR günü).
   - `StreakCalculator`: tek gün; ardışık günler; bugün yokken serinin korunması; dün de yokken 0;
     boşlukla kırılan seri; en uzun seri geçmişte kalmışken mevcut serinin ayrı olması; yinelenen
     günler; sırasız girdi.
2. **Repository (DB'li, transaction+rollback):** sayfalama sınırları (skip/take + toplam sayı),
   egzersiz filtresi, sıralama belirliliği, IDOR (başkasının oturumu/setleri gelmez), seti olmayan
   oturumun toplamlardan elenmesi, `GROUP BY` sonuçları.
3. **Servis (DB'li):** TR gün sınırı (23:00'te başlayan antrenman doğru güne düşer), `exerciseId`
   filtresinde toplamların filtreye tabi olması (Karar 8), görünmeyen egzersizde 404, `from > to`
   400, seri hesabının tüm geçmişten gelmesi (dar aralık seriyi kırmaz).
4. **Uçtan uca (`WebApplicationFactory`):** dört uçta 401; geçmişin sayfalanması ve zarf alanları;
   filtreli/filtresiz hacim; takvimin gün listesi ve serileri; 400/404 durumları.

---

## Bilinçli olarak kapsam dışı

- Haftalık/aylık hacim gruplaması (üçüncü bir uç) — gerçek ihtiyaç çıkarsa.
- `GET /api/sessions` ucuna sayfalama eklemek — çalışan uca dokunulmuyor.
- Vücut ağırlığıyla karşılaştırma — Faz 10.
- Export — Faz 11.
