# Frontend Dilim 2 — Şablonlar ve Dinlenme Sayacı Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Şablon arayüzü (liste + düzenleyici), antrenmanı şablonla başlatma ve hareket kartlarıyla
ilerleme, setler arası dinlenme sayacı (süre harekete göre şablonda), hareket geçmişi hacim grafiği ve
Geçmiş'te antrenman türü etiketi.

**Architecture:** Önce tek backend değişikliği: `TemplateExercise.RestSeconds` (migration + DTO +
ilerleme yanıtı) ve frontend tiplerinin yeniden üretimi. Sonra frontend dikey dilimler hâlinde:
şablon ekranları → şablonlu Bugün ekranı → dinlenme sayacı → hareket geçmişi grafiği → Geçmiş
etiketi. Saf mantık (`lib/dinlenme.ts`, `lib/ilerleme.ts`) bileşenlerden ayrıdır; grafik bileşeni
(`ui/HacimGrafigi`) veri bilmez. Görsel doğrulama ve dokümantasyon kontrolcü görevleridir.

**Tech Stack:** Backend .NET 10 + EF Core (Npgsql) + xUnit; frontend React 19 + Vite 8 + TypeScript
+ TanStack Query 5 + React Router 7 + Tailwind v4 + lucide-react; test Vitest + RTL + MSW.

**Spec:** `docs/superpowers/specs/2026-09-13-sablonlar-ve-dinlenme-design.md` (bağlayıcı). Görsel
kurallar `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md`, mimari kurallar
`docs/superpowers/specs/2026-09-12-frontend-react-pwa-design.md` geçerliliğini korur.

---

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Stil yalnızca Tailwind yardımcı sınıfları + `@theme` tokenlarıyla.** Satır içi `style=` YOK, UI
  kütüphanesi YOK, grafik kütüphanesi YOK, `@apply` YOK, `focus:outline-none` YOK. Tailwind'in hazır
  renk paleti YOK. Keyfi değer yalnızca token karşılığı olmayan tek seferlik ölçü için ve yanında
  gerekçe yorumuyla. Tekrarlanan sınıf kümesi bir bileşene (ya da aynı dosyada bir sabite) çıkar.
- **Renkler yalnızca tokenlar:** `bg`, `inset`, `surface-1..4`, `fg`, `muted`, `accent`, `on-accent`,
  `accent-soft`, `danger`, `danger-bg`, `on-danger-bg`.
- **`accent` bu dilimde YENİ HİÇBİR YERDE kullanılmaz** (şablon hapı, seçili kart, sayaç, grafik
  dahil). Mevcut kullanımlar (birincil düğme, rekor rozeti, aktif sekme, marka) aynen kalır.
- **Görünen BÜYÜK HARF yalnızca CSS ile (`uppercase`).** Kaynak metin normal yazılır.
- **Erişilebilirlik:** her girdinin ilişkili `<label>`'ı var (görünmüyorsa `sr-only`); süs ikonları
  `aria-hidden`; yalnızca ikondan oluşan düğme `aria-label` taşır; hata `role="alert"`; dokunma hedefi
  ≥ 44×44 px; hiçbir işlev hover'a bağlı değil.
- **Sunucudaki hesap istemcide tekrarlanmaz:** ilerleme sayıları, hacim, set sayısı, PR sunucudan
  gelir. Sunum (gruplama, sıra numarası, "4 hareket" = liste uzunluğu, eskiden yeniye çevirme) serbest.
- **Zaman `Europe/Istanbul` ile biçimlendirilir** (`lib/format.ts`).
- **API tipleri elle yazılmaz:** `npm run api:types` ile üretilir ve commit edilir. Yanıtlar
  `queries.ts`'teki `dogrulanmis*` fonksiyonlarında daraltılır (`!` yok).
- **Backend:** Controller → Service → Repository katmanları; migration yalnızca komutla üretilir
  (elle düzenlenmez); yeni kural DB'de CHECK ile de korunur.
- **Testler davranış sınar:** rol/etiket/metin ile sorgulanır, sınıf adı ya da renk sınanmaz. Var olan
  test SİLİNMEZ ve zayıflatılmaz; sorgusu değişmesi gerekirse aynı davranışı sınayacak şekilde
  güncellenir.
- **Metinler Türkçe**, test adları Türkçe (frontend ASCII, backend `Alt_cizgili_ascii`), kod
  yorumları Türkçe (frontend dosyalarında mevcut desen: ASCII yorum).
- **Doğrulama komutları:** backend `dotnet build` + `dotnet test tests/Grind.Tests` (PostgreSQL
  gerekir: `docker compose up -d`); frontend (`web/` içinde) `npm run typecheck` (= `tsc -b`,
  `tsc --noEmit`'e ÇEVİRME), `npm run test`, `npm run lint`, `npm run build`.
- **Commit mesajları** Türkçe, ASCII karakterlerle, `feat`/`test`/`chore`/`docs` (frontend için
  `(web)` kapsamlı) önekli, şu satırla biter:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### Backend'i çalıştırma

```bash
docker compose up -d                  # PostgreSQL (host portu 5433)
dotnet run --project src/Grind.Api    # varsayilan "http" profili -> http://localhost:5098
```

`--launch-profile https` KULLANMA: `UseHttpsRedirection` 307 döner, Vite proxy'si takip etmez.

---

## Dosya Haritası

**Backend (Görev 1):**
- Modify: `src/Grind.Api/Models/Entities/TemplateExercise.cs`,
  `src/Grind.Api/Data/Configurations/TemplateExerciseConfiguration.cs`,
  `src/Grind.Api/Models/Dtos/Template/TemplateExerciseRequest.cs`,
  `src/Grind.Api/Models/Dtos/Template/TemplateExerciseResponse.cs`,
  `src/Grind.Api/Models/Dtos/Session/SessionProgressResponse.cs`,
  `src/Grind.Api/Services/WorkoutTemplateService.cs`, `src/Grind.Api/Services/WorkoutSessionService.cs`
- Create (komutla): `src/Grind.Api/Data/Migrations/<zaman>_SablonDinlenmeSuresi.cs` (+ Designer,
  snapshot güncellenir)
- Test: `tests/Grind.Tests/Data/CheckConstraintTests.cs`, `Data/ColumnMappingTests.cs`,
  `Models/Dtos/TemplateDtoValidationTests.cs`, `Services/WorkoutTemplateServiceTests.cs`,
  `Integration/TemplateEndpointsTests.cs`, `Integration/SessionEndpointsTests.cs`
- Modify (üretilir): `web/src/api/schema.d.ts`

**Frontend yeni:**
- `web/src/lib/dinlenme.ts` (Görev 2 sabit, Görev 4 fonksiyonlar) + `dinlenme.test.ts` (Görev 4)
- `web/src/lib/egzersizler.ts` (Görev 2), `web/src/lib/ilerleme.ts` (Görev 3),
  `web/src/lib/rekor.ts` (Görev 3), `web/src/lib/uyari.ts` (Görev 4)
- `web/src/ui/SecimKutusu.tsx`, `ui/IkonDugmesi.tsx`, `ui/IkincilDugme.tsx`, `ui/SablonKarti.tsx`
  (Görev 2); `ui/TurEtiketi.tsx` (Görev 3); `ui/HacimGrafigi.tsx` + test (Görev 5)
- `web/src/pages/SablonlarPage.tsx`, `pages/SablonDuzenlePage.tsx` + testleri (Görev 2)
- `web/src/components/SablonlaBasla.tsx`, `components/HareketKartlari.tsx`,
  `components/SetSatiri.tsx` (Görev 3); `components/DinlenmeSayaci.tsx` + test (Görev 4);
  `components/HareketGecmisi.tsx` + test (Görev 5)

**Frontend değişen:** `web/src/api/queries.ts` (Görev 2, 3, 5, 6); `web/src/routes.tsx`,
`web/src/ui/HesapMenusu.tsx`, `web/src/App.test.tsx` (Görev 2); `web/src/components/AddSetForm.tsx`
(Görev 2, 3, 4); `web/src/components/SetList.tsx`, `web/src/pages/TodayPage.tsx` (Görev 3, 5);
`web/src/pages/TodayPage.test.tsx` (Görev 3, 4, 5); `web/src/lib/format.ts` + test (Görev 5);
`web/src/pages/HistoryPage.tsx` + test (Görev 6).

---

### Task 1: Backend — `TemplateExercise.RestSeconds`

**Files:** yukarıdaki "Backend (Görev 1)" listesi.

**Interfaces:**
- Consumes: yok.
- Produces:
  - `TemplateExercise.DefaultRestSeconds` (`public const int` = 90) ve `int RestSeconds`.
  - `TemplateExerciseRequest.RestSeconds` (`int?`, `[Range(0, 900)]`; null → 90).
  - `TemplateExerciseResponse(..., int PlannedSets, int RestSeconds)` — son parametre.
  - `SessionProgressResponse(long ExerciseId, string ExerciseName, int PlannedSets, int CompletedSets, int RestSeconds)`.
  - `schema.d.ts`: `TemplateExerciseRequest.restSeconds?: number | null`,
    `TemplateExerciseResponse.restSeconds?: number`, `SessionProgressResponse.restSeconds?: number`.

**EF tuzağı (neden `HasSentinel(-1)`):** `HasDefaultValue(90)` verilen bir `int` property'de EF,
CLR varsayılanı `0`'ı "değer verilmedi" sayar ve INSERT'e hiç koymaz — veritabanı 90 yazar. Oysa bu
alanda `0` = "sayaç yok". Sentinel `-1` (CHECK nedeniyle hiçbir zaman geçerli olmayan değer) yapılınca
`0` açıkça yazılır. Entity'deki `= DefaultRestSeconds` başlatıcısı yeni nesnelerin 90 ile doğmasını
sağlar. `Sifir_dinlenme_veritabaninda_sifir_kalir` testi bunu sabitler.

- [ ] **Step 1: Model testlerini yaz (kırmızı)**

`tests/Grind.Tests/Data/CheckConstraintTests.cs` — `Hedef_set_sayisi_pozitif_olmalidir` testinin
ALTINA:

```csharp
    /// <summary>0 = bu harekette dinlenme sayacı yok; üst sınır 15 dakika.</summary>
    [Fact]
    public void Dinlenme_suresi_sifir_ile_dokuz_yuz_saniye_arasindadir()
    {
        var sql = SqlOf<TemplateExercise>("CK_TemplateExercise_RestSeconds_Range");
        Assert.Contains("\"RestSeconds\" >= 0", sql);
        Assert.Contains("\"RestSeconds\" <= 900", sql);
    }
```

`tests/Grind.Tests/Data/ColumnMappingTests.cs` — sınıfın SONUNA:

```csharp
    /// <summary>
    /// Kolon varsayılanı 90 (migration mevcut satırlara bunu yazar). Sentinel -1: EF, 0'ı "değer
    /// verilmedi" sayıp kolon varsayılanına bırakmasın — 0 "sayaç yok" demek (bkz. yapılandırma).
    /// </summary>
    [Fact]
    public void Dinlenme_suresi_varsayilani_90_ve_sifir_acikca_yazilir()
    {
        var property = TestModel.Entity<TemplateExercise>().FindProperty(nameof(TemplateExercise.RestSeconds))!;

        Assert.NotNull(property);
        Assert.Equal(90, TemplateExercise.DefaultRestSeconds);
        Assert.Equal(TemplateExercise.DefaultRestSeconds, (int)property.GetDefaultValue()!);
        Assert.Equal(-1, (int)property.Sentinel!);
        Assert.False(property.IsNullable);
    }
```

`tests/Grind.Tests/Models/Dtos/TemplateDtoValidationTests.cs` — `Alt_DTO_gecersiz_ExerciseId_reddeder`
testinin ALTINA:

```csharp
    /// <summary>null "gönderilmedi" demek ve geçerli (servis 90 yazar); 0 "sayaç yok" ve geçerli.</summary>
    [Theory]
    [InlineData(null, true)]
    [InlineData(0, true)]
    [InlineData(900, true)]
    [InlineData(-1, false)]
    [InlineData(901, false)]
    public void Alt_DTO_tek_basina_RestSeconds_araligini_uygular(int? restSeconds, bool gecerliOlmali)
    {
        var errors = Validate(new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4, RestSeconds = restSeconds });

        Assert.Equal(gecerliOlmali, errors.Count == 0);
    }
```

- [ ] **Step 2: Kırmızı olduğunu doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: derleme hatası — `TemplateExercise.DefaultRestSeconds`, `RestSeconds` tanımsız.

- [ ] **Step 3: Entity, yapılandırma ve DTO'lar**

`src/Grind.Api/Models/Entities/TemplateExercise.cs` — tamamen:

```csharp
namespace Grind.Api.Models.Entities;

public class TemplateExercise
{
    /// <summary>
    /// Dinlenme süresi gönderilmezse kullanılan değer (saniye). Servis ve kolon varsayılanı
    /// (dolayısıyla migration) aynı sabiti kullanır; frontend'deki VARSAYILAN_DINLENME_SN bunun aynasıdır.
    /// </summary>
    public const int DefaultRestSeconds = 90;

    public long Id { get; set; }
    public long WorkoutTemplateId { get; set; }
    public long ExerciseId { get; set; }
    public int OrderIndex { get; set; }

    /// <summary>Hedeflenen set sayısı. Ağırlık/tekrar burada YOKTUR — onlar SetEntry'de yaşar.</summary>
    public int PlannedSets { get; set; }

    /// <summary>Setler arası dinlenme (saniye), 0-900. <c>0</c> = bu harekette dinlenme sayacı yok.</summary>
    public int RestSeconds { get; set; } = DefaultRestSeconds;

    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
```

`src/Grind.Api/Data/Configurations/TemplateExerciseConfiguration.cs` — `HasIndex` satırından
dosyanın sonuna kadarki kısmı şununla değiştir:

```csharp
        builder.HasIndex(te => new { te.WorkoutTemplateId, te.OrderIndex });

        builder.Property(te => te.RestSeconds)
            .HasDefaultValue(TemplateExercise.DefaultRestSeconds)
            // Sentinel -1: EF varsayılan olarak CLR'nin 0'ını "değer verilmedi" sayar ve INSERT'te
            // kolon varsayılanına (90) bırakır. Oysa 0 "sayaç yok" demek. -1 CHECK yüzünden hiçbir
            // zaman geçerli olmadığı için güvenli bir "atanmadı" işaretidir.
            .HasSentinel(-1);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_TemplateExercise_PlannedSets_Positive", "\"PlannedSets\" > 0");
            t.HasCheckConstraint(
                "CK_TemplateExercise_RestSeconds_Range", "\"RestSeconds\" >= 0 AND \"RestSeconds\" <= 900");
        });
    }
}
```

`src/Grind.Api/Models/Dtos/Template/TemplateExerciseRequest.cs` — `PlannedSets` property'sinin
ALTINA:

```csharp

    /// <summary>
    /// Setler arası dinlenme (saniye), <c>0</c> = sayaç yok. Nullable BİLEREK: gönderilmezse
    /// <see cref="Grind.Api.Models.Entities.TemplateExercise.DefaultRestSeconds"/> yazılır. <c>int</c>
    /// olsaydı alanı göndermeyen bir istemci C#'ın varsayılanı 0'ı, yani "sayaç yok"u sessizce
    /// yazardı. Veritabanında da CHECK ile korunuyor.
    /// </summary>
    [Range(0, 900, ErrorMessage = "Dinlenme süresi 0-900 saniye arasında olmalı.")]
    public int? RestSeconds { get; set; }
```

`src/Grind.Api/Models/Dtos/Template/TemplateExerciseResponse.cs` — kayıt imzasının son satırı:

```csharp
    int OrderIndex,
    int PlannedSets,
    int RestSeconds);
```

`src/Grind.Api/Models/Dtos/Session/SessionProgressResponse.cs` — tamamen:

```csharp
namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Şablondaki bir egzersiz için "hedef vs gerçekleşen". <paramref name="CompletedSets"/>
/// o oturumda o egzersize girilmiş GERÇEK set sayısıdır — önceden boş satır oluşturulmaz.
/// <paramref name="RestSeconds"/> şablondan canlı okunur: Bugün ekranı dinlenme süresini şablonu
/// ayrıca istemeden, oturumla aynı yanıtta alır (0 = sayaç yok).
/// </summary>
public record SessionProgressResponse(
    long ExerciseId,
    string ExerciseName,
    int PlannedSets,
    int CompletedSets,
    int RestSeconds);
```

- [ ] **Step 4: Servisler**

`src/Grind.Api/Services/WorkoutTemplateService.cs` — `ReplaceExercisesAsync` içindeki
`new TemplateExercise { ... }` bloğu:

```csharp
            template.TemplateExercises.Add(new TemplateExercise
            {
                ExerciseId = requested[index].ExerciseId,
                OrderIndex = index,
                PlannedSets = requested[index].PlannedSets,
                RestSeconds = requested[index].RestSeconds ?? TemplateExercise.DefaultRestSeconds
            });
```

Aynı dosyada `ToResponse` içindeki `new TemplateExerciseResponse(...)` çağrısının son iki argümanı:

```csharp
                te.OrderIndex,
                te.PlannedSets,
                te.RestSeconds))
```

`src/Grind.Api/Services/WorkoutSessionService.cs` — `ProgressAsync` içindeki çağrı:

```csharp
            .Select(te => new SessionProgressResponse(
                te.ExerciseId,
                te.Exercise.Name,
                te.PlannedSets,
                completed.GetValueOrDefault(te.ExerciseId),
                te.RestSeconds))
```

- [ ] **Step 5: Model testleri yeşil**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~CheckConstraintTests|FullyQualifiedName~ColumnMappingTests|FullyQualifiedName~TemplateDtoValidationTests"`
Expected: PASS (bu testler veritabanına bağlanmaz).

- [ ] **Step 6: Migration üret ve uygula**

```bash
dotnet dotnet-ef migrations add SablonDinlenmeSuresi --project src/Grind.Api
docker compose up -d
dotnet dotnet-ef database update --project src/Grind.Api
```

Üretilen `*_SablonDinlenmeSuresi.cs`'in `Up`'ını AÇ ve kontrol et (DÜZENLEME): `AddColumn<int>`
`name: "RestSeconds"`, `table: "TemplateExercises"`, `nullable: false`, `defaultValue: 90` ve
`AddCheckConstraint` `CK_TemplateExercise_RestSeconds_Range`. Farklıysa (ör. `defaultValue: 0`) DUR ve
raporla — model yapılandırması yanlıştır, migration elle düzeltilmez.

- [ ] **Step 7: Veritabanı ve uçtan uca testleri yaz (kırmızı değil, yeni davranışı sabitler)**

`tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs` — `Bos_sablon_olusturulabilir` testinin
ALTINA:

```csharp
    // ---- Dinlenme süresi ----

    [Fact]
    public async Task Dinlenme_gonderilmezse_varsayilan_yazilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));

            Assert.Equal(TemplateExercise.DefaultRestSeconds, olusan.Exercises[0].RestSeconds);
        }
    }

    /// <summary>
    /// 0 "sayaç yok" demek; EF'in sentinel davranışı onu kolon varsayılanına (90) çevirmemeli.
    /// ChangeTracker.Clear: izlenen nesne bellekteki değeri gösterirdi, değer veritabanından okunmalı.
    /// </summary>
    [Fact]
    public async Task Sifir_dinlenme_veritabaninda_sifir_kalir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(),
                new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4, RestSeconds = 0 },
                new TemplateExerciseRequest { ExerciseId = 11, PlannedSets = 3, RestSeconds = 180 }));
            context.ChangeTracker.Clear();

            var okunan = await service.GetByIdAsync(olusan.Id);

            Assert.Equal([0, 180], okunan.Exercises.Select(e => e.RestSeconds));
        }
    }
```

`tests/Grind.Tests/Integration/TemplateEndpointsTests.cs` — `Gecersiz_plannedSets_400_verir`
testinin ALTINA (ham JSON: "alan hiç gönderilmedi" durumunu tipli DTO ifade edemez):

```csharp
    [Fact]
    public async Task RestSeconds_gidip_gelir_gonderilmezse_90_olur()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":4,"restSeconds":180},{"exerciseId":11,"plannedSets":3}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var olusan = await response.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        Assert.Equal([180, 90], olusan!.Exercises.Select(e => e.RestSeconds));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(901)]
    public async Task Aralik_disi_restSeconds_400_verir(int restSeconds)
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":4,"restSeconds":{{restSeconds}}}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("restSeconds", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }
```

`tests/Grind.Tests/Integration/SessionEndpointsTests.cs` — `Acik_oturum_ucu_baslatilan_oturumu_dondurur`
testinin ALTINA:

```csharp
    /// <summary>Bugün ekranı süreyi şablonu ayrıca istemeden, açık oturumun ilerlemesinden okur.</summary>
    [Fact]
    public async Task Acik_oturum_ilerlemesi_dinlenme_suresini_tasir()
    {
        var client = await AuthenticatedClientAsync();
        var olusturma = await client.PostAsJsonAsync("/api/templates", new CreateTemplateRequest
        {
            Name = $"Sablon {Guid.NewGuid():N}",
            Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4, RestSeconds = 150 }]
        }, Json);
        olusturma.EnsureSuccessStatusCode();
        var sablon = (await olusturma.Content.ReadFromJsonAsync<TemplateResponse>(Json))!;

        var baslatma = await client.PostAsJsonAsync("/api/sessions",
            new StartSessionRequest { TemplateId = sablon.Id }, Json);
        baslatma.EnsureSuccessStatusCode();
        var acik = await client.GetFromJsonAsync<SessionResponse>("/api/sessions/open", Json);

        Assert.Equal(150, acik!.Progress[0].RestSeconds);
    }
```

- [ ] **Step 8: Tüm backend yeşil**

Run: `dotnet build` ve `dotnet test tests/Grind.Tests`
Expected: 0 uyarı, 0 hata; tüm testler PASS. Sayı komutla: `[Fact]` + her `[InlineData]` —
638 → **651** (+13: CHECK 1, kolon 1, DTO 5, servis 2, şablon ucu 3, oturum ucu 1).

- [ ] **Step 9: Frontend tiplerini yeniden üret**

API'yi arka planda başlat (`dotnet run --project src/Grind.Api`), `http://localhost:5098/swagger/v1/swagger.json`
200 dönünce:

```bash
cd web && npm run api:types
git diff --stat src/api/schema.d.ts
```

Expected: fark yalnızca üç şemada `restSeconds` (request'te `number | null`). API sürecini durdur.
Run: `cd web && npm run typecheck && npm run test` → temiz; 13 dosya, 71 test PASS.

- [ ] **Step 10: Commit**

```bash
git add src/Grind.Api tests/Grind.Tests web/src/api/schema.d.ts
git commit -m "feat: sablon hareketlerine dinlenme suresi (RestSeconds)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Şablon ekranları — liste, düzenleyici, hesap menüsü

**Files:**
- Modify: `web/src/api/queries.ts`, `web/src/routes.tsx`, `web/src/ui/HesapMenusu.tsx`,
  `web/src/components/AddSetForm.tsx`, `web/src/App.test.tsx`
- Create: `web/src/lib/dinlenme.ts`, `web/src/lib/egzersizler.ts`, `web/src/ui/SecimKutusu.tsx`,
  `web/src/ui/IkonDugmesi.tsx`, `web/src/ui/IkincilDugme.tsx`, `web/src/ui/SablonKarti.tsx`,
  `web/src/pages/SablonlarPage.tsx`, `web/src/pages/SablonDuzenlePage.tsx`
- Test: `web/src/pages/SablonlarPage.test.tsx`, `web/src/pages/SablonDuzenlePage.test.tsx`,
  `web/src/App.test.tsx`

**Interfaces:**
- Consumes: Görev 1'in `schema.d.ts`'i (`restSeconds`).
- Produces:
  - `queries.ts`: `queryKeys.templates` (`['templates']`), `queryKeys.template(id: number)`
    (`['template', id]` — BİLEREK `templates`'in öneki DEĞİL: liste tazelenirken açık düzenleyicinin
    detayı yeniden çekilmesin, silmeden sonra 404'e düşmesin);
    `interface SablonHareketi { exerciseId: number; exerciseName: string; isArchived: boolean; plannedSets: number; restSeconds: number }`;
    `interface Sablon { id: number; name: string; exercises: SablonHareketi[] }`;
    `interface SablonGirdisi { name: string; exercises: { exerciseId: number; plannedSets: number; restSeconds: number }[] }`;
    `useTemplates()`, `useTemplate(id: number | null)`, `useCreateTemplate()` (`mutate(girdi)`),
    `useUpdateTemplate()` (`mutate({ id, girdi })`), `useDeleteTemplate()` (`mutate(id)`).
  - `lib/dinlenme.ts`: `VARSAYILAN_DINLENME_SN = 90`.
  - `lib/egzersizler.ts`: `adaGoreSirala(egzersizler: readonly Egzersiz[]): Egzersiz[]`.
  - `ui/SecimKutusu` (select props), `ui/IkonDugmesi` (`etiket` + button props),
    `ui/IkincilDugme` (button props), `ui/SablonKarti` (`ad`, `hareketSayisi` + `to` YA DA
    `onClick`/`disabled`).
  - Rotalar: `/templates`, `/templates/new`, `/templates/:id`.

- [ ] **Step 1: `queries.ts` — şablon tipleri ve hook'lar**

Dosyanın başındaki tip takma adlarına ekle:

```ts
type TemplateResponse = components['schemas']['TemplateResponse'];
type TemplateExerciseResponse = components['schemas']['TemplateExerciseResponse'];
type CreateTemplateRequest = components['schemas']['CreateTemplateRequest'];
```

`queryKeys` nesnesine (`history` satırının altına):

```ts
  templates: ['templates'] as const,
  // BILEREK `templates`in oneki DEGIL: liste invalidate edilince acik duzenleyicinin detayi yeniden
  // cekilmesin (silmeden hemen sonra 404'e dusmesin).
  template: (id: number) => ['template', id] as const,
```

Dosyanın SONUNA:

```ts
export interface SablonHareketi {
  exerciseId: number;
  exerciseName: string;
  isArchived: boolean;
  plannedSets: number;
  restSeconds: number;
}

export interface Sablon {
  id: number;
  name: string;
  exercises: SablonHareketi[];
}

function dogrulanmisSablonHareketi(yanit: TemplateExerciseResponse): SablonHareketi {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.isArchived === undefined ||
    yanit.plannedSets === undefined ||
    yanit.restSeconds === undefined
  ) {
    throw new Error('Sunucudan eksik sablon hareketi yaniti alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    isArchived: yanit.isArchived,
    plannedSets: yanit.plannedSets,
    restSeconds: yanit.restSeconds,
  };
}

/** Hareketler sunucunun `orderIndex` sirasiyla gelir; istemci yeniden SIRALAMAZ. */
function dogrulanmisSablon(yanit: TemplateResponse): Sablon {
  if (yanit.id === undefined || !yanit.name) {
    throw new Error('Sunucudan eksik sablon yaniti alindi.');
  }
  return {
    id: yanit.id,
    name: yanit.name,
    exercises: (yanit.exercises ?? []).map(dogrulanmisSablonHareketi),
  };
}

export interface SablonGirdisi {
  name: string;
  // Sira dizideki konumdur; sunucu `OrderIndex`i buradan turetir (istemci gondermez).
  exercises: { exerciseId: number; plannedSets: number; restSeconds: number }[];
}

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async (): Promise<Sablon[]> => {
      const yanit = await request<TemplateResponse[]>('/templates');
      return yanit.map(dogrulanmisSablon);
    },
  });
}

