# Şablon Paylaşımı Implementation Plan (#467)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcıların antrenman şablonlarını arkadaşlarıyla (karşılıklı takip) paylaşmasını, bir arkadaşın paylaştığı şablonu görüntülemesini ve kendi hesabına anlık görüntü olarak kaydedip antrenman başlatmasını sağlamak.

**Architecture:** `WorkoutTemplate`'e iki alan eklenir (`IsSharedOverride`, `SavedFromUserId`). Arkadaşlık kontrolü `IFriendshipService` içinde (mevcut `IFollowRepository.GetRelationsAsync` üzerinden) tek yerde yaşar. Görünürlük ve kopyalama `PublicActivityService`'ten AYRI bir kapı olan `ISharedTemplateService`'te toplanır; uçlar mevcut `UsersController`'a (`/api/users/{username}/templates...`) eklenir, `TemplatesController`'a yalnızca paylaşım override ucu (`PUT /api/templates/{id}/sharing`) eklenir. Mobilde başkasının profiline koşullu bir "Şablonlar" sekmesi, salt-okunur detay + "Şablonu kaydet" ekranı, ve Antrenman sekmesinde kaydedilenler için yeni bir yatay kart bölümü eklenir. Yalnızca `mobile/` (web donduruldu, #326); backend/`packages/shared` ikisini de besler.

**Tech Stack:** ASP.NET Core (.NET 10), EF Core + Npgsql, xUnit; `packages/shared` (TanStack Query, i18next, vitest, openapi-typescript); `mobile/` (Expo, expo-router, NativeWind, lucide-react-native, jest-expo).

**Spec:** [docs/superpowers/specs/2026-09-27-sablon-paylasimi-design.md](../specs/2026-09-27-sablon-paylasimi-design.md)

## Global Constraints

- Web'e (`web/`) dokunulmaz (#326). `web/src/pages/KullaniciProfiliPage.tsx` ve `web/src/pages/SablonDuzenlePage.tsx` bilerek DEĞİŞTİRİLMEZ.
- Paylaşım **arkadaşlık (karşılıklı takip) şartlıdır** — `PrivacyLevel`-tabanlı arkadaşlıksız görünürlük burada YOK.
- Görünürlük: `template.IsSharedOverride ?? (ownerPrivacyLevel != Gizli)`. Hesaplanmış değer saklanmaz.
- Başkasının profilinde "Şablonlar" sekmesi **sadece arkadaşsan** render edilir (History/Records'un "her zaman görünür" deseninin aksine).
- Kaydetme sırasında isim çakışması **otomatik ayırt ediciyle** çözülür (`"{ad} ({kullaniciAdi})"`, gerekirse sayaçla), 409 dönülmez.
- Kaydetme sırasında kaynak şablonun yalnızca **kopyalayana görünür** (global veya kendi) egzersizleri kopyalanır — kaynak kullanıcının özel egzersizi görünür değilse o satır atlanır (CLAUDE.md Yetkilendirme Kuralı, IDOR). Kopyalanacak hiçbir satır kalmazsa (şablon boş değilken) `ValidationException` (400).
- Tüm yeni uçlar sahiplik/arkadaşlık/görünürlük kontrolünü SERVİS katmanında açıkça yapar; yalnızca Id ile sorgulayıp atlamak IDOR'dur.
- Kullanıcıya görünen her yeni metin `tr.ts` + `en.ts`'e AYNI COMMIT'te; modül seviyesinde `t` çağrılmaz.
- Mobil renkler `useRenkPaleti()`/`useIkonRenk()`'ten okunur, modül seviyesinde sabitlenmez.
- Migration elle düzenlenmez: `dotnet dotnet-ef migrations add ...` / `dotnet dotnet-ef database update --project src/Grind.Api`.
- `packages/shared/src/api/schema.d.ts` ELLE düzenlenmez: `npx openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o packages/shared/src/api/schema.d.ts` ile üretilir (API yerelde çalışırken).
- Veritabanı testleri çalışan PostgreSQL ister: `docker compose up -d` (port 5433).
- Commit mesajı Write ile scratchpad'e yazılır, `git commit -F <dosya>`; son satır `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

- `IsVisible` hesaplaması üç `PrivacyLevel` × üç `IsSharedOverride` durumunun HEPSİNDE doğru — Task 6'daki görünürlük matrisi testleri.
- Kaydetme sırasında kaynağın özel (kopyalayana görünmez) egzersizi sessizce atlanır, görünür olanlar korunur — Task 6'daki `Kaynagin_ozel_egzersizi_kopyalanmaz`.
- Arkadaş olmayan biri detay/kaydet ucuna 404 alır, mesaj hangi şablonun var olduğunu SIZDIRMAZ — Task 6'daki IDOR testleri.
- Kaydedilen kartın sıralaması `LastUsedAt`'e göre azalan, kendi şablonlarının manuel `OrderIndex`'inden bağımsız — Task 14/15.
- Sekme SADECE arkadaşsan render edilir, arkadaş değilsen hiç yok (boş durum değil) — Task 11/15.

---

### Task 1: Veri modeli — `IsSharedOverride` + `SavedFromUserId`

**Files:**
- Modify: `src/Grind.Api/Models/Entities/WorkoutTemplate.cs`
- Modify: `src/Grind.Api/Data/Configurations/WorkoutTemplateConfiguration.cs`
- Create: migration (üretilir, elle yazılmaz)

**Interfaces:**
- Produces: `WorkoutTemplate.IsSharedOverride` (`bool?`), `WorkoutTemplate.SavedFromUserId` (`long?`), `WorkoutTemplate.SavedFromUser` (`User?` navigation) — sonraki tüm görevler bunları kullanır.

- [ ] **Step 1: Entity'e alanları ekle**

```csharp
// src/Grind.Api/Models/Entities/WorkoutTemplate.cs
namespace Grind.Api.Models.Entities;

public class WorkoutTemplate
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public int OrderIndex { get; set; }

    /// <summary>
    /// Paylaşım override'ı (#467). <c>null</c> = varsayılan: hesabın <c>PrivacyLevel</c>'i
    /// Acik/Kisitli ise paylaşımda, Gizli ise değil. <c>true</c>/<c>false</c> bu varsayılanı
    /// şablon bazında tersine çevirir. Hesaplanmış "görünür mü" değeri BURADA SAKLANMAZ.
    /// </summary>
    public bool? IsSharedOverride { get; set; }

    /// <summary>
    /// <c>null</c> = kendi oluşturduğun şablon. Dolu = bir arkadaştan kaydedilmiş kopya (#467);
    /// kaynak kullanıcı adı değiştirilemediği için canlı join ile okunur, ayrıca kopyalanmaz.
    /// </summary>
    public long? SavedFromUserId { get; set; }

    public User User { get; set; } = null!;
    public User? SavedFromUser { get; set; }
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
}
```

- [ ] **Step 2: Konfigürasyona FK ekle**

```csharp
// src/Grind.Api/Data/Configurations/WorkoutTemplateConfiguration.cs
// mevcut Configure metodunun içine, User FK'sinden sonra:
builder.HasOne(t => t.SavedFromUser)
    .WithMany()
    .HasForeignKey(t => t.SavedFromUserId)
    .OnDelete(DeleteBehavior.Restrict);
```

- [ ] **Step 3: Migration üret**

Run: `dotnet dotnet-ef migrations add SablonPaylasimi --project src/Grind.Api`
Expected: `src/Grind.Api/Migrations/` altında yeni bir migration dosyası; `Up` metodunda `IsSharedOverride` (bool, nullable) ve `SavedFromUserId` (bigint, nullable) kolonları + FK.

- [ ] **Step 4: Yerel veritabanını güncelle ve derle**

Run: `docker compose up -d` (henüz açık değilse), `dotnet dotnet-ef database update --project src/Grind.Api`, `dotnet build`
Expected: migration uygulanır, derleme hatasız (henüz `WorkoutTemplate`'i kullanan kod bozulmadı).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Models/Entities/WorkoutTemplate.cs src/Grind.Api/Data/Configurations/WorkoutTemplateConfiguration.cs src/Grind.Api/Migrations/
git commit -m "feat: sablon paylasim alanlarini ekle (#467)"
```

---

### Task 2: `WorkoutSessionRepository` — şablon başına son kullanım

**Files:**
- Modify: `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs`
- Modify: `src/Grind.Api/Repositories/WorkoutSessionRepository.cs`
- Test: `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs`

**Interfaces:**
- Consumes: `IRepository<WorkoutSession>.Set` (mevcut `Repository<T>` alt sınıfı).
- Produces: `IWorkoutSessionRepository.GetLastUsedAtByTemplateIdsAsync(long userId, IReadOnlyCollection<long> templateIds, CancellationToken) -> Task<IReadOnlyDictionary<long, DateTime>>` — sözlükte olmayan id'nin hiç kullanılmadığı anlamına gelir.

- [ ] **Step 1: Testi yaz**

```csharp
// tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs (dosya yoksa oluştur; varsa bu Fact'i ekle)
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutSessionRepositoryTests
{
    private static async Task<(AppDbContext Context, User User, WorkoutSessionRepository Repository, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();
        return (context, user, new WorkoutSessionRepository(context), transaction);
    }

    [Fact]
    public async Task GetLastUsedAtByTemplateIdsAsync_en_son_baslangici_dondurur()
    {
        var (context, user, repository, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = new WorkoutTemplate { User = user, Name = $"Sablon {Guid.NewGuid():N}", CreatedAt = DateTime.UtcNow };
            context.Add(sablon);
            await context.SaveChangesAsync();

            var eski = TestDatabase.NewSession(user);
            eski.TemplateId = sablon.Id;
            eski.StartedAt = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);
            var yeni = TestDatabase.NewSession(user);
            yeni.TemplateId = sablon.Id;
            yeni.StartedAt = new DateTime(2026, 9, 20, 0, 0, 0, DateTimeKind.Utc);
            context.AddRange(eski, yeni);
            await context.SaveChangesAsync();

            var sonuc = await repository.GetLastUsedAtByTemplateIdsAsync(user.Id, [sablon.Id]);

            Assert.Equal(yeni.StartedAt, sonuc[sablon.Id]);
        }
    }

    [Fact]
    public async Task GetLastUsedAtByTemplateIdsAsync_kullanilmamis_sablon_sozlukte_yok()
    {
        var (_, user, repository, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await repository.GetLastUsedAtByTemplateIdsAsync(user.Id, [999_999_999]);

            Assert.False(sonuc.ContainsKey(999_999_999));
        }
    }
}
```

- [ ] **Step 2: Testi çalıştır, derleme hatasıyla (metot yok) başarısız olduğunu doğrula**

Run: `dotnet test --filter "FullyQualifiedName~WorkoutSessionRepositoryTests"`
Expected: derleme hatası — `IWorkoutSessionRepository` içinde `GetLastUsedAtByTemplateIdsAsync` yok.

- [ ] **Step 3: Arayüze ve uygulamaya metodu ekle**

```csharp
// src/Grind.Api/Repositories/IWorkoutSessionRepository.cs -- interface içine ekle
/// <summary>
/// Verilen şablon id'leri için o kullanıcının son antrenman başlangıcı (#467 — kaydedilen
/// şablonların "en son kullanılana göre" sıralanması). Eşleşmeyen/kullanılmamış id sözlükte yer almaz.
/// </summary>
Task<IReadOnlyDictionary<long, DateTime>> GetLastUsedAtByTemplateIdsAsync(
    long userId, IReadOnlyCollection<long> templateIds, CancellationToken cancellationToken = default);
```

```csharp
// src/Grind.Api/Repositories/WorkoutSessionRepository.cs -- sınıf içine ekle
public async Task<IReadOnlyDictionary<long, DateTime>> GetLastUsedAtByTemplateIdsAsync(
    long userId, IReadOnlyCollection<long> templateIds, CancellationToken cancellationToken = default)
{
    if (templateIds.Count == 0)
        return new Dictionary<long, DateTime>();

    return await Set
        .Where(s => s.UserId == userId && s.TemplateId != null && templateIds.Contains(s.TemplateId.Value))
        .GroupBy(s => s.TemplateId!.Value)
        .Select(g => new { TemplateId = g.Key, LastUsedAt = g.Max(s => s.StartedAt) })
        .ToDictionaryAsync(x => x.TemplateId, x => x.LastUsedAt, cancellationToken);
}
```

- [ ] **Step 4: Testi çalıştır ve geçtiğini doğrula**

Run: `dotnet test --filter "FullyQualifiedName~WorkoutSessionRepositoryTests"`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Repositories/IWorkoutSessionRepository.cs src/Grind.Api/Repositories/WorkoutSessionRepository.cs tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs
git commit -m "feat: sablon basina son kullanim sorgusu ekle (#467)"
```

---

### Task 3: `TemplateResponse` genişlet + `TemplateMapper` + `WorkoutTemplateService` güncelle

**Files:**
- Modify: `src/Grind.Api/Models/Dtos/Template/TemplateResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs`
- Modify: `src/Grind.Api/Repositories/WorkoutTemplateRepository.cs` (`SavedFromUser` include)
- Modify: `src/Grind.Api/Services/WorkoutTemplateService.cs`
- Modify: `tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs` (constructor değişti)

**Interfaces:**
- Consumes: Task 1 (`IsSharedOverride`, `SavedFromUserId`, `SavedFromUser`), Task 2 (`GetLastUsedAtByTemplateIdsAsync`).
- Produces: `TemplateResponse(Id, Name, CreatedAt, Exercises, IsSharedOverride, SavedFromUsername, LastUsedAt)`; `TemplateMapper.ToResponse(WorkoutTemplate, DateTime?) -> TemplateResponse`; `TemplateMapper.ToSharedResponse(WorkoutTemplate) -> SharedTemplateResponse` (Task 6'da tanımlanacak `SharedTemplateResponse`'a önceden referans verir — Task 6'da tip eklenene kadar bu dosya DERLENMEZ, bu yüzden Task 3 ve Task 6 SIRAYLA uygulanmalı, Task 6 bitmeden Task 3 tek başına test edilemez. Task 3'ün adımları bunu göz önünde bulundurup `ToSharedResponse`'u BU görevde eklemez, Task 6'ya bırakır).

- [ ] **Step 1: `TemplateResponse`'u genişlet**

```csharp
// src/Grind.Api/Models/Dtos/Template/TemplateResponse.cs
namespace Grind.Api.Models.Dtos.Template;

public record TemplateResponse(
    long Id,
    string Name,
    DateTime CreatedAt,
    IReadOnlyList<TemplateExerciseResponse> Exercises,
    /// <summary>#467: null = varsayılan (hesabın PrivacyLevel'ine göre), true/false override.</summary>
    bool? IsSharedOverride,
    /// <summary>#467: null = kendi şablonun; dolu = bir arkadaştan kaydedilmiş kopya.</summary>
    string? SavedFromUsername,
    /// <summary>#467: bu şablonla en son ne zaman antrenman başlatıldığı; hiç başlatılmadıysa null.</summary>
    DateTime? LastUsedAt);
```

- [ ] **Step 2: `TemplateMapper`'ı yaz (yalnızca `ToResponse`, `ToSharedResponse` Task 6'da eklenecek)**

