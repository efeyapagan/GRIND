# Dışa Aktarma Tasarımı — Ham JSON ve AI'ya Yapıştırılabilir Metin

**Tarih:** 2026-09-11
**Kapsam:** PLAN.md Faz 11 (11.1 ham JSON export, 11.2 AI-özet formatında düz metin, 11.3 formatlama
servis katmanında)
**Durum:** ✅ Onaylandı (2026-09-11). İki sorunun ikisinde de A seçeneği seçildi. Kalan kararlar
kullanıcının açık talimatıyla ("önerilen çözümler okey, bu fazlık sorma") tasarım sırasında alındı ve
aşağıda gerekçeleriyle kayıtlı.

## Bu Doküman Ne Değildir

CLAUDE.md iki export biçimini (ham JSON + AI-özet düz metin) ve bunların tabloya ihtiyaç duymadığını,
mevcut veriden sorgulanacağını zaten söylüyor. Aynı yerde şu kurallar da var: formatlamanın serviste
yaşaması, UTC saklama + TR gününe görüntüleme katmanında çevirme ve sahiplik kuralı. Faz 8 rekor
özetini, Faz 9 geçmiş/takvim/hacim hesaplarını, Faz 10 tartı sorgularını kurdu. Bu doküman onları
tekrar etmez; yalnızca Faz 11'in açık bıraktığı kararları kayda geçirir. Çelişki olursa CLAUDE.md
kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- **Migration YOK.** Yeni tablo yok; export tamamen okuma.
- **Sahiplik** her sorguda `currentUser.UserId` üzerinden. Export uçları dışarıdan hiçbir id almaz,
  bu yüzden IDOR yüzeyi "her sorgu kullanıcı yüklemini taşıyor mu" sorusuna indirgenir. Başkasının
  verisinin export'ta görünmediği test edilir.
- **Tarih parametreleri** Faz 9'daki gibi: `from`/`to` TR yerel günü (`DateOnly`), iki ucu da dahil,
  opsiyonel; `from > to` → 400. Çözümü `LocalDayRange.Resolve` yapar.
- **Bir oturumun günü** `StartedAt`'in TR günüdür. Setler de oturumlarının `StartedAt`'ine göre
  filtrelenir, kendi `CreatedAt`'lerine göre değil (Faz 9 Karar 7).
- **Zaman** enjekte edilen `TimeProvider`'dan gelir.

---

## Kararlar

### Karar 1 — İçerik: tam tablo (Soru 1/A)

Export seçilen aralığın **tüm** verisini tek belgede taşır:

1. **Oturumlar** ve setleri: başlangıç/bitiş, şablon adı, not, RIR, rekor işareti.
2. **Tartılar**: ham kayıtlar, günlük ortalama değil.
3. **Aralık özeti**: antrenman günü, oturum/set sayısı, toplam hacim, seri ve egzersiz bazında hacim.
4. **Tüm zamanların rekorları.**

Gerekçe: AI'nın yorum yapabilmesi için bağlam gerekir. Rekorlar olmadan "ilerliyor muyum?", tartılar
olmadan "kilo verirken güç kaybettim mi?" sorusu cevaplanamaz. Toplamların **hazır** gelmesi de
ayrıca önemli: LLM'ler aritmetikte güvenilmezdir, hacmi kendilerine topla dersek yanlış sayılar
üretirler.