export function useTemplate(id: number | null) {
  return useQuery({
    queryKey: queryKeys.template(id ?? 0),
    queryFn: async (): Promise<Sablon> =>
      dogrulanmisSablon(await request<TemplateResponse>(`/templates/${id}`)),
    enabled: id !== null,
  });
}

function sablonGovdesi(girdi: SablonGirdisi): string {
  const govde: CreateTemplateRequest = { name: girdi.name, exercises: girdi.exercises };
  return JSON.stringify(govde);
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (girdi: SablonGirdisi): Promise<Sablon> =>
      dogrulanmisSablon(
        await request<TemplateResponse>('/templates', { method: 'POST', body: sablonGovdesi(girdi) }),
      ),
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

/**
 * PUT ad ve hareket listesini BIRLIKTE degistirir (PATCH yalnizca ad). Acik oturum da tazelenir:
 * ilerleme ve dinlenme sureleri sunucuda sablondan canli okunur (spec Karar 8).
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, girdi }: { id: number; girdi: SablonGirdisi }): Promise<Sablon> =>
      dogrulanmisSablon(
        await request<TemplateResponse>(`/templates/${id}`, { method: 'PUT', body: sablonGovdesi(girdi) }),
      ),
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await request<void>(`/templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}
```

- [ ] **Step 2: Küçük ortak parçalar**

`web/src/lib/dinlenme.ts`:

```ts
/**
 * Backend'deki `TemplateExercise.DefaultRestSeconds` ile AYNI deger (spec Karar 1 ve 6): yeni sablon
 * satirinin dinlenmesi ve sablonda olmayan hareketin sayac suresi. Degisirse ikisi birlikte degisir.
 */
export const VARSAYILAN_DINLENME_SN = 90;
```

`web/src/lib/egzersizler.ts`:

```ts
import type { Egzersiz } from '../api/queries';

/** Egzersiz secim listeleri Turkce alfabetik siradadir (Bugun paneli, sablon duzenleyici). */
export function adaGoreSirala(egzersizler: readonly Egzersiz[]): Egzersiz[] {
  return [...egzersizler].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
```

`web/src/ui/SecimKutusu.tsx`:

```tsx
import type { SelectHTMLAttributes } from 'react';
import { ChevronsUpDown } from 'lucide-react';

/** Yerel `<select>` + sagda ok ikonu. Etiket cagiran taraftadir (`htmlFor` ile `id`). */
export default function SecimKutusu(secim: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...secim}
        className="h-12 w-full appearance-none rounded-lg bg-inset pr-10 pl-4 text-body-lg text-fg"
      />
      <ChevronsUpDown
        aria-hidden
        size={20}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
```

`web/src/ui/IkonDugmesi.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Yalnizca ikondan olusan dugmenin erisilebilir adi (zorunlu).
  etiket: string;
}

/** 44 px kare ikon dugmesi; icerige `aria-hidden` bir lucide ikonu verilir. */
export default function IkonDugmesi({ etiket, type = 'button', ...dugme }: Props) {
  return (
    <button
      type={type}
      aria-label={etiket}
      {...dugme}
      className="flex size-11 items-center justify-center rounded-lg bg-surface-3 text-muted disabled:opacity-40"
    />
  );
}
```

`web/src/ui/IkincilDugme.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

/** Notr ikincil eylem (ör. "Hareket ekle", "Vazgec"); accent YOK. */
export default function IkincilDugme({ type = 'button', ...dugme }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...dugme}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-label text-fg disabled:opacity-60"
    />
  );
}
```

`web/src/ui/SablonKarti.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const KART =
  'flex min-h-16 w-full items-center justify-between gap-4 rounded-xl bg-surface-2 p-4 text-left disabled:opacity-60';

type Props = { ad: string; hareketSayisi: number } & (
  | { to: string }
  | { onClick: () => void; disabled?: boolean }
);

/**
 * Sablon ozeti karti: Sablonlar listesinde duzenleyiciye giden baglanti, Bugun bos durumunda
 * antrenmani baslatan dugme. "N hareket" yanittaki listenin uzunlugudur (sunum).
 */
export default function SablonKarti(props: Props) {
  const icerik = (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body-lg font-semibold">{props.ad}</span>{' '}
        <span className="text-label text-muted">{props.hareketSayisi} hareket</span>
      </span>
      <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
    </>
  );

  if ('to' in props) {
    return (
      <Link to={props.to} className={KART}>
        {icerik}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={KART}>
      {icerik}
    </button>
  );
}
```

- [ ] **Step 3: `AddSetForm` ortak parçalara geçer (davranış değişmez)**

`web/src/components/AddSetForm.tsx`:
- import satırlarında `ChevronsUpDown`'ı kaldır (`import { Plus } from 'lucide-react';`), ekle:
  `import { adaGoreSirala } from '../lib/egzersizler';` ve `import SecimKutusu from '../ui/SecimKutusu';`
- `siraliEgzersizler` tanımı:

```tsx
  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);
```

- `<div className="relative"> … </div>` (label + select + ikon) bloğu:

```tsx
        <div>
          <label htmlFor="set-egzersiz" className="sr-only">
            Egzersiz
          </label>
          <SecimKutusu id="set-egzersiz" value={egzersizId} onChange={(e) => setManuelSecim(e.target.value)}>
            {siraliEgzersizler.map((eg) => (
              <option key={eg.id} value={eg.id}>
                {eg.name}
              </option>
            ))}
          </SecimKutusu>
        </div>
```

Run: `cd web && npm run test -- TodayPage` → 19 test PASS.

- [ ] **Step 4: Şablon listesi testi (kırmızı)**

`web/src/pages/SablonlarPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import SablonlarPage from './SablonlarPage';
import type { components } from '../api/schema';

type TemplateResponse = components['schemas']['TemplateResponse'];

function listeyiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <MemoryRouter initialEntries={['/templates']}>
        <Routes>
          <Route path="/templates" element={<SablonlarPage />} />
          <Route path="/templates/new" element={<p>Yeni sablon formu</p>} />
          <Route path="/templates/:id" element={<p>Duzenleyici</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PUSH_DAY: TemplateResponse = {
  id: 7,
  name: 'Push Day',
  createdAt: '2026-09-01T08:00:00Z',
  exercises: [
    { id: 1, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 0, plannedSets: 4, restSeconds: 120 },
    { id: 2, exerciseId: 5, exerciseName: 'Overhead Press', category: 'Push', isArchived: false, orderIndex: 1, plannedSets: 3, restSeconds: 90 },
  ],
};

test('sablonlar hareket sayisiyla kart olarak listelenir ve karta dokunmak duzenleyiciyi acar', async () => {
  server.use(http.get('/api/templates', () => HttpResponse.json([PUSH_DAY])));
  const kullanici = userEvent.setup();
  listeyiOlustur();

  const kart = await screen.findByRole('link', { name: /Push Day/ });
  expect(kart).toHaveTextContent('2 hareket');

  await kullanici.click(kart);
  expect(await screen.findByText('Duzenleyici')).toBeInTheDocument();
});

test('sablon yokken bos durum gorunur ve Yeni sablon formu acar', async () => {
  server.use(http.get('/api/templates', () => HttpResponse.json([])));
  const kullanici = userEvent.setup();
  listeyiOlustur();

  expect(await screen.findByText('Henüz şablon yok')).toBeInTheDocument();
  await kullanici.click(screen.getByRole('button', { name: 'Yeni şablon' }));
  expect(await screen.findByText('Yeni sablon formu')).toBeInTheDocument();
});
```

Run: `cd web && npm run test -- SablonlarPage` → FAIL (modül yok).

- [ ] **Step 5: `SablonlarPage`**

`web/src/pages/SablonlarPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useTemplates } from '../api/queries';
import BosDurum from '../ui/BosDurum';
import BirincilDugme from '../ui/BirincilDugme';
import SablonKarti from '../ui/SablonKarti';

/**
 * Sablon listesi (spec Karar 3). Sekme degil: hesap menusunden ve Bugun'un bos durumundan acilir
 * (Karar 2). Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 */
export default function SablonlarPage() {
  const navigate = useNavigate();
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <h1 className="text-title">Şablonlar</h1>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Şablonlar alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik="Henüz şablon yok"
          aciklama="Bir gün tipinin hareketlerini bir kez kur, antrenmanı tek dokunuşla başlat."
        />
      )}

      {sablonlar && sablonlar.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sablonlar.map((sablon) => (
            <li key={sablon.id}>
              <SablonKarti ad={sablon.name} hareketSayisi={sablon.exercises.length} to={`/templates/${sablon.id}`} />
            </li>
          ))}
        </ul>
      )}

      <BirincilDugme yukseklik="normal" onClick={() => navigate('/templates/new')}>
        <Plus aria-hidden size={20} />
        Yeni şablon
      </BirincilDugme>
    </div>
  );
}
```

Run: `cd web && npm run test -- SablonlarPage` → 2 PASS.

- [ ] **Step 6: Düzenleyici testleri (kırmızı)**

`web/src/pages/SablonDuzenlePage.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import SablonDuzenlePage from './SablonDuzenlePage';
import type { components } from '../api/schema';

type ExerciseResponse = components['schemas']['ExerciseResponse'];
type TemplateResponse = components['schemas']['TemplateResponse'];

