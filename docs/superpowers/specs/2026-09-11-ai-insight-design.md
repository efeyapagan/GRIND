# AiInsight Altyapısı Tasarımı — Sağlayıcı Soyutlaması, Saklama ve Gerçek LLM Çağrısı

**Tarih:** 2026-09-11
**Kapsam:** PLAN.md Faz 12 (12.1 `AiInsight` okuma/yönetim ve `Kind`/`WorkoutSessionId`/`SetEntryId`
kapsamları, 12.2 `IAiInsightProvider` + varsayılan kapalı `NullAiInsightProvider`, 12.3 gerçek LLM
çağrısı transaction DIŞINDA)
**Durum:** ✅ Onaylandı (2026-09-11). Kullanıcı fazı "bana bişi sormana gerek yok, çalışmaya başla"
diyerek başlattı; bu fazda soru sorulmadı. Tüm kararlar tasarım sırasında alındı ve aşağıda
gerekçeleriyle kayıtlı.

## Bu Doküman Ne Değildir

CLAUDE.md `AiInsight` tablosunu, `Kind` (Insight/Suggestion) ayrımını, maliyet alanlarını ve "LLM çağrısı
transaction açıkken çalışmaz" kuralını zaten tanımlıyor. Faz 1 tabloyu, FK davranışlarını (User → RESTRICT,
oturum/set → SET NULL) ve `(UserId, CreatedAt)` indeksini kurdu. Faz 11 LLM'e gidecek bağlamın kaynağını
(export metni) hazırladı. Bu doküman onları tekrar etmez; yalnızca Faz 12'nin açık bıraktığı kararları
kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- **Bağlam = Faz 11 export'u** (Faz 11 devreden not 3). LLM için ikinci bir özet formatı yazılmaz.
- **LLM çağrısı transaction DIŞINDA.** İstek başına transaction açan bir middleware yok ve eklenmez
  (CLAUDE.md).
- **Sahiplik** doğrudan `AiInsight.UserId` üzerinde. Alan nullable değil, global insight yok. Her sorgu
  `currentUser.UserId` yüklemini taşır; başkasının kaydı nötr mesajlı 404 alır (mesaj id içermez).
- **Gizli bilgi** (API anahtarı) user-secrets / ortam değişkeninde. `appsettings.json` yalnızca boş
  placeholder taşır.
- **Zaman** enjekte edilen `TimeProvider`'dan; TR günü `TurkeyDay` / `LocalDayRange` ile.
- **Set arası koçluk (Suggestion motoru) kurulmuyor** (CLAUDE.md "Gelecek Fikirler").

---

## Kararlar

### Karar 1 — Üretim yalnızca `Insight`; okuma her tür ve kapsam için