Reddedilenler: yalnızca oturum + set (B; aritmetik AI'ya kalırdı) ve `?include=` ile bölüm seçimi
(C; gerçek ihtiyaç yok, YAGNI).

### Karar 2 — Aralık verilmezse tüm geçmiş (Soru 2/A)

`from`/`to` opsiyoneldir, verilmeyen yönde sınır uygulanmaz. Ham JSON'un doğal kullanımı "verimin
tamamını al"dır (yedek, taşıma). Bir yıllık yoğun antrenman sıkıştırılmış metinde yaklaşık 30-40 bin
token eder ve güncel LLM'lere sığar. Boyut sınırı konmaz.

**Aralıktan bağımsız olanlar:** tüm zamanların rekorları ve seriler (mevcut/en uzun) her zaman tüm
geçmişten hesaplanır. Rekorun tanımı "tüm zamanlar" olduğu için bu kaçınılmaz; seride de Faz 9
Karar 5 aynen geçerli. İkisi de metin çıktısında açıkça "(aralıktan bağımsız)" /
"(tüm geçmişten)" diye etiketlenir ki AI rekoru aralıktaki bir sete bağlamaya çalışmasın.

### Karar 3 — Tek model, iki biçim

`ExportService` tek bir `ExportResponse` kurar. JSON ucu bunu olduğu gibi döner. Metin ucu **aynı
modeli** saf bir formatlayıcıdan (`ExportTextFormatter.Format(ExportResponse)`) geçirir.

- JSON ile metin **yapısal olarak** ayrışamaz, çünkü metin ayrı sorgulardan değil JSON'un
  kendisinden üretilir.
- Formatlayıcı saf bir fonksiyondur (DB, saat, kültür bağımlılığı yok) ve veritabanısız birim
  testle tamamen sabitlenir.
- 11.3 karşılanır: formatlama servis katmanında (`Services/`) yaşar, controller yalnızca dönüş yapar.

### Karar 4 — Hesaplar yeniden yazılmaz, mevcut yollardan gelir

Export yeni hesaplama mantığı içermez:

| Bölüm | Kaynak |
|---|---|
| Antrenman günü, seri, günlük toplamlar | `IStatsService.GetCalendarAsync` (Faz 9) |
| Egzersiz bazında hacim | `IStatsService.GetVolumeByExerciseAsync` (Faz 9) |
| Tüm zamanların rekorları | `IPersonalRecordService.GetAllTimeAsync` (Faz 8) |
| Oturum → DTO eşlemesi | `WorkoutHistoryService` ile paylaşılan `HistoryMapping` (bkz. Karar 9) |

Özetteki `SessionCount`, `SetCount` ve `TotalVolume` takvimin günlerinin toplamıdır. Böylece export
özeti `GET /api/stats/calendar` ve `volume/by-exercise` ile **birebir aynıdır**; bir test bunu
sabitler. Reddedilen: oturum listesinden bellekte yeniden toplamak. Bu, gün sınırı ve "setsiz oturum
sayılmaz" kurallarının ikinci bir kopyası olurdu. Faz 7 ve Faz 8'deki "aynı veri iki uçta farklı"
hatalarının kaynağı tam olarak buydu.

### Karar 5 — İki ayrı uç

- `GET /api/export/json?from&to` → `200 application/json`, `ExportResponse`
- `GET /api/export/text?from&to` → `200 text/plain; charset=utf-8`

Reddedilen: tek uç + `Accept` başlığıyla içerik anlaşması. Biçim örtük hale gelir, Swagger'dan ve
tarayıcıdan denemek zorlaşır. İki açık URL daha basit (KISS). Faz 9 Karar 4 de iki farklı çıktı tipi
için iki uç açmıştı.

**`Content-Disposition` başlığı yok.** Dosya olarak indirme bir istemci kararıdır ve frontend henüz
seçilmedi (YAGNI).

### Karar 6 — Metin biçimi

Hedef okuyucu bir LLM ve kullanıcı. Kurallar:

- **Dil Türkçe**, bölümler Markdown başlıklarıyla (`#`, `##`, `###`). Content-type yine `text/plain`;
  Markdown burada yalnızca LLM'lerin iyi ayrıştırdığı bir yapı işareti.
- **Sayılar kültürden bağımsız** (`CultureInfo.InvariantCulture`, `0.##`): `82.5`, `152340`. Binlik
  ayırıcı yok. Gerekçe: `tr-TR` biçimi `82,5` ve `152.340` yazar. İkincisi bir LLM'e "152,34" gibi
  okunabilir, yani belirsizdir. Veride zaten en fazla iki ondalık var (`WeightScale`), `0.##` hiçbir
  şeyi kırpmaz.
- **Tarih** ISO (`yyyy-MM-dd`), **saat** `HH:mm`, Türkiye yerel saatiyle.
- **Gün adı** Türkçe kısaltmayla (`Pzt`, `Sal`, `Çar`, `Per`, `Cum`, `Cmt`, `Paz`). Bu, sabit bir
  diziden gelir; kültür verisinden okunmaz. LLM'ler tarihten haftanın gününü hesaplamakta
  güvenilmezdir ve "pazartesileri daha güçlüsün" gibi bir örüntü ancak bu bilgiyle görülebilir.
- **Setler** oturum içinde egzersiz bazında gruplanır. Egzersizler oturumdaki ilk setlerinin
  sırasıyla, setler kronolojik sırayla listelenir. Her set `ağırlık×tekrar` biçimindedir, gerekirse
  ` (RIR n)` ve ` [PR: ağırlık]` / ` [PR: tekrar]` eki alır.
- **Id yok.** AI için gürültü, token maliyeti.
- **Not** tek satıra indirilir: satır sonları boşluğa çevrilir, yoksa kullanıcı metni belgenin
  başlık yapısını bozabilir.
- **Satır sonu** her zaman `\n`; `Environment.NewLine` kullanılmaz, çıktı işletim sisteminden
  bağımsızdır. Belge tek bir `\n` ile biter.
- Belgenin başında bir **açıklama bloğu** vardır: birimler, 0 kg'ın anlamı, hacim, RIR ve PR
  tanımları. AI'ya talimat/soru (prompt) **yazılmaz**, soruyu kullanıcı kendisi yazar.

Örnek (iki uç dahil bir aralık):

```text
# GRIND antrenman verisi
Aralık: 2026-03-01 – 2026-03-31 (TR yerel günü, iki uç dahil)
Oluşturulma: 2026-03-31 21:15 (TR)

Açıklamalar: Saatler Türkiye yerel saatidir. Setler ağırlık×tekrar biçimindedir; ağırlıklar kg,
0 = ek yük yok (yalnızca vücut ağırlığı). Hacim = ağırlık × tekrar. RIR = yedekte kalan tekrar.
[PR: ağırlık] = o egzersizde o ana kadarki en ağır set. [PR: tekrar] = aynı ağırlıkta o ana kadarki
en çok tekrar.

## Özet
- Antrenman günü: 12
- Oturum (en az bir seti olan): 13
- Set: 180
- Toplam hacim: 152340 kg
- Seri (tüm geçmişten): mevcut 2 gün, en uzun 5 gün

## Egzersiz bazında hacim
- Bench Press: 24800 kg (32 set)

## Tüm zamanların rekorları (aralıktan bağımsız)
- Bench Press (Push): en ağır 100×3 (2026-02-10) · en çok tekrar 60×25 (2026-01-05)

## Oturumlar
### 2026-03-02 Pzt 18:30–19:45 · Push Day A
Not: omuz sıkıştı
- Bench Press: 80×8, 80×7 (RIR 1), 85×5 [PR: ağırlık]
- Overhead Press: 40×10, 40×10, 40×9
Toplam: 6 set, 2785 kg

### 2026-03-04 Çar 07:10–(bitirilmedi)
(Bu oturumda set girilmedi.)

## Vücut ağırlığı
- 2026-03-01 Paz 08:10 — 82.4 kg
```

Başlık varyantları:

| `from` | `to` | Aralık satırı |
|---|---|---|
| — | — | `Aralık: tüm geçmiş` |
| var | — | `Aralık: 2026-03-01 ve sonrası` |
| — | var | `Aralık: 2026-03-31 ve öncesi` |
| var | var | `Aralık: 2026-03-01 – 2026-03-31 (TR yerel günü, iki uç dahil)` |

Oturum başlığında:

- **Bitmemiş oturumun** sonu `(bitirilmedi)` diye yazılır.
- Bitişi başka bir TR gününe düşen oturum `23:30–00:15 (+1 gün)` biçiminde gösterilir; unutulup
  günler sonra kapatılan bir oturumda bu `(+3 gün)` gibi olur.
- Şablon yoksa ` · Şablon` kısmı yazılmaz.

Boş bölümler: liste bölümlerinde `Bu aralıkta kayıt yok.`, rekorlarda `Henüz kayıt yok.` yazılır.
Özet bölümü her zaman sayılarla (0 dahil) basılır.

### Karar 7 — Sıralama eskiden yeniye

Oturumlar (`StartedAt`, eşitlikte `Id`), setler (`CreatedAt`, eşitlikte `Id`) ve tartılar
(`RecordedAt`, eşitlikte `Id`) kronolojiktir. Export bir **belgedir** ve AI zaman çizgisini baştan
sona okur. `GET /api/history`'nin yeniden eskiye sıralaması sayfalı bir arayüz içindir, burada
geçerli değil. Egzersiz bazında hacim ve rekorlar kendi uçlarındaki sırayı korur (hacim büyükten
küçüğe, rekorlar ada göre).

### Karar 8 — Setsiz oturum listede var, özette yok

Oturum listesi hiç seti girilmemiş oturumları da içerir, çünkü bir **günlüktür**: "omuz ağrıdı,
yapamadım" notu AI için değerlidir. Özet ise yalnızca en az bir seti olan oturumları sayar, çünkü bir
**antrenman** özetidir. Bu, Faz 9'daki `HistorySessionResponse` ↔ takvim ayrımının aynısıdır ve bir
tutarsızlık değildir. Özetteki alanın metin karşılığı bunu açıkça söyler: `Oturum (en az bir seti
olan)`.

### Karar 9 — Veri erişimi: iki yeni aralık sorgusu, izlemesiz

- `IWorkoutSessionRepository.GetInRangeAsync(userId, fromUtc?, toUtcExclusive?)`: aralıktaki tüm
  oturumlar, `Template` ile birlikte, kronolojik, `AsNoTracking`. Mevcut `FilterByRange`'i kullanır.
- `ISetEntryRepository.GetInRangeAsync(userId, fromUtc?, toUtcExclusive?)`: oturumu aralıkta
  başlamış tüm setler, `Exercise` ile birlikte, kronolojik, `AsNoTracking`. Oturumun `StartedAt`'ine
  göre filtre bugün `GetVolumeByExerciseAsync` içinde satır içi yazılı. İkinci bir kopya yazmak
  yerine özel bir `FilterBySessionRange` yardımcısına çekilir ve iki metot da onu kullanır (DRY;
  mevcut hacim testleri regresyon ağıdır).

Reddedilen: oturum id'leriyle `GetForSessionsAsync`'i yeniden kullanmak. Tüm geçmiş export'unda
binlerce id'lik bir `IN` listesi ve binlerce izlenen entity demek. Aralık filtresi oturum listesiyle
aynı UTC sınırlarını kullandığı için iki sorgu tutarlıdır.

**`HistoryMapping`:** `WorkoutHistoryService`'in özel `ToResponse`/`ToSetResponse` metotları
`Services/HistoryMapping.cs` içine (`internal static`) taşınır ve export da onları çağırır. Böylece
aynı oturum geçmiş ucunda ve export'ta aynı şekli alır. Davranış değişmez, Faz 9 testleri regresyon
ağıdır. `SetEntryService`'in kendi eşlemesine dokunulmaz: egzersiz adını ayrı bir parametreyle
alıyor (yeni eklenen sette `Exercise` navigasyonu yüklü olmayabilir) ve bu fazla ilgisi yok.
`BodyWeightLogResponse` tek satırlık bir kurucu çağrısıdır, ortak yardımcıya taşınmaz.

### Karar 10 — Metin ucunda `[Produces("text/plain")]` KULLANILMAZ

`[Produces]` bir sonuç filtresidir. `[ApiController]`'ın otomatik 400 yanıtını
(`ValidationProblemDetails`, ör. `from=abc`) de `text/plain`'e zorlar, bu nesneyi yazabilecek
biçimlendirici olmadığı için yanıt 406'ya döner. Onun yerine yalnızca meta veri olan
`[ProducesResponseType(typeof(string), 200, "text/plain")]` kullanılır, controller da
`Content(text, "text/plain; charset=utf-8")` döner. Bozuk tarihli bir isteğin metin ucunda **400**
(406 değil) aldığını bir uçtan uca test sabitler.

### Karar 11 — `TurkeyDay.ToLocal`

Formatlayıcı saat gösterdiği için UTC anın TR yerel karşılığına ihtiyaç duyar.
`TurkeyDay.ToLocal(DateTime utcInstant)` eklenir. `Local` Kind'ı aynı `EnsureNotLocal` korumasıyla
reddeder ve `Unspecified` Kind'lı bir yerel zaman döner. `LocalDateOf` artık
`DateOnly.FromDateTime(ToLocal(...))` olarak yazılır; saat dilimi dönüşümünün tek kopyası kalır.

---

## Tasarım

```
src/Grind.Api/
├─ Common/Time/
│  └─ TurkeyDay.cs                     (+ ToLocal; LocalDateOf onu kullanır)
├─ Models/Dtos/Stats/
│  └─ StatsRangeQuery.cs               (yalnızca doküman: export uçları da bunu kullanır)
├─ Models/Dtos/Export/
│  ├─ ExportResponse.cs                GeneratedAt, From, To, Summary, Sessions, BodyWeights,
│  │                                   AllTimeRecords
│  └─ ExportSummaryResponse.cs         TrainedDayCount, SessionCount, SetCount, TotalVolume,
│                                      CurrentStreak, LongestStreak, VolumeByExercise
├─ Repositories/
│  ├─ IWorkoutSessionRepository.cs / WorkoutSessionRepository.cs   (+ GetInRangeAsync)
│  └─ ISetEntryRepository.cs / SetEntryRepository.cs               (+ GetInRangeAsync,
│                                                                     FilterBySessionRange)
├─ Services/
│  ├─ HistoryMapping.cs                (WorkoutHistoryService'ten taşınan eşleme)
│  ├─ WorkoutHistoryService.cs         (HistoryMapping'i çağırır)
│  ├─ ExportTextFormatter.cs           saf: ExportResponse → string
│  └─ IExportService.cs / ExportService.cs
└─ Controllers/
   └─ ExportController.cs
```

Yeniden kullanılan DTO'lar: `HistorySessionResponse` (+ `SetEntryResponse`), `BodyWeightLogResponse`,
`ExerciseVolumeResponse`, `ExerciseRecordResponse`. Aynı veri için ikinci bir DTO açılmaz.

**`ExportResponse` (JSON):**

```json
{
  "generatedAt": "2026-03-31T18:15:00Z",
  "from": "2026-03-01",
  "to": "2026-03-31",
  "summary": {
    "trainedDayCount": 12, "sessionCount": 13, "setCount": 180, "totalVolume": 152340,
    "currentStreak": 2, "longestStreak": 5,
    "volumeByExercise": [ { "exerciseId": 1, "exerciseName": "Bench Press", "volume": 24800, "setCount": 32 } ]
  },
  "sessions": [ { "sessionId": 41, "startedAt": "...", "endedAt": "...", "templateName": "Push Day A",
                  "notes": "omuz sıkıştı", "totalVolume": 2785, "setCount": 6, "sets": [ ... ] } ],
  "bodyWeights": [ { "id": 7, "weight": 82.40, "recordedAt": "..." } ],
  "allTimeRecords": [ { "exerciseId": 1, "exerciseName": "Bench Press", "category": "Push", ... } ]
}
```

**Endpoint'ler** (ikisi de `[Authorize]`):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| GET | `/api/export/json` | tam export, JSON | 200, 400 |
| GET | `/api/export/text` | aynı export, AI'ya yapıştırılabilir metin | 200, 400 |

### Servis

```csharp
public interface IExportService
{
    Task<ExportResponse> GetAsync(StatsRangeQuery query, CancellationToken cancellationToken = default);
    Task<string> GetTextAsync(StatsRangeQuery query, CancellationToken cancellationToken = default);
}
```

`GetTextAsync` = `ExportTextFormatter.Format(await GetAsync(query))`. `GetAsync` şu adımları izler:

1. Aralığı `LocalDayRange.Resolve` ile çözer. Ters aralık, herhangi bir sorgudan önce 400 verir.
2. Oturumları ve setleri iki yeni aralık sorgusuyla alır, setleri oturuma göre gruplar ve
   `HistoryMapping` ile eşler.
3. Takvim + egzersiz hacmini `IStatsService`'ten, rekorları `IPersonalRecordService`'ten, tartıları
   `IBodyWeightLogRepository.GetInRangeAsync`'ten alır.
4. `GeneratedAt`'i `TimeProvider`'dan alır.

Salt okumadır, `SaveChangesAsync` yoktur. Sorgular sırayla çalışır: aynı `DbContext` eşzamanlı
sorgu kaldırmaz.

### Hata durumları

| Durum | Sonuç |
|---|---|
| `from > to`, bozuk tarih, `from = 9999-12-31` | 400 (her iki uçta da ProblemDetails JSON) |
| Token yok | 401 |
| Veri yok | 200. JSON'da boş listeler ve sıfır özet, metinde "kayıt yok" satırları |

---

## Test yüzeyi

1. **Saf birim:**
   - `TurkeyDayTests` +2: `ToLocal` UTC → TR (yaz saati olmayan +03:00), `Local` Kind reddi.
   - `ExportTextFormatterTests`: tam çıktı (altın metin); `tr-TR` kültüründe bile sayıların nokta
     ile yazılması; `80` / `82.5` kırpması; setlerin egzersiz bazında ilk görünme sırasıyla
     gruplanması; RIR ve PR ekleri; bitmemiş oturum; ertesi TR gününe taşan bitiş `(+1 gün)`;
     setsiz oturum satırı; boş export'un bölüm mesajları; dört aralık başlığı varyantı; nottaki satır
     sonlarının boşluğa çevrilmesi; gece yarısını aşan oturumun TR günüyle yazılması.
2. **Repository (DB'li):** oturum aralığı + kronolojik sıra + şablon adı yüklü + setsiz oturum dahil
   + başkasının oturumu yok. Set aralığı oturumun `StartedAt`'ine göre (setin `CreatedAt`'ine göre
   değil) + kronolojik + `Exercise` yüklü + başkasının seti yok.
3. **Servis (DB'li):**
   - bölümlerin birlikte dolması;
   - **özetin takvim ve egzersiz hacmi uçlarıyla birebir aynı olması**;
   - rekorların aralık dışındaki setten de gelmesi (aralıktan bağımsız);
   - tartıların aralıkta ve kronolojik gelmesi;
   - başkasının verisinin hiçbir bölümde görünmemesi;
   - verisiz kullanıcının boş ama geçerli export alması;
   - `GeneratedAt`'in saatten gelmesi;
   - metnin aynı modelin formatlanmış hali olması;
   - ters aralığın 400 vermesi.
4. **Uçtan uca:**
   - iki uçta 401;
   - JSON 200 ve şekli;
   - metin 200, `text/plain; charset=utf-8` ve egzersiz adını içermesi;
   - iki uçta ters aralık 400;
   - metin ucunda bozuk tarih **400 (406 değil)**;
   - başkasının verisi export'ta yok.

---

## Bilinçli olarak kapsam dışı

- Dosya indirme (`Content-Disposition`), CSV, bölüm seçimi, egzersiz filtresi (YAGNI).
- Boyut/aralık sınırı (Soru 2/A).
- Metne AI talimatı (prompt) gömmek: soruyu kullanıcı yazar.
- Backend'in LLM'e doğrudan bağlanması ve `AiInsight`: Faz 12.
- Proje çapında `AsNoTracking` geçişi: Faz 10'dan devreden not. Bu fazın yeni sorguları
  izlemesizdir, ama export'un çağırdığı `GetAllTimeAsync` (Faz 8) hâlâ izlemeli.
- **Bilinen maliyet:** tüm geçmiş export'u kullanıcının setlerini iki kez okur (oturum setleri +
  rekor özeti). Kişisel ölçekte önemsiz. Rekor özeti SQL'e taşındığında (Faz 8 devreden notu) bu da
  kendiliğinden düzelir.