function duzenleyiciyiOlustur(yol: string) {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <MemoryRouter initialEntries={[yol]}>
        <Routes>
          <Route path="/templates" element={<p>Sablon listesi</p>} />
          <Route path="/templates/new" element={<SablonDuzenlePage />} />
          <Route path="/templates/:id" element={<SablonDuzenlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Alfabetik sira: Bench Press (1), Deadlift (3), Squat (2).
const EGZERSIZLER: ExerciseResponse[] = [
  { id: 1, name: 'Bench Press', category: 'Push', isArchived: false, isGlobal: true, media: [] },
  { id: 2, name: 'Squat', category: 'Legs', isArchived: false, isGlobal: true, media: [] },
  { id: 3, name: 'Deadlift', category: 'Pull', isArchived: false, isGlobal: true, media: [] },
];

function ornekSablon(gecersizler: Partial<TemplateResponse> = {}): TemplateResponse {
  return { id: 7, name: 'Push Day', createdAt: '2026-09-01T08:00:00Z', exercises: [], ...gecersizler };
}

async function hareketEkleHazir() {
  const dugme = screen.getByRole('button', { name: 'Hareket ekle' });
  await waitFor(() => expect(dugme).toBeEnabled());
  return dugme;
}

test('yeni sablon hareketleri sirayla plannedSets ve restSeconds ile gonderir; asagi tasimak sirayi degistirir', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.post('/api/templates', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json(ornekSablon(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  await kullanici.type(screen.getByLabelText('Şablon adı'), 'Push Day');
  const ekle = await hareketEkleHazir();
  await kullanici.click(ekle);
  await kullanici.click(ekle);

  // Yeni satir henuz secilmemis ilk (alfabetik) egzersizi alir.
  expect(screen.getByLabelText('1. hareket: Egzersiz')).toHaveValue('1');
  expect(screen.getByLabelText('2. hareket: Egzersiz')).toHaveValue('3');

  await kullanici.clear(screen.getByLabelText('1. hareket: Hedef set'));
  await kullanici.type(screen.getByLabelText('1. hareket: Hedef set'), '4');
  await kullanici.selectOptions(screen.getByLabelText('2. hareket: Dinlenme'), '180');
  await kullanici.click(screen.getByRole('button', { name: '1. hareket: aşağı taşı' }));
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(gonderilen).toEqual({
    name: 'Push Day',
    exercises: [
      { exerciseId: 3, plannedSets: 3, restSeconds: 180 },
      { exerciseId: 1, plannedSets: 4, restSeconds: 90 },
    ],
  });
});

test('ayni egzersiz ikinci satirda secilemez', async () => {
  server.use(http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)));
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  const ekle = await hareketEkleHazir();
  await kullanici.click(ekle);
  await kullanici.click(ekle);

  const ikinciSatir = screen.getByLabelText('2. hareket: Egzersiz');
  expect(within(ikinciSatir).getByRole('option', { name: 'Bench Press' })).toBeDisabled();
  expect(within(ikinciSatir).getByRole('option', { name: 'Squat' })).toBeEnabled();
  const ilkSatir = screen.getByLabelText('1. hareket: Egzersiz');
  expect(within(ilkSatir).getByRole('option', { name: 'Deadlift' })).toBeDisabled();
});

test('ayni adli sablon icin sunucunun 409 mesaji gosterilir', async () => {
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.post('/api/templates', () =>
      HttpResponse.json(
        { title: 'Çakışma', status: 409, detail: "'Push Day' adında bir şablonunuz zaten var." },
        { status: 409 },
      ),
    ),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  await kullanici.type(screen.getByLabelText('Şablon adı'), 'Push Day');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByRole('alert')).toHaveTextContent("'Push Day' adında bir şablonunuz zaten var.");
  expect(screen.queryByText('Sablon listesi')).not.toBeInTheDocument();
});

test('silme iki adimli onay ister; DELETE yalnizca Evet sil ile gider', async () => {
  let silmeSayisi = 0;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/templates/7', () => HttpResponse.json(ornekSablon())),
    http.delete('/api/templates/7', () => {
      silmeSayisi += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/7');

  await kullanici.click(await screen.findByRole('button', { name: 'Şablonu sil' }));
  expect(screen.getByText(/Silmek istediğine emin misin\?/)).toBeInTheDocument();
  expect(silmeSayisi).toBe(0);

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(screen.queryByText(/Silmek istediğine emin misin\?/)).not.toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Şablonu sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(silmeSayisi).toBe(1);
});

test('mevcut sablon yuklenir: arsivli hareket hapi ve listede olmayan dinlenme degeri korunur, PUT gonderilir', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/templates/7', () =>
      HttpResponse.json(
        ornekSablon({
          exercises: [
            { id: 1, exerciseId: 9, exerciseName: 'Eski Hareket', category: 'Other', isArchived: true, orderIndex: 0, plannedSets: 2, restSeconds: 45 },
            { id: 2, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 1, plannedSets: 4, restSeconds: 120 },
          ],
        }),
      ),
    ),
    http.put('/api/templates/7', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json(ornekSablon());
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/7');

  expect(await screen.findByDisplayValue('Push Day')).toBeInTheDocument();
  expect(screen.getByText('Artık kullanılmıyor')).toBeInTheDocument();
  expect(screen.getByLabelText('1. hareket: Egzersiz')).toHaveValue('9');
  expect(screen.getByLabelText('1. hareket: Dinlenme')).toHaveValue('45');
  expect(screen.getByLabelText('2. hareket: Dinlenme')).toHaveValue('120');

  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(gonderilen).toEqual({
    name: 'Push Day',
    exercises: [
      { exerciseId: 9, plannedSets: 2, restSeconds: 45 },
      { exerciseId: 1, plannedSets: 4, restSeconds: 120 },
    ],
  });
});
```

Run: `cd web && npm run test -- SablonDuzenlePage` → FAIL (modül yok).

- [ ] **Step 7: `SablonDuzenlePage`**

`web/src/pages/SablonDuzenlePage.tsx`:

```tsx
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useExercises,
  useTemplate,
  useUpdateTemplate,
  type Egzersiz,
  type Sablon,
  type SablonGirdisi,
} from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { adaGoreSirala } from '../lib/egzersizler';
import { VARSAYILAN_DINLENME_SN } from '../lib/dinlenme';
import Alan from '../ui/Alan';
import BirincilDugme from '../ui/BirincilDugme';
import Hap from '../ui/Hap';
import HataKutusu from '../ui/HataKutusu';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import SecimKutusu from '../ui/SecimKutusu';

const DINLENME_SECENEKLERI = [
  { deger: 0, etiket: 'Yok' },
  { deger: 30, etiket: '30 sn' },
  { deger: 60, etiket: '60 sn' },
  { deger: 90, etiket: '90 sn' },
  { deger: 120, etiket: '2 dk' },
  { deger: 180, etiket: '3 dk' },
  { deger: 240, etiket: '4 dk' },
  { deger: 300, etiket: '5 dk' },
];

const YENI_SATIR_HEDEF_SET = '3';
const ALAN_ETIKETI = 'text-label text-muted';

interface Satir {
  // React anahtari: satir tasininca ya da silinince durum (odak, girdi) dogru satirda kalsin.
  anahtar: number;
  exerciseId: number;
  exerciseName: string;
  isArchived: boolean;
  plannedSets: string;
  restSeconds: number;
}

function SayfaBasligi({ baslik }: { baslik: string }) {
  return (
    <header className="flex flex-col gap-1">
      <Link to="/templates" className="flex min-h-11 w-fit items-center gap-1 text-label text-muted">
        <ChevronLeft aria-hidden size={18} />
        Şablonlar
      </Link>
      <h1 className="text-title">{baslik}</h1>
    </header>
  );
}

/**
 * `/templates/new` ve `/templates/:id` (spec Karar 3). Form durumu yuklenen sablondan BIR KEZ kurulur:
 * `SablonFormu` sablon geldikten sonra ve id'ye gore `key`lenerek monte edilir, efektle kopyalama yok.
 */
export default function SablonDuzenlePage() {
  const { id } = useParams();
  const sablonId = id === undefined ? null : Number(id);
  const { data: sablon, isLoading, isError } = useTemplate(sablonId);

  if (sablonId === null) {
    return <SablonFormu sablon={null} />;
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 pt-2 pb-4">
        <SayfaBasligi baslik="Şablonu düzenle" />
        <p className="text-body text-muted">Yükleniyor...</p>
      </div>
    );
  }
  if (isError || !sablon) {
    return (
      <div className="flex flex-col gap-5 pt-2 pb-4">
        <SayfaBasligi baslik="Şablonu düzenle" />
        <p role="alert" className="text-body text-danger">
          Şablon alınamadı.
        </p>
      </div>
    );
  }
  return <SablonFormu key={sablon.id} sablon={sablon} />;
}

function SablonFormu({ sablon }: { sablon: Sablon | null }) {
  const navigate = useNavigate();
  const { data: egzersizler } = useExercises();
  const olusturMutasyonu = useCreateTemplate();
  const guncelleMutasyonu = useUpdateTemplate();
  const silMutasyonu = useDeleteTemplate();

  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);

  const [ad, setAd] = useState(sablon?.name ?? '');
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    (sablon?.exercises ?? []).map((hareket, sira) => ({
      anahtar: sira,
      exerciseId: hareket.exerciseId,
      exerciseName: hareket.exerciseName,
      isArchived: hareket.isArchived,
      plannedSets: String(hareket.plannedSets),
      restSeconds: hareket.restSeconds,
    })),
  );
  const siradakiAnahtar = useRef(satirlar.length);

  const [adHatasi, setAdHatasi] = useState<string | null>(null);
  const [setHatalari, setSetHatalari] = useState<Record<number, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silmeOnayi, setSilmeOnayi] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);

  const secilenIdler = new Set(satirlar.map((satir) => satir.exerciseId));
  const eklenebilirEgzersiz = siraliEgzersizler.find((eg) => !secilenIdler.has(eg.id));

  function hareketEkle() {
    if (!eklenebilirEgzersiz) {
      return;
    }
    const anahtar = siradakiAnahtar.current;
    siradakiAnahtar.current += 1;
    setSatirlar((onceki) => [
      ...onceki,
      {
        anahtar,
        exerciseId: eklenebilirEgzersiz.id,
        exerciseName: eklenebilirEgzersiz.name,
        isArchived: false,
        plannedSets: YENI_SATIR_HEDEF_SET,
        restSeconds: VARSAYILAN_DINLENME_SN,
      },
    ]);
  }

  function satiriGuncelle(anahtar: number, degisiklik: Partial<Satir>) {
    setSatirlar((onceki) => onceki.map((satir) => (satir.anahtar === anahtar ? { ...satir, ...degisiklik } : satir)));
  }

  function egzersizSec(anahtar: number, exerciseId: number) {
    const egzersiz = siraliEgzersizler.find((eg) => eg.id === exerciseId);
    if (egzersiz) {
      satiriGuncelle(anahtar, { exerciseId: egzersiz.id, exerciseName: egzersiz.name, isArchived: false });
    }
  }

  function tasi(sira: number, yon: -1 | 1) {
    setSatirlar((onceki) => {
      const hedef = sira + yon;
      if (hedef < 0 || hedef >= onceki.length) {
        return onceki;
      }
      const yeni = [...onceki];
      [yeni[sira], yeni[hedef]] = [yeni[hedef], yeni[sira]];
      return yeni;
    });
  }

  /** Sunucu kurallarini yansitir ama belirleyici sunucudur (spec Karar 3). */
  function dogrula(): boolean {
    const kirpilmisAd = ad.trim();
    const yeniAdHatasi =
      kirpilmisAd.length < 2 || kirpilmisAd.length > 100 ? 'Şablon adı 2-100 karakter olmalı.' : null;
    const yeniSetHatalari: Record<number, string> = {};
    for (const satir of satirlar) {
      const metin = satir.plannedSets.trim();
      const sayi = Number(metin);
      if (metin === '' || !Number.isInteger(sayi) || sayi < 1 || sayi > 50) {
        yeniSetHatalari[satir.anahtar] = 'Hedef set 1-50 arasında olmalı.';
      }
    }
    setAdHatasi(yeniAdHatasi);
    setSetHatalari(yeniSetHatalari);
    return yeniAdHatasi === null && Object.keys(yeniSetHatalari).length === 0;
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    if (!dogrula()) {
      return;
    }

    const girdi: SablonGirdisi = {
      name: ad.trim(),
      exercises: satirlar.map((satir) => ({
        exerciseId: satir.exerciseId,
        plannedSets: Number(satir.plannedSets.trim()),
        restSeconds: satir.restSeconds,
      })),
    };

    try {
      if (sablon) {
        await guncelleMutasyonu.mutateAsync({ id: sablon.id, girdi });
      } else {
        await olusturMutasyonu.mutateAsync(girdi);
      }
      navigate('/templates');
    } catch (hata) {
      // Ad alanina ait DataAnnotations hatasi alanin altina; digerleri (409, ic eleman hatalari)
      // genel hata kutusuna -- sessiz kalinmaz (apiHatasiniAyir I3).
      const sonuc = apiHatasiniAyir(hata, ['name']);
      setAdHatasi(sonuc.alanHatalari.name ?? null);
      setGenelHata(sonuc.genelHata);
    }
  }

  async function sil() {
    if (!sablon) {
      return;
    }
    setSilmeHatasi(null);
    try {
      await silMutasyonu.mutateAsync(sablon.id);
      navigate('/templates');
    } catch (hata) {
      setSilmeHatasi(apiHatasiniAyir(hata, []).genelHata);
      setSilmeOnayi(false);
    }
  }

  const kaydediliyor = olusturMutasyonu.isPending || guncelleMutasyonu.isPending;

  return (
    <form onSubmit={kaydet} noValidate className="flex flex-col gap-5 pt-2 pb-4">
      <SayfaBasligi baslik={sablon ? 'Şablonu düzenle' : 'Yeni şablon'} />

      {genelHata && <HataKutusu baslik="Şablon kaydedilemedi" mesaj={genelHata} />}

      <Alan
        id="sablon-adi"
        etiket="Şablon adı"
        ikon={ClipboardList}
        placeholder="Push Day"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        hata={adHatasi ?? undefined}
      />

      <section aria-labelledby="hareketler-basligi" className="flex flex-col gap-3">
        <h2 id="hareketler-basligi" className="text-heading">
          Hareketler
        </h2>
        {satirlar.length === 0 && <p className="text-body text-muted">Henüz hareket yok.</p>}
        <ol className="flex flex-col gap-3">
          {satirlar.map((satir, sira) => (
            <HareketSatiri
              key={satir.anahtar}
              satir={satir}
              sira={sira + 1}
              sonMu={sira === satirlar.length - 1}
              egzersizler={siraliEgzersizler}
              baskaSatirdaSecilenler={new Set(
                satirlar.filter((diger) => diger.anahtar !== satir.anahtar).map((diger) => diger.exerciseId),
              )}
              setHatasi={setHatalari[satir.anahtar]}
              onEgzersiz={(exerciseId) => egzersizSec(satir.anahtar, exerciseId)}
              onHedefSet={(deger) => satiriGuncelle(satir.anahtar, { plannedSets: deger })}
              onDinlenme={(saniye) => satiriGuncelle(satir.anahtar, { restSeconds: saniye })}
              onYukari={() => tasi(sira, -1)}
              onAsagi={() => tasi(sira, 1)}
              onKaldir={() => setSatirlar((onceki) => onceki.filter((diger) => diger.anahtar !== satir.anahtar))}
            />
          ))}
        </ol>
        <IkincilDugme onClick={hareketEkle} disabled={!eklenebilirEgzersiz}>
          <Plus aria-hidden size={18} />
          Hareket ekle
        </IkincilDugme>
      </section>

      <BirincilDugme type="submit" yukseklik="normal" disabled={kaydediliyor}>
        Kaydet
      </BirincilDugme>

      {sablon && (
        <div className="flex flex-col gap-3 border-t border-surface-3 pt-5">
          {silmeHatasi && (
            <p role="alert" className="text-label text-danger">
              {silmeHatasi}
            </p>
          )}
          {silmeOnayi ? (
            // Tarayicinin confirm()'u KULLANILMAZ (spec Karar 3): onay ayni yerde, iki adimda.
            <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
              <p className="text-body">
                Silmek istediğine emin misin? Bu şablonla yapılmış geçmiş antrenmanlar silinmez.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sil}
                  disabled={silMutasyonu.isPending}
                  className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg disabled:opacity-60"
                >
                  Evet, sil
                </button>
                <div className="flex-1">
                  <IkincilDugme onClick={() => setSilmeOnayi(false)}>Vazgeç</IkincilDugme>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSilmeOnayi(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl text-label text-danger"
            >
              <Trash2 aria-hidden size={18} />
              Şablonu sil
            </button>
          )}
        </div>
      )}
    </form>
  );
}

interface HareketSatiriProps {
  satir: Satir;
  sira: number;
  sonMu: boolean;
  egzersizler: Egzersiz[];
  baskaSatirdaSecilenler: Set<number>;
  setHatasi?: string;
  onEgzersiz: (exerciseId: number) => void;
  onHedefSet: (deger: string) => void;
  onDinlenme: (saniye: number) => void;
  onYukari: () => void;
  onAsagi: () => void;
  onKaldir: () => void;
}

/**
 * Tek hareket karti. Surukle-birak YOK (spec Karar 3): yukari/asagi/kaldir dugmeleri erisilebilir ve
 * basit. Her girdinin erisilebilir adi satir numarasini tasir ("1. hareket: Hedef set"); gorunen
 * etiket kisa kalir.
 */