`POST /api/insights` her zaman `Kind = Insight`, `WorkoutSessionId = null`, `SetEntryId = null` bir kayıt
üretir. Listeleme, tekil okuma ve silme ise **her türde** çalışır. Liste `kind`, `workoutSessionId` ve
`setEntryId` ile süzülebilir; ileride Suggestion motoru satır yazmaya başladığında API değişmeden
okunabilir olur (12.1'in "kapsamlar" maddesi).

Reddedilenler:
- **POST'ta `Kind = Suggestion` kabul etmek.** Motor yok. Set bağlamı olmadan üretilen bir "öneri"
  yanıltıcı olurdu.
- **Oturuma bağlı insight üretmek.** Export metni bilerek id taşımaz (Faz 11 Karar 6). Metin içinde tek
  bir oturumu hedeflemek, onu başlık satırından tanımayı gerektirir ve kırılgandır. "Bu antrenmanı
  yorumla" ihtiyacını tek günlük bir aralık (`from = to = bugün`) zaten karşılar.

### Karar 2 — Üret / listele / getir / sil; düzenleme ve elle ekleme yok

- **PUT/PATCH yok.** `AiInsight`, hangi modelin ne zaman, ne maliyetle ne söylediğinin kaydıdır.
  `Content`'i düzenlemek onu `Model`/`TokensUsed`/`EstimatedCostUsd`'den koparır ve kaydı yanlışlar.
- **Elle ekleme yok.** İstemcinin gönderdiği bir metinde model, token ve maliyet alanları uydurma olurdu.
  Dışarıdaki bir AI'ya yapıştırma yolu (Faz 11) geriye yazmaz. YAGNI.
- **Silme** kalıcıdır ve yalnızca kendi kaydında çalışır. Türetilmiş veridir; hiçbir tablo ona FK
  vermez, silinmesi başka kaydı etkilemez.

### Karar 3 — Aralık satırda saklanır: `RangeFrom`, `RangeTo` (migration)

`AiInsight`'a iki nullable `DateOnly` sütun eklenir; PostgreSQL'de `date` tipindedir. Insight satırlarında
ikisi de doludur (Karar 4'teki varsayılan çözümden sonra). Oturum kapsamlı olacak Suggestion satırlarında
null kalırlar.

Gerekçe: girdisi bilinmeyen bir yorum belirsizdir. "Son 30 gün" hangi 30 gündür? İstemci aynı aralık için
tekrar ücret ödeyip ödemeyeceğine karar verebilmek için bu bilgiye ihtiyaç duyar (CLAUDE.md: "tekrar
tekrar API'ye sorup ücret ödenmesin"). `CreatedAt` yetmez: bugün oluşturulan bir yorum geçen yılı
kapsayabilir.

3NF: aralık, yorumun kendi girdisidir; başka bir non-key alandan türetilemez.

Migration `dotnet ef migrations add AiInsightAralikAlanlari` ile üretilir. CLAUDE.md domain modeli
güncellenir.

Reddedilenler: hiç saklamamak (yukarıdaki belirsizlik) ve LLM'e giden export metninin tamamını saklamak.
İkincisi her satırda on binlerce karakterlik bir kopya demek. Aralık + `CreatedAt` o metni yaklaşık olarak
yeniden üretmeye yeter. YAGNI.

### Karar 4 — Varsayılan aralık son 30 gün, üst sınır 366 gün, verisiz aralık 400

Çözümü saf bir `AiInsightRange.Resolve(from, to, today)` yapar:

- `to` verilmezse **bugün** (TR günü, `TimeProvider`'dan).
- `from` verilmezse `to − 29 gün`. Böylece iki ucu dahil 30 gün olur. `to` takvimin en başına çok yakınsa
  `from` `DateOnly.MinValue`'da sınırlanır; bu durum asla 500'e dönmez.
- `from > to` → 400. Mesaj ve kural `LocalDayRange`'ten gelir (bkz. aşağı).
- Aralık iki uç dahil **366 günden uzunsa** → 400 `Aralık en fazla 366 gün olabilir.`

Tek sıralama kuralı: `LocalDayRange.Resolve` içindeki `from > to` kontrolü, public
`LocalDayRange.EnsureOrdered(from, to)` yardımcısına çekilir. `Resolve` ve `AiInsightRange` ikisi de onu
çağırır (DRY; mevcut `LocalDayRangeTests` regresyon ağıdır).

**Verisiz aralık:** export'ta aralıktaki **oturum ve tartı listelerinin ikisi de boşsa** sağlayıcı hiç
çağrılmaz, 400 `Bu aralıkta yorumlanacak kayıt yok.` döner. Bir LLM'e "veri yok" dedirtmek için para
ödenmez. Uzak gelecekteki bir `to` da bu kuralla kendiliğinden elenir. Rekorlar ve seriler aralıktan
bağımsız olduğu için (Faz 11 Karar 2) bu kontrole katılmaz. Setsiz ama notlu bir oturum veridir, sayılır
(Faz 11 Karar 8).

Neden 366: artık yıl dahil tam bir yıl. Faz 11'in tahminine göre yoğun bir yıl ~30-40 bin token eder;
varsayılan modelle girdi başına ~0,20 USD. Sınır, yanlışlıkla gönderilmiş on yıllık bir isteği durdurur.

Reddedilenler:
- **Export'un "tüm geçmiş" varsayılanı.** Maliyet geçmişle birlikte büyür. Export bir yedektir, insight
  ücretli bir çağrıdır; amaç farklı olduğu için varsayılan da farklıdır.
- **`from`/`to` zorunlu tutmak.** Swagger'dan tek tıkla denemeyi zorlaştırır, oysa makul bir varsayılan
  var.

### Karar 5 — Sağlayıcı soyutlaması

```csharp
public interface IAiInsightProvider
{
    Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default);
}

public sealed record AiCompletion(string Content, string Model, int? TokensUsed, decimal? EstimatedCostUsd);
```

- `AiCompletion`, entity'nin AI alanlarını birebir taşır. **Fiyatı sağlayıcı bilir, servis bilmez.**
  Fiyat modele özgü bir bilgidir; sağlayıcı değişince servis değişmez (SRP).
- **Ne sorulacağı** (talimat, Karar 11) servis katmanındadır. Sağlayıcı yalnızca **nasıl** sorulacağını
  bilir. İkinci bir sağlayıcı talimatı yeniden yazmaz.
- **`NullAiInsightProvider` varsayılandır** ve `ServiceUnavailableException("AI yorumlama şu an kapalı.")`
  fırlatır → 503. Buradaki Null nesnesi "açıkça kullanılamıyor" demektir, sahte başarı değildir. Sahte bir
  içerik, kullanıcının ödemediği satırlar yazar ve geçmişi kirletirdi.

Reddedilenler: arayüzde `IsEnabled` özelliği (tester-doer deseni; Null sağlayıcının fırlatması bunu zaten
söyler, ISP) ve genel bir `ILlmClient` soyutlaması (tek kullanım, KISS).

### Karar 6 — Akış: oku → sor → tek `SaveChangesAsync`; transaction yok

`AiInsightService.GenerateAsync` şu sırayla çalışır:

1. **Aralığı çöz** (saf, Karar 4). 400'ler hiçbir IO'dan önce döner.
2. **Export'u oku:** `IExportService.GetAsync(from, to)`. Salt okumadır, `SaveChangesAsync` çağırmaz.
3. **Verisiz aralık kontrolü** (Karar 4).
4. **Metne çevir:** `ExportTextFormatter.Format(export)`. Bu, `GetTextAsync`'in gövdesinin aynısıdır.
   Model boşluk kontrolü için gerektiği için iki adım açıkça yazılır; Faz 11 Karar 3 gereği çıktı birebir
   aynıdır.
5. **Sağlayıcıyı çağır.** Bu noktada açık transaction ve bekleyen izlenmiş değişiklik yoktur.
6. **Kaydet:** `repository.Add(...)` + tek `SaveChangesAsync`.

`BeginTransaction` hiçbir yerde yok. Tek `SaveChangesAsync` zaten atomiktir (CLAUDE.md). Sağlayıcı
hata verirse hiçbir şey yazılmaz; exception `GlobalExceptionHandler`'a gider.

### Karar 7 — Ücreti ödenmiş yanıt, istemci bağlantıyı kopardıysa da saklanır

5\. ve 6. adımlar isteğin iptal belirtecini değil `CancellationToken.None`'ı kullanır. İstek LLM'e
ulaştığı anda ücret doğmuştur. İstemci koparsa (telefon kilitlendi, sekme kapandı) iptal etmek parası
ödenmiş bir yanıtı çöpe atar ve kullanıcı aynı yorum için tekrar öder. İş, sağlayıcının zaman aşımıyla
sınırlıdır (Karar 8).

Önceki okumalar isteğin belirtecine uyar, çünkü o noktada henüz para ödenmemiştir.

Bu güvenlidir: istemci kopunca ASP.NET Core yalnızca belirteci tetikler; action'ı yarıda kesmez ve
scope'u (DbContext'i) action bitmeden atmaz.

Reddedilen: istek belirtecini LLM çağrısına geçirmek. Kopan her bağlantıda ödenmiş çıktı kaybolurdu.

### Karar 8 — Gerçek sağlayıcı: Anthropic, resmi C# SDK, varsayılan kapalı

- **Paket:** resmi `Anthropic` NuGet paketi, **12.47.0**'a sabit. Ham HTTP reddedildi. SDK
  408/409/429/5xx'te yeniden dener, tipli hatalar verir ve tel biçimini bizim yerimize izler. İstek
  şekli, geçici bir derleme denemesiyle 12.47.0'a karşı doğrulandı.
- **Uç:** `client.Beta.Messages.Create`. Beta ad alanı, sunucu tarafı fallback için gerekli.
- **İstek:**
  - `Model`: yapılandırmadan, varsayılan `claude-opus-5`.
  - `MaxTokens`: yapılandırmadan, varsayılan 16000. Akışsız istek için güvenli tavan.
  - `System`: talimat (Karar 11).
  - Tek bir kullanıcı mesajı: export metni.
  - `Betas = ["server-side-fallback-2026-07-01"]` ve `Fallbacks = new Default()`. Model isteği politika
    gerekçesiyle reddederse API aynı çağrı içinde Anthropic'in önerdiği fallback modeliyle yanıtlar.
  - `Thinking` ve `Effort` verilmez. Opus 5 varsayılan olarak uyarlanabilir düşünmeyle, `high`
    effort'la çalışır.
- **Yanıt:**
  - `BetaTextBlock` metinleri birleştirilir; düşünme blokları atlanır.
  - `Model` = `response.Model`: yanıtı fiilen üreten model, fallback olabilir. Denetim açısından doğru
    olan budur.
  - `TokensUsed` = `InputTokens + OutputTokens`.
  - Maliyet `AiCostCalculator`'dan gelir (Karar 10).
- **Olağandışı durumlar:**
  - `StopReason == "refusal"`, yani fallback zinciri de reddetti → 503 `Model bu isteğe yanıt vermedi.`
  - Boş metin → 503.
  - `max_tokens` ile kesilen yanıt **saklanır**: ücreti ödenmiştir ve kesik bir yorum hiç yoktan iyidir.
- **Hatalar:** `AnthropicApiException` (yanlış anahtar, 429, yeniden denemelerden sonra 5xx dahil),
  `AnthropicIOException` ve zaman aşımı (`OperationCanceledException`; belirteç `None` olduğu için tek
  kaynağı zaman aşımıdır) loglanır. Log'a durum yazılır, anahtar yazılmaz. İstemciye
  `ServiceUnavailableException("AI sağlayıcısına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.")`
  döner. Sağlayıcının hata gövdesi istemciye asla ulaşmaz.
- **Ömür:** `AnthropicClient` ve sağlayıcı singleton'dır. İstemci iş parçacığı güvenlidir ve kendi
  `HttpClient`'ını yeniden kullanır. `Timeout` yapılandırmadan gelir (varsayılan 180 sn);
  `MaxRetries` SDK varsayılanında kalır (2).
- **Test edilebilirlik:** `AnthropicClient.HttpClient` dışarıdan verilebilir. Sağlayıcı testleri sahte bir
  `HttpMessageHandler` ile ağa çıkmadan SDK'nın tüm yolunu (serileştirme dahil) sınar.

### Karar 9 — Yapılandırma ve aktivasyon

```json
"Ai": {
  "Provider": "None",
  "ApiKey": "",
  "Model": "claude-opus-5",
  "MaxTokens": 16000,
  "TimeoutSeconds": 180,
  "InputUsdPerMillionTokens": 5.0,
  "OutputUsdPerMillionTokens": 25.0
}
```

- **Aktivasyon kod değişikliği istemez:**
  `dotnet user-secrets set "Ai:Provider" "Anthropic"` + `dotnet user-secrets set "Ai:ApiKey" "<anahtar>"`.
  Hangi zaman etkinleştirileceği kullanıcının maliyet kararıdır (PLAN 12.3).
- **`Provider` bir enum'dur** (`AiProviderKind { None, Anthropic }`). Yapılandırma bağlayıcısı tanınmayan
  bir değeri (`"Antropic"`) açılışta `InvalidOperationException` ile reddeder. Yazım hatası, özelliği
  sessizce kapalı bırakmak yerine BOOT'u durdurur.
- **Açılışta fail-fast** (`Jwt:Key` kontrolüyle aynı desen): `Anthropic` seçiliyken boş `ApiKey`, boş
  `Model`, `MaxTokens <= 0` veya `TimeoutSeconds <= 0` → `InvalidOperationException`.
- **Fiyat verilmezse `EstimatedCostUsd` null** kalır. Bilinmeyen maliyet, yanlış bir sayıdan iyidir.
- **Varsayılan fiyatlar varsayılan modelinkidir** (Claude Opus 5: 1M girdi token'ı 5 USD, 1M çıktı
  token'ı 25 USD). Model değiştirilirse fiyatlar da değiştirilmelidir; `appsettings.json`'daki yorum bunu
  söyler.

Reddedilen: sağlayıcıyı `ApiKey`'in varlığına göre seçmek. Örtüktür; unutulmuş bir anahtar sessizce
harcamaya başlardı.

### Karar 10 — Maliyet saf bir fonksiyonda

`AiCostCalculator.Estimate(inputTokens, outputTokens, inputUsdPerMillion?, outputUsdPerMillion?)` →
`decimal?`:

- Fiyatlardan biri null ise null döner.
- Değilse `girdi × fiyat / 1.000.000 + çıktı × fiyat / 1.000.000` hesaplanır ve
  `MidpointRounding.AwayFromZero` ile **6 ondalığa** yuvarlanır.

6 ondalık, sütunun ölçeğidir (`numeric(10,6)`, Faz 1). `AwayFromZero` Faz 10'un yuvarlama kararıyla
tutarlıdır.

### Karar 11 — Talimat

`AiInsightPrompt.Instructions` servis katmanında sabit bir Türkçe metindir. İçinde zaman damgası yoktur.
Kapsadıkları:

- rol: kuvvet antrenmanı koçu;
- verinin ne olduğu (belgenin kendi açıklama bloğuna gönderme);
- yorum başlıkları: genel gidişat ve düzenlilik, ilerleme ve rekorlar, hacim dağılımı ve dengesizlikler,
  vücut ağırlığıyla ilişki, 2-4 somut öneri;
- kurallar: yalnızca verideki bilgilere dayanmak, sayı uydurmamak, veri yetmiyorsa bunu söylemek, tıbbi
  teşhis koymamak (ağrı notlarında uzmana yönlendirmek), kısa başlık ve madde kullanmak.

Güncel modeller aşırı ayrıntılı talimatla daha kötü yazar; metin bilerek kısa tutulur.

### Karar 12 — 503 ve yeni exception

`Common/Exceptions/ServiceUnavailableException` eklenir. `GlobalExceptionHandler.Map` onu 503
`Hizmet kullanılamıyor`'a eşler.

- `detail` = mesaj. Mesajları yalnızca bu kod yazar, sağlayıcının metni asla mesaja girmez.
  `Detail()` yalnızca tam 500'ün mesajını gizlediği için 503'ün mesajı Production'da da görünür.
- 503, 5xx olduğu için handler onu Error seviyesinde loglar. Kapalı özelliğe gelen istekler de loglanır;
  seyrektir ve fark edilmesi istenir.

Reddedilenler: 501 (özellik yazılmış, yalnızca kapalı) ve dış hata için 502 (istemci için "sonra tekrar
dene" tek bir koddur; sebep log'dan ayrılır).

### Karar 13 — Liste: süzme, sıralama, sayfalama, IDOR

- `GET /api/insights?kind&workoutSessionId&setEntryId&page&pageSize` → `PagedResponse<AiInsightResponse>`.
  Sıra yeniden eskiye: `CreatedAt` azalan, eşitlikte `Id` azalan.
- Süzgeçler `UserId == current` ile VE'lenir. Başka birinin oturum/set id'siyle süzmek **boş sayfa** verir,
  404 vermez. Sonuçlar zaten kullanıcının kendi satırlarıyla sınırlı olduğu için yabancı id'ler hakkında
  hiçbir şey sızmaz. Faz 9'daki egzersiz süzgecinden farkı şu: orada global egzersizler olduğu için
  doğrulanacak bir kaynak vardı, burada yok.
- Sayfalama için `PagedRangeQuery`'den `Page`, `PageSize` ve `Skip()` ortak bir `PagedQuery` tabanına
  çekilir (`PagedRangeQuery : PagedQuery`). `AiInsightQuery : PagedQuery` olur. Mevcut
  `PagedRangeQueryTests` regresyon ağıdır. Reddedilen: `PagedRangeQuery`'den türemek. Kimsenin istemediği,
  `CreatedAt` üzerinde bir `from`/`to` getirir ve `RangeFrom`/`RangeTo`'nun yanında kafa karıştırır.
- Geçersiz `kind` (`kind=Foo`, `kind=7`) model bağlamada 400 alır.

### Karar 14 — POST gövdesi ayrı bir DTO

`GenerateInsightRequest { DateOnly? From; DateOnly? To; }`. Sıfır baytlık gövde null'a bağlanır ve
varsayılana (son 30 gün) düşer (`SessionsController.Start`'taki `?? new()` deseni). Başarı 201 +
`Location: /api/insights/{id}` döner.

`StatsRangeQuery`'den ayrıdır: şekil aynı, anlam farklı. Orada null "sınır yok" demek, burada "son 30 gün".
Farklı sebeplerle değişecek iki şeyi birleştirmek DRY'nin kötüye kullanımı olurdu (solid-dry-kiss).

---

## Tasarım

```
src/Grind.Api/
├─ Common/Exceptions/ServiceUnavailableException.cs   (yeni)
├─ Common/ErrorHandling/GlobalExceptionHandler.cs     (+ 503)
├─ Common/Time/LocalDayRange.cs                       (+ EnsureOrdered; Resolve onu kullanır)
├─ Models/Entities/AiInsight.cs                       (+ RangeFrom, RangeTo)
├─ Data/Migrations/<zaman>_AiInsightAralikAlanlari.cs (üretilir)
├─ Data/DependencyInjection.cs                        (+ IAiInsightRepository)
├─ Models/Dtos/Common/PagedQuery.cs                   (yeni; PagedRangeQuery'den çıkarıldı)
├─ Models/Dtos/Common/PagedRangeQuery.cs              (: PagedQuery)
├─ Models/Dtos/Insight/GenerateInsightRequest.cs
├─ Models/Dtos/Insight/AiInsightQuery.cs
├─ Models/Dtos/Insight/AiInsightResponse.cs
├─ Repositories/IAiInsightRepository.cs / AiInsightRepository.cs
├─ Services/AiInsightRange.cs                         saf: varsayılan + sınır
├─ Services/IAiInsightService.cs / AiInsightService.cs
├─ Services/DependencyInjection.cs                    (+ IAiInsightService)
├─ Services/Ai/IAiInsightProvider.cs                  (+ AiCompletion)
├─ Services/Ai/NullAiInsightProvider.cs
├─ Services/Ai/AnthropicAiInsightProvider.cs
├─ Services/Ai/AiSettings.cs                          (+ AiProviderKind)
├─ Services/Ai/AiCostCalculator.cs                    saf
├─ Services/Ai/AiInsightPrompt.cs
├─ Services/Ai/DependencyInjection.cs                 AddAiInsightProvider(settings)
├─ Controllers/InsightsController.cs
├─ Program.cs                                         (+ AddAiInsightProvider)
└─ appsettings.json                                   (+ Ai bölümü)
```

**`AiInsightResponse`:** `Id`, `Kind`, `WorkoutSessionId`, `SetEntryId`, `RangeFrom`, `RangeTo`, `Content`,
`Model`, `TokensUsed`, `EstimatedCostUsd`, `CreatedAt`. `Kind` telde metin olarak taşınır (global
`JsonStringEnumConverter`).

**Endpoint'ler** (hepsi `[Authorize]`):

| Metot | Yol | Anlam | Durumlar |
|---|---|---|---|
| POST | `/api/insights` | aralık için yorum üret ve sakla | 201, 400, 503 |
| GET | `/api/insights` | kendi yorumların, süzgeçli, sayfalı | 200, 400 |
| GET | `/api/insights/{id}` | tek yorum | 200, 404 |
| DELETE | `/api/insights/{id}` | yorumu sil | 204, 404 |

### Servis

```csharp
public interface IAiInsightService
{
    Task<AiInsightResponse> GenerateAsync(
        GenerateInsightRequest request, CancellationToken cancellationToken = default);
    Task<PagedResponse<AiInsightResponse>> GetPageAsync(
        AiInsightQuery query, CancellationToken cancellationToken = default);
    Task<AiInsightResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

### Repository

```csharp
public interface IAiInsightRepository : IRepository<AiInsight>
{
    /// Başkasının kaydında null. İZLEMELİ: silme bu nesneyi kullanır.
    Task<AiInsight?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// Sayfa + toplam sayı aynı filtreden, CreatedAt/Id azalan, izlemesiz.
    Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(
        long userId, AiInsightKind? kind, long? workoutSessionId, long? setEntryId,
        int skip, int take, CancellationToken cancellationToken = default);
}
```

### Hata durumları

| Durum | Sonuç |
|---|---|
| `from > to`, bozuk tarih, 366 günden uzun aralık | 400 |
| Aralıkta oturum da tartı da yok | 400, sağlayıcı çağrılmaz |
| Geçersiz `kind` | 400 |
| Başkasının ya da olmayan kayıt | 404 (`Yorum bulunamadı.`) |
| Sağlayıcı kapalı (varsayılan) | 503 `AI yorumlama şu an kapalı.` |
| Sağlayıcı hatası, zaman aşımı, ret, boş yanıt | 503, satır yazılmaz |
| Token yok | 401 |

---

## Test yüzeyi

1. **Saf birim (DB'siz):**
   - `AiInsightRangeTests`: varsayılan 30 gün bugünde biter; yalnızca `to`; yalnızca `from`; tam 366 gün
     geçer; 367 gün 400; `from > to` 400; takvimin başına yakın `to` 500 vermez.
   - `AiCostCalculatorTests`: 1M/1M token 5/25 fiyatla 30 USD; küçük sayıların 6 ondalığa yuvarlanması;
     eksik fiyat null.
   - `GlobalExceptionHandlerTests` +2: 503 eşlemesi ve mesajın Production'da görünmesi.
   - `ColumnMappingTests` +1: `RangeFrom`/`RangeTo` `date` ve nullable.
   - `AiProviderRegistrationTests`: `None` → Null sağlayıcı; `Anthropic` + anahtar → Anthropic sağlayıcısı;
     anahtarsız `Anthropic` açılışta hata; geçersiz `MaxTokens` hata; tanınmayan sağlayıcı adı bağlamada
     hata.
   - Mevcut `LocalDayRangeTests` ve `PagedRangeQueryTests` çıkarılan yardımcıların regresyon ağıdır.
2. **Sağlayıcı (sahte `HttpMessageHandler`, ağ yok):**
   - İstek `/v1/messages`'a gider; `x-api-key` ve fallback beta başlığı taşır; gövdede model,
     `max_tokens`, `system`, veri ve `"fallbacks": "default"` vardır.
   - Metin blokları birleşir, düşünme bloğu atlanır, model yanıttan gelir, token toplamı ve maliyet
     hesaplanır.
   - Ret, boş metin, HTTP 500, HTTP 401 ve ağ hatası hepsi `ServiceUnavailableException` verir.
   - Null sağlayıcı `ServiceUnavailableException` fırlatır.
3. **Repository (DB):** sahiplik/IDOR; sıra ve toplam sayı; `kind`/oturum/set süzgeçleri; başkasının
   satırlarının dışlanması; `RangeFrom`/`RangeTo`'nun gidip gelmesi.
4. **Servis (DB):**
   - satırın sağlayıcı alanları, `Kind = Insight`, aralık ve saatten gelen `CreatedAt` ile yazılması;
   - varsayılan aralığın son 30 TR günü olması ve sağlayıcıya giden metnin o aralığın başlığını ve egzersiz
     adını içermesi;
   - verisiz aralığın 400 vermesi, sağlayıcının çağrılmaması, satır yazılmaması;
   - sağlayıcı hatasında satır yazılmaması;
   - sağlayıcı çağrıldığı anda bekleyen izlenmiş değişiklik olmaması (Karar 6);
   - 367 günlük aralığın 400 vermesi;
   - listeleme/getirme/silme ve IDOR;
   - `kind` süzgeci.
5. **Uçtan uca:**
   - dört uçta 401;
   - varsayılan (kapalı) yapılandırmada POST → 503 ProblemDetails ve detay metni;
   - sahte sağlayıcıyla POST → 201 + `Location` + gövde, sonra liste, getir, sil (204) ve 404;
   - sıfır baytlık gövdeyle 201;
   - 366 günden uzun aralık 400;
   - `kind=Foo` 400;
   - başkasının yorumu okunamaz/silinemez (404) ve listede yok.

---

## Bilinçli olarak kapsam dışı

- Suggestion motoru ve oturuma/sete bağlı üretim (Karar 1).
- POST'ta kullanıcının kendi sorusu. Soruyu da saklamak gerekirdi (yeni bir sütun); frontend kararına
  kadar YAGNI.
- Akışlı (streaming) yanıt ve prompt caching. Tek çağrıdır ve bağlam her seferinde değişir.
- Günlük/aylık harcama sınırı ve rate limiting. Kişisel ölçek; maliyet satır başına tutuluyor, "bu ay ne
  harcadım" `EstimatedCostUsd` üzerinde bir SUM sorgusudur, yeni tablo gerektirmez.
- Aynı aralık için otomatik tekrar üretim engeli. İstemci listeye bakarak karar verir.
- Başka sağlayıcılar (arayüz buna izin verir, yazılmadı).
- **Bilinen sınır:** maliyet tahmini yapılandırılan modelin fiyatını kullanır. Fallback farklı fiyatlı bir
  modelle yanıtlarsa tahmin sapar. Bugün Opus ailesi fallback'leri aynı fiyattadır.
- **Bilinen sınır:** kapalı özelliğe gelen her istek Error seviyesinde loglanır (Karar 12).
- Faz 11'den devreden notlar (izlemeli `GetAllTimeAsync`, `recordedAt` offset'i, haftalık ortalamalar)
  hâlâ açık; bu fazın kapsamı dışında.