```csharp
// src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs
using Grind.Api.Models.Entities;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// `WorkoutTemplate` -> yanıt DTO'su eşlemesi TEK yerde (#467): `WorkoutTemplateService`
/// (kendi şablonların) ve `SharedTemplateService` (arkadaştan görünenler) aynı satır eşlemesini
/// paylaşır, kopyalamaz (DRY).
/// </summary>
public static class TemplateMapper
{
    public static TemplateResponse ToResponse(WorkoutTemplate template, DateTime? lastUsedAt) => new(
        template.Id,
        template.Name,
        template.CreatedAt,
        ExercisesOf(template),
        template.IsSharedOverride,
        template.SavedFromUser?.Username,
        lastUsedAt);

    internal static IReadOnlyList<TemplateExerciseResponse> ExercisesOf(WorkoutTemplate template) =>
        template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new TemplateExerciseResponse(
                te.Id, te.ExerciseId, te.Exercise.Name, te.Exercise.Category, te.Exercise.IsArchived,
                te.OrderIndex, te.PlannedSets, te.RestSeconds))
            .ToList();
}
```

- [ ] **Step 3: Repository'nin dahil ettiği ilişkilere `SavedFromUser`'ı ekle**

```csharp
// src/Grind.Api/Repositories/WorkoutTemplateRepository.cs -- WithExercises metodunu değiştir
private static IQueryable<WorkoutTemplate> WithExercises(IQueryable<WorkoutTemplate> query)
    => query
        .Include(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
        .ThenInclude(te => te.Exercise)
        .Include(t => t.SavedFromUser);
```

- [ ] **Step 4: `WorkoutTemplateService`'i `TemplateMapper` ve `LastUsedAt` ile güncelle**

```csharp
// src/Grind.Api/Services/WorkoutTemplateService.cs
// Constructor'a IWorkoutSessionRepository ekle:
public class WorkoutTemplateService(
    IWorkoutTemplateRepository templateRepository,
    IExerciseRepository exerciseRepository,
    IWorkoutSessionRepository sessionRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : IWorkoutTemplateService
{
    // ... TemplateNotFound/ExerciseNotFound sabitleri aynı kalır ...

    public async Task<IReadOnlyList<TemplateResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var templates = await templateRepository.GetAllAsync(currentUser.UserId, cancellationToken);
        var lastUsed = await sessionRepository.GetLastUsedAtByTemplateIdsAsync(
            currentUser.UserId, templates.Select(t => t.Id).ToList(), cancellationToken);
        return templates.Select(t => TemplateMapper.ToResponse(t, lastUsed.GetValueOrDefault(t.Id))).ToList();
    }

    public async Task<TemplateResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => await ToResponseAsync(await OwnedOrThrowAsync(id, cancellationToken), cancellationToken);

    // CreateAsync/UpdateAsync/PatchAsync'in SONUNDAKİ "return ToResponse(await OwnedOrThrowAsync(...))"
    // satırlarının HER ÜÇÜNÜ de aşağıdakiyle değiştir:
    //   return await ToResponseAsync(await OwnedOrThrowAsync(template.Id, cancellationToken), cancellationToken);

    private async Task<TemplateResponse> ToResponseAsync(WorkoutTemplate template, CancellationToken cancellationToken)
    {
        var lastUsed = await sessionRepository.GetLastUsedAtByTemplateIdsAsync(
            currentUser.UserId, [template.Id], cancellationToken);
        return TemplateMapper.ToResponse(template, lastUsed.GetValueOrDefault(template.Id));
    }

    // ReorderAsync'in son satırı ("return istenen.Select(id => ToResponse(sirayaGore[id])).ToList();")
    // sıra bilgisinin LastUsedAt'i etkilemediği için AYNI KALIR ama artik ToResponse yerine
    // TemplateMapper.ToResponse(sirayaGore[id], null) YAZILAMAZ (LastUsedAt yanlış olur) --
    // bunun yerine GetAllAsync'teki gibi TOPLU bir GetLastUsedAtByTemplateIdsAsync çağrısı eklenir:
    public async Task<IReadOnlyList<TemplateResponse>> ReorderAsync(
        ReorderTemplatesRequest request, CancellationToken cancellationToken = default)
    {
        var istenen = request.TemplateIds!;
        var templates = await templateRepository.GetAllAsync(currentUser.UserId, cancellationToken);

        var mevcutIdler = templates.Select(t => t.Id).ToHashSet();
        if (istenen.Count != mevcutIdler.Count || !mevcutIdler.SetEquals(istenen))
        {
            throw new ValidationException("Sıralama, şablonlarınızın tamamını birebir içermeli.");
        }

        var sirayaGore = templates.ToDictionary(t => t.Id);
        for (var sira = 0; sira < istenen.Count; sira++)
        {
            sirayaGore[istenen[sira]].OrderIndex = sira;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var lastUsed = await sessionRepository.GetLastUsedAtByTemplateIdsAsync(
            currentUser.UserId, istenen, cancellationToken);
        return istenen.Select(id => TemplateMapper.ToResponse(sirayaGore[id], lastUsed.GetValueOrDefault(id))).ToList();
    }

    // ... ReplaceExercisesAsync, OwnedOrThrowAsync, RequireTrimmedName, EnsureNameFreeAsync aynı kalır ...
    // Eski `private static TemplateResponse ToResponse(WorkoutTemplate template) => new(...)` metodu SİLİNİR
    // (yerini TemplateMapper.ToResponse aldı).
}
```

- [ ] **Step 5: DI kaydını kontrol et (repository zaten kayıtlı, servis değişmedi)**

`src/Grind.Api/Data/DependencyInjection.cs`'te `IWorkoutSessionRepository` zaten kayıtlı — değişiklik gerekmiyor.

- [ ] **Step 6: Test yardımcısını güncelle**

```csharp
// tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs -- CreateAsync helper'ını degistir
private static async Task<(AppDbContext Context, User User, WorkoutTemplateService Service, IAsyncDisposable Transaction)>
    CreateAsync()
{
    var context = TestDatabase.CreateContext();
    var transaction = await context.Database.BeginTransactionAsync();
    var user = TestDatabase.NewUser();
    context.Add(user);
    await context.SaveChangesAsync();

    var service = new WorkoutTemplateService(
        new WorkoutTemplateRepository(context), new ExerciseRepository(context),
        new WorkoutSessionRepository(context), new UnitOfWork(context), new StubCurrentUser(user.Id));

    return (context, user, service, transaction);
}
```