function HareketSatiri({
  satir,
  sira,
  sonMu,
  egzersizler,
  baskaSatirdaSecilenler,
  setHatasi,
  onEgzersiz,
  onHedefSet,
  onDinlenme,
  onYukari,
  onAsagi,
  onKaldir,
}: HareketSatiriProps) {
  const onEk = `${sira}. hareket`;
  const idOnEki = `hareket-${satir.anahtar}`;
  // Arsivlenmis egzersiz secim listesinde yok (GET /api/exercises arsivlileri dondurmez) ama sablonda
  // kalabilir: kendi adiyla ayrica secenek olarak gosterilir, veri kaybolmaz.
  const listedeYok = !egzersizler.some((eg) => eg.id === satir.exerciseId);
  const dinlenmeSecenekleri = DINLENME_SECENEKLERI.some((secenek) => secenek.deger === satir.restSeconds)
    ? DINLENME_SECENEKLERI
    : [...DINLENME_SECENEKLERI, { deger: satir.restSeconds, etiket: `${satir.restSeconds} sn` }].sort(
        (a, b) => a.deger - b.deger,
      );

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
          >
            {sira}
          </span>
          {satir.isArchived && <Hap>Artık kullanılmıyor</Hap>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <IkonDugmesi etiket={`${onEk}: yukarı taşı`} onClick={onYukari} disabled={sira === 1}>
            <ChevronUp aria-hidden size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: aşağı taşı`} onClick={onAsagi} disabled={sonMu}>
            <ChevronDown aria-hidden size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: kaldır`} onClick={onKaldir}>
            <X aria-hidden size={20} />
          </IkonDugmesi>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idOnEki}-egzersiz`} className={ALAN_ETIKETI}>
          <span className="sr-only">{onEk}: </span>
          Egzersiz
        </label>
        <SecimKutusu
          id={`${idOnEki}-egzersiz`}
          value={satir.exerciseId}
          onChange={(e) => onEgzersiz(Number(e.target.value))}
        >
          {listedeYok && <option value={satir.exerciseId}>{satir.exerciseName}</option>}
          {egzersizler.map((eg) => (
            <option key={eg.id} value={eg.id} disabled={baskaSatirdaSecilenler.has(eg.id)}>
              {eg.name}
            </option>
          ))}
        </SecimKutusu>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idOnEki}-set`} className={ALAN_ETIKETI}>
            <span className="sr-only">{onEk}: </span>
            Hedef set
          </label>
          <input
            id={`${idOnEki}-set`}
            inputMode="numeric"
            value={satir.plannedSets}
            onChange={(e) => onHedefSet(e.target.value)}
            className="h-12 w-full rounded-lg bg-inset px-4 text-body-lg text-fg tabular-nums focus:bg-surface-3"
          />
          {setHatasi && (
            <p role="alert" className="text-label text-danger">
              {setHatasi}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idOnEki}-dinlenme`} className={ALAN_ETIKETI}>
            <span className="sr-only">{onEk}: </span>
            Dinlenme
          </label>
          <SecimKutusu
            id={`${idOnEki}-dinlenme`}
            value={satir.restSeconds}
            onChange={(e) => onDinlenme(Number(e.target.value))}
          >
            {dinlenmeSecenekleri.map((secenek) => (
              <option key={secenek.deger} value={secenek.deger}>
                {secenek.etiket}
              </option>
            ))}
          </SecimKutusu>
        </div>
      </div>
    </li>
  );
}
```

Label metni `<span>1. hareket: </span>Egzersiz` → erişilebilir ad `1. hareket: Egzersiz`. Testlerde ad
bulunamazsa (boşluk birleşmesi) `{' '}` ekle; adı DEĞİŞTİRME.

Run: `cd web && npm run test -- SablonDuzenlePage` → 5 PASS.

- [ ] **Step 8: Rotalar ve hesap menüsü**

`web/src/routes.tsx` — import'lara `SablonlarPage` ve `SablonDuzenlePage`, `children`'a:

```tsx
      { path: 'templates', element: <SablonlarPage /> },
      { path: 'templates/new', element: <SablonDuzenlePage /> },
      { path: 'templates/:id', element: <SablonDuzenlePage /> },
```

Üst yorumu "`/`, `/history`, `/records` ve şablon rotaları TEK bir `ProtectedRoute` altında" diye
güncelle.

`web/src/ui/HesapMenusu.tsx` — tamamen:

```tsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MENU_ID = 'hesap-menusu';
const MENU_OGESI = 'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-label';

/**
 * Hesap menusu: "Sablonlar" ve "Cikis yap" (dilim 2 spec Karar 2 -- sablonlar sekme degil).
 * Popover API: disari dokununca ve Escape ile KENDILIGINDEN kapanir.
 *
 * Menu icindeki bir baglanti tiklaninca popover kendiliginden KAPANMAZ (kabuk sayfa degisince de
 * yerinde durur) -- bu yuzden `hidePopover` elle cagrilir. jsdom Popover API'yi uygulamadigi icin
 * cagri istege bagli.
 */
export default function HesapMenusu() {
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Hesap menüsü"
        className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-fg"
      >
        <User aria-hidden size={20} />
      </button>
      <div
        ref={menuRef}
        id={MENU_ID}
        popover="auto"
        // Golge Stitch'in "Level 3" degeri; token karsiligi yok, tek seferlik.
        className="inset-auto top-16 right-4 m-0 w-44 rounded-lg border-0 bg-surface-3 p-1 text-fg shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      >
        <Link to="/templates" onClick={() => menuRef.current?.hidePopover?.()} className={`${MENU_OGESI} text-fg`}>
          <ClipboardList aria-hidden size={16} />
          Şablonlar
        </Link>
        <button type="button" onClick={logout} className={`${MENU_OGESI} text-danger`}>
          <LogOut aria-hidden size={16} />
          Çıkış yap
        </button>
      </div>
    </>
  );
}
```

`web/src/App.test.tsx` — `testRouterOlustur`'daki `children`'a
`{ path: 'templates', element: <p>Sablonlar sayfasi</p> },` ekle; dosyanın sonuna:

```tsx
test('hesap menusundeki Sablonlar baglantisi sablon listesine gider', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');
  // jsdom kapali popover'i gizler (bkz. cikis testleri) -- { hidden: true }.
  await kullanici.click(screen.getByRole('link', { name: 'Şablonlar', hidden: true }));

  expect(await screen.findByText('Sablonlar sayfasi')).toBeInTheDocument();
});
```

- [ ] **Step 9: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 15 dosya, **79** test PASS (71 + 2 + 5 + 1).

- [ ] **Step 10: Commit**

```bash
git add web/src
git commit -m "feat(web): sablon listesi, duzenleyici ve hesap menusunde sablonlar" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Bugün — şablonla başlatma, hareket kartları ve seçim

**Files:**
- Modify: `web/src/api/queries.ts`, `web/src/pages/TodayPage.tsx`,
  `web/src/components/AddSetForm.tsx`, `web/src/components/SetList.tsx`
- Create: `web/src/lib/ilerleme.ts`, `web/src/lib/rekor.ts`, `web/src/ui/TurEtiketi.tsx`,
  `web/src/components/SetSatiri.tsx`, `web/src/components/SablonlaBasla.tsx`,
  `web/src/components/HareketKartlari.tsx`
- Test: `web/src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: Görev 2'nin `useTemplates`, `Sablon`, `SablonKarti`, `SecimKutusu`, `adaGoreSirala`.
- Produces:
  - `queries.ts`: `interface HareketIlerlemesi { exerciseId: number; exerciseName: string; plannedSets: number; completedSets: number; restSeconds: number }`;
    `AcikOturum` artık `templateId: number | null` ve `progress: HareketIlerlemesi[]` taşır;
    `useStartSession()` → `mutate(templateId: number)`, veri `AcikOturum`.
  - `lib/ilerleme.ts`: `varsayilanHareket(ilerleme: HareketIlerlemesi[]): number | null`.
  - `lib/rekor.ts`: `rekorRozetiMetni(kayit: SetKaydi): string | null` (SetList'ten taşınır).
  - `components/SetSatiri` (`{ kayit: SetKaydi; sira: number }`, bir `<li>`).
  - `components/HareketKartlari` (`{ ilerleme, setler, secilenId: number | null, onSec(exerciseId) }`;
    Görev 5 `bugunkuOturumId` ekler).
  - `AddSetForm` artık KONTROLLÜ: `{ egzersizId: number | null; onEgzersizSec: (exerciseId: number) => void }`.
  - `ui/TurEtiketi` (`children`) — nötr büyük harf hap; Görev 6 da kullanır.

**Spec'ten bilinçli sapma (yazılı karar):** Karar 4 "200 dönerse … şablon uygulanmadı" der. `request()`
HTTP durum kodunu dışarı vermez; mesajın anlamı da "şablon uygulanmadı"dır. Bu yüzden istemci dönen
oturumun `templateId`'sini istenenle karşılaştırır. 200 + başka/boş şablon → mesaj; 200 + aynı şablon
(aynı karta ikinci dokunuş) → mesaj YOK, çünkü şablon zaten uygulanmıştır. Spec'in testi ("200
yanıtında bilgi görünür", şablonsuz açık oturum) bu kuralla aynen geçer.

**Seçim kuralı (Karar 5) nasıl uygulanır:** seçim `TodayPage`'de tek durumdur (`secim`). Şablonlu
oturum yüklendiğinde ve henüz seçim yokken varsayılan hareket durum olarak BİR KEZ yazılır
(render sırasında koşullu `setSecim`; React'in "önceki render'dan bilgi saklama" deseni, efekt yok).
Böylece set eklenip hareket tamamlanınca seçim kendiliğinden atlamaz. Şablonsuz oturumda seçim
yoksa etkin değer alfabetik ilk egzersizdir (sabitlenmez; liste değişmez).

- [ ] **Step 1: `queries.ts` — ilerleme ve başlatma**

Tip takma adlarına:

```ts
type SessionProgressResponse = components['schemas']['SessionProgressResponse'];
type StartSessionRequest = components['schemas']['StartSessionRequest'];
```

`AcikOturum` arayüzü ve `dogrulanmisOturum` şununla değişir (öncesine `HareketIlerlemesi` eklenir):

```ts
export interface HareketIlerlemesi {
  exerciseId: number;
  exerciseName: string;
  plannedSets: number;
  completedSets: number;
  restSeconds: number;
}

export interface AcikOturum {
  id: number;
  startedAt: string;
  isOpen: boolean;
  templateId: number | null;
  templateName: string | null;
  // Sablonsuz oturumda bos. Sira, hedef ve gerceklesen sayilar SUNUCUDAN gelir (spec Karar 8).
  progress: HareketIlerlemesi[];
}

function dogrulanmisIlerleme(yanit: SessionProgressResponse): HareketIlerlemesi {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.plannedSets === undefined ||
    yanit.completedSets === undefined ||
    yanit.restSeconds === undefined
  ) {
    throw new Error('Sunucudan eksik ilerleme yaniti alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    plannedSets: yanit.plannedSets,
    completedSets: yanit.completedSets,
    restSeconds: yanit.restSeconds,
  };
}

function dogrulanmisOturum(yanit: SessionResponse): AcikOturum {
  if (yanit.id === undefined || !yanit.startedAt || yanit.isOpen === undefined) {
    throw new Error('Sunucudan eksik oturum yaniti alindi.');
  }
  return {
    id: yanit.id,
    startedAt: yanit.startedAt,
    isOpen: yanit.isOpen,
    templateId: yanit.templateId ?? null,
    templateName: yanit.templateName ?? null,
    progress: (yanit.progress ?? []).map(dogrulanmisIlerleme),
  };
}
```

`useFinishSession`'ın ALTINA:

```ts
/**
 * `POST /api/sessions { templateId }`. Bugun acik oturum varsa sunucu onu 200 ile oldugu gibi doner
 * ve `templateId` UYGULANMAZ (Faz 7 karari) -- cagiran taraf donen oturumun `templateId`'sine bakar.
 */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: number): Promise<AcikOturum> => {
      const govde: StartSessionRequest = { templateId };
      const yanit = await request<SessionResponse>('/sessions', {
        method: 'POST',
        body: JSON.stringify(govde),
      });
      return dogrulanmisOturum(yanit);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
      void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
    },
  });
}
```

- [ ] **Step 2: Saf yardımcılar ve küçük bileşenler**

`web/src/lib/ilerleme.ts`:

```ts
import type { HareketIlerlemesi } from '../api/queries';

/**
 * Spec Karar 5: varsayilan secim `completedSets < plannedSets` olan ilk hareket, hepsi tamamsa ilk
 * hareket; sablonsuz oturumda secim yok (null). Karsilastirilan sayilar sunucunundur.
 */
export function varsayilanHareket(ilerleme: readonly HareketIlerlemesi[]): number | null {
  if (ilerleme.length === 0) {
    return null;
  }
  return (ilerleme.find((hareket) => hareket.completedSets < hareket.plannedSets) ?? ilerleme[0]).exerciseId;
}
```

`web/src/lib/rekor.ts`:

```ts
import type { SetKaydi } from '../api/queries';

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN HESAPLANMAZ.
 * `None` icin rozet yok. Buyuk harf CSS ile gelir.
 */
export function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return 'Ağırlık rekoru';
  }
  if (kayit.recordType === 'Reps') {
    return 'Tekrar rekoru';
  }
  return null;
}
```

`web/src/ui/TurEtiketi.tsx`:

```tsx
import type { ReactNode } from 'react';

/**
 * Antrenman turu hapi (sablon adi ya da "Serbest"): notr, buyuk harf CSS ile. `accent` KULLANILMAZ
 * (gorsel tasarim spec'i Karar 2: accent rekorlara, birincil eyleme, aktif sekmeye ve markaya ayrildi).
 */
export default function TurEtiketi({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full bg-surface-3 px-2.5 py-1 text-label text-fg uppercase">
      {children}
    </span>
  );
}
```

`web/src/components/SetSatiri.tsx` — `SetList.tsx`'teki `'bugun'` varyantının `<li>`'si buraya
TAŞINIR (sınıflar ve metin birebir aynı):

```tsx
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import { rekorRozetiMetni } from '../lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';

/**
 * Bugun ekraninin set satiri: SetList'in 'bugun' gruplari ve sablonlu oturumun hareket kartlari ayni
 * satiri kullanir (DRY). Deger metni bosluklari `{' '}` ile acikca tasir (textContent tek parca).
 */
export default function SetSatiri({ kayit, sira }: { kayit: SetKaydi; sira: number }) {
  const rozet = rekorRozetiMetni(kayit);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-2">
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-12 shrink-0 text-label text-muted">{sira}. Set</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-metric tabular-nums">
            {formatWeight(kayit.weight)} <span className="text-body text-muted">kg</span>{' '}
            <span className="font-light text-muted">×</span> {kayit.reps}
          </span>
          {rozet && <Rozet>{rozet}</Rozet>}
        </div>
      </div>
      {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
    </li>
  );
}
```

`web/src/components/SetList.tsx`:
- `rekorRozetiMetni` fonksiyonunu (ve yorumunu) SİL, yerine `import { rekorRozetiMetni } from '../lib/rekor';`
  ve `import SetSatiri from './SetSatiri';`.
- `'bugun'` dönüşündeki `<ul>` gövdesi:

```tsx
          <ul className="flex flex-col gap-1">
            {grup.sets.map((kayit, setSirasi) => (
              <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} />
            ))}
          </ul>
```

- artık kullanılmayan import'ları (`Rozet`, `Hap`, `formatWeight`, ikonlar) yalnızca `'gecmis'`
  varyantı hâlâ kullanıyorsa bırak; `npm run lint` kullanılmayanı gösterir.

Run: `cd web && npm run test` → 79 PASS (davranış değişmedi).

- [ ] **Step 3: `SablonlaBasla` ve `HareketKartlari`**

`web/src/components/SablonlaBasla.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useTemplates } from '../api/queries';
import SablonKarti from '../ui/SablonKarti';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

/**
 * Bugun'un bos durumundaki "Sablonla basla" bolumu (spec Karar 2 ve 4). Baslatma mutasyonu ve
 * "sablon uygulanmadi" bilgisi TodayPage'dedir: oturum acilinca bu bolum kaybolur, bilgi kaybolmamali.
 *
 * Sablon listesinin hatasi `role="alert"` DEGIL: bolum ikincil bir kisayoldur, serbest antrenman
 * paneli calismaya devam eder.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <section aria-labelledby="sablonla-basla-basligi" className="flex flex-col gap-3">
      <h2 id="sablonla-basla-basligi" className="text-heading">
        Şablonla başla
      </h2>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}
      {isError && <p className="text-body text-muted">Şablonlar alınamadı.</p>}

      {sablonlar && sablonlar.length === 0 && (
        <p className="text-body text-muted">
          Henüz şablon yok.{' '}
          <Link to="/templates/new" className="text-fg underline">
            Şablon oluştur
          </Link>
        </p>
      )}

      {sablonlar && sablonlar.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {sablonlar.map((sablon) => (
              <li key={sablon.id}>
                <SablonKarti
                  ad={sablon.name}
                  hareketSayisi={sablon.exercises.length}
                  onClick={() => onBasla(sablon.id)}
                  disabled={bekliyor}
                />
              </li>
            ))}
          </ul>
          <Link to="/templates" className="flex min-h-11 w-fit items-center text-label text-muted underline">
            Şablonları yönet
          </Link>
        </>
      )}
    </section>
  );
}
```

`web/src/components/HareketKartlari.tsx`:

```tsx
import { Check } from 'lucide-react';
import type { HareketIlerlemesi, SetKaydi } from '../api/queries';
import SetList from './SetList';
import SetSatiri from './SetSatiri';

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  secilenId: number | null;
  onSec: (exerciseId: number) => void;
}

/**
 * Sablonlu oturumun hareket kartlari (spec Karar 5). Sira, hedef ve gerceklesen sayilar sunucunun
 * `progress`'inden gelir; setlerin kartlara dagitilmasi yalnizca sunumdur.
 *
 * Kart basligi bir `<button>`dir ve adi "Bench Press, 2 / 4 set"; setler dugmenin DISINDA durur
 * (dugme icinde liste, erisilebilir adi setlerle sisirirdi). Secim `aria-pressed` ile ve accent
 * KULLANMADAN (notr halka) gosterilir.
 */
export default function HareketKartlari({ ilerleme, setler, secilenId, onSec }: Props) {
  const planliIdler = new Set(ilerleme.map((hareket) => hareket.exerciseId));
  const planDisiSetler = setler.filter((kayit) => !planliIdler.has(kayit.exerciseId));

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-4">
        {ilerleme.map((hareket, sira) => {
          const secili = hareket.exerciseId === secilenId;
          const tamamlandi = hareket.completedSets >= hareket.plannedSets;
          const hareketSetleri = setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId);

          return (
            <li
              key={hareket.exerciseId}
              className={`flex flex-col gap-2 rounded-xl bg-surface-1 p-4 ${secili ? 'ring-1 ring-muted' : ''}`}
            >
              <button
                type="button"
                aria-pressed={secili}
                aria-label={`${hareket.exerciseName}, ${hareket.completedSets} / ${hareket.plannedSets} set`}
                onClick={() => onSec(hareket.exerciseId)}
                className="flex min-h-12 w-full items-center justify-between gap-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
                  >
                    {tamamlandi ? <Check size={18} /> : sira + 1}
                  </span>
                  <span className="truncate text-heading">{hareket.exerciseName}</span>
                </span>
                <span className="shrink-0 text-label-xs text-muted uppercase tabular-nums">
                  {hareket.completedSets} / {hareket.plannedSets} set
                </span>
              </button>
              {hareketSetleri.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {hareketSetleri.map((kayit, setSirasi) => (
                    <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {planDisiSetler.length > 0 && (
        <section aria-labelledby="plan-disi-basligi" className="flex flex-col gap-2">
          <h2 id="plan-disi-basligi" className="text-heading">
            Plan dışı
          </h2>
          <SetList sets={planDisiSetler} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `TodayPage.test.tsx` — sahte sunucuyu genişlet, yeni testleri yaz (kırmızı)**

Tip takma adlarına ekle:

```tsx
type TemplateResponse = components['schemas']['TemplateResponse'];
type SessionProgressResponse = components['schemas']['SessionProgressResponse'];
```

`sahteSunucuyuKur` fonksiyonunu TAMAMEN şununla değiştir (mevcut davranış korunur; şablon listesi,
oturum başlatma, geçmiş ucu ve ilerleme sayacı eklenir — boş durum artık `GET /api/templates` çeker,
şablonsuz oturum Görev 5'te `GET /api/history` çeker; `onUnhandledRequest: 'error'` yüzünden
handler'lar varsayılan olarak burada durur):

```tsx
function sahteSunucuyuKur(
  opsiyonlar: {
    baslangicOturumu?: SessionResponse | null;
    recordTypeUret?: (govde: { exerciseId: number; weight: number; reps: number }) => RecordType;
    sablonlar?: TemplateResponse[];
  } = {},
) {
  let oturum: SessionResponse | null = opsiyonlar.baslangicOturumu ?? null;
  let setler: SetEntryResponse[] = [];
  let siradakiSetId = 100;
  const siradakiOturumId = 1;
  const gonderilenGovdeler: unknown[] = [];
  const baslatmaGovdeleri: unknown[] = [];
  const gecmisAramalari: string[] = [];

  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/sessions/open', () => {
      if (!oturum) {
        return HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 });
      }
      return HttpResponse.json(oturum);
    }),
    http.get('/api/sessions/:id/sets', () => HttpResponse.json(setler)),
    http.get('/api/templates', () => HttpResponse.json(opsiyonlar.sablonlar ?? [])),
    http.get('/api/history', ({ request }) => {
      gecmisAramalari.push(new URL(request.url).search);
      return HttpResponse.json({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 });
    }),
    // Gercek backend gibi: acik oturum varsa 200 ile oldugu gibi doner (templateId UYGULANMAZ),
    // yoksa sablonun hareketleriyle 201.
    http.post('/api/sessions', async ({ request }) => {
      const govde = (await request.json()) as { templateId?: number | null };
      baslatmaGovdeleri.push(govde);
      if (oturum) {
        return HttpResponse.json(oturum, { status: 200 });
      }
      const sablon = opsiyonlar.sablonlar?.find((s) => s.id === govde.templateId);
      oturum = {
        id: siradakiOturumId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: sablon?.id ?? null,
        templateName: sablon?.name ?? null,
        notes: null,
        progress: (sablon?.exercises ?? []).map((hareket) => ({
          exerciseId: hareket.exerciseId,
          exerciseName: hareket.exerciseName,
          plannedSets: hareket.plannedSets,
          completedSets: 0,
          restSeconds: hareket.restSeconds,
        })),
      };
      return HttpResponse.json(oturum, { status: 201 });
    }),
    http.post('/api/sets', async ({ request }) => {
      const govde = (await request.json()) as { exerciseId: number; weight: number; reps: number; rir?: number | null };
      gonderilenGovdeler.push(govde);

      if (!oturum) {
        oturum = {
          id: siradakiOturumId,
          startedAt: new Date().toISOString(),
          endedAt: null,
          isOpen: true,
          templateId: null,
          templateName: null,
          notes: null,
          progress: [],
        };
      }

      const egzersiz = EGZERSIZLER.find((e) => e.id === govde.exerciseId);
      const yeniSet: SetEntryResponse = {
        id: siradakiSetId++,
        sessionId: oturum.id as number,
        exerciseId: govde.exerciseId,
        exerciseName: egzersiz?.name ?? 'Bilinmeyen',
        weight: govde.weight,
        reps: govde.reps,
        recordType: opsiyonlar.recordTypeUret?.(govde) ?? 'None',
        rir: govde.rir ?? null,
        createdAt: new Date().toISOString(),
      };
      setler = [...setler, yeniSet];
      // Sunucu ilerlemeyi gercek set sayisindan hesaplar; sahte sunucu da sayaci artirir.
      oturum = {
        ...oturum,
        progress: (oturum.progress ?? []).map((hareket) =>
          hareket.exerciseId === govde.exerciseId
            ? { ...hareket, completedSets: (hareket.completedSets ?? 0) + 1 }
            : hareket,
        ),
      };
      return HttpResponse.json(yeniSet);
    }),
    http.post('/api/sessions/:id/finish', () => {
      if (oturum) {
        oturum = { ...oturum, endedAt: new Date().toISOString(), isOpen: false };
      }
      return HttpResponse.json(oturum);
    }),
  );

  return {
    sonGonderilenGovde: () => gonderilenGovdeler.at(-1),
    baslatmaGovdeleri: () => baslatmaGovdeleri,
    gecmisAramalari: () => gecmisAramalari,
  };
}
```

`EGZERSIZLER` sabitinin ALTINA:

```tsx
const PUSH_DAY: TemplateResponse = {
  id: 10,
  name: 'Push Day',
  createdAt: '2026-09-01T08:00:00Z',
  exercises: [
    { id: 1, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 0, plannedSets: 4, restSeconds: 120 },
    { id: 2, exerciseId: 2, exerciseName: 'Squat', category: 'Legs', isArchived: false, orderIndex: 1, plannedSets: 3, restSeconds: 0 },
  ],
};

function sablonluOturum(progress: SessionProgressResponse[]): SessionResponse {
  return {
    id: 20,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: 10,
    templateName: 'Push Day',
    notes: null,
    progress,
  };
}

function ilerleme(
  exerciseId: number,
  exerciseName: string,
  plannedSets: number,
  completedSets: number,
  restSeconds = 90,
): SessionProgressResponse {
  return { exerciseId, exerciseName, plannedSets, completedSets, restSeconds };
}

const HAREKET_KARTI_ADI = /, \d+ \/ \d+ set$/;
```

`import { render, screen, waitFor } from '@testing-library/react';` satırına `within` ekle. Dosyanın
SONUNA:

```tsx
test('bos durumda sablon kartina dokunmak templateId ile oturum baslatir ve hareket kartlari gorunur', async () => {
  const ortam = sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  const kart = await screen.findByRole('button', { name: /Push Day/ });
  expect(kart).toHaveTextContent('2 hareket');
  await kullanici.click(kart);

  expect(await screen.findByRole('button', { name: 'Bench Press, 0 / 4 set' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Squat, 0 / 3 set' })).toBeInTheDocument();
  expect(ortam.baslatmaGovdeleri()).toEqual([{ templateId: 10 }]);
  // Baslikta sablon adi notr hap olarak (buyuk harf CSS ile).
  expect(screen.getByText('Push Day')).toBeInTheDocument();
  expect(screen.queryByText('Bugün henüz antrenman yok')).not.toBeInTheDocument();
});

test('baslatma var olan sablonsuz oturumu donerse sablon uygulanmadi bilgisi gorunur', async () => {
  sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  // Arada baska bir yerden oturum acilmis: sunucu 200 ile sablonsuz oturumu doner.
  let acik: SessionResponse | null = null;
  server.use(
    http.get('/api/sessions/open', () =>
      acik ? HttpResponse.json(acik) : HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
    ),
    http.post('/api/sessions', () => {
      acik = {
        id: 30,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: null,
        templateName: null,
        notes: null,
        progress: [],
      };
      return HttpResponse.json(acik, { status: 200 });
    }),
  );
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: /Push Day/ }));

  expect(
    await screen.findByText('Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: HAREKET_KARTI_ADI })).not.toBeInTheDocument();
});

test('hic sablon yokken bos durumda Sablon olustur baglantisi gorunur', async () => {
  sahteSunucuyuKur({ sablonlar: [] });
  bugunSayfasiniOlustur();

  const baglanti = await screen.findByRole('link', { name: 'Şablon oluştur' });
  expect(baglanti).toHaveAttribute('href', '/templates/new');
  expect(screen.getByText(/Henüz şablon yok/)).toBeInTheDocument();
});

test('sablonlu oturumda kartlar sunucunun sirasiyla gorunur; varsayilan secim tamamlanmamis ilk harekettir', async () => {
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(2, 'Squat', 3, 3), ilerleme(1, 'Bench Press', 4, 1)]),
  });
  bugunSayfasiniOlustur();

  await waitFor(() => expect(screen.getAllByRole('button', { name: HAREKET_KARTI_ADI })).toHaveLength(2));
  const kartlar = screen.getAllByRole('button', { name: HAREKET_KARTI_ADI });
  expect(kartlar[0]).toHaveAccessibleName('Squat, 3 / 3 set');
  expect(kartlar[1]).toHaveAccessibleName('Bench Press, 1 / 4 set');
  expect(kartlar[0]).toHaveAttribute('aria-pressed', 'false');
  expect(kartlar[1]).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(screen.getByLabelText('Egzersiz')).toHaveValue('1'));
});

test('karta dokunmak paneldeki egzersizi degistirir; hareket tamamlaninca secim sonrakine atlamaz', async () => {
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 1, 0), ilerleme(2, 'Squat', 3, 0)]),
  });
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '60', '8');

  const bench = await screen.findByRole('button', { name: 'Bench Press, 1 / 1 set' });
  expect(bench).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Egzersiz')).toHaveValue('1');

  await kullanici.click(screen.getByRole('button', { name: 'Squat, 0 / 3 set' }));

  expect(screen.getByLabelText('Egzersiz')).toHaveValue('2');
  expect(screen.getByRole('button', { name: 'Squat, 0 / 3 set' })).toHaveAttribute('aria-pressed', 'true');
});

test('sablonda olmayan harekete girilen setler Plan disi grubunda gorunur', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await kullanici.selectOptions(screen.getByLabelText('Egzersiz'), '2');
  await setEkle(kullanici, '70', '5');

  const planDisi = await screen.findByRole('region', { name: 'Plan dışı' });
  expect(within(planDisi).getByText(tamMetin('70 kg × 5'))).toBeInTheDocument();
});
```

Run: `cd web && npm run test -- TodayPage` → yeni 6 test FAIL (mevcut 19'u da boş durumda şablon
bölümü olmadığı için hâlâ geçer).

- [ ] **Step 5: `AddSetForm` kontrollü seçim**

`web/src/components/AddSetForm.tsx`:
- Bileşen imzası ve seçim durumu:

```tsx
interface Props {
  // Secim TodayPage'dedir (hareket kartlari ve panel ayni secimi paylasir, spec Karar 5). `null`:
  // egzersiz listesi henuz yuklenmedi.
  egzersizId: number | null;
  onEgzersizSec: (exerciseId: number) => void;
}