- [ ] **Step 7: Yeni bir test ekle — `LastUsedAt` doğru geliyor**

```csharp
// tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs -- yeni Fact
[Fact]
public async Task LastUsedAt_en_son_antrenman_baslangicini_gosterir()
{
    var (context, user, service, transaction) = await CreateAsync();
    await using (transaction)
    {
        var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));
        var oturum = TestDatabase.NewSession(user);
        oturum.TemplateId = olusan.Id;
        oturum.StartedAt = new DateTime(2026, 9, 20, 0, 0, 0, DateTimeKind.Utc);
        context.Add(oturum);
        await context.SaveChangesAsync();

        var okunan = await service.GetByIdAsync(olusan.Id);

        Assert.Equal(oturum.StartedAt, okunan.LastUsedAt);
    }
}

[Fact]
public async Task LastUsedAt_hic_kullanilmadiysa_null()
{
    var (_, _, service, transaction) = await CreateAsync();
    await using (transaction)
    {
        var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));

        Assert.Null(olusan.LastUsedAt);
    }
}
```

- [ ] **Step 8: Derle ve mevcut/yeni testleri çalıştır**

Run: `dotnet build && dotnet test --filter "FullyQualifiedName~WorkoutTemplateServiceTests"`
Expected: `SharedTemplateResponse` henüz yok olduğu için `TemplateMapper.ToSharedResponse` bu görevde YAZILMADI, dolayısıyla derleme geçer. Tüm `WorkoutTemplateServiceTests` PASS (yenileri dahil).

- [ ] **Step 9: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Template/TemplateResponse.cs src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs src/Grind.Api/Repositories/WorkoutTemplateRepository.cs src/Grind.Api/Services/WorkoutTemplateService.cs tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs
git commit -m "feat: TemplateResponse'a paylasim/son kullanim alanlarini ekle (#467)"
```

---

### Task 4: `IFriendshipService`

**Files:**
- Create: `src/Grind.Api/Services/IFriendshipService.cs`
- Create: `src/Grind.Api/Services/FriendshipService.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Services/FriendshipServiceTests.cs`

**Interfaces:**
- Consumes: mevcut `IFollowRepository.GetRelationsAsync(long viewerId, IReadOnlyCollection<long> otherIds, CancellationToken) -> Task<(HashSet<long> ViewerFollows, HashSet<long> FollowsViewer)>`.
- Produces: `IFriendshipService.AreFriendsAsync(long userId1, long userId2, CancellationToken) -> Task<bool>` — Task 6 bunu kullanır.

- [ ] **Step 1: Testi yaz**

```csharp
// tests/Grind.Tests/Services/FriendshipServiceTests.cs
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class FriendshipServiceTests
{
    private static async Task<(AppDbContext Context, User A, User B, FriendshipService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var (a, b) = (TestDatabase.NewUser(), TestDatabase.NewUser());
        context.AddRange(a, b);
        await context.SaveChangesAsync();
        return (context, a, b, new FriendshipService(new FollowRepository(context)), transaction);
    }

    [Fact]
    public async Task Karsilikli_takip_arkadas_sayilir()
    {
        var (context, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.AddRange(
                new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = DateTime.UtcNow },
                new Follow { FollowerId = b.Id, FolloweeId = a.Id, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            Assert.True(await service.AreFriendsAsync(a.Id, b.Id));
            Assert.True(await service.AreFriendsAsync(b.Id, a.Id));
        }
    }

    [Fact]
    public async Task Tek_yonlu_takip_arkadas_sayilmaz()
    {
        var (context, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            Assert.False(await service.AreFriendsAsync(a.Id, b.Id));
        }
    }

    [Fact]
    public async Task Hic_takip_yoksa_arkadas_degil()
    {
        var (_, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.False(await service.AreFriendsAsync(a.Id, b.Id));
        }
    }
}
```

- [ ] **Step 2: Testi çalıştır, derleme hatasıyla başarısız olduğunu doğrula**

Run: `dotnet test --filter "FullyQualifiedName~FriendshipServiceTests"`
Expected: derleme hatası — `IFriendshipService`/`FriendshipService` yok.

- [ ] **Step 3: Arayüzü ve uygulamayı yaz**

```csharp
// src/Grind.Api/Services/IFriendshipService.cs
namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık = karşılıklı takip (#281, #467). Tek yerde yaşar ki her arkadaşlık-şartlı
/// özellik (bugün şablon paylaşımı) aynı sorguyu tekrarlamasın (DRY).
/// </summary>
public interface IFriendshipService
{
    Task<bool> AreFriendsAsync(long userId1, long userId2, CancellationToken cancellationToken = default);
}
```

```csharp
// src/Grind.Api/Services/FriendshipService.cs
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class FriendshipService(IFollowRepository followRepository) : IFriendshipService
{
    public async Task<bool> AreFriendsAsync(
        long userId1, long userId2, CancellationToken cancellationToken = default)
    {
        var (follows, followedBy) = await followRepository.GetRelationsAsync(userId1, [userId2], cancellationToken);
        return follows.Contains(userId2) && followedBy.Contains(userId2);
    }
}
```

- [ ] **Step 4: DI'a kaydet**

```csharp
// src/Grind.Api/Services/DependencyInjection.cs -- AddApplicationServices içine ekle
services.AddScoped<IFriendshipService, FriendshipService>();
```

- [ ] **Step 5: Testi çalıştır ve geçtiğini doğrula**

Run: `dotnet test --filter "FullyQualifiedName~FriendshipServiceTests"`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Services/IFriendshipService.cs src/Grind.Api/Services/FriendshipService.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Services/FriendshipServiceTests.cs
git commit -m "feat: karsilikli takipten arkadaslik kontrolu ekle (#467)"
```

---

### Task 5: Kendi şablonunun paylaşım override'ını değiştirme ucu

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Template/UpdateTemplateSharingRequest.cs`
- Modify: `src/Grind.Api/Services/IWorkoutTemplateService.cs`
- Modify: `src/Grind.Api/Services/WorkoutTemplateService.cs`
- Modify: `src/Grind.Api/Controllers/TemplatesController.cs`
- Test: `tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs`

**Interfaces:**
- Produces: `IWorkoutTemplateService.UpdateSharingAsync(long id, bool? overrideValue, CancellationToken) -> Task<TemplateResponse>`.

- [ ] **Step 1: Testleri yaz**

```csharp
// tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs -- yeni Fact'ler
[Fact]
public async Task UpdateSharingAsync_override_yazar_ve_okunur()
{
    var (_, _, service, transaction) = await CreateAsync();
    await using (transaction)
    {
        var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));
        Assert.Null(olusan.IsSharedOverride);

        var guncel = await service.UpdateSharingAsync(olusan.Id, true);

        Assert.True(guncel.IsSharedOverride);
    }
}

[Fact]
public async Task UpdateSharingAsync_null_ile_varsayilana_dondurulebilir()
{
    var (_, _, service, transaction) = await CreateAsync();
    await using (transaction)
    {
        var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));
        await service.UpdateSharingAsync(olusan.Id, false);

        var guncel = await service.UpdateSharingAsync(olusan.Id, null);

        Assert.Null(guncel.IsSharedOverride);
    }
}