export default function AddSetForm({ egzersizId, onEgzersizSec }: Props) {
```

- `manuelSecim`, `ilkEgzersizId` ve eski `egzersizId` türetmesini (yorumuyla birlikte) SİL.
- `gonder` içinde `alanlariDogrula` çağrısından ÖNCE:

```tsx
    if (egzersizId === null) {
      return;
    }
```

- `mutateAsync` çağrısında `exerciseId: egzersizId,`.
- Seçim kutusu:

```tsx
          <SecimKutusu
            id="set-egzersiz"
            value={egzersizId ?? ''}
            onChange={(e) => onEgzersizSec(Number(e.target.value))}
          >
```

- Dosya başındaki bileşen yorumuna ekle: "Secilen egzersiz disaridan gelir (kontrollu)."

- [ ] **Step 6: `TodayPage`**

`web/src/pages/TodayPage.tsx` — tamamen:

```tsx
import { useState } from 'react';
import { CircleCheck, Dumbbell } from 'lucide-react';
import { useExercises, useFinishSession, useOpenSession, useSessionSets, useStartSession } from '../api/queries';
import { formatTrTime } from '../lib/format';
import { adaGoreSirala } from '../lib/egzersizler';
import { varsayilanHareket } from '../lib/ilerleme';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';
import HareketKartlari from '../components/HareketKartlari';
import SablonlaBasla from '../components/SablonlaBasla';
import BosDurum from '../ui/BosDurum';
import TurEtiketi from '../ui/TurEtiketi';

const SABLON_UYGULANMADI = 'Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.';

/**
 * "Bugun" ekrani. Acik oturum varsa baslangic saati (TR), sablonluysa sablon adi ve hareket kartlari,
 * degilse gruplu set listesi; yoksa bos durum + "Sablonla basla". Set ekleme paneli HER DURUMDA
 * render edilir: ilk set sunucu tarafinda sablonsuz oturumu kendiliginden acar.
 *
 * DIKKAT (review bulgusu): oturum ve set sorgularinin HATA durumu bos durumdan AYRI ve ONCELIKLI.
 *
 * Secim (spec Karar 5) burada TEK durumdur; kartlar ve panel paylasir. Sablonlu oturum yuklenip
 * henuz secim yokken varsayilan hareket BIR KEZ duruma yazilir (render sirasinda kosullu set -- efekt
 * yok). Boylece hareket tamamlaninca secim kendiliginden sonrakine ATLAMAZ.
 *
 * `pb-72` (18rem): sabit set ekle paneli listenin son satirini ortmesin.
 */
export default function TodayPage() {
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  const { data: egzersizler } = useExercises();
  const bitirMutasyonu = useFinishSession();
  const baslatMutasyonu = useStartSession();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);

  const ilerleme = gorunenOturum?.progress ?? [];
  const sablonVarsayilani = varsayilanHareket(ilerleme);
  const [secim, setSecim] = useState<number | null>(null);
  if (secim === null && sablonVarsayilani !== null) {
    setSecim(sablonVarsayilani);
  }
  const etkinSecim = secim ?? sablonVarsayilani ?? adaGoreSirala(egzersizler ?? [])[0]?.id ?? null;

  function sablonlaBasla(templateId: number) {
    setBaslatmaBilgisi(null);
    baslatMutasyonu.mutate(templateId, {
      onSuccess: (acilan) => {
        // request() durum kodunu vermez; anlam "sablon uygulanmadi" oldugu icin donen oturumun
        // sablonuna bakilir (plan: spec Karar 4'ten bilincli sapma).
        if (acilan.templateId !== templateId) {
          setBaslatmaBilgisi(SABLON_UYGULANMADI);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-72">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-title">Bugün</h1>
          {gorunenOturum?.isOpen && (
            <button
              type="button"
              onClick={() => bitirMutasyonu.mutate(gorunenOturum.id)}
              disabled={bitirMutasyonu.isPending}
              className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-muted disabled:opacity-60"
            >
              <CircleCheck aria-hidden size={18} />
              Antrenmanı bitir
            </button>
          )}
        </div>
        {gorunenOturum && (
          <div className="flex flex-wrap items-center gap-2">
            {gorunenOturum.isOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label">
                <span aria-hidden className="size-2 rounded-full bg-muted motion-safe:animate-pulse" />
                Devam ediyor
              </span>
            )}
            {gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}
            <span className="text-label text-muted">Başlangıç {formatTrTime(gorunenOturum.startedAt)}</span>
          </div>
        )}
        {bitirMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman bitirilemedi. Lütfen tekrar deneyin.
          </p>
        )}
        {baslatMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman başlatılamadı. Lütfen tekrar deneyin.
          </p>
        )}
        {baslatmaBilgisi && (
          <p role="status" className="text-label text-muted">
            {baslatmaBilgisi}
          </p>
        )}
      </header>

      {oturumYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}

      {oturumHataliMi && (
        <p role="alert" className="text-body text-danger">
          Oturum bilgisi alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {gorunenOturum && (
        <>
          {setlerYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}
          {setlerHataliMi && (
            <p role="alert" className="text-body text-danger">
              Setler alınamadı. Lütfen sayfayı yenileyin.
            </p>
          )}
          {!setlerYukleniyor &&
            !setlerHataliMi &&
            (ilerleme.length > 0 ? (
              <HareketKartlari ilerleme={ilerleme} setler={setler ?? []} secilenId={etkinSecim} onSec={setSecim} />
            ) : (
              <SetList sets={setler ?? []} />
            ))}
        </>
      )}

      {!oturumYukleniyor && !oturumHataliMi && !oturum && (
        <>
          <BosDurum
            ikon={Dumbbell}
            baslik="Bugün henüz antrenman yok"
            aciklama="İlk seti ekleyerek antrenmanı başlatın."
          />
          <SablonlaBasla onBasla={sablonlaBasla} bekliyor={baslatMutasyonu.isPending} />
        </>
      )}

      <AddSetForm egzersizId={etkinSecim} onEgzersizSec={setSecim} />
    </div>
  );
}
```

- [ ] **Step 7: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 15 dosya, **85** test PASS (79 + 6).

- [ ] **Step 8: Commit**

```bash
git add web/src
git commit -m "feat(web): bugun ekraninda sablonla baslatma ve hareket kartlari" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Dinlenme sayacı

**Files:**
- Modify: `web/src/lib/dinlenme.ts`, `web/src/components/AddSetForm.tsx`,
  `web/src/pages/TodayPage.test.tsx`
- Create: `web/src/lib/uyari.ts`, `web/src/components/DinlenmeSayaci.tsx`
- Test: `web/src/lib/dinlenme.test.ts`, `web/src/components/DinlenmeSayaci.test.tsx`,
  `web/src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `HareketIlerlemesi` ve `AcikOturum.progress` (Görev 3), `VARSAYILAN_DINLENME_SN` (Görev 2).
- Produces:
  - `lib/dinlenme.ts`: `EK_SURE_SN = 15`; `interface Dinlenme { bitisMs: number; toplamMs: number }`;
    `dinlenmeBaslat(simdiMs, saniye): Dinlenme | null` (saniye ≤ 0 → null);
    `kalanMs(d, simdiMs)`, `bittiMi(d, simdiMs)`, `sureEkle(d, saniye)`, `gecenOran(d, simdiMs)`,
    `kalanSureMetni(ms): string` (`m:ss`, yukarı yuvarlar), `dinlenmeSuresi(ilerleme, exerciseId): number`.
  - `lib/uyari.ts`: `sesiHazirla()`, `bipCal()`, `titret()`, `ekraniAcikTut(): Promise<(() => void) | null>`.
  - `components/DinlenmeSayaci` (`{ dinlenme: Dinlenme | null; onDegis: (d: Dinlenme | null) => void }`
    — `onDegis` kararlı olmalı, `useState` setter'ı verilir).

**Zaman modeli:** yalnızca bitiş anı ve toplam süre tutulur; kalan süre `Date.now()`'dan hesaplanır
(sekme arka plandan dönünce doğru). Başlangıç anı `bitisMs - toplamMs`'tir (`sureEkle` ikisini
birlikte artırır, değişmez). Bileşenin saniyelik `simdi` durumu yeni bir sayaç başlarken eski
kalabileceği için görüntüde `max(simdi, baslangic)` kullanılır — efektte `setState` gerekmez.

**Canlı bölge:** sayaç `role="status"` bir `sr-only` paragrafı HER ZAMAN render eder, yalnızca
bitişte "Dinlenme bitti" yazar (önceden var olan canlı bölge güvenilir duyurulur; geri sayım
saniyeleri duyurulmaz). Bu, sayfada ikinci bir `status` demektir: mevcut
`set eklenince durum satiri eklenen seti duyurur` testinin sorgusu aynı davranışı sınayacak şekilde
güncellenir (Step 7).

- [ ] **Step 1: Saf modül testleri (kırmızı)**

`web/src/lib/dinlenme.test.ts`:

```ts
import {
  bittiMi,
  dinlenmeBaslat,
  dinlenmeSuresi,
  gecenOran,
  kalanMs,
  kalanSureMetni,
  sureEkle,
  VARSAYILAN_DINLENME_SN,
} from './dinlenme';

const T0 = 1_000_000;

test('sifir ya da negatif sure sayac baslatmaz', () => {
  expect(dinlenmeBaslat(T0, 0)).toBeNull();
  expect(dinlenmeBaslat(T0, -5)).toBeNull();
});

test('kalan sure bitis anindan hesaplanir ve sifirin altina inmez', () => {
  const d = dinlenmeBaslat(T0, 120)!;
  expect(kalanMs(d, T0)).toBe(120_000);
  expect(kalanMs(d, T0 + 30_000)).toBe(90_000);
  expect(bittiMi(d, T0 + 119_999)).toBe(false);
  expect(kalanMs(d, T0 + 500_000)).toBe(0);
  expect(bittiMi(d, T0 + 120_000)).toBe(true);
});

test('sure eklemek bitisi ve toplami birlikte uzatir', () => {
  const d = sureEkle(dinlenmeBaslat(T0, 60)!, 15);
  expect(kalanMs(d, T0)).toBe(75_000);
  expect(d.toplamMs).toBe(75_000);
});

test('kalan sure m:ss bicimindedir ve saniyeye yukari yuvarlanir', () => {
  expect(kalanSureMetni(90_000)).toBe('1:30');
  expect(kalanSureMetni(89_001)).toBe('1:30');
  expect(kalanSureMetni(5_000)).toBe('0:05');
  expect(kalanSureMetni(0)).toBe('0:00');
  expect(kalanSureMetni(300_000)).toBe('5:00');
});

test('gecen oran baslangicta 0, yarida 0.5, bitince 1', () => {
  const d = dinlenmeBaslat(T0, 100)!;
  expect(gecenOran(d, T0)).toBe(0);
  expect(gecenOran(d, T0 + 50_000)).toBe(0.5);
  expect(gecenOran(d, T0 + 200_000)).toBe(1);
});

test('dinlenme suresi sablondaki hareketten gelir, plan disinda varsayilandir', () => {
  const ilerleme = [
    { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 4, completedSets: 0, restSeconds: 180 },
    { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, completedSets: 0, restSeconds: 0 },
  ];
  expect(dinlenmeSuresi(ilerleme, 1)).toBe(180);
  expect(dinlenmeSuresi(ilerleme, 2)).toBe(0);
  expect(dinlenmeSuresi(ilerleme, 99)).toBe(VARSAYILAN_DINLENME_SN);
  expect(dinlenmeSuresi([], 1)).toBe(VARSAYILAN_DINLENME_SN);
});
```

Run: `cd web && npm run test -- dinlenme.test` → FAIL (fonksiyonlar yok).

- [ ] **Step 2: `lib/dinlenme.ts` — tamamen**

```ts
import type { HareketIlerlemesi } from '../api/queries';

/**
 * Backend'deki `TemplateExercise.DefaultRestSeconds` ile AYNI deger (spec Karar 1 ve 6): yeni sablon
 * satirinin dinlenmesi ve sablonda olmayan hareketin sayac suresi. Degisirse ikisi birlikte degisir.
 */
export const VARSAYILAN_DINLENME_SN = 90;

export const EK_SURE_SN = 15;

/**
 * Sayac durumu yalnizca bitis ani ve toplam sureden ibarettir (spec Karar 6): kalan sure her an
 * `Date.now()`'dan hesaplanir, boylece sekme arka plandan donunce dogru gorunur. Baslangic ani
 * `bitisMs - toplamMs`dir.
 */
export interface Dinlenme {
  bitisMs: number;
  toplamMs: number;
}

export function dinlenmeBaslat(simdiMs: number, saniye: number): Dinlenme | null {
  if (saniye <= 0) {
    return null;
  }
  return { bitisMs: simdiMs + saniye * 1000, toplamMs: saniye * 1000 };
}

export function kalanMs(dinlenme: Dinlenme, simdiMs: number): number {
  return Math.max(0, dinlenme.bitisMs - simdiMs);
}

export function bittiMi(dinlenme: Dinlenme, simdiMs: number): boolean {
  return kalanMs(dinlenme, simdiMs) === 0;
}

export function sureEkle(dinlenme: Dinlenme, saniye: number): Dinlenme {
  return { bitisMs: dinlenme.bitisMs + saniye * 1000, toplamMs: dinlenme.toplamMs + saniye * 1000 };
}

export function gecenOran(dinlenme: Dinlenme, simdiMs: number): number {
  return Math.min(1, 1 - kalanMs(dinlenme, simdiMs) / dinlenme.toplamMs);
}

/** `m:ss`; saniye YUKARI yuvarlanir ki "0:00" ancak sure gercekten dolunca gorunsun. */
export function kalanSureMetni(ms: number): string {
  const toplamSaniye = Math.ceil(ms / 1000);
  const dakika = Math.floor(toplamSaniye / 60);
  const saniye = toplamSaniye % 60;
  return `${dakika}:${String(saniye).padStart(2, '0')}`;
}

/**
 * Eklenen setin hareketi sablondaysa onun `restSeconds`'i (0 = sayac yok), degilse (plan disi ya da
 * sablonsuz antrenman) varsayilan (spec Karar 6). Sure sunucunun ilerleme yanitindan okunur.
 */
export function dinlenmeSuresi(ilerleme: readonly HareketIlerlemesi[], exerciseId: number): number {
  return ilerleme.find((hareket) => hareket.exerciseId === exerciseId)?.restSeconds ?? VARSAYILAN_DINLENME_SN;
}
```

Run: `cd web && npm run test -- dinlenme.test` → 6 PASS.

- [ ] **Step 3: `lib/uyari.ts` — tarayıcı yan etkileri (hepsi desteklenmezse sessizce atlanır)**

```ts
/**
 * Dinlenme bitis uyarilari ve ekran kilidi (spec Karar 6, Riskler). Hepsi istege baglidir: API yoksa
 * (iOS Safari'de titresim, eski tarayicida Wake Lock, jsdom'da hicbiri) sessizce atlanir; sayac yine
 * calisir.
 */

let sesBaglami: AudioContext | null = null;

/**
 * Tarayicilar sesi ancak kullanici etkilesimiyle acilmis/surdurulmus bir AudioContext ile calar. Bu
 * yuzden "Set ekle" dokunusunda cagrilir; bitis bipi aylar sonra degil ~dakikalar sonra ayni baglamla
 * calar.
 */
export function sesiHazirla(): void {
  if (typeof window.AudioContext === 'undefined') {
    return;
  }
  sesBaglami ??= new AudioContext();
  if (sesBaglami.state === 'suspended') {
    void sesBaglami.resume();
  }
}

export function bipCal(): void {
  if (!sesBaglami) {
    return;
  }
  const osilator = sesBaglami.createOscillator();
  const kazanc = sesBaglami.createGain();
  osilator.frequency.value = 880;
  kazanc.gain.value = 0.2;
  osilator.connect(kazanc).connect(sesBaglami.destination);
  const baslangic = sesBaglami.currentTime;
  osilator.start(baslangic);
  osilator.stop(baslangic + 0.2);
}

export function titret(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(200);
  }
}

/** Ekrani acik tutar; birakma fonksiyonu doner. Destek yoksa ya da istek reddedilirse `null`. */
export async function ekraniAcikTut(): Promise<(() => void) | null> {
  if (!('wakeLock' in navigator)) {
    return null;
  }
  try {
    const kilit = await navigator.wakeLock.request('screen');
    return () => {
      void kilit.release();
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Bileşen testleri (kırmızı)**

`web/src/components/DinlenmeSayaci.test.tsx`:

```tsx
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DinlenmeSayaci from './DinlenmeSayaci';
import { dinlenmeBaslat, type Dinlenme } from '../lib/dinlenme';

function Sarmalayici({ saniye }: { saniye: number | null }) {
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(() =>
    saniye === null ? null : dinlenmeBaslat(Date.now(), saniye),
  );
  return <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />;
}

// Sahte zamanlayicilar Date'i de sahteler; userEvent yerine fireEvent (userEvent kendi gecikmelerini
// sahte saatle bekler).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('kalan sure gorunur ve saniyede bir azalir', () => {
  render(<Sarmalayici saniye={90} />);

  expect(screen.getByText('1:30')).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.getByText('1:00')).toBeInTheDocument();
});

test('+15 sn sureyi uzatir, Atla sayaci kaldirir', () => {
  render(<Sarmalayici saniye={60} />);

  fireEvent.click(screen.getByRole('button', { name: '+15 sn' }));
  expect(screen.getByText('1:15')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Atla' }));
  expect(screen.queryByText('1:15')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
});

test('sure dolunca Dinlenme bitti duyurulur, titresir ve birkac saniye sonra satir kaybolur', () => {
  const titresim = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: titresim, configurable: true });
  try {
    render(<Sarmalayici saniye={5} />);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Dinlenme bitti');
    expect(titresim).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByText('Dinlenme bitti')).not.toBeInTheDocument();
  } finally {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
});

test('sayac yokken gorunur satir yoktur ama canli bolge hazirdir', () => {
  render(<Sarmalayici saniye={null} />);

  expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
```

Run: `cd web && npm run test -- DinlenmeSayaci` → FAIL (modül yok).

- [ ] **Step 5: `DinlenmeSayaci`**

`web/src/components/DinlenmeSayaci.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  bittiMi,
  EK_SURE_SN,
  gecenOran,
  kalanMs,
  kalanSureMetni,
  sureEkle,
  type Dinlenme,
} from '../lib/dinlenme';
import { bipCal, ekraniAcikTut, titret } from '../lib/uyari';

const BITTI_GORUNME_MS = 3000;
const KUCUK_DUGME = 'h-11 rounded-lg bg-surface-3 px-3 text-label text-fg';

interface Props {
  dinlenme: Dinlenme | null;
  // Kararli olmali (useState setter'i): bitis zamanlayicisinin bagimliligidir.
  onDegis: (dinlenme: Dinlenme | null) => void;
}

/**
 * Set ekle panelinin ustundeki dinlenme satiri (spec Karar 6). Mantik `lib/dinlenme.ts`'te; bu
 * bilesen goruntuler, saniyede bir yenilenir, bitiste titresim + bip + duyuru yapar ve birkac saniye
 * sonra satiri kaldirir. Calisirken ekran acik tutulur (Wake Lock; sayfa gorunur olunca yeniden).
 */
export default function DinlenmeSayaci({ dinlenme, onDegis }: Props) {
  const [simdi, setSimdi] = useState(() => Date.now());
  // Yeni bir sayac basladiginda `simdi` bir onceki tikten kalma olabilir; baslangic anindan once
  // olamaz (bkz. Dinlenme yorumu).
  const etkinSimdi = dinlenme ? Math.max(simdi, dinlenme.bitisMs - dinlenme.toplamMs) : simdi;
  const bitti = dinlenme !== null && bittiMi(dinlenme, etkinSimdi);
  const calisiyor = dinlenme !== null && !bitti;

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [calisiyor]);

  useEffect(() => {
    if (!bitti) {
      return;
    }
    titret();
    bipCal();
    const zamanlayici = setTimeout(() => onDegis(null), BITTI_GORUNME_MS);
    return () => clearTimeout(zamanlayici);
  }, [bitti, onDegis]);

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    let birak: (() => void) | null = null;
    let iptal = false;
    const iste = () => {
      void ekraniAcikTut().then((yeniBirak) => {
        if (iptal) {
          yeniBirak?.();
          return;
        }
        birak?.();
        birak = yeniBirak;
      });
    };
    // Tarayici sayfa gizlenince kilidi kendisi birakir; gorunur olunca yeniden istenir.
    const gorunurlukDegisti = () => {
      if (document.visibilityState === 'visible') {
        setSimdi(Date.now());
        iste();
      }
    };
    iste();
    document.addEventListener('visibilitychange', gorunurlukDegisti);
    return () => {
      iptal = true;
      document.removeEventListener('visibilitychange', gorunurlukDegisti);
      birak?.();
    };
  }, [calisiyor]);

  return (
    <>
      {/* Canli bolge HER ZAMAN var; yalnizca bitiste dolar. Geri sayim saniyeleri duyurulmaz. */}
      <p role="status" className="sr-only">
        {bitti ? 'Dinlenme bitti' : ''}
      </p>
      {dinlenme && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Timer aria-hidden size={18} className="text-muted" />
              {bitti ? (
                <span aria-hidden className="text-body-lg font-semibold">
                  Dinlenme bitti
                </span>
              ) : (
                <>
                  <span className="text-label text-muted uppercase">Dinlenme</span>
                  <span className="text-metric tabular-nums">{kalanSureMetni(kalanMs(dinlenme, etkinSimdi))}</span>
                </>
              )}
            </span>
            {!bitti && (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => onDegis(sureEkle(dinlenme, EK_SURE_SN))} className={KUCUK_DUGME}>
                  +15 sn
                </button>
                <button type="button" onClick={() => onDegis(null)} className={KUCUK_DUGME}>
                  Atla
                </button>
              </span>
            )}
          </div>
          {!bitti && (
            <progress
              aria-hidden
              value={gecenOran(dinlenme, etkinSimdi)}
              max={1}
              // Yerel ilerleme cubugunun parcalari yalnizca tarayiciya ozgu sozde elemanlarla boyanir;
              // token karsiligi olan bir yardimci sinif yok.
              className="h-1 w-full appearance-none overflow-hidden rounded-full bg-surface-4 [&::-moz-progress-bar]:bg-fg [&::-webkit-progress-bar]:bg-surface-4 [&::-webkit-progress-value]:bg-fg"
            />
          )}
        </div>
      )}
    </>
  );
}
```

Görünen "Dinlenme bitti" `aria-hidden`: duyuruyu canlı bölge yapar, ekran okuyucu iki kez okumaz.
Testteki `queryByText('Dinlenme bitti')` gizli metni de bulur; bu yüzden satır kaybolduktan sonra
sınanır.

Run: `cd web && npm run test -- DinlenmeSayaci` → 4 PASS.

- [ ] **Step 6: `AddSetForm` sayacı başlatır**

`web/src/components/AddSetForm.tsx`:
- import'lar:

```tsx
import { dinlenmeBaslat, dinlenmeSuresi, type Dinlenme } from '../lib/dinlenme';
import { sesiHazirla } from '../lib/uyari';
import DinlenmeSayaci from './DinlenmeSayaci';
```

- `sonEklenen` durumunun ALTINA:

```tsx
  // Spec Karar 6: her basarili set sonrasi yeniden baslar; hareket secimini degistirmek durdurmaz.
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(null);
```

- `gonder`'in ilk satırı `e.preventDefault();`'in ALTINA:

```tsx
    // Ses ancak kullanici etkilesimiyle acilabilir: "Set ekle" dokunusu bu etkilesimdir.
    sesiHazirla();
```

- `mutateAsync` başarılı olduktan sonra, `setSonEklenen(...)` satırının ALTINA:

```tsx
      setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(acikOturum?.progress ?? [], egzersizId)));
```

(Plan dışı hareket ya da şablonsuz antrenmanda 90 sn; şablonda `0` ise `null` — açık sayaç da durur.)

- Panelin iç `<div … bg-surface-3 p-4 shadow-2xl>`'inin İLK çocuğu:

```tsx
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />
```

- [ ] **Step 7: `TodayPage.test.tsx` — ikinci canlı bölge ve sayaç testleri**

Mevcut `set eklenince durum satiri eklenen seti duyurur` testinde:

```tsx
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Eklendi: 82,5 kg × 5'),
  );
```

yerine (panelde artık dinlenme sayacının canlı bölgesi de var; aynı davranış: metin bir `status`
bölgesinde):

```tsx
  expect(await screen.findByText('Eklendi: 82,5 kg × 5')).toHaveAttribute('role', 'status');
```

Dosyanın SONUNA (yalnızca `Date` sahtelenir: MSW, TanStack Query ve userEvent gerçek
zamanlayıcılarla çalışmaya devam eder; saat donduğu için görüntü yavaş CI'da da "2:00" kalır):

```tsx
describe('dinlenme sayaci', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('sablondaki harekete set eklenince sayac hareketin restSeconds degeriyle baslar', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0, 120)]) });
    const kullanici = userEvent.setup();
    bugunSayfasiniOlustur();

    await egzersizSecimineBekle();
    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('2:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+15 sn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atla' })).toBeInTheDocument();
  });

  test('restSeconds 0 olan harekette sayac baslamaz', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0, 0)]) });
    const kullanici = userEvent.setup();
    bugunSayfasiniOlustur();

    await egzersizSecimineBekle();
    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('Eklendi: 60 kg × 8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
  });

  test('sablonsuz antrenmanda sayac varsayilan 90 sn ile baslar', async () => {
    sahteSunucuyuKur();
    const kullanici = userEvent.setup();
    bugunSayfasiniOlustur();

    await egzersizSecimineBekle();
    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('1:30')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 17 dosya, **98** test PASS (85 + 6 + 4 + 3).

Tip hatası `navigator.wakeLock` / `AudioContext` için çıkarsa `tsconfig.app.json`'daki `lib`'in
`DOM`'u içerdiğini doğrula (içeriyor olmalı); `any` ile susturma.

- [ ] **Step 9: Commit**

```bash
git add web/src
git commit -m "feat(web): setler arasi dinlenme sayaci" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Hareket geçmişi grafiği

**Files:**
- Modify: `web/src/api/queries.ts`, `web/src/lib/format.ts`, `web/src/components/HareketKartlari.tsx`,
  `web/src/pages/TodayPage.tsx`, `web/src/pages/TodayPage.test.tsx`
- Create: `web/src/ui/HacimGrafigi.tsx`, `web/src/components/HareketGecmisi.tsx`
- Test: `web/src/lib/format.test.ts`, `web/src/ui/HacimGrafigi.test.tsx`,
  `web/src/components/HareketGecmisi.test.tsx`, `web/src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `GecmisOturum`, `dogrulanmisGecmisSayfasi` (mevcut), `HareketKartlari` (Görev 3).
- Produces:
  - `queries.ts`: `queryKeys.exerciseHistory(exerciseId: number)` (`['exerciseHistory', id]`);
    `useExerciseHistory(exerciseId: number | null)` → `GecmisOturum[]` (sunucu sırası: yeniden eskiye);
    `useAddSet` bu anahtarı eklenen setin egzersizi için tazeler.
  - `lib/format.ts`: `formatKisaTarih(iso: string): string` → `"12 Eyl"` (TR günü).
  - `ui/HacimGrafigi` (`{ noktalar: GrafikNoktasi[]; baslik: string }`,
    `interface GrafikNoktasi { etiket: string; deger: number; vurgulu?: boolean }`) — API bilmez.
  - `components/HareketGecmisi` (`{ exerciseId: number; exerciseName: string; bugunkuOturumId: number | null }`).
  - `HareketKartlari` yeni prop: `bugunkuOturumId: number`.

**Kullanıcı sayıları nereden:** çubuk değerleri ve "Geçen sefer" satırı `GET /api/history?ExerciseId=&PageSize=10`
yanıtının `totalVolume`/`setCount`'udur; sunucu egzersiz filtresinde bunları YALNIZCA o egzersizin
setlerinden hesaplar (Faz 9 Karar 8). İstemci yalnızca sırayı çevirir ve bugünü işaretler.

- [ ] **Step 1: Testler (kırmızı)**

`web/src/lib/format.test.ts` — import'a `formatKisaTarih` ekle, dosyanın SONUNA:

```ts
test('formatKisaTarih gun ve kisa ay adini TR gunune gore verir', () => {
  expect(formatKisaTarih('2026-09-12T08:00:00Z')).toBe('12 Eyl');
  // UTC 22:30 -> TR 01:30, ERTESI GUN.
  expect(formatKisaTarih('2026-09-12T22:30:00Z')).toBe('13 Eyl');
});
```

`web/src/ui/HacimGrafigi.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import HacimGrafigi from './HacimGrafigi';

const NOKTALAR = [
  { etiket: '8 Eyl', deger: 1200 },
  { etiket: '10 Eyl', deger: 2400 },
  { etiket: 'Bugün', deger: 800, vurgulu: true },
];

test('grafik ozet adini tasir ve noktalari sirasiyla ekran okuyucu listesi olarak verir', () => {
  render(<HacimGrafigi noktalar={NOKTALAR} baslik="Bench Press hacmi, son 3 antrenman" />);

  expect(screen.getByRole('img', { name: 'Bench Press hacmi, son 3 antrenman' })).toBeInTheDocument();
  const maddeler = screen.getAllByRole('listitem');
  expect(maddeler.map((madde) => madde.textContent)).toEqual([
    '8 Eyl: 1.200 kg',
    '10 Eyl: 2.400 kg',
    'Bugün: 800 kg',
  ]);
});

test('en yuksek deger yalnizca bir kez kg ile yazilir', () => {
  render(<HacimGrafigi noktalar={NOKTALAR} baslik="Hacim" />);

  expect(screen.getAllByText('2.400 kg')).toHaveLength(1);
  expect(screen.queryByText('1.200 kg')).not.toBeInTheDocument();
});
```

`web/src/components/HareketGecmisi.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import HareketGecmisi from './HareketGecmisi';
import type { components } from '../api/schema';

type HistorySessionResponse = components['schemas']['HistorySessionResponse'];

function gecmisiOlustur(bugunkuOturumId: number | null = 9) {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <HareketGecmisi exerciseId={1} exerciseName="Bench Press" bugunkuOturumId={bugunkuOturumId} />
    </QueryClientProvider>,
  );
}

function oturum(sessionId: number, startedAt: string, totalVolume: number, setCount: number): HistorySessionResponse {
  return { sessionId, startedAt, endedAt: null, templateName: null, notes: null, totalVolume, setCount, sets: [] };
}

function sunucuyuKur(items: HistorySessionResponse[]) {
  const aramalar: URLSearchParams[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      aramalar.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items, page: 1, pageSize: 10, totalCount: items.length, totalPages: 1 });
    }),
  );
  return aramalar;
}

// Sunucu sirasi: yeniden eskiye. 9 = bugunku acik oturum.
const OTURUMLAR = [
  oturum(9, '2026-09-13T08:00:00Z', 800, 1),
  oturum(5, '2026-09-10T08:00:00Z', 2400, 3),
  oturum(3, '2026-09-08T08:00:00Z', 1200, 2),
];

test('ExerciseId ve PageSize=10 ile ister; cubuklar eskiden yeniye sunucunun hacimleriyle, bugun vurgulu', async () => {
  const aramalar = sunucuyuKur(OTURUMLAR);
  gecmisiOlustur();

  expect(await screen.findByRole('img', { name: 'Bench Press hacmi, son 3 antrenman' })).toBeInTheDocument();
  expect(aramalar[0].get('ExerciseId')).toBe('1');
  expect(aramalar[0].get('PageSize')).toBe('10');
  expect(screen.getAllByRole('listitem').map((madde) => madde.textContent)).toEqual([
    '8 Eyl: 1.200 kg',
    '10 Eyl: 2.400 kg',
    'Bugün: 800 kg',
  ]);
});

test('Gecen sefer satiri bugunden onceki en yeni oturumun sunucu degerlerini gosterir', async () => {
  sunucuyuKur(OTURUMLAR);
  gecmisiOlustur();

  expect(await screen.findByText('Geçen sefer: 3 set · 2.400 kg')).toBeInTheDocument();
});

test('bugunden once hic oturum yoksa Bu hareketin ilk antrenmani der ve grafik cizilmez', async () => {
  sunucuyuKur([oturum(9, '2026-09-13T08:00:00Z', 800, 1)]);
  gecmisiOlustur();

  expect(await screen.findByText('Bu hareketin ilk antrenmanı')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
```

`web/src/pages/TodayPage.test.tsx` — `describe('dinlenme sayaci', …)` bloğunun ÜSTÜNE:

```tsx
test('sablonsuz oturumda secili hareketin gecmisi istenir ve set eklenince yeniden istenir', async () => {
  const acikOturum: SessionResponse = {
    id: 40,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    notes: null,
    progress: [],
  };
  const ortam = sahteSunucuyuKur({ baslangicOturumu: acikOturum });
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await waitFor(() => expect(ortam.gecmisAramalari().length).toBeGreaterThan(0));
  expect(ortam.gecmisAramalari()[0]).toContain('ExerciseId=1');
  const ilkSayi = ortam.gecmisAramalari().length;

  await setEkle(kullanici, '60', '8');

  await waitFor(() => expect(ortam.gecmisAramalari().length).toBeGreaterThan(ilkSayi));
});
```

Run: `cd web && npm run test -- format HacimGrafigi HareketGecmisi TodayPage` → yeni testler FAIL.

- [ ] **Step 2: `format.ts` ve `queries.ts`**

`web/src/lib/format.ts` — `formatTrTime`'ın ALTINA:

```ts
/** Grafik ekseni icin kisa tarih ("12 Eyl"), TR gunune gore. */
export function formatKisaTarih(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_ZAMAN_DILIMI,
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}
```

`web/src/api/queries.ts`:
- `queryKeys`'e: `exerciseHistory: (exerciseId: number) => ['exerciseHistory', exerciseId] as const,`
- `useHistory`'nin ALTINA:

```ts
/**
 * Bir hareketin son 10 oturumu (spec Karar 9). Egzersiz filtresi verildiginde sunucu her oturumun
 * `totalVolume`/`setCount`'unu YALNIZCA o egzersizin setlerinden hesaplar -- istemci toplamaz.
 * Acik bugunku oturum da (o harekete set girildiyse) listededir.
 */
export function useExerciseHistory(exerciseId: number | null) {
  return useQuery({
    queryKey: queryKeys.exerciseHistory(exerciseId ?? 0),
    queryFn: async (): Promise<GecmisOturum[]> => {
      const yanit = await request<HistorySessionResponsePagedResponse>(
        `/history?ExerciseId=${exerciseId}&PageSize=10`,
      );
      return dogrulanmisGecmisSayfasi(yanit).items;
    },
    enabled: exerciseId !== null,
  });
}
```

- `useAddSet`'in `onSuccess`'ine (son satır):

```ts
      // Bugunku cubuk buyusun (spec Karar 9): yalnizca eklenen setin hareketi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseHistory(set.exerciseId) });
```

- [ ] **Step 3: `HacimGrafigi`**

`web/src/ui/HacimGrafigi.tsx`:

```tsx
import { formatWeight } from '../lib/format';

export interface GrafikNoktasi {
  etiket: string;
  deger: number;
  vurgulu?: boolean;
}

interface Props {
  noktalar: GrafikNoktasi[];
  // SVG'nin erisilebilir ozet adi (ör. "Bench Press hacmi, son 6 antrenman").
  baslik: string;
}

// viewBox birimleri: her nokta ADIM genisliginde bir yuva, cubuk yuvanin ortasinda.
const YUKSEKLIK = 100;
const ADIM = 10;
const CUBUK = 6;
const EN_KISA_CUBUK = 2;

/**
 * Veri bilmeyen cubuk grafik (spec Karar 9): hareket, oturum ya da API bilmez; bugun Bugun ekraninda,
 * ileride Rekorlar/istatistik ekranlarinda aynen kullanilir. Kutuphane YOK, elle SVG.
 *
 * Yatayda yayilmak icin `preserveAspectRatio="none"` kullanilir; bu metni bozacagi icin etiketler
 * SVG'nin DISINDA, ayni yuva genisliginde (`flex-1`) HTML satirlaridir. Renkler: cubuk `surface-4`,
 * vurgulu (bugun) `fg`; accent KULLANILMAZ. Ayni veri ekran okuyucuya gizli bir listeyle verilir.
 */
export default function HacimGrafigi({ noktalar, baslik }: Props) {
  const enBuyuk = Math.max(0, ...noktalar.map((nokta) => nokta.deger));
  const enBuyukSira = enBuyuk > 0 ? noktalar.findIndex((nokta) => nokta.deger === enBuyuk) : -1;

  return (
    <figure className="flex flex-col gap-1">
      <div aria-hidden className="flex">
        {noktalar.map((nokta, sira) => (
          <span
            key={`${nokta.etiket}-${sira}`}
            className="min-w-0 flex-1 text-center text-label-xs whitespace-nowrap text-muted tabular-nums"
          >
            {sira === enBuyukSira ? `${formatWeight(nokta.deger)} kg` : ''}
          </span>
        ))}
      </div>
      <svg
        role="img"
        aria-label={baslik}
        viewBox={`0 0 ${noktalar.length * ADIM} ${YUKSEKLIK}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
      >
        {noktalar.map((nokta, sira) => {
          const yukseklik =
            enBuyuk > 0 ? Math.max(EN_KISA_CUBUK, (nokta.deger / enBuyuk) * YUKSEKLIK) : EN_KISA_CUBUK;
          return (
            <rect
              key={`${nokta.etiket}-${sira}`}
              x={sira * ADIM + (ADIM - CUBUK) / 2}
              y={YUKSEKLIK - yukseklik}
              width={CUBUK}
              height={yukseklik}
              rx={1}
              className={nokta.vurgulu ? 'fill-fg' : 'fill-surface-4'}
            />
          );
        })}
      </svg>
      <div aria-hidden className="flex">
        {noktalar.map((nokta, sira) => (
          <span
            key={`${nokta.etiket}-${sira}`}
            className={`min-w-0 flex-1 text-center text-label-xs whitespace-nowrap ${nokta.vurgulu ? 'text-fg' : 'text-muted'}`}
          >
            {nokta.etiket}
          </span>
        ))}
      </div>
      <ul className="sr-only">
        {noktalar.map((nokta, sira) => (
          <li key={`${nokta.etiket}-${sira}`}>
            {nokta.etiket}: {formatWeight(nokta.deger)} kg
          </li>
        ))}
      </ul>
    </figure>
  );
}
```

- [ ] **Step 4: `HareketGecmisi`**

`web/src/components/HareketGecmisi.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useExerciseHistory } from '../api/queries';
import { formatKisaTarih, formatWeight } from '../lib/format';
import HacimGrafigi from '../ui/HacimGrafigi';

interface Props {
  exerciseId: number;
  exerciseName: string;
  bugunkuOturumId: number | null;
}

/**
 * Secili hareketin hacim gecmisi (spec Karar 9): veriyi ceker, sunucunun yeniden-eskiye sirasini
 * eskiden yeniye cevirir, bugunku oturumu vurgular. "Gecen sefer" bugunden onceki en yeni oturumun
 * sunucudan gelen `setCount`/`totalVolume`'udur ("en agir set" gibi istemci turetimi YOK).
 *
 * Yukleme/hata metinleri `role="alert"` DEGIL: bolum ikincil bilgidir, set girisini engellemez.
 */
export default function HareketGecmisi({ exerciseId, exerciseName, bugunkuOturumId }: Props) {
  const { data: oturumlar, isLoading, isError } = useExerciseHistory(exerciseId);
  const baslikId = `hareket-gecmisi-${exerciseId}`;

  let icerik: ReactNode;
  if (isLoading) {
    icerik = <p className="text-body text-muted">Yükleniyor...</p>;
  } else if (isError || !oturumlar) {
    icerik = <p className="text-body text-muted">Geçmiş alınamadı.</p>;
  } else {
    const oncekiler = oturumlar.filter((oturum) => oturum.sessionId !== bugunkuOturumId);
    if (oncekiler.length === 0) {
      icerik = <p className="text-body text-muted">Bu hareketin ilk antrenmanı</p>;
    } else {
      const noktalar = [...oturumlar].reverse().map((oturum) => {
        const bugun = oturum.sessionId === bugunkuOturumId;
        return {
          etiket: bugun ? 'Bugün' : formatKisaTarih(oturum.startedAt),
          deger: oturum.totalVolume,
          vurgulu: bugun,
        };
      });
      const gecenSefer = oncekiler[0];
      icerik = (
        <>
          <HacimGrafigi noktalar={noktalar} baslik={`${exerciseName} hacmi, son ${noktalar.length} antrenman`} />
          <p className="text-label text-muted tabular-nums">
            Geçen sefer: {gecenSefer.setCount} set · {formatWeight(gecenSefer.totalVolume)} kg
          </p>
        </>
      );
    }
  }

  return (
    <section aria-labelledby={baslikId} className="flex flex-col gap-2 pt-2">
      <h3 id={baslikId} className="text-label text-muted uppercase">
        Geçmiş
      </h3>
      {icerik}
    </section>
  );
}
```

Testteki `findByText('Geçen sefer: 3 set · 2.400 kg')` birden fazla metin düğümüne bölünmüş içeriği
de bulur (tek eleman, `textContent` eşleşmesi değil — RTL varsayılan eşleyicisi elemanın kendi metin
düğümlerini birleştirir). Bulamazsa JSX'i tek şablon dizgisine çevir:
`{`Geçen sefer: ${gecenSefer.setCount} set · ${formatWeight(gecenSefer.totalVolume)} kg`}`.

- [ ] **Step 5: Yerleşim**

`web/src/components/HareketKartlari.tsx`:
- `import HareketGecmisi from './HareketGecmisi';`
- `Props`'a `bugunkuOturumId: number;` ekle, imzaya ekle.
- Kartın set listesinin (`hareketSetleri.length > 0 && …`) ALTINA:

```tsx
              {secili && (
                <HareketGecmisi
                  exerciseId={hareket.exerciseId}
                  exerciseName={hareket.exerciseName}
                  bugunkuOturumId={bugunkuOturumId}
                />
              )}
```

`web/src/pages/TodayPage.tsx`:
- `import HareketGecmisi from '../components/HareketGecmisi';`
- `etkinSecim` satırının ALTINA:

```tsx
  const seciliEgzersizAdi = egzersizler?.find((eg) => eg.id === etkinSecim)?.name ?? null;
```

- Set listesi dalı:

```tsx
            (ilerleme.length > 0 ? (
              <HareketKartlari
                ilerleme={ilerleme}
                setler={setler ?? []}
                secilenId={etkinSecim}
                onSec={setSecim}
                bugunkuOturumId={gorunenOturum.id}
              />
            ) : (
              <>
                {/* Sablonsuz antrenmanda panelde secili hareketin gecmisi, set listesinin USTUNDE (Karar 9). */}
                {etkinSecim !== null && seciliEgzersizAdi && (
                  <HareketGecmisi
                    exerciseId={etkinSecim}
                    exerciseName={seciliEgzersizAdi}
                    bugunkuOturumId={gorunenOturum.id}
                  />
                )}
                <SetList sets={setler ?? []} />
              </>
            ))}
```

- [ ] **Step 6: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 19 dosya, **105** test PASS (98 + 1 + 2 + 3 + 1).

`fill-fg` / `fill-surface-4` sınıflarının derlenen CSS'te olduğunu doğrula:
`grep -o 'fill-surface-4\|fill-fg' web/dist/assets/*.css | sort -u` → ikisi de var.

- [ ] **Step 7: Commit**

```bash
git add web/src
git commit -m "feat(web): secili hareketin hacim gecmisi grafigi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Geçmiş'te antrenman türü

**Files:**
- Modify: `web/src/api/queries.ts`, `web/src/pages/HistoryPage.tsx`
- Test: `web/src/pages/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: `ui/TurEtiketi` (Görev 3).
- Produces: `GecmisOturum.templateName: string | null`.

- [ ] **Step 1: Test (kırmızı)**

`web/src/pages/HistoryPage.test.tsx` — dosyanın SONUNA:

```tsx
test('kart ozetinde sablon adi ya da Serbest gorunur', async () => {
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json(
        sayfaYaniti([
          ornekOturum({ sessionId: 2, startedAt: '2026-09-11T08:00:00Z', templateName: 'Push Day' }),
          ornekOturum({ sessionId: 1, startedAt: '2026-09-10T08:00:00Z', templateName: null }),
        ]),
      ),
    ),
  );

  gecmisSayfasiniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar[0]).toHaveTextContent('Push Day');
  expect(satirlar[1]).toHaveTextContent('Serbest');
});
```

Run: `cd web && npm run test -- HistoryPage` → FAIL.

- [ ] **Step 2: Uygula**

`web/src/api/queries.ts`: `GecmisOturum`'a `templateName: string | null;`, `dogrulanmisGecmisOturum`
dönüşüne `templateName: yanit.templateName ?? null,`.

`web/src/pages/HistoryPage.tsx`: `import TurEtiketi from '../ui/TurEtiketi';`; özetteki tarih
satırı:

```tsx
                        <span className="flex flex-wrap items-center gap-2 text-label">
                          <span className="flex items-center gap-1">
                            <CalendarDays aria-hidden size={18} className="text-muted" />
                            {formatTrDate(oturum.startedAt)}
                          </span>
                          {/* Spec Karar 7: sablon adi ya da "Serbest"; notr hap, accent yok. */}
                          <TurEtiketi>{oturum.templateName ?? 'Serbest'}</TurEtiketi>
                        </span>
```

- [ ] **Step 3: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 19 dosya, **106** test PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): gecmis kartinda antrenman turu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7 (kontrolcü): Görsel doğrulama

Görev 1–6 incelemeleri temizlendikten SONRA, final tüm-branch incelemesinden ÖNCE. Alt ajana
verilmez; kod DEĞİŞTİRMEZ. Sapmalar deftere `Gorsel: <ekran> — <sapma> — <spec maddesi>` olarak yazılır
ve final incelemeye girdi olur. Çalışma dizini scratchpad altında `gorsel2/`.

- [ ] **Step 1: Sunucular ayakta mı**

```bash
curl -s -o /dev/null -w "api %{http_code}\n" http://localhost:5098/swagger/v1/swagger.json
curl -s -o /dev/null -w "web %{http_code}\n" http://localhost:5173/
```

Değilse: `docker compose up -d`, `dotnet run --project src/Grind.Api` (http profili),
`cd web && npm run dev` (arka planda).

- [ ] **Step 2: Örnek veri (yalnızca yerel dev veritabanı)**

`gorsel2/hazirla.mjs` — iki kullanıcı: `gorsel_sablon` (Push Day şablonu, iki GEÇMİŞ oturum, bugün açık
şablonlu oturum) ve `gorsel_bos` (yalnızca şablonlar, bugün oturum yok). API geçmiş tarihli set kabul
etmediği için geçmiş oturumlar bugün açılıp bitirilir, sonra `psql` ile tarihleri geri alınır. Tekrar
çalıştırılınca veri çoğaltmaz (geçmiş toplamı 0 değilse tohumlamaz):

```js
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const TABAN = 'http://localhost:5173/api';
const SIFRE = 'GorselTest123';

async function json(yol, secenek = {}, token) {
  const yanit = await fetch(TABAN + yol, {
    ...secenek,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const govde = yanit.status === 204 ? null : await yanit.json().catch(() => null);
  return { status: yanit.status, govde };
}

async function oturumAc(kullaniciAdi) {
  const kimlik = JSON.stringify({ username: kullaniciAdi, password: SIFRE });
  let sonuc = await json('/auth/register', { method: 'POST', body: kimlik });
  if (sonuc.status === 409) sonuc = await json('/auth/login', { method: 'POST', body: kimlik });
  if (sonuc.status !== 200 && sonuc.status !== 201) throw new Error(`${kullaniciAdi}: ${sonuc.status}`);
  return sonuc.govde;
}

function depoDosyasiYaz(dosya, kimlik) {
  const deger = JSON.stringify({ token: kimlik.token, expiresAtUtc: kimlik.expiresAtUtc, username: kimlik.username });
  writeFileSync(dosya, JSON.stringify({
    cookies: [],
    origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'grind.oturum', value: deger }] }],
  }));
}

function psql(sql) {
  execSync(`docker exec grind-db psql -U grind -d grind -c "${sql.replaceAll('"', '\\"')}"`, { stdio: 'inherit' });
}

async function sablonKur(token) {
  const { govde: mevcut } = await json('/templates', {}, token);
  const bulunan = mevcut.find((s) => s.name === 'Push Day');
  if (bulunan) return bulunan;
  const { govde: egzersizler } = await json('/exercises', {}, token);
  const id = (ad) => egzersizler.find((e) => e.name === ad).id;
  const { govde } = await json('/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Push Day',
      exercises: [
        { exerciseId: id('Bench Press'), plannedSets: 4, restSeconds: 120 },
        { exerciseId: id('Overhead Press'), plannedSets: 3, restSeconds: 90 },
        { exerciseId: id('Triceps Pushdown'), plannedSets: 3, restSeconds: 60 },
      ],
    }),
  }, token);
  await json('/templates', {
    method: 'POST',
    body: JSON.stringify({ name: 'Pull Day', exercises: [{ exerciseId: id('Deadlift'), plannedSets: 3, restSeconds: 180 }] }),
  }, token);
  return govde;
}

async function setleriEkle(token, exerciseId, setler) {
  for (const [weight, reps] of setler) {
    await json('/sets', { method: 'POST', body: JSON.stringify({ exerciseId, weight, reps, rir: 2 }) }, token);
  }
}

const dolu = await oturumAc('gorsel_sablon');
const bos = await oturumAc('gorsel_bos');
const sablon = await sablonKur(dolu.token);
await sablonKur(bos.token);
const bench = sablon.exercises[0].exerciseId;

const { govde: gecmis } = await json('/history', {}, dolu.token);
if (gecmis.totalCount === 0) {
  for (const [gunOnce, setler] of [[6, [[70, 8], [70, 8], [72.5, 6]]], [3, [[75, 8], [75, 7], [77.5, 5], [77.5, 5]]]]) {
    const { govde: acilan } = await json('/sessions', { method: 'POST', body: JSON.stringify({ templateId: sablon.id }) }, dolu.token);
    await setleriEkle(dolu.token, bench, setler);
    await json(`/sessions/${acilan.id}/finish`, { method: 'POST' }, dolu.token);
    psql(`UPDATE "WorkoutSessions" SET "StartedAt" = "StartedAt" - interval '${gunOnce} days', "EndedAt" = "EndedAt" - interval '${gunOnce} days' WHERE "Id" = ${acilan.id};`);
    psql(`UPDATE "SetEntries" SET "CreatedAt" = "CreatedAt" - interval '${gunOnce} days' WHERE "WorkoutSessionId" = ${acilan.id};`);
  }
  await json('/sessions', { method: 'POST', body: JSON.stringify({ templateId: sablon.id }) }, dolu.token);
  await setleriEkle(dolu.token, bench, [[80, 8], [80, 6]]);
}

depoDosyasiYaz('gorsel2/dolu.json', dolu);
depoDosyasiYaz('gorsel2/bos.json', bos);
console.log('hazir', sablon.id);
```

Run: `node gorsel2/hazirla.mjs` → `hazir <id>`. (Global egzersiz adları `GlobalExercises.cs`'teki
seed'dir; adı bulunamazsa betiği o dosyaya göre düzelt.)

- [ ] **Step 3: Ekran görüntüleri (390×844)**

Tıklama gerektiren kare (çalışan sayaç) için CLI yetmez; `gorsel2/cek.mjs` Playwright kütüphanesiyle:

```bash
cd gorsel2 && npm init -y >/dev/null && npm i playwright@1 && npx playwright install chromium
```

```js
import { chromium } from 'playwright';

const W = 'http://localhost:5173';
const SABLON_ID = process.argv[2];
const tarayici = await chromium.launch();

async function sayfa(depo) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, storageState: depo });
  return baglam.newPage();
}

async function cek(depo, yol, dosya, { tam = false, once } = {}) {
  const p = await sayfa(depo);
  await p.goto(W + yol);
  await p.waitForTimeout(2000);
  if (once) await once(p);
  await p.screenshot({ path: dosya, fullPage: tam });
  await p.context().close();
}

await cek('dolu.json', '/templates', 'sablonlar.png');
await cek('dolu.json', `/templates/${SABLON_ID}`, 'duzenleyici.png', { tam: true });
await cek('dolu.json', '/templates/new', 'yeni-sablon.png');
await cek('bos.json', '/', 'bugun-bos-sablonlu.png', { tam: true });
await cek('dolu.json', '/', 'bugun-sablonlu.png', { tam: true });
await cek('dolu.json', '/', 'bugun-sayac.png', {
  once: async (p) => {
    await p.getByLabel('Ağırlık (kg)').fill('80');
    await p.getByLabel('Tekrar').fill('5');
    await p.getByRole('button', { name: 'Set ekle' }).click();
    await p.waitForTimeout(3000);
  },
});
await cek('dolu.json', '/history', 'gecmis.png');
await cek('dolu.json', '/', 'hesap-menusu.png', {
  once: async (p) => {
    await p.getByRole('button', { name: 'Hesap menüsü' }).click();
    await p.waitForTimeout(500);
  },
});
await tarayici.close();
```

Run: `cd gorsel2 && node cek.mjs <SABLON_ID>`

Not: `bugun-sayac.png` açık oturuma gerçek bir set ekler (yalnızca dev veritabanı); tekrar
çalıştırmak Bench'e set biriktirir, sorun değil.

- [ ] **Step 4: Denetle ve deftere yaz**

Her görüntüyü aç, spec'e ve görsel tasarım spec'ine göre denetle:
- `accent` yalnızca birincil düğmede ("Yeni şablon", "Kaydet", "Set ekle"), rekor rozetlerinde ve aktif
  sekmede; şablon hapı, seçili kart, sayaç, grafik çubukları, "Şablonlar" menü öğesi NÖTR.
- Şablon düzenleyici: satır kartları, yukarı/aşağı/kaldır düğmeleri ≥ 44 px, dinlenme seçimi okunur;
  ilk satırın "yukarı" ve son satırın "aşağı" düğmesi pasif görünür.
- Bugün (şablonlu): hareket kartları sırayla, "2 / 4 SET" büyük harf, tamamlanan kartta onay ikonu,
  seçili kartta halka + altında "GEÇMİŞ" başlığı, grafikte bugünkü çubuk açık renk ve "Bugün" etiketi,
  en yüksek değer çubuğun üstünde, "Geçen sefer" satırı.
- Sayaç satırı panelin EN ÜSTÜNDE: "DİNLENME" + `m:ss`, ince ilerleme çubuğu, "+15 sn" ve "Atla";
  panel son kartın/grafiğin üstünü örtmüyor (`bugun-sablonlu.png` tam sayfa).
- Bugün (boş): boş durumun altında "Şablonla başla", kartlarda "N hareket", "Şablonları yönet".
- Geçmiş: tarihin yanında "PUSH DAY" / "SERBEST" hapı, taşma yok.
- Hesap menüsü: "Şablonlar" üstte, "Çıkış yap" altta.

---

### Task 8 (kontrolcü): Dokümantasyon

Final tüm-branch incelemesinden ve düzeltme dalgasından SONRA.

- [ ] **Step 1:** Test sayılarını komutla belirle, KARIŞTIRMA: frontend `cd web && npm run test` özet
      satırı; backend `[Fact]` + her `[InlineData]` (`grep -rE '^\s*\[(Fact|InlineData)' tests/Grind.Tests | wc -l`
      — `[Theory]` sayılmaz).
- [ ] **Step 2:** `PLAN.md`:
  - "Durum Özeti" tablosuna `| F3 | Frontend dilim 2: şablonlar, dinlenme sayacı, hareket geçmişi | ✅ |`.
  - "Frontend Görsel Tasarım" bölümünün altına "Frontend Dilim 2 — Şablonlar ve dinlenme ✅" bölümü:
    spec/plan bağlantıları; ne yapıldı (backend `RestSeconds` + migration, şablon ekranları, şablonla
    başlatma ve hareket kartları, dinlenme sayacı, hareket geçmişi grafiği, Geçmiş etiketi); verilen
    kararlar (EF sentinel `-1`, "şablon uygulanmadı" için `templateId` karşılaştırması, seçimin render
    sırasında bir kez sabitlenmesi, ikinci canlı bölge yüzünden güncellenen test sorgusu, kart başlığı
    düğme / setler dışarıda); ayrı test sayıları; devreden notlar (sayaç bildirimi ve kalıcılığı yok,
    iOS'ta titreşim yok, Wake Lock gerçek cihazda denenmedi, `useTemplate` silinen şablonun detayını
    önbellekte `gcTime` boyunca tutar, arşivlenmiş şablon hareketi panel listesinde görünmez, hareket
    başına en ağır set/1RM grafiği yok, "Gerçek Kullanımdan Gelen İstekler"deki egzersiz arama hâlâ
    açık).
  - "Frontend Dilim 1" devreden notlarındaki "Sonraki dilimler" satırından "şablonlar"ı düş.
- [ ] **Step 3:** `CLAUDE.md`:
  - "Kapsam ve Sıra" altına: "**Frontend dilim 2 tamamlandı (2026-09-xx)** — şablonlar, dinlenme sayacı,
    hareket geçmişi grafiği; ayrıntı PLAN.md'de. Takvim/seri ayrı dilim."
  - Domain Modeli'nde `TemplateExercise` satırına `RestSeconds` (0-900 sn, varsayılan 90, 0 = sayaç yok).
  - "İlk dilim … Şablon, istatistik, … sonraki dilimlere bırakıldı" cümlesinden "Şablon"u düş.
- [ ] **Step 4:** Spec'in `**Durum:** 📋 Spec.` satırını `**Durum:** ✅ Uygulandı (plan: docs/superpowers/plans/2026-09-13-frontend-dilim-2-sablonlar-ve-dinlenme.md).`
      yap; Riskler'deki "PR #39 henüz merge edilmedi" maddesini "PR #39/#40 ile merge edildi" diye güncelle.
- [ ] **Step 5:** Commit:

```bash
git add PLAN.md CLAUDE.md docs/superpowers/specs/2026-09-13-sablonlar-ve-dinlenme-design.md
git commit -m "docs: frontend dilim 2 tamamlandi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:**

  | Spec maddesi | Görev |
  |---|---|
  | Karar 1 (`RestSeconds`, CHECK, `int?` + 90, yanıtlar, migration, tipler, testler) | Görev 1 |
  | Karar 2 (sekme yok; boş Bugün + hesap menüsü; rotalar; şablon yoksa bağlantı) | Görev 2 (menü, rotalar), Görev 3 (boş Bugün) |
  | Karar 3 (liste, düzenleyici, pasif seçenekler, dinlenme seçenekleri + listede olmayan değer, yukarı/aşağı/kaldır, arşiv hapı, POST/PUT, iki adımlı silme, hata deseni, istemci doğrulaması) | Görev 2 |
  | Karar 4 (yalnızca boş durumda başlatma, 201/200, serbest antrenman aynen) | Görev 3 |
  | Karar 5 (nötr şablon hapı, kartlar, `aria-pressed`, onay ikonu, plan dışı, varsayılan seçim ve atlamama) | Görev 3 |
  | Karar 6 (başlama kuralları, görünüm, bitiş anı, bitiş uyarıları, yeniden başlama, Wake Lock, kalıcılık yok, saf modül) | Görev 4 |
  | Karar 7 (Geçmiş'te şablon adı / "Serbest") | Görev 6 |
  | Karar 8 (sorgu anahtarları, hook'lar, tazelemeler, daraltma) | Görev 2, 3, 5 |
  | Karar 9 (`HacimGrafigi` / `HareketGecmisi` ayrımı, veri, çizim, erişilebilirlik, yerleşim, boş durum) | Görev 5 |
  | Görsel doğrulama | Görev 7 |
  | Dokümanlar | Görev 8 |

- **Spec'ten bilinçli sapmalar (gerekçeleri görevlerde):**
  1. "200 → şablon uygulanmadı" durum kodu yerine dönen `templateId` ile (Görev 3).
  2. Kart "bir `<button>`dır" → kartın BAŞLIĞI düğmedir, setler ve grafik düğmenin dışında (Görev 3).
  3. `template(id)` anahtarı `templates`'in öneki değil (Görev 2 Interfaces).
  4. Karar 8'deki "set ekleme ve silme `exerciseHistory`'yi tazeler": arayüzde set silme yok; yalnızca
     ekleme tazeler (Görev 5).
- **Adlar görevler boyunca aynı:** `Sablon`, `SablonHareketi`, `SablonGirdisi`, `HareketIlerlemesi`,
  `AcikOturum.progress/templateId`, `useTemplates/useTemplate/useCreateTemplate/useUpdateTemplate/useDeleteTemplate/useStartSession/useExerciseHistory`,
  `queryKeys.templates/template/exerciseHistory`, `VARSAYILAN_DINLENME_SN`, `Dinlenme`,
  `dinlenmeBaslat/kalanMs/bittiMi/sureEkle/gecenOran/kalanSureMetni/dinlenmeSuresi`,
  `varsayilanHareket`, `adaGoreSirala`, `rekorRozetiMetni`, `formatKisaTarih`, bileşenler
  `SecimKutusu/IkonDugmesi/IkincilDugme/SablonKarti/TurEtiketi/HacimGrafigi/SetSatiri/SablonlaBasla/HareketKartlari/DinlenmeSayaci/HareketGecmisi`,
  `AddSetForm` props `egzersizId/onEgzersizSec`, `HareketKartlari` props `ilerleme/setler/secilenId/onSec/bugunkuOturumId`.
- **Test sayısı ilerleyişi:** backend 638 → Görev 1: **651**. Frontend 71 (13 dosya) → Görev 2: 79
  (15) → Görev 3: 85 (15) → Görev 4: 98 (17) → Görev 5: 105 (19) → Görev 6: **106** (19). Görev 8'de
  komutla yeniden sayılır.
- **Dosya çakışması (sıralı):** `queries.ts` 2/3/5/6; `AddSetForm.tsx` 2/3/4; `TodayPage.tsx` 3/5;
  `TodayPage.test.tsx` 3/4/5 (Görev 3 `sahteSunucuyuKur`'u geçmiş ucu dahil genişletir ki 5'te
  değişmesin); `HareketKartlari.tsx` 3/5; `lib/dinlenme.ts` 2/4.
- **Doğrulanmış varsayımlar:**
  - Geçmiş ucu egzersiz filtresinde yalnızca o egzersize seti olan oturumları döner
    (`s.SetEntries.Any(e => e.ExerciseId == id)`, `WorkoutSessionRepository`); parametre adları
    `ExerciseId`, `PageSize` (`HistoryQuery` : `PagedRangeQuery`).
  - `GET /api/exercises` arşivlileri döndürmez (`ExerciseRepository`: `includeArchived || !IsArchived`).
  - `TemplateExerciseResponse` / `SessionProgressResponse` kurucuları yalnızca iki serviste çağrılıyor.
  - Veritabanı testleri geliştirme veritabanını kullanır (`TestDatabase`); migration `database update`
    ile uygulanmalı. Model/Swagger testleri `TemplateExercise` sütun sayısına bağlı değil.
  - lucide 1.45'te `ClipboardList`, `ChevronUp/Down/Left/Right`, `Trash2`, `Check`, `Timer`, `Plus`, `X` var.
  - Node'da `Intl` `tr-TR` `{ day: 'numeric', month: 'short' }` → `"12 Eyl"`.
  - oxlint `react/only-export-components` uyarı düzeyinde: bileşen dosyaları yalnızca bileşen dışa
    aktarır (yardımcılar `lib/`'de, `HacimGrafigi`'nin tipi `export interface` — tip dışa aktarımı
    uyarı üretmez).
- **Bilinen riskler:**
  1. EF `HasSentinel` beklenen migration'ı (`defaultValue: 90`) üretmezse Görev 1 Step 6 durur.
  2. `navigator.wakeLock` / `AudioContext` tipleri TS `DOM` lib'inde yoksa Görev 4 durur (`any` yok).
  3. Render sırasında `setSecim` React'te geçerli bir desen; StrictMode'da çift render bir sorun
     yaratmaz (koşul ikinci render'da yanlış olur). Uyarı çıkarsa kontrolcüye raporlanır, efekte
     çevrilmez.