[Fact]
public async Task UpdateSharingAsync_baskasinin_sablonunda_404_verir()
{
    var (context, _, service, transaction) = await CreateAsync();
    await using (transaction)
    {
        var digerKullanici = TestDatabase.NewUser();
        var digerSablon = new WorkoutTemplate { User = digerKullanici, Name = UniqueName(), CreatedAt = DateTime.UtcNow };
        context.Add(digerSablon);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateSharingAsync(digerSablon.Id, true));
    }
}
```

- [ ] **Step 2: Testleri çalıştır, derleme hatasıyla başarısız olduğunu doğrula**

Run: `dotnet test --filter "FullyQualifiedName~WorkoutTemplateServiceTests"`
Expected: derleme hatası — `UpdateSharingAsync` yok.

- [ ] **Step 3: İstek DTO'sunu yaz**

```csharp
// src/Grind.Api/Models/Dtos/Template/UpdateTemplateSharingRequest.cs
namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tek alanlı gövde (#467): burada <c>null</c> "dokunma" DEĞİL "varsayılana dön" anlamına gelir
/// — <c>PatchTemplateRequest</c>'teki null semantiğiyle karıştırılmasın diye ayrı bir uç.
/// </summary>
public class UpdateTemplateSharingRequest
{
    public bool? Override { get; set; }
}
```

- [ ] **Step 4: Servis arayüzüne ve uygulamaya metodu ekle**

```csharp
// src/Grind.Api/Services/IWorkoutTemplateService.cs -- interface içine ekle
/// <summary>
/// Paylaşım override'ını yazar (#467): null = varsayılana dön (hesabın PrivacyLevel'ine göre),
/// true/false şablon bazında zorlar. Başkasının şablonunda NotFoundException (404).
/// </summary>
Task<TemplateResponse> UpdateSharingAsync(
    long id, bool? overrideValue, CancellationToken cancellationToken = default);
```

```csharp
// src/Grind.Api/Services/WorkoutTemplateService.cs -- sınıf içine ekle
public async Task<TemplateResponse> UpdateSharingAsync(
    long id, bool? overrideValue, CancellationToken cancellationToken = default)
{
    var template = await OwnedOrThrowAsync(id, cancellationToken);
    template.IsSharedOverride = overrideValue;
    await unitOfWork.SaveChangesAsync(cancellationToken);
    return await ToResponseAsync(template, cancellationToken);
}
```

- [ ] **Step 5: Controller ucunu ekle**

```csharp
// src/Grind.Api/Controllers/TemplatesController.cs -- Delete metodundan önce ekle
/// <summary>
/// Paylaşım override'ı (#467). Gövde <c>{ "override": true | false | null }</c> — null
/// varsayılana (hesabın gizlilik seviyesi) döner.
/// </summary>
[HttpPut("{id:long}/sharing")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult<TemplateResponse>> UpdateSharing(
    long id, UpdateTemplateSharingRequest request, CancellationToken cancellationToken)
    => Ok(await templateService.UpdateSharingAsync(id, request.Override, cancellationToken));
```

- [ ] **Step 6: Testleri çalıştır ve geçtiğini doğrula**

Run: `dotnet build && dotnet test --filter "FullyQualifiedName~WorkoutTemplateServiceTests"`
Expected: PASS (tüm eski + yeni testler).

- [ ] **Step 7: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Template/UpdateTemplateSharingRequest.cs src/Grind.Api/Services/IWorkoutTemplateService.cs src/Grind.Api/Services/WorkoutTemplateService.cs src/Grind.Api/Controllers/TemplatesController.cs tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs
git commit -m "feat: sablon paylasim override ucunu ekle (#467)"
```

---

### Task 6: `ISharedTemplateService` — görünürlük, detay ve kaydetme

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Template/SharedTemplateResponse.cs`
- Modify: `src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs` (`ToSharedResponse` ekle)
- Create: `src/Grind.Api/Services/ISharedTemplateService.cs`
- Create: `src/Grind.Api/Services/SharedTemplateService.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Services/SharedTemplateServiceTests.cs`

**Interfaces:**
- Consumes: Task 4 `IFriendshipService.AreFriendsAsync`; mevcut `IUserRepository.GetActiveByUsernameOrThrowAsync`; mevcut `IWorkoutTemplateRepository.GetAllAsync`/`GetOwnedByIdAsync`/`NameExistsAsync`; mevcut `IExerciseRepository.GetVisibleByIdsAsync`.
- Produces: `ISharedTemplateService.GetSharedTemplatesAsync(string username, CancellationToken) -> Task<IReadOnlyList<SharedTemplateResponse>>`; `GetSharedTemplateDetailAsync(string username, long templateId, CancellationToken) -> Task<SharedTemplateResponse>`; `SaveTemplateAsync(string username, long templateId, CancellationToken) -> Task<TemplateResponse>`. Task 7 (controller) bunları çağırır.

- [ ] **Step 1: Testleri yaz**

```csharp
// tests/Grind.Tests/Services/SharedTemplateServiceTests.cs
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class SharedTemplateServiceTests
{
    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    /// <summary>A ve B; B arkadaş olabilir/olmayabilir, B'nin bir şablonu var.</summary>
    private static async Task<(AppDbContext Context, User A, User B, WorkoutTemplate BSablonu, Exercise BEgzersizi, IAsyncDisposable Transaction)>
        CreateAsync(PrivacyLevel bSeviyesi = PrivacyLevel.Kisitli, bool arkadas = true)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var (a, b) = (TestDatabase.NewUser(), TestDatabase.NewUser());
        b.PrivacyLevel = bSeviyesi;
        var egzersiz = TestDatabase.NewExercise(null, $"Global Egzersiz {Guid.NewGuid():N}");
        context.AddRange(a, b, egzersiz);
        await context.SaveChangesAsync();

        var sablon = new WorkoutTemplate { User = b, Name = $"Sablon {Guid.NewGuid():N}", CreatedAt = DateTime.UtcNow };
        context.Add(sablon);
        await context.SaveChangesAsync();
        context.Add(new TemplateExercise { WorkoutTemplateId = sablon.Id, ExerciseId = egzersiz.Id, OrderIndex = 0, PlannedSets = 3 });
        await context.SaveChangesAsync();

        if (arkadas)
        {
            context.AddRange(
                new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = DateTime.UtcNow },
                new Follow { FollowerId = b.Id, FolloweeId = a.Id, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();
        }

        return (context, a, b, sablon, egzersiz, transaction);
    }

    private static SharedTemplateService ServiceFor(AppDbContext context, User viewer)
    {
        var current = new StubCurrentUser(viewer);
        return new SharedTemplateService(
            new UserRepository(context), new WorkoutTemplateRepository(context), new ExerciseRepository(context),
            new FriendshipService(new FollowRepository(context)), new UnitOfWork(context), current);
    }

    // ---- Görünürlük matrisi ----

    [Fact]
    public async Task Acik_hesapta_arkadas_override_olmadan_gorur()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Acik);
        await using (transaction)
        {
            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            Assert.Contains(liste, s => s.Id == sablon.Id);
        }
    }

    [Fact]
    public async Task Gizli_hesapta_arkadas_override_olmadan_goremez()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Gizli);
        await using (transaction)
        {
            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            Assert.DoesNotContain(liste, s => s.Id == sablon.Id);
        }
    }

    [Fact]
    public async Task Gizli_hesapta_true_override_ile_gorunur()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Gizli);
        await using (transaction)
        {
            sablon.IsSharedOverride = true;
            await context.SaveChangesAsync();

            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            Assert.Contains(liste, s => s.Id == sablon.Id);
        }
    }

    [Fact]
    public async Task Acik_hesapta_false_override_ile_gizlenir()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Acik);
        await using (transaction)
        {
            sablon.IsSharedOverride = false;
            await context.SaveChangesAsync();

            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            Assert.DoesNotContain(liste, s => s.Id == sablon.Id);
        }
    }

    // ---- Arkadaşlık şartı ----

    [Fact]
    public async Task Arkadas_degilse_acik_hesapta_bile_bos_liste_alir()
    {
        var (context, a, b, _, _, transaction) = await CreateAsync(PrivacyLevel.Acik, arkadas: false);
        await using (transaction)
        {
            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            Assert.Empty(liste);
        }
    }

    [Fact]
    public async Task Arkadas_degilse_detay_ucuna_404_verir_sizdirmaz()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Acik, arkadas: false);
        await using (transaction)
        {
            var hata = await Assert.ThrowsAsync<NotFoundException>(
                () => ServiceFor(context, a).GetSharedTemplateDetailAsync(b.Username, sablon.Id));
            Assert.DoesNotContain(sablon.Id.ToString(), hata.Message);
        }
    }

    [Fact]
    public async Task Arkadas_degilse_kaydetme_ucuna_404_verir()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync(PrivacyLevel.Acik, arkadas: false);
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id));
        }
    }

    // ---- Kaydetme ----

    [Fact]
    public async Task Kaydetme_anlik_goruntu_kopyalar_ve_kaynagi_isaretler()
    {
        var (context, a, b, sablon, egzersiz, transaction) = await CreateAsync();
        await using (transaction)
        {
            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);

            Assert.Equal(b.Username, kopya.SavedFromUsername);
            Assert.Single(kopya.Exercises);
            Assert.Equal(egzersiz.Id, kopya.Exercises[0].ExerciseId);
        }
    }

    [Fact]
    public async Task Kaydetme_isim_cakismasinda_ayirt_edici_ekler()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new WorkoutTemplate { User = a, Name = sablon.Name, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);

            Assert.Equal($"{sablon.Name} ({b.Username})", kopya.Name);
        }
    }

    [Fact]
    public async Task Kaynagin_ozel_egzersizi_kopyaya_gecmez()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var bOzelEgzersiz = TestDatabase.NewExercise(b, $"B'nin ozel egzersizi {Guid.NewGuid():N}");
            context.Add(bOzelEgzersiz);
            await context.SaveChangesAsync();
            context.Add(new TemplateExercise { WorkoutTemplateId = sablon.Id, ExerciseId = bOzelEgzersiz.Id, OrderIndex = 1, PlannedSets = 3 });
            await context.SaveChangesAsync();

            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);

            // Yalnizca global egzersiz kopyalanir; B'nin ozel egzersizi A'ya GORUNMEZ (IDOR kurali).
            Assert.Single(kopya.Exercises);
            Assert.DoesNotContain(kopya.Exercises, e => e.ExerciseId == bOzelEgzersiz.Id);
        }
    }
}
```

- [ ] **Step 2: Testleri çalıştır, derleme hatasıyla başarısız olduğunu doğrula**

Run: `dotnet test --filter "FullyQualifiedName~SharedTemplateServiceTests"`
Expected: derleme hatası — `SharedTemplateResponse`/`ISharedTemplateService`/`SharedTemplateService` yok.

- [ ] **Step 3: `SharedTemplateResponse` DTO'sunu yaz**

```csharp
// src/Grind.Api/Models/Dtos/Template/SharedTemplateResponse.cs
namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Bir arkadaşın paylaştığı şablonun salt-okunur görünümü (#467) — sahiplik/paylaşım alanları
/// TAŞIMAZ, bakan zaten görünürlük kontrolünden geçmiş.
/// </summary>
public record SharedTemplateResponse(
    long Id,
    string Name,
    IReadOnlyList<TemplateExerciseResponse> Exercises);
```

- [ ] **Step 4: `TemplateMapper`'a `ToSharedResponse` ekle**

```csharp
// src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs -- sınıfın içine ekle
public static SharedTemplateResponse ToSharedResponse(WorkoutTemplate template) => new(
    template.Id, template.Name, ExercisesOf(template));
```

- [ ] **Step 5: Servis arayüzünü yaz**

```csharp
// src/Grind.Api/Services/ISharedTemplateService.cs
using Grind.Api.Models.Dtos.Template;

namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık-şartlı şablon paylaşımı (#467) — `PublicActivityService`'in gizlilik-tabanlı
/// (arkadaşlıksız) kapısından AYRI: burada arkadaşlık HÂLÂ şarttır.
/// </summary>
public interface ISharedTemplateService
{
    /// <summary>Arkadaş değilsen boş liste (403 değil — görünürlük kuralı, yetki hatası değil).</summary>
    Task<IReadOnlyList<SharedTemplateResponse>> GetSharedTemplatesAsync(
        string username, CancellationToken cancellationToken = default);

    /// <summary>Görünür değilse NotFoundException (404) — hangi şablonun var olduğunu sızdırmaz.</summary>
    Task<SharedTemplateResponse> GetSharedTemplateDetailAsync(
        string username, long templateId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Anlık görüntü olarak kopyalar: kaydedene GÖRÜNÜR olmayan (kaynağın özel) egzersizler
    /// atlanır. Kopyalanacak hiçbir satır kalmazsa (şablon boş değilken) ValidationException (400).
    /// </summary>
    Task<Grind.Api.Models.Dtos.Template.TemplateResponse> SaveTemplateAsync(
        string username, long templateId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 6: Servis uygulamasını yaz**

```csharp
// src/Grind.Api/Services/SharedTemplateService.cs
using Grind.Api.Common.Exceptions;
using Grind.Api.Data;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class SharedTemplateService(
    IUserRepository userRepository,
    IWorkoutTemplateRepository templateRepository,
    IExerciseRepository exerciseRepository,
    IFriendshipService friendshipService,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : ISharedTemplateService
{
    private const string TemplateNotFound = "Şablon bulunamadı.";

    public async Task<IReadOnlyList<SharedTemplateResponse>> GetSharedTemplatesAsync(
        string username, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var isSelf = target.Id == currentUser.UserId;
        if (!isSelf && !await friendshipService.AreFriendsAsync(currentUser.UserId, target.Id, cancellationToken))
            return [];

        var templates = await templateRepository.GetAllAsync(target.Id, cancellationToken);
        return templates
            .Where(t => isSelf || IsVisible(t, target.PrivacyLevel))
            .Select(TemplateMapper.ToSharedResponse)
            .ToList();
    }

    public async Task<SharedTemplateResponse> GetSharedTemplateDetailAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
        => TemplateMapper.ToSharedResponse(await VisibleOrThrowAsync(username, templateId, cancellationToken));

    public async Task<TemplateResponse> SaveTemplateAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
    {
        var source = await VisibleOrThrowAsync(username, templateId, cancellationToken);

        var candidateIds = source.TemplateExercises.Select(te => te.ExerciseId).ToList();
        var visible = candidateIds.Count == 0
            ? []
            : await exerciseRepository.GetVisibleByIdsAsync(candidateIds, currentUser.UserId, cancellationToken);
        var visibleIds = visible.Select(e => e.Id).ToHashSet();

        // Kaynağın ÖZEL egzersizleri kopyalayana görünmez -- ownership kuralı (CLAUDE.md
        // Yetkilendirme Kuralı). Bu satırlar sessizce atlanır, global/kendi egzersizler kalır.
        var kopyalanacaklar = source.TemplateExercises
            .Where(te => visibleIds.Contains(te.ExerciseId))
            .OrderBy(te => te.OrderIndex)
            .ToList();

        if (kopyalanacaklar.Count == 0 && source.TemplateExercises.Count > 0)
            throw new ValidationException("Bu şablonun hiçbir hareketi kaydedilemedi.");

        var name = await UniqueNameAsync(source.Name, username, cancellationToken);

        var kopya = new WorkoutTemplate
        {
            UserId = currentUser.UserId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            SavedFromUserId = source.UserId
        };

        for (var i = 0; i < kopyalanacaklar.Count; i++)
        {
            kopya.TemplateExercises.Add(new TemplateExercise
            {
                ExerciseId = kopyalanacaklar[i].ExerciseId,
                OrderIndex = i,
                PlannedSets = kopyalanacaklar[i].PlannedSets,
                RestSeconds = kopyalanacaklar[i].RestSeconds
            });
        }

        templateRepository.Add(kopya);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var yeniden = await templateRepository.GetOwnedByIdAsync(kopya.Id, currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException(TemplateNotFound);
        return TemplateMapper.ToResponse(yeniden, lastUsedAt: null);
    }

    private async Task<WorkoutTemplate> VisibleOrThrowAsync(
        string username, long templateId, CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var isSelf = target.Id == currentUser.UserId;
        if (!isSelf && !await friendshipService.AreFriendsAsync(currentUser.UserId, target.Id, cancellationToken))
            throw new NotFoundException(TemplateNotFound);

        var template = await templateRepository.GetOwnedByIdAsync(templateId, target.Id, cancellationToken);
        if (template is null || (!isSelf && !IsVisible(template, target.PrivacyLevel)))
            throw new NotFoundException(TemplateNotFound);

        return template;
    }

    private async Task<string> UniqueNameAsync(string name, string sourceUsername, CancellationToken cancellationToken)
    {
        if (!await templateRepository.NameExistsAsync(currentUser.UserId, name, null, cancellationToken))
            return name;

        var aday = $"{name} ({sourceUsername})";
        var sayac = 2;
        while (await templateRepository.NameExistsAsync(currentUser.UserId, aday, null, cancellationToken))
        {
            aday = $"{name} ({sourceUsername} {sayac})";
            sayac++;
        }
        return aday;
    }

    private static bool IsVisible(WorkoutTemplate template, PrivacyLevel ownerLevel) =>
        template.IsSharedOverride ?? ownerLevel != PrivacyLevel.Gizli;
}
```

- [ ] **Step 7: DI'a kaydet**

```csharp
// src/Grind.Api/Services/DependencyInjection.cs -- AddApplicationServices içine ekle
services.AddScoped<ISharedTemplateService, SharedTemplateService>();
```

- [ ] **Step 8: Testleri çalıştır ve geçtiğini doğrula**

Run: `dotnet build && dotnet test --filter "FullyQualifiedName~SharedTemplateServiceTests"`
Expected: PASS (11 test).

- [ ] **Step 9: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Template/SharedTemplateResponse.cs src/Grind.Api/Models/Dtos/Template/TemplateMapper.cs src/Grind.Api/Services/ISharedTemplateService.cs src/Grind.Api/Services/SharedTemplateService.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Services/SharedTemplateServiceTests.cs
git commit -m "feat: arkadastan sablon gorme ve kaydetme servisini ekle (#467)"
```

---

### Task 7: `UsersController` uçları

**Files:**
- Modify: `src/Grind.Api/Controllers/UsersController.cs`

**Interfaces:**
- Consumes: Task 6 `ISharedTemplateService`.
- Produces: `GET /api/users/{username}/templates`, `GET /api/users/{username}/templates/{id}`, `POST /api/users/{username}/templates/{id}/save`.

- [ ] **Step 1: Servisi enjekte et ve uçları ekle**

```csharp
// src/Grind.Api/Controllers/UsersController.cs
public class UsersController(
    IFollowService followService,
    IProfileService profileService,
    IPublicActivityService publicActivityService,
    ISharedTemplateService sharedTemplateService) : ControllerBase
{
    // ... mevcut uçlar aynı kalır ...

    /// <summary>
    /// Hedefin paylaşılan şablonları (#467) — arkadaşlık ŞARTTIR (History/Records'un aksine).
    /// Arkadaş değilsen boş liste, hedef pasif/yoksa 404.
    /// </summary>
    [HttpGet("{username}/templates")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SharedTemplateResponse>>> GetSharedTemplates(
        string username, CancellationToken cancellationToken)
        => Ok(await sharedTemplateService.GetSharedTemplatesAsync(username, cancellationToken));

    /// <summary>Görünür değilse 404 (hangi şablonun var olduğunu sızdırmaz).</summary>
    [HttpGet("{username}/templates/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SharedTemplateResponse>> GetSharedTemplateDetail(
        string username, long id, CancellationToken cancellationToken)
        => Ok(await sharedTemplateService.GetSharedTemplateDetailAsync(username, id, cancellationToken));

    /// <summary>Kendi hesabına anlık görüntü olarak kopyalar (#467).</summary>
    [HttpPost("{username}/templates/{id:long}/save")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateResponse>> SaveSharedTemplate(
        string username, long id, CancellationToken cancellationToken)
    {
        var saved = await sharedTemplateService.SaveTemplateAsync(username, id, cancellationToken);
        return Created($"/api/templates/{saved.Id}", saved);
    }
}
```

`using Grind.Api.Models.Dtos.Template;` gerekli — dosyanın başındaki using bloğuna ekle.

- [ ] **Step 2: Derle**

Run: `dotnet build`
Expected: hatasız derleme.

- [ ] **Step 3: Commit**

```bash
git add src/Grind.Api/Controllers/UsersController.cs
git commit -m "feat: paylasilan sablon uclarini UsersController'a ekle (#467)"
```

---

### Task 8: `packages/shared` — schema, tipler ve sorgu kancaları

**Files:**
- Modify: `packages/shared/src/api/schema.d.ts` (üretilir)
- Modify: `packages/shared/src/api/queries.ts`

**Interfaces:**
- Consumes: Task 1-7 backend uçları.
- Produces: `Sablon` (genişletilmiş), `SharedSablon`, `useSharedTemplates(username)`, `useSharedTemplate(username, id)`, `useSaveSharedTemplate(username)`, `useUpdateTemplateSharing()`, `queryKeys.paylasilanSablonlar*`. Mobil görevler bunları kullanır.

- [ ] **Step 1: API'yi yerelde ayağa kaldır ve şemayı yeniden üret**

Run: `dotnet run --project src/Grind.Api` (ayrı bir terminalde bırak), sonra `npx openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o packages/shared/src/api/schema.d.ts`
Expected: `git diff --stat packages/shared/src/api/schema.d.ts` yalnızca bu dosyayı gösterir; `SharedTemplateResponse`, `UpdateTemplateSharingRequest` şemaları ve `TemplateResponse`'un yeni alanları (`isSharedOverride`, `savedFromUsername`, `lastUsedAt`) görünür. API'yi durdur.

- [ ] **Step 2: Yeni tip takma adlarını ekle**

```ts
// packages/shared/src/api/queries.ts -- diger "type X = components['schemas'][...]" satirlarinin yanina
type SharedTemplateResponse = components['schemas']['SharedTemplateResponse'];
type UpdateTemplateSharingRequest = components['schemas']['UpdateTemplateSharingRequest'];
```

- [ ] **Step 3: `Sablon`'u genişlet ve doğrulamayı güncelle**

```ts
// packages/shared/src/api/queries.ts -- Sablon interface'ini degistir
export interface Sablon {
  id: number;
  name: string;
  exercises: SablonHareketi[];
  isSharedOverride: boolean | null;
  savedFromUsername: string | null;
  lastUsedAt: string | null;
}

// dogrulanmisSablon'u degistir
function dogrulanmisSablon(yanit: TemplateResponse): Sablon {
  if (yanit.id === undefined || !yanit.name) {
    throw new Error('Sunucudan eksik sablon yaniti alindi.');
  }
  return {
    id: yanit.id,
    name: yanit.name,
    exercises: (yanit.exercises ?? []).map(dogrulanmisSablonHareketi),
    isSharedOverride: yanit.isSharedOverride ?? null,
    savedFromUsername: yanit.savedFromUsername ?? null,
    lastUsedAt: yanit.lastUsedAt ?? null,
  };
}
```

- [ ] **Step 4: `SharedSablon` tipini ve doğrulamasını ekle**

```ts
// packages/shared/src/api/queries.ts -- Sablon bloğundan sonra
export interface SharedSablon {
  id: number;
  name: string;
  exercises: SablonHareketi[];
}

function dogrulanmisSharedSablon(yanit: SharedTemplateResponse): SharedSablon {
  if (yanit.id === undefined || !yanit.name) {
    throw new Error('Sunucudan eksik paylasilan sablon yaniti alindi.');
  }
  return {
    id: yanit.id,
    name: yanit.name,
    exercises: (yanit.exercises ?? []).map(dogrulanmisSablonHareketi),
  };
}
```

- [ ] **Step 5: `queryKeys`'e anahtarları ekle**

```ts
// packages/shared/src/api/queries.ts -- queryKeys nesnesine ekle (bildirimlerAll'dan sonra)
// #467: bir kullanicinin paylasilan sablonlari; onek sayesinde kaydetme/paylasim degisikligi
// hem listeyi hem detayi tazeler.
paylasilanSablonlarAll: (kullaniciAdi: string) => ['paylasilanSablonlar', kullaniciAdi] as const,
paylasilanSablonlar: (kullaniciAdi: string) => [...queryKeys.paylasilanSablonlarAll(kullaniciAdi), 'liste'] as const,
paylasilanSablon: (kullaniciAdi: string, id: number) =>
  [...queryKeys.paylasilanSablonlarAll(kullaniciAdi), id] as const,
```

- [ ] **Step 6: Sorgu ve mutasyon kancalarını ekle**

```ts
// packages/shared/src/api/queries.ts -- useDeleteTemplate'ten sonra
export function useSharedTemplates(kullaniciAdi: string | null) {
  return useQuery({
    queryKey: queryKeys.paylasilanSablonlar(kullaniciAdi ?? ''),
    queryFn: async (): Promise<SharedSablon[]> => {
      const yanit = await request<SharedTemplateResponse[]>(`/users/${kullaniciAdi}/templates`);
      return yanit.map(dogrulanmisSharedSablon);
    },
    enabled: kullaniciAdi !== null,
  });
}

export function useSharedTemplate(kullaniciAdi: string | null, id: number | null) {
  return useQuery({
    queryKey: queryKeys.paylasilanSablon(kullaniciAdi ?? '', id ?? 0),
    queryFn: async (): Promise<SharedSablon> =>
      dogrulanmisSharedSablon(
        await request<SharedTemplateResponse>(`/users/${kullaniciAdi}/templates/${id}`),
      ),
    enabled: kullaniciAdi !== null && id !== null,
  });
}

/** Kaydedince kendi sablon listen ANINDA tazelenir -- "My Templates" altinda yeni kart gorunur. */
export function useSaveSharedTemplate(kullaniciAdi: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<Sablon> =>
      dogrulanmisSablon(
        await request<TemplateResponse>(`/users/${kullaniciAdi}/templates/${id}/save`, { method: 'POST' }),
      ),
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useUpdateTemplateSharing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, override: yeniDurum }: { id: number; override: boolean | null }): Promise<Sablon> => {
      const govde: UpdateTemplateSharingRequest = { override: yeniDurum };
      return dogrulanmisSablon(
        await request<TemplateResponse>(`/templates/${id}/sharing`, { method: 'PUT', body: JSON.stringify(govde) }),
      );
    },
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}
```

- [ ] **Step 7: Ortak paketi tip kontrolünden geçir**

Run: `npm run typecheck --workspace @grind/shared`
Expected: hatasız.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/api/schema.d.ts packages/shared/src/api/queries.ts
git commit -m "feat: sablon paylasimi icin shared tip ve sorgulari ekle (#467)"
```

---

### Task 9: Çok dil — `tr.ts` + `en.ts`

**Files:**
- Modify: `packages/shared/src/i18n/tr.ts`
- Modify: `packages/shared/src/i18n/en.ts`
- Modify: `mobile/src/components/ProfilSekmeleri.tsx` (`etiketAnahtari` union genişlet)

**Interfaces:**
- Produces: `kabuk.sekmeSablonlar`, `sablonlar.paylas*`, `sablonlar.kaydedilen*`, `sablonlar.arkadasSablonuKaydet*` anahtarları — Task 10-14 mobil bileşenleri bunları kullanır.

- [ ] **Step 1: `tr.ts`'e anahtarları ekle**

```ts
// packages/shared/src/i18n/tr.ts -- kabuk bölümüne (sekmeRekorlar'dan sonra) ekle
sekmeSablonlar: 'Şablonlar',
```

```ts
// packages/shared/src/i18n/tr.ts -- sablonlar bölümüne (dinlenmeDk'dan sonra) ekle
paylasBasligi: 'Bu şablonu paylaş',
paylasVarsayilan: 'Hesap ayarına göre ({{durum}})',
paylasHerkeseAcik: 'Herkese açık',
paylasGizli: 'Gizli',
paylasAciklama: 'Arkadaşların (karşılıklı takip) bu şablonu profilinde görebilir.',
paylasimGuncellenemedi: 'Paylaşım ayarı güncellenemedi.',
kaydedilenKaynak: '{{kullaniciAdi}} tarafından paylaşıldı',
kaydedilenlerBasligi: 'Kaydedilenler',
kaydedilenlerYok: 'Henüz kaydedilmiş bir şablonun yok.',
sablonuKaydet: 'Şablonu kaydet',
sablonKaydedildi: 'Şablon kendi hesabına kaydedildi.',
sablonKaydedilemedi: 'Şablon kaydedilemedi.',
arkadasSablonuYok: 'Bu kullanıcının paylaşılan şablonu yok.',
arkadasSablonlariAlinamadi: 'Şablonlar alınamadı.',
```

- [ ] **Step 2: `en.ts`'e karşılıklarını ekle**

```ts
// packages/shared/src/i18n/en.ts -- kabuk bölümüne
sekmeSablonlar: 'Templates',
```

```ts
// packages/shared/src/i18n/en.ts -- sablonlar bölümüne
paylasBasligi: 'Share this template',
paylasVarsayilan: 'Follows account setting ({{durum}})',
paylasHerkeseAcik: 'Public',
paylasGizli: 'Hidden',
paylasAciklama: 'Your friends (mutual follows) can see this template on your profile.',
paylasimGuncellenemedi: 'Could not update sharing setting.',
kaydedilenKaynak: 'Shared by {{kullaniciAdi}}',
kaydedilenlerBasligi: 'Saved',
kaydedilenlerYok: "You haven't saved any templates yet.",
sablonuKaydet: 'Save template',
sablonKaydedildi: 'Template saved to your account.',
sablonKaydedilemedi: 'Could not save the template.',
arkadasSablonlariAlinamadi: 'Could not load templates.',
arkadasSablonuYok: 'This user has no shared templates.',
```

- [ ] **Step 3: `ProfilSekmesi`'nin `etiketAnahtari` union'ını genişlet**

```ts
// mobile/src/components/ProfilSekmeleri.tsx
export interface ProfilSekmesi {
  to: string;
  etiketAnahtari: 'kabuk.sekmeGecmis' | 'kabuk.sekmeRekorlar' | 'kabuk.sekmeOlcumler' | 'kabuk.sekmeSablonlar';
  ikon: LucideIcon;
}
```

- [ ] **Step 4: Katalog testlerini çalıştır**

Run: `npm run test --workspace @grind/shared -- katalog`
Expected: PASS — iki katalog aynı anahtarları taşıyor.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/i18n/tr.ts packages/shared/src/i18n/en.ts mobile/src/components/ProfilSekmeleri.tsx
git commit -m "feat: sablon paylasimi metinlerini tr/en katalogla ekle (#467)"
```

---

### Task 10: Kendi şablon formunda paylaşım tri-state kontrolü

**Files:**
- Modify: `mobile/src/components/SablonFormu.tsx`

**Interfaces:**
- Consumes: Task 8 `useUpdateTemplateSharing()`, Task 9 i18n anahtarları.

- [ ] **Step 1: Testi yaz**

`SablonFormu` bugün `useExercises`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate`'i `@grind/shared/api/queries`'ten çeker; mevcut `SablonlaBasla.test.tsx`'teki desenle AYNI şekilde `jest.mock` ile taklit edilir (MSW/QueryClientProvider YOK, gerçek istek atılmaz — hook'lar doğrudan mock fonksiyon döndürür).

```tsx
// mobile/src/components/SablonFormu.test.tsx (dosya yoksa oluştur)
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  useExercises,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useUpdateTemplateSharing,
} from '@grind/shared/api/queries';
import SablonFormu from './SablonFormu';

jest.mock('@grind/shared/api/queries', () => ({
  useExercises: jest.fn(),
  useCreateTemplate: jest.fn(),
  useUpdateTemplate: jest.fn(),
  useDeleteTemplate: jest.fn(),
  useUpdateTemplateSharing: jest.fn(),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const useUpdateTemplateSharingMock = useUpdateTemplateSharing as jest.Mock;
const paylasimMutasyonu = jest.fn();

const sablon = {
  id: 1,
  name: 'Push Day',
  exercises: [],
  isSharedOverride: null,
  savedFromUsername: null,
  lastUsedAt: null,
};

beforeEach(() => {
  paylasimMutasyonu.mockReset();
  (useExercises as jest.Mock).mockReturnValue({ data: [] });
  (useCreateTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useUpdateTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useDeleteTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  useUpdateTemplateSharingMock.mockReturnValue({ mutate: paylasimMutasyonu, isPending: false, isError: false });
});

test('Herkese acik secilince paylasim mutasyonu override true ile cagrilir', async () => {
  await render(<SablonFormu sablon={sablon} donusYolu="/templates" />);

  await fireEvent.press(screen.getByText('Herkese açık'));

  expect(paylasimMutasyonu).toHaveBeenCalledWith({ id: 1, override: true });
});

test('yeni sablon olustururken (sablon null) paylasim kontrolu gorunmez', async () => {
  await render(<SablonFormu sablon={null} donusYolu="/templates" />);

  expect(screen.queryByText('Bu şablonu paylaş')).toBeNull();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm run test --workspace mobile -- SablonFormu`
Expected: FAIL — "Herkese açık" metni ekranda yok.

- [ ] **Step 3: Formu güncelle**

```tsx
// mobile/src/components/SablonFormu.tsx
// import bloguna ekle:
import { useUpdateTemplateSharing } from '@grind/shared/api/queries';

// Props/state'ten sonra, kaydet dugmesinden once (BirincilDugme'den once) ekle:
const paylasimMutasyonu = useUpdateTemplateSharing();

function paylasimSecenegi(): 'varsayilan' | 'acik' | 'gizli' {
  if (sablon?.isSharedOverride === true) return 'acik';
  if (sablon?.isSharedOverride === false) return 'gizli';
  return 'varsayilan';
}

// JSX'e, "Hareketler" basligindan once, sadece duzenlerken (sablon dolu):
{sablon && (
  <View className="flex-col gap-2">
    <Text className="text-heading text-fg">{t('sablonlar.paylasBasligi')}</Text>
    <Text className="text-label text-muted">{t('sablonlar.paylasAciklama')}</Text>
    <View className="flex-row gap-2">
      {(
        [
          { deger: null, etiket: t('sablonlar.paylasVarsayilan', { durum: '' }) },
          { deger: true, etiket: t('sablonlar.paylasHerkeseAcik') },
          { deger: false, etiket: t('sablonlar.paylasGizli') },
        ] as const
      ).map((secenek) => {
        const secili =
          (secenek.deger === null && paylasimSecenegi() === 'varsayilan') ||
          (secenek.deger === true && paylasimSecenegi() === 'acik') ||
          (secenek.deger === false && paylasimSecenegi() === 'gizli');
        return (
          <Pressable
            key={String(secenek.deger)}
            accessibilityRole="button"
            accessibilityState={{ selected: secili }}
            disabled={paylasimMutasyonu.isPending}
            onPress={() => sablon && paylasimMutasyonu.mutate({ id: sablon.id, override: secenek.deger })}
            className={`h-11 flex-1 items-center justify-center rounded-xl ${secili ? 'bg-accent' : 'bg-surface-3'}`}
          >
            <Text className={`text-label ${secili ? 'text-on-accent' : 'text-fg'}`}>{secenek.etiket}</Text>
          </Pressable>
        );
      })}
    </View>
    {paylasimMutasyonu.isError && (
      <Text accessibilityRole="alert" className="text-label text-danger">
        {t('sablonlar.paylasimGuncellenemedi')}
      </Text>
    )}
  </View>
)}
```

- [ ] **Step 4: Testi çalıştır ve geçtiğini doğrula**

Run: `npm run test --workspace mobile -- SablonFormu`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/SablonFormu.tsx mobile/src/components/SablonFormu.test.tsx
git commit -m "feat: sablon duzenleme formuna paylasim kontrolu ekle (#467)"
```

---

### Task 11: Başkasının profilinde koşullu "Şablonlar" sekmesi + liste ekranı

**Files:**
- Modify: `mobile/app/(tabs)/profile/u/[username]/_layout.tsx`
- Create: `mobile/app/(tabs)/profile/u/[username]/templates.tsx`

**Interfaces:**
- Consumes: Task 8 `useSharedTemplates`, Task 9 i18n.
- Produces: `/profile/u/[username]/templates` rotası; Task 12 buradan detay ekranına gider.

- [ ] **Step 1: Sekme listesine koşullu satırı ekle, filtreyi test edilebilir bir fonksiyona çıkar**

```tsx
// mobile/app/(tabs)/profile/u/[username]/_layout.tsx
// import bloguna ekle:
import { Dumbbell } from 'lucide-react-native';

// Dosya seviyesinde (bileşenin DIŞINDA), export edilen saf fonksiyon -- Task 15 bunu doğrudan test eder:
/**
 * #467: Şablonlar sekmesi SADECE arkadaşsan görünür (History/Records'un "her zaman görünür,
 * içerik boşalır" deseninin BİLEREK aksine). Gizli hesapta Geçmiş de düşer (#294'ten beri).
 */
export function gorunurSekmeler(kok: string, arkadas: boolean, gizli: boolean) {
  return (
    [
      { to: `${kok}/history`, etiketAnahtari: 'kabuk.sekmeGecmis' as const, ikon: History },
      { to: `${kok}/records`, etiketAnahtari: 'kabuk.sekmeRekorlar' as const, ikon: Trophy },
      { to: `${kok}/templates`, etiketAnahtari: 'kabuk.sekmeSablonlar' as const, ikon: Dumbbell },
    ] as const
  ).filter((s) => {
    if (s.to.endsWith('/templates')) return arkadas;
    return !gizli || s.to.endsWith('/records');
  });
}

// BaskasininBasligi icindeki sekmeler tanimini degistir:
const arkadas = profil.data.relation === 'Friends';
const gizli = profil.data.privacyLevel === 'Gizli';
const kok = `/profile/u/${ad}`;
const sekmeler = gorunurSekmeler(kok, arkadas, gizli);
```

- [ ] **Step 2: Liste ekranını yaz**

```tsx
// mobile/app/(tabs)/profile/u/[username]/templates.tsx
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSharedTemplates } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import BosDurum from '../../../../../src/ui/BosDurum';
import { useAltMenuPayi } from '../../../../../src/ui/KabukTabBar';
import PaylasilanSablonSatiri from '../../../../../src/components/PaylasilanSablonSatiri';

/**
 * #467: arkadaşın paylaştığı şablonlar -- sadece arkadaşsan bu ekrana yönlendirilir (bkz.
 * `_layout.tsx`'teki koşullu sekme). Kendi Rekorlar/Geçmiş ekranlarıyla ayni bos durum deseni.
 */
export default function PaylasilanSablonlarScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, isError } = useSharedTemplates(ad);

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.arkadasSablonlariAlinamadi')}
        </Text>
      )}
      {data && data.length === 0 && <BosDurum ikon={Dumbbell} baslik={t('sablonlar.arkadasSablonuYok')} />}
      {data && data.length > 0 && (
        <View className="flex-col gap-3">
          {data.map((sablon) => (
            <PaylasilanSablonSatiri key={sablon.id} kullaniciAdi={ad} sablon={sablon} ozet={sablonOzeti(sablon)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
```

Not: `PaylasilanSablonSatiri` Task 12'de yazılacak (satıra dokununca detay ekranına gider) — bu görev onu import eder ama dosyası henüz yok, bu yüzden Task 11'in derlenmesi Task 12 bitene kadar TAMAMLANMAZ. Sırayla uygulanmalı.

- [ ] **Step 3: Commit (Task 12 ile birlikte, aşağıda)**

Bu görevin commit'i Task 12'nin Step 5'inde BİRLİKTE yapılır (derlemenin geçmesi için ikisi birlikte gerekir).

---

### Task 12: Salt-okunur şablon detayı + "Şablonu kaydet"

**Files:**
- Create: `mobile/src/components/PaylasilanSablonSatiri.tsx`
- Create: `mobile/app/(tabs)/profile/u/[username]/templates/[id].tsx`

**Interfaces:**
- Consumes: Task 8 `useSharedTemplate`, `useSaveSharedTemplate`; Task 9 i18n.
- Produces: `PaylasilanSablonSatiri` (Task 11 kullanıyor); `/profile/u/[username]/templates/[id]` rotası.

- [ ] **Step 1: Satır bileşenini yaz**

```tsx
// mobile/src/components/PaylasilanSablonSatiri.tsx
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SharedSablon } from '@grind/shared/api/queries';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonFiguru from '../ui/SablonFiguru';

interface Props {
  kullaniciAdi: string;
  sablon: SharedSablon;
  ozet: SablonOzeti;
}

/** #467: liste satırı -- dokununca salt-okunur detay ekranına gider. */
export default function PaylasilanSablonSatiri({ kullaniciAdi, sablon, ozet }: Props) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/profile/u/${kullaniciAdi}/templates/${sablon.id}` as never)}
      className="flex-row items-center gap-3 rounded-xl border border-surface-4 bg-surface-2 p-4"
    >
      <SablonFiguru kategori={ozet.kategori} boyut={40} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-lg text-fg">{sablon.name}</Text>
        <Text numberOfLines={1} className="text-label text-muted">{ozet.hareketAdlari.join(', ')}</Text>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Detay ekranını yaz**

```tsx
// mobile/app/(tabs)/profile/u/[username]/templates/[id].tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSharedTemplate, useSaveSharedTemplate } from '@grind/shared/api/queries';
import BirincilDugme from '../../../../../../src/ui/BirincilDugme';
import HataKutusu from '../../../../../../src/ui/HataKutusu';
import { useAltMenuPayi } from '../../../../../../src/ui/KabukTabBar';

/**
 * #467: arkadaşın şablonunun salt-okunur görünümü -- kendi düzenleme formunu (SablonFormu)
 * KULLANMAZ, bu başkasının şablonu. "Şablonu kaydet" kendi hesabına anlık görüntü kopyalar.
 */
export default function PaylasilanSablonDetayEkrani() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  const router = useRouter();
  const { username: ad = '', id } = useLocalSearchParams<{ username: string; id: string }>();
  const templateId = Number(id);
  const { data: sablon, isLoading, isError } = useSharedTemplate(ad, templateId);
  const kaydetMutasyonu = useSaveSharedTemplate(ad);
  const [kaydetHatasi, setKaydetHatasi] = useState<string | null>(null);

  async function kaydet() {
    setKaydetHatasi(null);
    try {
      await kaydetMutasyonu.mutateAsync(templateId);
      router.push('/(tabs)' as never);
    } catch {
      setKaydetHatasi(t('sablonlar.sablonKaydedilemedi'));
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && <HataKutusu baslik={t('sablonlar.tekilHata')} mesaj={t('sablonlar.arkadasSablonlariAlinamadi')} />}
      {sablon && (
        <>
          <BirincilDugme yukseklik="normal" disabled={kaydetMutasyonu.isPending} onPress={kaydet}>
            {t('sablonlar.sablonuKaydet')}
          </BirincilDugme>
          {kaydetHatasi && <HataKutusu baslik={t('sablonlar.sablonKaydedilemedi')} mesaj={kaydetHatasi} />}

          <Text className="text-heading font-bold text-fg">{sablon.name}</Text>
          <View className="flex-col gap-3">
            {sablon.exercises.map((hareket) => (
              <View key={hareket.exerciseId} className="rounded-xl border border-surface-4 bg-surface-2 p-4">
                <Text className="text-body-lg text-fg">{hareket.exerciseName}</Text>
                <Text className="text-label text-muted">
                  {t('sablonlar.hareketSayisi', { count: hareket.plannedSets })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 3: Derle ve mobil test paketini çalıştır**

Run: `npm run typecheck --workspace mobile && npm run test --workspace mobile`
Expected: hatasız derleme, mevcut testler PASS (yeni ekranlar için otomatik test bu görevde yok — Task 15 kapsıyor).

- [ ] **Step 4: Manuel gözle dene**

`npm run start --workspace mobile` ile uygulamayı aç, iki test kullanıcısı arasında karşılıklı takip kur, biri şablon oluşturup paylaşıma açsın (Task 10'daki toggle), diğeri "Şablonlar" sekmesinden görüp kaydetsin. İngilizce dilde de aynı akışı dene (Hesap ayarları → Dil → English).

- [ ] **Step 5: Commit (Task 11 ile birlikte)**

```bash
git add mobile/app/(tabs)/profile/u/[username]/_layout.tsx mobile/app/(tabs)/profile/u/[username]/templates.tsx mobile/app/(tabs)/profile/u/[username]/templates/[id].tsx mobile/src/components/PaylasilanSablonSatiri.tsx
git commit -m "feat: baskasinin profilinde sablonlar sekmesi ve kaydetme ekle (#467)"
```

---

### Task 13: `SablonKayitliKarti` — yatay kaydedilen şablon kartı

**Files:**
- Create: `mobile/src/ui/SablonKayitliKarti.tsx`
- Test: `mobile/src/ui/SablonKayitliKarti.test.tsx`

**Interfaces:**
- Consumes: `Sablon` (Task 8, `savedFromUsername` alanı), `SablonOzeti` (mevcut `sablonOzeti`), `useIkonRenk`.
- Produces: `SablonKayitliKarti({ sablon, ozet, onBasla, onMenu, disabled }: Props)` — Task 14 kullanır.

- [ ] **Step 1: Testi yaz**

```tsx
// mobile/src/ui/SablonKayitliKarti.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import SablonKayitliKarti from './SablonKayitliKarti';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';

const sablon = {
  id: 1,
  name: 'Push Day (efe)',
  savedFromUsername: 'efe',
  exercises: [{ exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, plannedSets: 4, restSeconds: 90 }],
};

test('karta dokununca onBasla cagrilir', () => {
  const onBasla = jest.fn();
  render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi={sablon.savedFromUsername}
      ozet={sablonOzeti(sablon)}
      onBasla={onBasla}
      onMenu={jest.fn()}
      disabled={false}
    />,
  );

  fireEvent.press(screen.getByRole('button', { name: sablon.name }));

  expect(onBasla).toHaveBeenCalledTimes(1);
});

test('kimden kaydedildigi metni gorunur', () => {
  render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi="efe"
      ozet={sablonOzeti(sablon)}
      onBasla={jest.fn()}
      onMenu={jest.fn()}
      disabled={false}
    />,
  );

  expect(screen.getByText('efe tarafından paylaşıldı')).toBeTruthy();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm run test --workspace mobile -- SablonKayitliKarti`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Bileşeni yaz**

```tsx
// mobile/src/ui/SablonKayitliKarti.tsx
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonFiguru from './SablonFiguru';
import { KART_YUKSEKLIGI } from './SablonVitrinKarti';
import { useIkonRenk } from './renkler';

export const KAYITLI_KART_YUKSEKLIGI = KART_YUKSEKLIGI / 2;

interface Props {
  ad: string;
  kaynakKullaniciAdi: string | null;
  ozet: SablonOzeti;
  genislik?: number;
  onBasla: () => void;
  onMenu: () => void;
  disabled: boolean;
  ref?: React.Ref<View>;
}

/**
 * #467: "My Templates" altında kaydedilenler için yatay, uzun dikdörtgen kart --
 * `SablonVitrinKarti`nin yarı yükseklikte, tek dokunuşlu (ayrı bir "Başla" düğmesi yok) hali.
 * Basılı tutma menüsü (Düzenle/Sil) `SablonMenusu`den, çağıran taraf yönetir (SablonVitrinKarti ile aynı desen).
 */
export default function SablonKayitliKarti({
  ad,
  kaynakKullaniciAdi,
  ozet,
  genislik,
  onBasla,
  onMenu,
  disabled,
  ref,
}: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={ad}
      accessibilityHint={t('sablonlar.kartIpucu')}
      accessibilityActions={[{ name: 'longpress' }]}
      onAccessibilityAction={(olay) => olay.nativeEvent.actionName === 'longpress' && onMenu()}
      onPress={onBasla}
      disabled={disabled}
      className="flex-row items-center gap-3 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 p-3"
      style={{ height: KAYITLI_KART_YUKSEKLIGI, width: genislik, opacity: disabled ? 0.6 : 1 }}
    >
      <SablonFiguru kategori={ozet.kategori} boyut={56} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-lg font-bold text-fg">{ad}</Text>
        {kaynakKullaniciAdi && (
          <Text numberOfLines={1} className="text-label text-muted">
            {t('sablonlar.kaydedilenKaynak', { kullaniciAdi: kaynakKullaniciAdi })}
          </Text>
        )}
      </View>
      <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-accent/20">
        <Dumbbell color={ikonRenk.accentSoft} size={20} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 4: Testi çalıştır ve geçtiğini doğrula**

Run: `npm run test --workspace mobile -- SablonKayitliKarti`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/ui/SablonKayitliKarti.tsx mobile/src/ui/SablonKayitliKarti.test.tsx
git commit -m "feat: kaydedilen sablon karti bileseni ekle (#467)"
```

---

### Task 14: Antrenman sekmesinde "Kaydedilenler" bölümü ve sıralama

**Files:**
- Modify: `mobile/src/components/SablonlaBasla.tsx`

**Interfaces:**
- Consumes: Task 8 `Sablon.savedFromUsername`/`Sablon.lastUsedAt`, Task 13 `SablonKayitliKarti`, mevcut `SablonMenusu`, `useDeleteTemplate`.

- [ ] **Step 1: Testi yaz**

Mevcut dosya `useTemplates`'i doğrudan `jest.mock('@grind/shared/api/queries', ...)` ile taklit ediyor (`beforeEach`'teki `useTemplatesMock.mockReturnValue({ data: SABLONLAR, ... })`) — yeni testler AYNI mock'u, mevcut `SABLONLAR` sabitine dokunmadan, kendi verisiyle geçici olarak değiştirir.

```tsx
// mobile/src/components/SablonlaBasla.test.tsx -- mevcut dosyanin SONUNA ekle
test('kaydedilen sablonlar en son kullanilana gore siralanir, kendi sablonlarindan ayri gorunur', async () => {
  useTemplatesMock.mockReturnValue({
    data: [
      { id: 1, name: 'Kendi Sablonum', exercises: [], savedFromUsername: null, lastUsedAt: null },
      { id: 2, name: 'Eski Kayit', exercises: [], savedFromUsername: 'efe', lastUsedAt: '2026-09-01T00:00:00Z' },
      { id: 3, name: 'Yeni Kayit', exercises: [], savedFromUsername: 'efe', lastUsedAt: '2026-09-20T00:00:00Z' },
    ],
    isLoading: false,
    isError: false,
  });

  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.getByText('Kaydedilenler')).toBeTruthy();
  const satirlar = screen.getAllByText(/Kayit$/);
  expect(satirlar.map((s) => s.props.children)).toEqual(['Yeni Kayit', 'Eski Kayit']);
});

test('kaydedilen sablon yoksa Kaydedilenler basligi gorunmez', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.queryByText('Kaydedilenler')).toBeNull();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm run test --workspace mobile -- SablonlaBasla`
Expected: FAIL — "Kaydedilenler" metni yok.

- [ ] **Step 3: Bileşeni güncelle**

```tsx
// mobile/src/components/SablonlaBasla.tsx
// importlara ekle:
import SablonKayitliKarti from '../ui/SablonKayitliKarti';

// Bilesen govdesinde, sablonlar verisi geldikten sonra listeyi ikiye ayir. `!s.savedFromUsername`
// (strict `=== null` DEGIL): eski/mock sablon nesnelerinde alan hic yoksa (undefined) da kendi
// sablonu sayilmali -- aksi halde SablonlaBasla.test.tsx'teki SABLONLAR sabiti (bu alani
// tasimiyor) yanlislikla "kaydedilen" listesine dusup mevcut testleri kirar.
const kendiSablonlari = (sablonlar ?? []).filter((s) => !s.savedFromUsername);
const kaydedilenSablonlar = [...(sablonlar ?? []).filter((s) => s.savedFromUsername)].sort(
  (a, b) => new Date(b.lastUsedAt ?? 0).getTime() - new Date(a.lastUsedAt ?? 0).getTime(),
);

// SablonKaruseli'ne verilen `sablonlar` prop'unu `kendiSablonlari` yap (boş durum kontrolleri de
// `kendiSablonlari`ya gore), ve SablonKaruseli'nden hemen sonra (kapanis View'inden once) ekle:
{kaydedilenSablonlar.length > 0 && (
  <View className="flex-col gap-3">
    <Text className="text-heading text-fg">{t('sablonlar.kaydedilenlerBasligi')}</Text>
    {kaydedilenSablonlar.map((sablon) => (
      <SablonKayitliKarti
        key={sablon.id}
        ad={sablon.name}
        kaynakKullaniciAdi={sablon.savedFromUsername}
        ozet={sablonOzeti(sablon)}
        onBasla={() => onBasla(sablon.id)}
        onMenu={() => menuyuAc(sablon)}
        disabled={bekliyor}
      />
    ))}
  </View>
)}
```

`menuyuAc` fonksiyonu zaten mevcut (`SablonVitrinKarti` için kullanılan) — aynı `SablonMenusu` state'i kaydedilen kartlar için de yeniden kullanılır, ek bir menü bileşeni gerekmez.

- [ ] **Step 4: Testi çalıştır ve geçtiğini doğrula**

Run: `npm run test --workspace mobile -- SablonlaBasla`
Expected: PASS.

- [ ] **Step 5: Tüm mobil test paketini ve tip kontrolünü çalıştır**

Run: `npm run test --workspace mobile && npm run typecheck --workspace mobile`
Expected: hatasız.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/SablonlaBasla.tsx mobile/src/components/SablonlaBasla.test.tsx
git commit -m "feat: antrenman sekmesine kaydedilen sablonlar bolumunu ekle (#467)"
```

---

### Task 15: Kapsayıcı testler — koşullu sekme filtresi ve çevrilmemiş metin taraması

**Files:**
- Create: `mobile/app/(tabs)/profile/u/[username]/_layout.test.tsx`

**Interfaces:**
- Consumes: Task 11'in `gorunurSekmeler(kok, arkadas, gizli)` saf fonksiyonu — bileşeni Slot/router mock'larıyla render etmeden, yönlendirme kuralını doğrudan doğrular.

- [ ] **Step 1: Testi yaz**

```tsx
// mobile/app/(tabs)/profile/u/[username]/_layout.test.tsx
import { gorunurSekmeler } from './_layout';

test('arkadas degilse sablonlar sekmesi listede yok', () => {
  const sekmeler = gorunurSekmeler('/profile/u/efe', false, false);

  expect(sekmeler.some((s) => s.to.endsWith('/templates'))).toBe(false);
});

test('arkadassa sablonlar sekmesi listede var', () => {
  const sekmeler = gorunurSekmeler('/profile/u/efe', true, false);

  expect(sekmeler.some((s) => s.to.endsWith('/templates'))).toBe(true);
});

test('arkadas ve gizli hesap: sadece rekorlar ve sablonlar (gecmis dusuyor)', () => {
  const sekmeler = gorunurSekmeler('/profile/u/efe', true, true);

  expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['records', 'templates']);
});

test('arkadas olmayan gizli hesap: sadece rekorlar', () => {
  const sekmeler = gorunurSekmeler('/profile/u/efe', false, true);

  expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['records']);
});
```

- [ ] **Step 2: Testleri çalıştır, geçtiğini doğrula (Task 11 zaten uygulandı)**

Run: `npm run test --workspace mobile -- _layout`
Expected: PASS (4 test).

- [ ] **Step 3: Çevrilmemiş metin ve katalog testlerini son kez çalıştır**

Run: `npm run test --workspace mobile -- cevrilmemisMetin && npm run test --workspace @grind/shared -- katalog`
Expected: PASS — hiçbir yeni ekranda satır içi Türkçe metin yok, iki katalog senkron.

- [ ] **Step 4: Backend'in tam test paketini çalıştır**

Run: `dotnet test`
Expected: tüm testler PASS (Task 1-7'de eklenenler dahil).

- [ ] **Step 5: Commit**

```bash
git add mobile/app/(tabs)/profile/u/[username]/_layout.test.tsx
git commit -m "test: sablonlar sekmesinin kosullu render'ini dogrula (#467)"
```
