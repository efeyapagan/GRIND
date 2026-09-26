# Bildirimler Implementation Plan (#325)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil ana sayfadaki zilin açtığı boş ekranı, sorgu anında türetilen takip ve rekor bildirimleriyle doldurmak; zile okunmamış sayısı rozeti eklemek.

**Architecture:** Yeni tablo yok. Bildirimler mevcut `Follow`, `WorkoutSession`, `SetEntry` satırlarından foreign key join'leriyle türetilir; her tür bir `INotificationSource` arkasındadır, `NotificationService` kaynakları birleştirir. Okundu durumu için `User.NotificationsSeenAt` tek sütunu. Mobil taraf `packages/shared` sorgularıyla okur.

**Tech Stack:** ASP.NET Core (.NET 10), EF Core + Npgsql, xUnit; `packages/shared` (TanStack Query, i18next, vitest); `mobile/` (Expo, expo-router, NativeWind, jest-expo).

**Spec:** [docs/superpowers/specs/2026-09-26-bildirimler-design.md](../specs/2026-09-26-bildirimler-design.md)

## Global Constraints

- Web'e (`web/`) dokunulmaz (#326). Tipler `packages/shared/src/api/schema.d.ts`'e üretilir.
- Pencere: son **30 gün**; liste en fazla **50** bildirim; sayfalama yok.
- Türler: `Follow`, `Records`. `NotificationKind` JSON'da metin (`"Follow"` / `"Records"`).
- `isUnread = NotificationsSeenAt is null || occurredAt > NotificationsSeenAt`.
- Sıralama: `occurredAt` azalan, eşitlikte `Kind` artan (`Follow` < `Records`), sonra kaynak kimliği azalan.
- Hiçbir uç `userId` almaz; kimlik `ICurrentUserService.UserId`'den.
- EF Core'a yalnızca repository dokunur; DbContext'e eşzamanlı sorgu atılmaz (kaynaklar sırayla çağrılır).
- Kullanıcıya görünen her yeni metin `tr.ts` + `en.ts`'e aynı commit'te; sayıya bağlı metin `_one`/`_other`; modül seviyesinde `t` yok.
- Tarih/sayı `useDil()` + `formatGoreliTarih` / `formatWeight`; sabit yerel ayar yazılmaz.
- Mobil renkler Tailwind sınıflarından ya da `useRenkPaleti()`/`useIkonRenk()`'ten; modül seviyesinde renk okunmaz. Satır içi `style=` yalnızca mevcut desenlerde (güvenli alan payı gibi) kullanılır.
- Rozet: `bg-accent` + `text-on-accent`; 9'dan büyükse `9+`.
- Migration elle düzenlenmez: `dotnet dotnet-ef migrations add ...`.
- Commit mesajı Write ile dosyaya yazılır, `git commit -F <dosya>`; son satır `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Veritabanı testleri çalışan PostgreSQL ister: `docker compose up -d` (port 5433) ve güncel şema (`dotnet dotnet-ef database update --project src/Grind.Api`).

## Review Focus

- Aynı kişiden hem takip hem rekor bildirimi varsa ikisi de doğru kişi özetiyle (avatar, ilişki) çizilir — Task 4'teki `Ayni_kisiden_takip_ve_rekor_bildirimi_birlikte_gelir` testi.
- Aynı `occurredAt`'e sahip iki bildirimin sırası her istekte aynıdır — Task 4'teki `Esit_zamanda_siralama_deterministiktir`.
- Bir antrenmanda iki harekette rekor var, biri yeniden hesaplamayla `None` olur: bildirim kalır, yalnızca o hareket düşer — Task 4'teki `Rekoru_dusen_hareket_bildirimden_duser_digeri_kalir`.
- `displayName` boşsa satırda kullanıcı adı yazılır — Task 8'deki `gorunen isim yoksa kullanici adi yazilir`.
- Ekran açıkken liste yeniden çekilse de görüldü isteği bir kez gider — Task 9'daki `liste yeniden gelse de goruldu bir kez gider`.

---

### Task 1: `UserSummaryBuilder` — kişi özeti üretimini `FollowService`'ten ayır

Davranış değişmez; mevcut `FollowServiceTests` bu görevin testidir.

**Files:**
- Create: `src/Grind.Api/Services/IUserSummaryBuilder.cs`
- Create: `src/Grind.Api/Services/UserSummaryBuilder.cs`
- Modify: `src/Grind.Api/Services/FollowService.cs` (özel `SummariesAsync` / `RelationsAsync` kalkar)
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Modify: `tests/Grind.Tests/Services/FollowServiceTests.cs:51-53` (`ServiceFor`)

**Interfaces:**
- Produces: `IUserSummaryBuilder.BuildAsync(IReadOnlyList<UserRef> users, CancellationToken) -> Task<IReadOnlyList<UserSummaryResponse>>` (girdiyle aynı sırada); `IUserSummaryBuilder.RelationsAsync(IReadOnlyCollection<long> otherIds, CancellationToken) -> Task<Func<long, FollowRelation>>`.

- [ ] **Step 1: Arayüzü yaz**

```csharp
// src/Grind.Api/Services/IUserSummaryBuilder.cs
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>
/// Bir kişi listesini oturum açmış kullanıcının gözünden satıra çevirir: görünen isim, fotoğraf sürümü ve
/// BAKANIN ilişkisi (#281, #284). Takip listeleri, arama ve bildirimler (#325) aynı satırı çizer.
/// </summary>
public interface IUserSummaryBuilder
{
    /// <summary>Girdiyle aynı sırada; ilişkiler ve fotoğraflar için toplam iki sorgu.</summary>
    Task<IReadOnlyList<UserSummaryResponse>> BuildAsync(
        IReadOnlyList<UserRef> users, CancellationToken cancellationToken = default);

    /// <summary>Oturum açmış kullanıcının verilen kişilerle ilişkisi — tek sorgu, sonra bellekte.</summary>
    Task<Func<long, FollowRelation>> RelationsAsync(
        IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Uygulamayı `FollowService`'teki kodu taşıyarak yaz**

```csharp
// src/Grind.Api/Services/UserSummaryBuilder.cs
using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class UserSummaryBuilder(
    IFollowRepository followRepository,
    IUserAvatarRepository avatarRepository,
    ICurrentUserService currentUser) : IUserSummaryBuilder
{
    public async Task<IReadOnlyList<UserSummaryResponse>> BuildAsync(
        IReadOnlyList<UserRef> users, CancellationToken cancellationToken = default)
    {
        var ids = users.Select(u => u.Id).ToList();
        var relation = await RelationsAsync(ids, cancellationToken);
        var avatars = await avatarRepository.GetUpdatedAtsAsync(ids, cancellationToken);
        return users.Select(u => new UserSummaryResponse(
            u.Username,
            u.DisplayName,
            avatars.ContainsKey(u.Id),
            avatars.TryGetValue(u.Id, out var updatedAt) ? AvatarVersion.Of(updatedAt) : null,
            relation(u.Id))).ToList();
    }

    public async Task<Func<long, FollowRelation>> RelationsAsync(
        IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default)
    {
        var viewerId = currentUser.UserId;
        var (viewerFollows, followsViewer) = await followRepository.GetRelationsAsync(
            viewerId, otherIds, cancellationToken);

        return id => (id == viewerId, viewerFollows.Contains(id), followsViewer.Contains(id)) switch
        {
            (true, _, _) => FollowRelation.Self,
            (_, true, true) => FollowRelation.Friends,
            (_, true, false) => FollowRelation.Following,
            (_, false, true) => FollowRelation.FollowedBy,
            _ => FollowRelation.None
        };
    }
}
```

`AvatarVersion`'ın namespace'i `FollowService.cs`'teki `using`'lerden doğrulanır (`Grind.Api.Common` ya da `Grind.Api.Common.Time`); gerekeni ekle.

- [ ] **Step 3: `FollowService`'i builder'a bağla**

Birincil yapıcıya `IUserSummaryBuilder summaryBuilder` ekle (`avatarRepository`'den sonra). `private async Task<IReadOnlyList<UserSummaryResponse>> SummariesAsync(...)` ve `private async Task<Func<long, FollowRelation>> RelationsAsync(...)` metotlarını sil. Kullanım yerleri:

```csharp
// GetProfileAsync içinde
var relations = await summaryBuilder.RelationsAsync([target.Id], cancellationToken);

// SearchAsync içinde
return await summaryBuilder.BuildAsync(users, cancellationToken);

// ListAsync içinde
return new PagedResponse<UserSummaryResponse>(
    await summaryBuilder.BuildAsync(items, cancellationToken), query.Page, query.PageSize, total);
```

- [ ] **Step 4: DI kaydı**

`AddApplicationServices` içinde `IFollowService` satırından önce:

```csharp
services.AddScoped<IUserSummaryBuilder, UserSummaryBuilder>();
```

- [ ] **Step 5: Testin yapıcısını güncelle**

```csharp
private static FollowService ServiceFor(AppDbContext context, User current)
{
    var followRepository = new FollowRepository(context);
    var avatarRepository = new UserAvatarRepository(context);
    var currentUser = new StubCurrentUser(current);
    return new FollowService(
        followRepository, new UserRepository(context), avatarRepository,
        new UserSummaryBuilder(followRepository, avatarRepository, currentUser),
        new UnitOfWork(context), currentUser, new SahteSaat());
}
```

- [ ] **Step 6: Testleri koş**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Follow"`
Expected: `FollowServiceTests` ve `FollowEndpointsTests` hepsi PASS (sayıyı çıktıdan oku, önceki koşuyla aynı olmalı).

- [ ] **Step 7: Commit**

```bash
git add src/Grind.Api/Services/IUserSummaryBuilder.cs src/Grind.Api/Services/UserSummaryBuilder.cs src/Grind.Api/Services/FollowService.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Services/FollowServiceTests.cs
git commit -F <mesaj-dosyası>   # "refactor: kisi ozeti uretimi UserSummaryBuilder'a tasindi (#325)"
```

---

### Task 2: `User.NotificationsSeenAt` + migration

**Files:**
- Modify: `src/Grind.Api/Models/Entities/User.cs`
- Create (üretilir): `src/Grind.Api/Data/Migrations/*_BildirimGorulmeZamani.cs` + `.Designer.cs`, `AppDbContextModelSnapshot.cs` güncellenir

**Interfaces:**
- Produces: `User.NotificationsSeenAt : DateTime?` (UTC, `timestamp with time zone`).

- [ ] **Step 1: Alanı ekle** (`PrivacyLevel`'dan sonra)

```csharp
/// <summary>
/// Kullanıcının bildirim ekranını en son açtığı an (UTC, #325); <c>null</c> = hiç açmadı. Bildirimler
/// saklanmaz, sorgu anında türetilir — okunmamış = bu andan sonra olmuş olan.
/// </summary>
public DateTime? NotificationsSeenAt { get; set; }
```

- [ ] **Step 2: Migration üret**

Run: `dotnet dotnet-ef migrations add BildirimGorulmeZamani --project src/Grind.Api`
Expected: `Users` tablosuna nullable `NotificationsSeenAt timestamp with time zone` ekleyen tek bir `AddColumn`; başka değişiklik yok (varsa dur ve bildir).

- [ ] **Step 3: Veritabanına uygula**

Run: `dotnet dotnet-ef database update --project src/Grind.Api`
Expected: `Done.`

- [ ] **Step 4: Veri testlerini koş**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Grind.Tests.Data"`
Expected: hepsi PASS. `Tum_datetime_property_leri_timestamptz_olur` yeni alanı otomatik kapsar; `Model_tam_olarak_on_iki_entity_icerir` değişmez (yeni entity yok).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Models/Entities/User.cs src/Grind.Api/Data/Migrations
git commit -F <mesaj-dosyası>   # "feat: User.NotificationsSeenAt sutunu (#325)"
```

---

### Task 3: Bildirim DTO'ları ve `BestRecordPicker`

**Files:**
- Create: `src/Grind.Api/Models/Enums/NotificationKind.cs`
- Create: `src/Grind.Api/Models/Dtos/Notification/NotificationRecordResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Notification/NotificationResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Notification/UnreadNotificationCountResponse.cs`
- Create: `src/Grind.Api/Models/Projections/NotificationProjections.cs`
- Create: `src/Grind.Api/Services/BestRecordPicker.cs`
- Test: `tests/Grind.Tests/Services/BestRecordPickerTests.cs`

**Interfaces:**
- Produces:
  - `enum NotificationKind { Follow, Records }`
  - `record NotificationRecordResponse(long ExerciseId, string ExerciseName, decimal Weight, int Reps, RecordType RecordType)`
  - `record NotificationResponse(NotificationKind Kind, DateTime OccurredAt, bool IsUnread, UserSummaryResponse Actor, IReadOnlyList<NotificationRecordResponse>? Records)`
  - `record UnreadNotificationCountResponse(int Count)`
  - `record FollowEvent(long FollowId, DateTime OccurredAt, UserRef Actor)`
  - `record RecordSessionEvent(long SessionId, DateTime OccurredAt, UserRef Actor)`
  - `record RecordSetRow(long SessionId, long ExerciseId, string ExerciseName, decimal Weight, int Reps, RecordType RecordType, DateTime CreatedAt, int? OrderIndex)`
  - `static IReadOnlyList<NotificationRecordResponse> BestRecordPicker.Pick(IEnumerable<RecordSetRow> sets)`

- [ ] **Step 1: Tipleri yaz**

```csharp
// src/Grind.Api/Models/Enums/NotificationKind.cs
namespace Grind.Api.Models.Enums;

/// <summary>Bildirim türü (#325). Saklanmaz — yalnızca yanıtta; yeni tür = yeni bir <c>INotificationSource</c>.</summary>
public enum NotificationKind
{
    Follow,
    Records
}
```

```csharp
// src/Grind.Api/Models/Dtos/Notification/NotificationRecordResponse.cs
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Notification;

/// <summary>Rekor bildiriminde bir hareket: o antrenmandaki en iyi rekor seti.</summary>
public record NotificationRecordResponse(
    long ExerciseId, string ExerciseName, decimal Weight, int Reps, RecordType RecordType);
```

```csharp
// src/Grind.Api/Models/Dtos/Notification/NotificationResponse.cs
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Notification;

/// <summary>
/// Bir bildirim (#325). <see cref="Actor"/> olayı yapan kişi, BAKANIN gözünden (ilişki <c>Friends</c> ise
/// istemci "Artık arkadaşsınız" yazar). <see cref="Records"/> yalnızca <see cref="NotificationKind.Records"/>'da dolu.
/// </summary>
public record NotificationResponse(
    NotificationKind Kind,
    DateTime OccurredAt,
    bool IsUnread,
    UserSummaryResponse Actor,
    IReadOnlyList<NotificationRecordResponse>? Records);
```

```csharp
// src/Grind.Api/Models/Dtos/Notification/UnreadNotificationCountResponse.cs
namespace Grind.Api.Models.Dtos.Notification;

public record UnreadNotificationCountResponse(int Count);
```

```csharp
// src/Grind.Api/Models/Projections/NotificationProjections.cs
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>Beni takip eden birinin <c>Follow</c> satırı (#325) — repository'nin okuma modeli.</summary>
public record FollowEvent(long FollowId, DateTime OccurredAt, UserRef Actor);

/// <summary>Takip ettiğim birinin rekorlu, bitmiş antrenmanı; <see cref="OccurredAt"/> = <c>EndedAt</c>.</summary>
public record RecordSessionEvent(long SessionId, DateTime OccurredAt, UserRef Actor);

/// <summary>
/// Rekorlu antrenmanlardaki bir rekor seti. <see cref="OrderIndex"/> hareketin o antrenmandaki sırası;
/// hareket antrenmanın listesinde yoksa <c>null</c>.
/// </summary>
public record RecordSetRow(
    long SessionId, long ExerciseId, string ExerciseName, decimal Weight, int Reps,
    RecordType RecordType, DateTime CreatedAt, int? OrderIndex);
```

- [ ] **Step 2: Başarısız testleri yaz**

```csharp
// tests/Grind.Tests/Services/BestRecordPickerTests.cs
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>Rekor bildiriminde hareket başına tek satır (#325): en ağır set, eşitlikte tekrarı fazla olan.</summary>
public class BestRecordPickerTests
{
    private static readonly DateTime T0 = new(2026, 9, 26, 10, 0, 0, DateTimeKind.Utc);

    private static RecordSetRow Set(long exerciseId, decimal weight, int reps, int? order = 0, int dakika = 0,
        RecordType type = RecordType.Weight) =>
        new(1, exerciseId, $"Hareket {exerciseId}", weight, reps, type, T0.AddMinutes(dakika), order);

    [Fact]
    public void Hareket_basina_en_agir_set_secilir_esitlikte_tekrari_fazla_olan()
    {
        var sonuc = BestRecordPicker.Pick([Set(1, 80, 8), Set(1, 82.5m, 6), Set(1, 82.5m, 7, type: RecordType.Reps)]);

        var tek = Assert.Single(sonuc);
        Assert.Equal((82.5m, 7, RecordType.Reps), (tek.Weight, tek.Reps, tek.RecordType));
    }

    [Fact]
    public void Hareketler_antrenmandaki_siraya_gore_listede_olmayan_sona_ilk_setine_gore()
    {
        var sonuc = BestRecordPicker.Pick([
            Set(3, 50, 5, order: null, dakika: 1),
            Set(2, 60, 5, order: 1),
            Set(4, 40, 5, order: null, dakika: 0),
            Set(1, 70, 5, order: 0)
        ]);

        Assert.Equal([1L, 2L, 4L, 3L], sonuc.Select(r => r.ExerciseId));
    }
}
```

- [ ] **Step 3: Başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BestRecordPickerTests"`
Expected: derleme hatası — `BestRecordPicker` yok.

- [ ] **Step 4: Uygula**

```csharp
// src/Grind.Api/Services/BestRecordPicker.cs
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>Bir antrenmanın rekor setlerinden hareket başına en iyisi (#325) — saf, veritabanına dokunmaz.</summary>
public static class BestRecordPicker
{
    public static IReadOnlyList<NotificationRecordResponse> Pick(IEnumerable<RecordSetRow> sets) =>
        sets.GroupBy(s => s.ExerciseId)
            .Select(g => (
                Best: g.OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps).First(),
                Order: g.First().OrderIndex ?? int.MaxValue,
                FirstAt: g.Min(s => s.CreatedAt)))
            .OrderBy(x => x.Order).ThenBy(x => x.FirstAt)
            .Select(x => new NotificationRecordResponse(
                x.Best.ExerciseId, x.Best.ExerciseName, x.Best.Weight, x.Best.Reps, x.Best.RecordType))
            .ToList();
}
```

- [ ] **Step 5: Geçtiğini gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BestRecordPickerTests"`
Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Models/Enums/NotificationKind.cs src/Grind.Api/Models/Dtos/Notification src/Grind.Api/Models/Projections/NotificationProjections.cs src/Grind.Api/Services/BestRecordPicker.cs tests/Grind.Tests/Services/BestRecordPickerTests.cs
git commit -F <mesaj-dosyası>   # "feat: bildirim DTO'lari ve hareket basina en iyi rekor secimi (#325)"
```

---

### Task 4: Repository, kaynaklar ve `NotificationService`

**Files:**
- Create: `src/Grind.Api/Repositories/INotificationRepository.cs`
- Create: `src/Grind.Api/Repositories/NotificationRepository.cs`
- Create: `src/Grind.Api/Services/INotificationSource.cs` (arayüz + `NotificationItem`)
- Create: `src/Grind.Api/Services/FollowNotificationSource.cs`
- Create: `src/Grind.Api/Services/RecordNotificationSource.cs`
- Create: `src/Grind.Api/Services/INotificationService.cs`
- Create: `src/Grind.Api/Services/NotificationService.cs`
- Modify: `src/Grind.Api/Data/DependencyInjection.cs` (repository kaydı)
- Modify: `src/Grind.Api/Services/DependencyInjection.cs` (kaynaklar + servis)
- Test: `tests/Grind.Tests/Services/NotificationServiceTests.cs`

**Interfaces:**
- Consumes: Task 1 `IUserSummaryBuilder`; Task 2 `User.NotificationsSeenAt`; Task 3 projeksiyonları, DTO'lar, `BestRecordPicker.Pick`.
- Produces:
  - `INotificationRepository.GetFollowEventsAsync(long userId, DateTime since, int take, CancellationToken) -> Task<IReadOnlyList<FollowEvent>>`
  - `INotificationRepository.GetRecordSessionEventsAsync(long userId, DateTime since, int take, CancellationToken) -> Task<IReadOnlyList<RecordSessionEvent>>`
  - `INotificationRepository.GetRecordSetsAsync(IReadOnlyCollection<long> sessionIds, CancellationToken) -> Task<IReadOnlyList<RecordSetRow>>`
  - `record NotificationItem(NotificationKind Kind, DateTime OccurredAt, long SourceId, UserRef Actor, IReadOnlyList<NotificationRecordResponse>? Records)`
  - `INotificationSource.GetAsync(long userId, DateTime since, int limit, CancellationToken) -> Task<IReadOnlyList<NotificationItem>>`
  - `INotificationService.GetAsync(CancellationToken) -> Task<IReadOnlyList<NotificationResponse>>`
  - `INotificationService.GetUnreadCountAsync(CancellationToken) -> Task<UnreadNotificationCountResponse>`
  - `INotificationService.MarkSeenAsync(CancellationToken) -> Task`
  - `NotificationService.Window = TimeSpan.FromDays(30)`, `NotificationService.Limit = 50`

- [ ] **Step 1: Başarısız servis testlerini yaz**

```csharp
// tests/Grind.Tests/Services/NotificationServiceTests.cs
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

/// <summary>
/// Bildirimler (#325) saklanmaz, <c>Follow</c> / <c>WorkoutSession</c> / <c>SetEntry</c> satırlarından
/// türetilir: satırı değiştiren her akış (takibi bırakma, oturum silme, rekor yeniden hesaplama) bildirimi
/// de kendiliğinden değiştirir.
/// </summary>
[Trait("Category", "Database")]
public class NotificationServiceTests
{
    private static readonly DateTime Simdi = new(2026, 9, 26, 12, 0, 0, DateTimeKind.Utc);

    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private sealed class SahteSaat : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(Simdi, TimeSpan.Zero);
    }

    private static async Task<(AppDbContext Context, User[] Users, IAsyncDisposable Transaction)> CreateAsync(int n)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var users = Enumerable.Range(0, n).Select(_ => TestDatabase.NewUser()).ToArray();
        context.AddRange(users);
        await context.SaveChangesAsync();
        return (context, users, transaction);
    }

    private static NotificationService ServiceFor(AppDbContext context, User current)
    {
        var currentUser = new StubCurrentUser(current);
        var repository = new NotificationRepository(context);
        return new NotificationService(
            [new FollowNotificationSource(repository), new RecordNotificationSource(repository)],
            new UserRepository(context),
            new UserSummaryBuilder(new FollowRepository(context), new UserAvatarRepository(context), currentUser),
            new UnitOfWork(context), currentUser, new SahteSaat());
    }

    private static async Task<Follow> TakipAsync(AppDbContext context, User follower, User followee, DateTime at)
    {
        var follow = new Follow { FollowerId = follower.Id, FolloweeId = followee.Id, CreatedAt = at };
        context.Add(follow);
        await context.SaveChangesAsync();
        return follow;
    }

    /// <summary><paramref name="sahip"/> için <paramref name="bitis"/>'te biten (null = açık) antrenman ve setleri.</summary>
    private static async Task<WorkoutSession> AntrenmanAsync(
        AppDbContext context, User sahip, DateTime? bitis, params (Exercise Hareket, decimal Kg, int Tekrar, RecordType Tur)[] setler)
    {
        var session = new WorkoutSession { UserId = sahip.Id, StartedAt = (bitis ?? Simdi).AddHours(-1), EndedAt = bitis };
        context.Add(session);
        foreach (var (hareket, kg, tekrar, tur) in setler)
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = hareket, Weight = kg, Reps = tekrar, RecordType = tur,
                CreatedAt = session.StartedAt
            });
        await context.SaveChangesAsync();
        return session;
    }

    private static async Task<Exercise> HareketAsync(AppDbContext context, User sahip, string ad)
    {
        var exercise = TestDatabase.NewExercise(sahip, ad);
        context.Add(exercise);
        await context.SaveChangesAsync();
        return exercise;
    }

    // ---- Takip ----

    [Fact]
    public async Task Takip_bildirim_uretir_birakilinca_kaybolur()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            var follow = await TakipAsync(context, ali, ben, Simdi.AddHours(-2));

            var bildirim = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal((NotificationKind.Follow, ali.Username, Simdi.AddHours(-2)),
                (bildirim.Kind, bildirim.Actor.Username, bildirim.OccurredAt));
            Assert.Null(bildirim.Records);

            context.Remove(follow);
            await context.SaveChangesAsync();
            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    [Fact]
    public async Task Yeniden_takip_yeni_zamanla_en_uste_cikar()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (ben, ali, veli) = (users[0], users[1], users[2]);
            var ilk = await TakipAsync(context, ali, ben, Simdi.AddHours(-5));
            await TakipAsync(context, veli, ben, Simdi.AddHours(-3));
            context.Remove(ilk);
            await context.SaveChangesAsync();
            await TakipAsync(context, ali, ben, Simdi.AddHours(-1));

            var liste = await ServiceFor(context, ben).GetAsync();
            Assert.Equal([ali.Username, veli.Username], liste.Select(b => b.Actor.Username));
        }
    }

    [Fact]
    public async Task Karsilikli_takipte_iliski_Friends_doner()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ali, ben, Simdi.AddHours(-2));
            await TakipAsync(context, ben, ali, Simdi.AddHours(-1));

            var bildirim = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal(FollowRelation.Friends, bildirim.Actor.Relation);
        }
    }

    // ---- Rekor ----

    [Fact]
    public async Task Yalnizca_bitmis_ve_rekorlu_antrenman_bildirim_uretir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddHours(-3), (bench, 100, 5, RecordType.Weight));
            await AntrenmanAsync(context, ali, Simdi.AddHours(-2), (bench, 60, 5, RecordType.None));
            await AntrenmanAsync(context, ali, null, (bench, 110, 5, RecordType.Weight));

            var bildirim = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal((NotificationKind.Records, Simdi.AddHours(-3)), (bildirim.Kind, bildirim.OccurredAt));
            var rekor = Assert.Single(bildirim.Records!);
            Assert.Equal(("Bench", 100m, 5, RecordType.Weight), (rekor.ExerciseName, rekor.Weight, rekor.Reps, rekor.RecordType));
        }
    }

    [Fact]
    public async Task Takipten_once_biten_antrenman_gorunmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddDays(-2), (bench, 100, 5, RecordType.Weight));
            await TakipAsync(context, ben, ali, Simdi.AddDays(-1));

            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    [Fact]
    public async Task Antrenman_silinince_rekor_bildirimi_kaybolur()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            var bench = await HareketAsync(context, ali, "Bench");
            var session = await AntrenmanAsync(context, ali, Simdi.AddHours(-3), (bench, 100, 5, RecordType.Weight));

            context.Remove(session);
            await context.SaveChangesAsync();

            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    [Fact]
    public async Task Rekoru_dusen_hareket_bildirimden_duser_digeri_kalir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            var (bench, squat) = (await HareketAsync(context, ali, "Bench"), await HareketAsync(context, ali, "Squat"));
            var session = await AntrenmanAsync(context, ali, Simdi.AddHours(-3),
                (bench, 100, 5, RecordType.Weight), (squat, 140, 3, RecordType.Weight));

            var squatSeti = await context.Set<SetEntry>().SingleAsync(s => s.WorkoutSessionId == session.Id && s.ExerciseId == squat.Id);
            squatSeti.RecordType = RecordType.None;
            await context.SaveChangesAsync();

            var bildirim = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal(["Bench"], bildirim.Records!.Select(r => r.ExerciseName));

            var benchSeti = await context.Set<SetEntry>().SingleAsync(s => s.WorkoutSessionId == session.Id && s.ExerciseId == bench.Id);
            benchSeti.RecordType = RecordType.None;
            await context.SaveChangesAsync();
            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    [Fact]
    public async Task Ayni_kisiden_takip_ve_rekor_bildirimi_birlikte_gelir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            await TakipAsync(context, ali, ben, Simdi.AddDays(-9));
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddHours(-3), (bench, 100, 5, RecordType.Weight));

            var liste = await ServiceFor(context, ben).GetAsync();
            Assert.Equal([NotificationKind.Records, NotificationKind.Follow], liste.Select(b => b.Kind));
            Assert.All(liste, b => Assert.Equal((ali.Username, FollowRelation.Friends), (b.Actor.Username, b.Actor.Relation)));
        }
    }

    // ---- Ortak kurallar ----

    [Fact]
    public async Task Pasif_hesabin_olaylari_gorunmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ali, ben, Simdi.AddHours(-5));
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddHours(-3), (bench, 100, 5, RecordType.Weight));
            ali.DeletedAt = Simdi.AddHours(-1);
            await context.SaveChangesAsync();

            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    [Fact]
    public async Task Otuz_gunden_eski_olay_gelmez()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (ben, eski, yeni) = (users[0], users[1], users[2]);
            await TakipAsync(context, eski, ben, Simdi.AddDays(-31));
            await TakipAsync(context, yeni, ben, Simdi.AddDays(-29));

            Assert.Equal([yeni.Username], (await ServiceFor(context, ben).GetAsync()).Select(b => b.Actor.Username));
        }
    }

    [Fact]
    public async Task En_fazla_elli_bildirim_doner_en_yeniler()
    {
        var (context, users, transaction) = await CreateAsync(56);
        await using (transaction)
        {
            var ben = users[0];
            for (var i = 1; i < users.Length; i++)
                await TakipAsync(context, users[i], ben, Simdi.AddMinutes(-i));

            var liste = await ServiceFor(context, ben).GetAsync();
            Assert.Equal(NotificationService.Limit, liste.Count);
            Assert.Equal(users[1].Username, liste[0].Actor.Username);
            Assert.Equal(users[50].Username, liste[^1].Actor.Username);
        }
    }

    [Fact]
    public async Task Esit_zamanda_siralama_deterministiktir()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (ben, ali, veli) = (users[0], users[1], users[2]);
            var ayniAn = Simdi.AddHours(-1);
            var ilk = await TakipAsync(context, ali, ben, ayniAn);
            var ikinci = await TakipAsync(context, veli, ben, ayniAn);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-10));
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, ayniAn, (bench, 100, 5, RecordType.Weight));

            var liste = await ServiceFor(context, ben).GetAsync();
            // Follow < Records; aynı türde kaynak kimliği azalan (sonra oluşan önce).
            Assert.Equal(
                [(NotificationKind.Follow, veli.Username), (NotificationKind.Follow, ali.Username), (NotificationKind.Records, ali.Username)],
                liste.Select(b => (b.Kind, b.Actor.Username)));
            Assert.True(ikinci.Id > ilk.Id);
        }
    }

    [Fact]
    public async Task Gorulme_aninin_oncesi_okunmus_sonrasi_okunmamis_null_ise_hepsi_okunmamis()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (ben, ali, veli) = (users[0], users[1], users[2]);
            await TakipAsync(context, ali, ben, Simdi.AddHours(-5));
            await TakipAsync(context, veli, ben, Simdi.AddHours(-1));

            Assert.All(await ServiceFor(context, ben).GetAsync(), b => Assert.True(b.IsUnread));
            Assert.Equal(2, (await ServiceFor(context, ben).GetUnreadCountAsync()).Count);

            ben.NotificationsSeenAt = Simdi.AddHours(-3);
            await context.SaveChangesAsync();

            var liste = await ServiceFor(context, ben).GetAsync();
            Assert.Equal([(veli.Username, true), (ali.Username, false)], liste.Select(b => (b.Actor.Username, b.IsUnread)));
            Assert.Equal(1, (await ServiceFor(context, ben).GetUnreadCountAsync()).Count);
        }
    }

    [Fact]
    public async Task Goruldu_isareti_simdiyi_yazar_ve_sayiyi_sifirlar()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ali, ben, Simdi.AddHours(-1));

            await ServiceFor(context, ben).MarkSeenAsync();

            Assert.Equal(Simdi, (await context.Set<User>().AsNoTracking().SingleAsync(u => u.Id == ben.Id)).NotificationsSeenAt);
            Assert.Equal(0, (await ServiceFor(context, ben).GetUnreadCountAsync()).Count);
        }
    }
}
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~NotificationServiceTests"`
Expected: derleme hatası — `NotificationService`, `NotificationRepository`, kaynaklar yok.

- [ ] **Step 3: Repository'yi yaz**

```csharp
// src/Grind.Api/Repositories/INotificationRepository.cs
using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

/// <summary>
/// Bildirimlerin kaynağı olan satırlar (#325). Bildirim tablosu yok: sorgular <c>Follow</c>,
/// <c>WorkoutSession</c> ve <c>SetEntry</c>'den okur; işi yapan kişi pasifse satır dışarıda kalır.
/// </summary>
public interface INotificationRepository
{
    /// <summary><paramref name="userId"/>'yi takip edenler, <paramref name="since"/>'ten beri, en yeni önce.</summary>
    Task<IReadOnlyList<FollowEvent>> GetFollowEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// <paramref name="userId"/>'nin takip ettiklerinin, takipten SONRA bitmiş ve en az bir rekor seti olan
    /// antrenmanları, en yeni önce.
    /// </summary>
    Task<IReadOnlyList<RecordSessionEvent>> GetRecordSessionEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);

    /// <summary>Verilen antrenmanların rekor setleri (<c>RecordType != None</c>).</summary>
    Task<IReadOnlyList<RecordSetRow>> GetRecordSetsAsync(
        IReadOnlyCollection<long> sessionIds, CancellationToken cancellationToken = default);
}
```

```csharp
// src/Grind.Api/Repositories/NotificationRepository.cs
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class NotificationRepository(AppDbContext context) : INotificationRepository
{
    public async Task<IReadOnlyList<FollowEvent>> GetFollowEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
        => await context.Set<Follow>()
            .Where(f => f.FolloweeId == userId && f.Follower.DeletedAt == null && f.CreatedAt >= since)
            .OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Take(take)
            .Select(f => new FollowEvent(
                f.Id, f.CreatedAt, new UserRef(f.Follower.Id, f.Follower.Username, f.Follower.DisplayName)))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RecordSessionEvent>> GetRecordSessionEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
        => await (
                from f in context.Set<Follow>()
                where f.FollowerId == userId && f.Followee.DeletedAt == null
                join s in context.Set<WorkoutSession>() on f.FolloweeId equals s.UserId
                where s.EndedAt != null && s.EndedAt > f.CreatedAt && s.EndedAt >= since
                      && s.SetEntries.Any(e => e.RecordType != RecordType.None)
                orderby s.EndedAt descending, s.Id descending
                select new RecordSessionEvent(
                    s.Id, s.EndedAt!.Value, new UserRef(f.Followee.Id, f.Followee.Username, f.Followee.DisplayName)))
            .Take(take)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RecordSetRow>> GetRecordSetsAsync(
        IReadOnlyCollection<long> sessionIds, CancellationToken cancellationToken = default)
        => await context.Set<SetEntry>()
            .Where(e => sessionIds.Contains(e.WorkoutSessionId) && e.RecordType != RecordType.None)
            .Select(e => new RecordSetRow(
                e.WorkoutSessionId, e.ExerciseId, e.Exercise.Name, e.Weight, e.Reps, e.RecordType, e.CreatedAt,
                e.WorkoutSession.SessionExercises
                    .Where(x => x.ExerciseId == e.ExerciseId)
                    .Select(x => (int?)x.OrderIndex)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);
}
```

Kayıt (`src/Grind.Api/Data/DependencyInjection.cs`, `IUserAvatarRepository` satırından sonra):

```csharp
services.AddScoped<INotificationRepository, NotificationRepository>();
```

- [ ] **Step 4: Kaynakları yaz**

```csharp
// src/Grind.Api/Services/INotificationSource.cs
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>Bir bildirim türünün ham öğesi; okundu durumu ve kişi özeti servis tarafından eklenir.</summary>
public record NotificationItem(
    NotificationKind Kind, DateTime OccurredAt, long SourceId, UserRef Actor,
    IReadOnlyList<NotificationRecordResponse>? Records);

/// <summary>
/// Bir bildirim türünün kaynağı (#325). Yeni bir tür yeni bir kaynaktır — <see cref="NotificationService"/>
/// değişmez. İleride saklanması gereken bir tür gelirse (push, veride izi olmayan olay), o tabloyu okuyan
/// kaynak da bu arayüzü uygular.
/// </summary>
public interface INotificationSource
{
    /// <summary><paramref name="since"/>'ten beri en fazla <paramref name="limit"/> öğe, en yeni önce.</summary>
    Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default);
}
```

```csharp
// src/Grind.Api/Services/FollowNotificationSource.cs
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>"Seni takip etti" — satır silinince (takip bırakılınca) bildirim de yoktur.</summary>
public class FollowNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
        => (await repository.GetFollowEventsAsync(userId, since, limit, cancellationToken))
            .Select(e => new NotificationItem(NotificationKind.Follow, e.OccurredAt, e.FollowId, e.Actor, null))
            .ToList();
}
```

```csharp
// src/Grind.Api/Services/RecordNotificationSource.cs
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Takip ettiğin birinin rekorlu antrenmanı — antrenman bitince tek bildirim. Rekor rozetleri
/// (<c>RecordType</c>) yeniden hesaplanırsa bildirim güncel durumu gösterir.
/// </summary>
public class RecordNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
    {
        var sessions = await repository.GetRecordSessionEventsAsync(userId, since, limit, cancellationToken);
        if (sessions.Count == 0)
            return [];

        var sets = (await repository.GetRecordSetsAsync(sessions.Select(s => s.SessionId).ToList(), cancellationToken))
            .ToLookup(s => s.SessionId);

        return sessions
            .Select(s => new NotificationItem(
                NotificationKind.Records, s.OccurredAt, s.SessionId, s.Actor, BestRecordPicker.Pick(sets[s.SessionId])))
            .ToList();
    }
}
```

- [ ] **Step 5: Servisi yaz**

```csharp
// src/Grind.Api/Services/INotificationService.cs
using Grind.Api.Models.Dtos.Notification;

namespace Grind.Api.Services;

/// <summary>Oturum açmış kullanıcının bildirimleri (#325); kimlik token'dan gelir.</summary>
public interface INotificationService
{
    Task<IReadOnlyList<NotificationResponse>> GetAsync(CancellationToken cancellationToken = default);

    /// <summary><see cref="GetAsync"/> ile aynı hattan sayılır — liste ile rozet ayrışamaz.</summary>
    Task<UnreadNotificationCountResponse> GetUnreadCountAsync(CancellationToken cancellationToken = default);

    Task MarkSeenAsync(CancellationToken cancellationToken = default);
}
```

```csharp
// src/Grind.Api/Services/NotificationService.cs
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class NotificationService(
    IEnumerable<INotificationSource> sources,
    IUserRepository userRepository,
    IUserSummaryBuilder summaryBuilder,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : INotificationService
{
    public static readonly TimeSpan Window = TimeSpan.FromDays(30);
    public const int Limit = 50;

    public async Task<IReadOnlyList<NotificationResponse>> GetAsync(CancellationToken cancellationToken = default)
    {
        var (items, seenAt) = await CollectAsync(cancellationToken);
        var actors = items.Select(i => i.Actor).DistinctBy(a => a.Id).ToList();
        var summaries = (await summaryBuilder.BuildAsync(actors, cancellationToken))
            .Zip(actors, (summary, actor) => (actor.Id, summary))
            .ToDictionary(p => p.Id, p => p.summary);

        return items
            .Select(i => new NotificationResponse(i.Kind, i.OccurredAt, IsUnread(i, seenAt), summaries[i.Actor.Id], i.Records))
            .ToList();
    }

    public async Task<UnreadNotificationCountResponse> GetUnreadCountAsync(CancellationToken cancellationToken = default)
    {
        var (items, seenAt) = await CollectAsync(cancellationToken);
        return new UnreadNotificationCountResponse(items.Count(i => IsUnread(i, seenAt)));
    }

    public async Task MarkSeenAsync(CancellationToken cancellationToken = default)
    {
        var user = await CurrentUserAsync(cancellationToken);
        user.NotificationsSeenAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static bool IsUnread(NotificationItem item, DateTime? seenAt) => seenAt is null || item.OccurredAt > seenAt;

    private async Task<(IReadOnlyList<NotificationItem> Items, DateTime? SeenAt)> CollectAsync(
        CancellationToken cancellationToken)
    {
        var user = await CurrentUserAsync(cancellationToken);
        var since = timeProvider.GetUtcNow().UtcDateTime - Window;

        // DbContext eşzamanlı sorgu kaldırmaz — kaynaklar sırayla.
        var all = new List<NotificationItem>();
        foreach (var source in sources)
            all.AddRange(await source.GetAsync(user.Id, since, Limit, cancellationToken));

        var items = all
            .OrderByDescending(i => i.OccurredAt).ThenBy(i => i.Kind).ThenByDescending(i => i.SourceId)
            .Take(Limit)
            .ToList();
        return (items, user.NotificationsSeenAt);
    }

    private async Task<User> CurrentUserAsync(CancellationToken cancellationToken)
        => await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException("Kullanıcı bulunamadı.");
}
```

`IUnitOfWork`'ün namespace'i `FollowService.cs`'teki `using`'lerden doğrulanır (`Grind.Api.Data`); farklıysa düzelt.

DI (`src/Grind.Api/Services/DependencyInjection.cs`, `IProfileService` satırından sonra):

```csharp
services.AddScoped<INotificationSource, FollowNotificationSource>();
services.AddScoped<INotificationSource, RecordNotificationSource>();
services.AddScoped<INotificationService, NotificationService>();
```

- [ ] **Step 6: Geçtiğini gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~NotificationServiceTests"`
Expected: 14 PASS. `Esit_zamanda_siralama_deterministiktir` kırmızıysa `ThenBy(i => i.Kind)` sırasını ve enum sırasını (`Follow = 0`) kontrol et.

- [ ] **Step 7: Commit**

```bash
git add src/Grind.Api/Repositories/INotificationRepository.cs src/Grind.Api/Repositories/NotificationRepository.cs src/Grind.Api/Services/INotificationSource.cs src/Grind.Api/Services/FollowNotificationSource.cs src/Grind.Api/Services/RecordNotificationSource.cs src/Grind.Api/Services/INotificationService.cs src/Grind.Api/Services/NotificationService.cs src/Grind.Api/Data/DependencyInjection.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Services/NotificationServiceTests.cs
git commit -F <mesaj-dosyası>   # "feat: takip ve rekor bildirimleri sorgu aninda turetilir (#325)"
```

---

### Task 5: `NotificationsController` + uç testleri

**Files:**
- Create: `src/Grind.Api/Controllers/NotificationsController.cs`
- Test: `tests/Grind.Tests/Integration/NotificationEndpointsTests.cs`

**Interfaces:**
- Consumes: Task 4 `INotificationService`.
- Produces: `GET /api/notifications` → `NotificationResponse[]`; `GET /api/notifications/unread-count` → `{ count }`; `POST /api/notifications/seen` → 204.

- [ ] **Step 1: Başarısız uç testlerini yaz**

```csharp
// tests/Grind.Tests/Integration/NotificationEndpointsTests.cs
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#325): rota, kimlik ve JSON sözleşmesi. Türetme kuralları <c>NotificationServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class NotificationEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"bldrm_{Guid.NewGuid():N}"[..20];
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, username);
    }

    [Theory]
    [InlineData("GET", "/api/notifications")]
    [InlineData("GET", "/api/notifications/unread-count")]
    [InlineData("POST", "/api/notifications/seen")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Her_kullanici_yalnizca_kendi_bildirimlerini_gorur()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, _) = await RegisteredClientAsync();
        var (_, cAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/follow", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{cAdi}/follow", null)).StatusCode);

        var aninki = await a.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications", Json);
        var bninki = await b.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications", Json);

        var tek = Assert.Single(aninki!);
        Assert.Equal((NotificationKind.Follow, true), (tek.Kind, tek.IsUnread));
        Assert.Empty(bninki!);
    }

    [Fact]
    public async Task Goruldu_204_doner_ve_okunmamis_sayisini_sifirlar()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, _) = await RegisteredClientAsync();
        await b.PostAsync($"/api/users/{aAdi}/follow", null);

        var once = await a.GetFromJsonAsync<UnreadNotificationCountResponse>("/api/notifications/unread-count", Json);
        Assert.Equal(1, once!.Count);

        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync("/api/notifications/seen", null)).StatusCode);

        var sonra = await a.GetFromJsonAsync<UnreadNotificationCountResponse>("/api/notifications/unread-count", Json);
        Assert.Equal(0, sonra!.Count);
    }
}
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~NotificationEndpointsTests"`
Expected: 401 testleri 404'le FAIL (uç yok), diğerleri FAIL.

- [ ] **Step 3: Controller'ı yaz**

```csharp
// src/Grind.Api/Controllers/NotificationsController.cs
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// Oturum açmış kullanıcının bildirimleri (#325): son 30 gün, en fazla 50. Bildirimler saklanmaz, mevcut
/// satırlardan türetilir; kimlik her zaman token'dan gelir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    /// <summary>Yeniden eskiye; <c>isUnread</c> son görülme anına göre.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationResponse>>> Get(CancellationToken cancellationToken)
        => Ok(await notificationService.GetAsync(cancellationToken));

    /// <summary>Zil rozeti için okunmamış sayısı.</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<UnreadNotificationCountResponse>> GetUnreadCount(CancellationToken cancellationToken)
        => Ok(await notificationService.GetUnreadCountAsync(cancellationToken));

    /// <summary>Ekran açıldı: şu ana kadarki her bildirim okundu sayılır.</summary>
    [HttpPost("seen")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkSeen(CancellationToken cancellationToken)
    {
        await notificationService.MarkSeenAsync(cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Notification|FullyQualifiedName~Follow|FullyQualifiedName~BestRecordPicker"`
Expected: hepsi PASS (sayıyı çıktıdan oku).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Controllers/NotificationsController.cs tests/Grind.Tests/Integration/NotificationEndpointsTests.cs
git commit -F <mesaj-dosyası>   # "feat: /api/notifications uclari (#325)"
```

---

### Task 6: Ortak paket — tipler, sorgular, katalog

**Files:**
- Modify: `packages/shared/src/api/schema.d.ts` (üretilir)
- Modify: `packages/shared/src/api/queries.ts` (tip takma adları, `queryKeys`, üç hook, `useTakipEt`)
- Modify: `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts` (`bildirimler` grubu)

**Interfaces:**
- Consumes: Task 5 uçları.
- Produces (queries.ts'ten dışa aktarılır):
  - `interface BildirimRekoru { exerciseId: number; exerciseName: string; weight: number; reps: number; recordType: 'Weight' | 'Reps' }`
  - `interface Bildirim { kind: 'Follow' | 'Records'; occurredAt: string; isUnread: boolean; actor: KullaniciOzeti; records: BildirimRekoru[] }` (`Follow`'da `records` boş dizi)
  - `useBildirimler()` → `UseQueryResult<Bildirim[]>`
  - `useOkunmamisBildirimSayisi(etkin: boolean)` → `UseQueryResult<number>`
  - `useBildirimleriGorulduYap()` → `UseMutationResult<void, Error, void>`
  - `queryKeys.bildirimlerAll`, `queryKeys.bildirimler`, `queryKeys.okunmamisBildirim`
  - Katalog: `bildirimler.takipEtti` (`{{ad}}`), `bildirimler.artikArkadassiniz`, `bildirimler.rekorKirdi_one/_other` (`{{ad}}`, `{{count}}`), `bildirimler.rekorSatiri` (`{{hareket}}`, `{{agirlik}}`, `{{tekrar}}`), `bildirimler.alinamadi`, `bildirimler.tekrarDene`, `bildirimler.zilEtiketi_one/_other` (`{{count}}`)

- [ ] **Step 1: Tipleri üret**

API'yi çalıştır (`dotnet run --project src/Grind.Api`, Development, port 5098), sonra repo kökünden:

Run: `npx openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o packages/shared/src/api/schema.d.ts`
Expected: `schema.d.ts`'te `NotificationResponse`, `NotificationRecordResponse`, `UnreadNotificationCountResponse`, `NotificationKind` şemaları; `git diff --stat` yalnızca bu dosyayı gösterir ve fark bu şemalarla + üç yolla sınırlıdır (başka fark varsa dur ve bildir).

- [ ] **Step 2: Katalogu yaz** (`tr.ts` ve `en.ts`'te mevcut `bildirimler` grubunu genişlet)

```ts
// tr.ts
bildirimler: {
  bos: 'Henüz bildirim yok',
  bosAciklama: 'Yeni bir bildirim olduğunda burada görünecek.',
  takipEtti: '{{ad}} seni takip etmeye başladı',
  artikArkadassiniz: 'Artık arkadaşsınız',
  rekorKirdi_one: '{{ad}} {{count}} harekette rekor kırdı',
  rekorKirdi_other: '{{ad}} {{count}} harekette rekor kırdı',
  rekorSatiri: '{{hareket}} · {{agirlik}} kg × {{tekrar}}',
  alinamadi: 'Bildirimler alınamadı.',
  tekrarDene: 'Tekrar dene',
  zilEtiketi_one: 'Bildirimler, {{count}} okunmamış',
  zilEtiketi_other: 'Bildirimler, {{count}} okunmamış',
},
```

```ts
// en.ts
bildirimler: {
  bos: 'No notifications yet',
  bosAciklama: 'New notifications will show up here.',
  takipEtti: '{{ad}} started following you',
  artikArkadassiniz: "You're now friends",
  rekorKirdi_one: '{{ad}} set a record in {{count}} exercise',
  rekorKirdi_other: '{{ad}} set records in {{count}} exercises',
  rekorSatiri: '{{hareket}} · {{agirlik}} kg × {{tekrar}}',
  alinamadi: "Couldn't load notifications.",
  tekrarDene: 'Try again',
  zilEtiketi_one: 'Notifications, {{count}} unread',
  zilEtiketi_other: 'Notifications, {{count}} unread',
},
```

- [ ] **Step 3: Sorguları yaz** (`queries.ts`)

Dosya başındaki tip takma adlarına:

```ts
type NotificationResponse = components['schemas']['NotificationResponse'];
type UnreadNotificationCountResponse = components['schemas']['UnreadNotificationCountResponse'];
```

`queryKeys` nesnesinin sonuna:

```ts
  // #325: `bildirimlerAll` oneki liste ve sayiyi birlikte kapsar (takip degisince ikisi de eskir);
  // "goruldu" yalnizca sayiyi eskitir -- acik ekrandaki okunmamis vurgulari kalsin.
  bildirimlerAll: ['bildirimler'] as const,
  bildirimler: ['bildirimler', 'liste'] as const,
  okunmamisBildirim: ['bildirimler', 'okunmamis'] as const,
```

`useTakipEt`'in `onSuccess` dizisine `queryKeys.bildirimlerAll` ekle.

Takip arayüzü bölümünün sonuna (`dogrulanmisKullaniciOzeti`'nden sonra olmalı):

```ts
// ---- Bildirimler (#325) ----

export interface BildirimRekoru {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  recordType: 'Weight' | 'Reps';
}

/** Sunucuda saklanmaz, takip ve rekor satirlarindan turetilir; `actor` BAKANIN gozunden. */
export interface Bildirim {
  kind: 'Follow' | 'Records';
  occurredAt: string;
  isUnread: boolean;
  actor: KullaniciOzeti;
  /** `Follow`'da bos. */
  records: BildirimRekoru[];
}

function dogrulanmisBildirim(yanit: NotificationResponse): Bildirim {
  if (!yanit.kind || !yanit.occurredAt || yanit.isUnread === undefined || !yanit.actor) {
    throw new Error('Sunucudan eksik bildirim alindi.');
  }
  return {
    kind: yanit.kind,
    occurredAt: yanit.occurredAt,
    isUnread: yanit.isUnread,
    actor: dogrulanmisKullaniciOzeti(yanit.actor),
    records: (yanit.records ?? []).map((r) => {
      if (r.exerciseId === undefined || !r.exerciseName || r.weight === undefined || r.reps === undefined
        || (r.recordType !== 'Weight' && r.recordType !== 'Reps')) {
        throw new Error('Sunucudan eksik rekor satiri alindi.');
      }
      return { exerciseId: r.exerciseId, exerciseName: r.exerciseName, weight: r.weight, reps: r.reps, recordType: r.recordType };
    }),
  };
}

export function useBildirimler() {
  return useQuery({
    queryKey: queryKeys.bildirimler,
    queryFn: async (): Promise<Bildirim[]> =>
      (await request<NotificationResponse[]>('/notifications')).map(dogrulanmisBildirim),
  });
}

/** Zil rozeti. `etkin` false iken (ana sayfa disinda) istek atilmaz; true'ya donunce bayatsa yeniden cekilir. */
export function useOkunmamisBildirimSayisi(etkin: boolean) {
  return useQuery({
    queryKey: queryKeys.okunmamisBildirim,
    enabled: etkin,
    queryFn: async (): Promise<number> => {
      const yanit = await request<UnreadNotificationCountResponse>('/notifications/unread-count');
      if (yanit.count === undefined) {
        throw new Error('Sunucudan eksik bildirim sayisi alindi.');
      }
      return yanit.count;
    },
  });
}

export function useBildirimleriGorulduYap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await request<void>('/notifications/seen', { method: 'POST' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.okunmamisBildirim });
    },
  });
}
```

Üretilen şemada alan tipleri farklıysa (ör. `kind` bir birleşim yerine `string`), doğrulamayı tipe uyacak şekilde daralt; `as` ile susturma.

- [ ] **Step 4: Ortak paket testleri ve tip kontrolü**

Run: `npm run test --workspace @grind/shared` ve `npm run typecheck --workspace @grind/shared`
Expected: `katalog.test.ts` dahil hepsi PASS; tip hatası yok.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/schema.d.ts packages/shared/src/api/queries.ts packages/shared/src/i18n/tr.ts packages/shared/src/i18n/en.ts
git commit -F <mesaj-dosyası>   # "feat: bildirim sorgulari ve katalog metinleri (#325)"
```

---

### Task 7: Mobil — zil rozeti

**Files:**
- Modify: `mobile/src/ui/KabukBaslik.tsx`
- Test: `mobile/src/ui/KabukBaslik.test.tsx`

**Interfaces:**
- Consumes: Task 6 `useOkunmamisBildirimSayisi(etkin)`, `bildirimler.zilEtiketi_*`.

- [ ] **Step 1: Başarısız testleri yaz**

`KabukBaslik.test.tsx`'in mock'larına ekle:

```tsx
let mockOkunmamis: number | undefined = 0;
jest.mock('@grind/shared/api/queries', () => ({
  useOkunmamisBildirimSayisi: () => ({ data: mockOkunmamis }),
}));
```

`beforeEach`'e `mockOkunmamis = 0;` ekle. Mevcut ilk testteki `getByLabelText('Bildirimler')` sayı 0 iken aynen geçer. Yeni testler:

```tsx
/** #325: okunmamis varsa zilin ustunde sayi rozeti; etiket sayiyi tasir. */
test('okunmamis bildirim varsa rozet sayiyi gosterir, etiket sayiyi tasir', async () => {
  mockPathname = '/';
  mockOkunmamis = 3;
  await render(<KabukBaslik />);

  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByLabelText('Bildirimler, 3 okunmamış')).toBeTruthy();
});

test("okunmamis 9'dan fazlaysa rozet 9+ yazar", async () => {
  mockPathname = '/';
  mockOkunmamis = 12;
  await render(<KabukBaslik />);

  expect(screen.getByText('9+')).toBeTruthy();
});

test('okunmamis yoksa ya da sayi gelmediyse rozet cizilmez', async () => {
  mockPathname = '/';
  mockOkunmamis = undefined;
  await render(<KabukBaslik />);

  expect(screen.queryByTestId('zil-rozeti')).toBeNull();
  expect(screen.getByLabelText('Bildirimler')).toBeTruthy();
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npm run test --workspace mobile -- KabukBaslik`
Expected: yeni üç test FAIL.

- [ ] **Step 3: Uygula** (`KabukBaslik.tsx`)

```tsx
import { useOkunmamisBildirimSayisi } from '@grind/shared/api/queries';
// ...
const anaSayfa = pathname === '/';
const { data: okunmamis = 0 } = useOkunmamisBildirimSayisi(anaSayfa);
```

Koşulu `pathname === '/'` yerine `anaSayfa` ile değiştir; zil düğmesini şöyle yap:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={okunmamis > 0 ? t('bildirimler.zilEtiketi', { count: okunmamis }) : t('ortak.bildirimler')}
  onPress={() => router.push('/bildirimler')}
  className="size-10 shrink-0 items-center justify-center"
>
  <Bell color={ikonRenk.fg} size={22} />
  {okunmamis > 0 && (
    <View
      testID="zil-rozeti"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="absolute right-0.5 top-0.5 min-w-4 items-center justify-center rounded-full bg-accent px-1"
    >
      <Text className="text-label text-on-accent">{okunmamis > 9 ? '9+' : okunmamis}</Text>
    </View>
  )}
</Pressable>
```

Bileşen yorumuna bir satır: `#325: zilde okunmamis sayisi rozeti; sayi yalnizca ana sayfada istenir.` `text-label` rozet için büyük kalırsa gözle denemede küçült (`text-[10px]` yasak değilse mevcut desenden bak; yoksa `text-label` kalır).

- [ ] **Step 4: Geçtiğini gör**

Run: `npm run test --workspace mobile -- KabukBaslik`
Expected: hepsi PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/ui/KabukBaslik.tsx mobile/src/ui/KabukBaslik.test.tsx
git commit -F <mesaj-dosyası>   # "feat: mobil zilde okunmamis bildirim rozeti (#325)"
```

---

### Task 8: Mobil — `BildirimSatiri`

**Files:**
- Create: `mobile/src/components/BildirimSatiri.tsx`
- Test: `mobile/src/components/BildirimSatiri.test.tsx`

**Interfaces:**
- Consumes: Task 6 `Bildirim` tipi ve katalog anahtarları; `ProfilFotografi` (`boyut="kucuk"`).
- Produces: `export default function BildirimSatiri({ bildirim }: { bildirim: Bildirim })`; kök `testID={\`bildirim-${kind}-${username}\`}`.

- [ ] **Step 1: Başarısız testleri yaz**

```tsx
// mobile/src/components/BildirimSatiri.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Bildirim } from '@grind/shared/api/queries';
import BildirimSatiri from './BildirimSatiri';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
// Fotograf kimlikli bir fetch'le gelir; bu testlerin konusu degil.
jest.mock('./ProfilFotografi', () => () => null);

const ali = { username: 'ali', displayName: 'Ali Kaya', hasAvatar: false, avatarVersion: null };

function takip(relation: Bildirim['actor']['relation'], displayName: string | null = 'Ali Kaya'): Bildirim {
  return {
    kind: 'Follow', occurredAt: new Date().toISOString(), isUnread: true,
    actor: { ...ali, displayName, relation }, records: [],
  };
}

beforeEach(() => mockPush.mockReset());

test('takip bildirimi metni; dokununca profile gider', async () => {
  await render(<BildirimSatiri bildirim={takip('FollowedBy')} />);

  expect(screen.getByText('Ali Kaya seni takip etmeye başladı')).toBeTruthy();
  expect(screen.queryByText('Artık arkadaşsınız')).toBeNull();

  await fireEvent.press(screen.getByTestId('bildirim-Follow-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali');
});

test('karsilikli takipte "Artik arkadassiniz" satiri eklenir', async () => {
  await render(<BildirimSatiri bildirim={takip('Friends')} />);

  expect(screen.getByText('Artık arkadaşsınız')).toBeTruthy();
});

test('gorunen isim yoksa kullanici adi yazilir', async () => {
  await render(<BildirimSatiri bildirim={takip('FollowedBy', null)} />);

  expect(screen.getByText('ali seni takip etmeye başladı')).toBeTruthy();
});

test('rekor bildirimi hareket sayisini ve her hareketi yazar; dokununca rekorlara gider', async () => {
  const bildirim: Bildirim = {
    kind: 'Records', occurredAt: new Date().toISOString(), isUnread: false,
    actor: { ...ali, relation: 'Following' },
    records: [
      { exerciseId: 1, exerciseName: 'Bench Press', weight: 82.5, reps: 6, recordType: 'Weight' },
      { exerciseId: 2, exerciseName: 'Squat', weight: 140, reps: 3, recordType: 'Reps' },
    ],
  };
  await render(<BildirimSatiri bildirim={bildirim} />);

  expect(screen.getByText('Ali Kaya 2 harekette rekor kırdı')).toBeTruthy();
  expect(screen.getByText('Bench Press · 82,5 kg × 6')).toBeTruthy();
  expect(screen.getByText('Squat · 140 kg × 3')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('bildirim-Records-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali/records');
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npm run test --workspace mobile -- BildirimSatiri`
Expected: FAIL — modül yok.

- [ ] **Step 3: Uygula**

```tsx
// mobile/src/components/BildirimSatiri.tsx
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Bildirim } from '@grind/shared/api/queries';
import { useDil } from '@grind/shared/i18n';
import { formatGoreliTarih, formatWeight } from '@grind/shared/lib/format';
import ProfilFotografi from './ProfilFotografi';

/**
 * Bildirim ekraninda bir satir (#325): takip ya da takip edilen birinin rekorlu antrenmani. Okunmamis
 * satir bu ziyaret boyunca bir ton acik zeminde durur. Dokunmak kisinin profilini (rekorda Rekorlar
 * sekmesini) acar.
 */
export default function BildirimSatiri({ bildirim }: { bildirim: Bildirim }) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  const kisi = bildirim.actor;
  const ad = kisi.displayName ?? kisi.username;
  const profil = `/profile/u/${encodeURIComponent(kisi.username)}`;

  return (
    <Pressable
      testID={`bildirim-${bildirim.kind}-${kisi.username}`}
      accessibilityRole="link"
      onPress={() => router.push(bildirim.kind === 'Follow' ? profil : `${profil}/records`)}
      className={`flex-row gap-3 rounded-xl p-3 ${bildirim.isUnread ? 'bg-surface-3' : 'bg-surface-2'}`}
    >
      <ProfilFotografi profil={kisi} boyut="kucuk" />
      <View className="min-w-0 flex-1 flex-col gap-1">
        <Text className="text-body text-fg">
          {bildirim.kind === 'Follow'
            ? t('bildirimler.takipEtti', { ad })
            : t('bildirimler.rekorKirdi', { ad, count: bildirim.records.length })}
        </Text>
        {bildirim.kind === 'Follow' && kisi.relation === 'Friends' && (
          <Text className="text-body text-muted">{t('bildirimler.artikArkadassiniz')}</Text>
        )}
        {bildirim.records.map((rekor) => (
          <Text key={rekor.exerciseId} numberOfLines={1} className="text-body text-muted">
            {t('bildirimler.rekorSatiri', {
              hareket: rekor.exerciseName,
              agirlik: formatWeight(rekor.weight, dil),
              tekrar: rekor.reps,
            })}
          </Text>
        ))}
        <Text className="text-label text-muted">{formatGoreliTarih(bildirim.occurredAt, dil)}</Text>
      </View>
    </Pressable>
  );
}
```

`@grind/shared/lib/format` ve `@grind/shared/i18n` yollarını mevcut mobil importlardan doğrula (`SetList.tsx`). `bg-surface-3`'ün `surface-2` üstünde ayırt edilebilirliğini gözle denemede iki temada kontrol et.

- [ ] **Step 4: Geçtiğini gör**

Run: `npm run test --workspace mobile -- BildirimSatiri`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/BildirimSatiri.tsx mobile/src/components/BildirimSatiri.test.tsx
git commit -F <mesaj-dosyası>   # "feat: mobil bildirim satiri (#325)"
```

---

### Task 9: Mobil — bildirimler ekranı

**Files:**
- Modify: `mobile/app/(tabs)/bildirimler.tsx`
- Test: `mobile/__tests__/app/tabs/bildirimler.test.tsx`

**Interfaces:**
- Consumes: Task 6 `useBildirimler`, `useBildirimleriGorulduYap`; Task 8 `BildirimSatiri`.

- [ ] **Step 1: Başarısız testleri yaz**

```tsx
// mobile/__tests__/app/tabs/bildirimler.test.tsx
import { render, screen } from '@testing-library/react-native';
import { useBildirimler, useBildirimleriGorulduYap } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import BildirimlerScreen from '../../../app/(tabs)/bildirimler';

jest.mock('@grind/shared/api/queries', () => ({
  useBildirimler: jest.fn(),
  useBildirimleriGorulduYap: jest.fn(),
}));
// jest.mock fabrikasi dosyanin basina tasinir; JSX yardimcisina erisemeyebilir -- createElement ile.
jest.mock('../../../src/components/BildirimSatiri', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return ({ bildirim }: { bildirim: { actor: { username: string } } }) =>
    createElement(Text, null, `satir-${bildirim.actor.username}`);
});
jest.mock('../../../src/ui/KabukTabBar', () => ({ useAltMenuPayi: () => 0 }));

const mockGoruldu = jest.fn();
const refetch = jest.fn();

function sorgu(durum: Partial<{ data: unknown[]; isLoading: boolean; isError: boolean }>) {
  (useBildirimler as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch, ...durum });
}

function ekran() {
  return render(
    <PageTitleProvider>
      <BildirimlerScreen />
    </PageTitleProvider>,
  );
}

const bildirim = { kind: 'Follow', occurredAt: '2026-09-26T09:00:00Z', isUnread: true, actor: { username: 'ali' }, records: [] };

beforeEach(() => {
  mockGoruldu.mockReset();
  (useBildirimleriGorulduYap as jest.Mock).mockReturnValue({ mutate: mockGoruldu });
});

test('liste gelince satirlar cizilir ve goruldu bir kez gider', async () => {
  sorgu({ data: [bildirim] });
  await ekran();

  expect(screen.getByText('satir-ali')).toBeTruthy();
  expect(mockGoruldu).toHaveBeenCalledTimes(1);
});

test('liste yeniden gelse de goruldu bir kez gider', async () => {
  sorgu({ data: [bildirim] });
  const { rerender } = await ekran();
  sorgu({ data: [bildirim, { ...bildirim, actor: { username: 'veli' } }] });
  await rerender(
    <PageTitleProvider>
      <BildirimlerScreen />
    </PageTitleProvider>,
  );

  expect(mockGoruldu).toHaveBeenCalledTimes(1);
});

test('liste bossa bos durum gorunur', async () => {
  sorgu({ data: [] });
  await ekran();

  expect(screen.getByText('Henüz bildirim yok')).toBeTruthy();
});

test('hata durumunda mesaj ve tekrar dene gorunur, goruldu gitmez', async () => {
  sorgu({ isError: true });
  await ekran();

  expect(screen.getByText('Bildirimler alınamadı.')).toBeTruthy();
  expect(screen.getByText('Tekrar dene')).toBeTruthy();
  expect(mockGoruldu).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npm run test --workspace mobile -- bildirimler`
Expected: boş durum testi dışındakiler FAIL.

- [ ] **Step 3: Uygula**

```tsx
// mobile/app/(tabs)/bildirimler.tsx
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { useBildirimler, useBildirimleriGorulduYap } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../src/ui/BosDurum';
import BildirimSatiri from '../../src/components/BildirimSatiri';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';

/**
 * Ana sayfanin sag ustundeki zilin actigi ekran (#324, #325). Liste geldikten sonra "goruldu" BIR KEZ
 * gider: okunmamis vurgular bu ziyaret boyunca kalir, zil rozeti sifirlanir. Liste alinamadiysa gitmez --
 * gorulmemis bildirim okundu sayilmasin. Geri dugmesi kabuktan gelir (`altEkranMi`).
 */
export default function BildirimlerScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  usePageTitle(t('ortak.bildirimler'));
  const { data, isLoading, isError, refetch } = useBildirimler();
  const { mutate: gorulduYap } = useBildirimleriGorulduYap();
  const gorulduGitti = useRef(false);

  useEffect(() => {
    if (data && !gorulduGitti.current) {
      gorulduGitti.current = true;
      gorulduYap();
    }
  }, [data, gorulduYap]);

  return (
    <ScrollView contentContainerClassName="gap-3 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {isError && (
        <View className="flex-col items-start gap-2">
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('bildirimler.alinamadi')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void refetch()} className="min-h-11 justify-center">
            <Text className="text-label text-accent-soft">{t('bildirimler.tekrarDene')}</Text>
          </Pressable>
        </View>
      )}

      {data && data.length === 0 && (
        <BosDurum ikon={Bell} baslik={t('bildirimler.bos')} aciklama={t('bildirimler.bosAciklama')} />
      )}

      {data?.map((bildirim) => (
        <BildirimSatiri key={`${bildirim.kind}-${bildirim.actor.username}-${bildirim.occurredAt}`} bildirim={bildirim} />
      ))}
    </ScrollView>
  );
}
```

`text-accent-soft` bağlantı/eylem metni kuralına uyar (görsel spec: `accent-soft` = vurgu metni). Mevcut ekranlarda bir "tekrar dene" bileşeni bulunursa onu kullan.

- [ ] **Step 4: Geçtiğini gör**

Run: `npm run test --workspace mobile -- bildirimler`
Expected: 4 PASS.

- [ ] **Step 5: Tüm mobil testleri ve tip kontrolü**

Run: `npm run test --workspace mobile` ve `npm run typecheck --workspace mobile`
Expected: hepsi PASS; tip hatası yok (`renkler.test.ts` ve kontrast testleri dahil — yeni token eklenmedi).

- [ ] **Step 6: Commit**

```bash
git add "mobile/app/(tabs)/bildirimler.tsx" mobile/__tests__/app/tabs/bildirimler.test.tsx
git commit -F <mesaj-dosyası>   # "feat: mobil bildirim ekrani gercek bildirimleri gosterir (#325)"
```

---

### Task 10: Dokümanlar, gözle deneme, issue notu

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md` (accent kuralı, #324 genişlemesinin altına)

- [ ] **Step 1: `CLAUDE.md`**

1. "Kapsam ve Sıra" listesine, "Gizlilik seviyesi (#294)" maddesinden sonra:

```markdown
- **Bildirimler (2026-09-26, #325)** — yalnızca mobil: ana sayfadaki zilde okunmamış sayısı rozeti ve
 `bildirimler` ekranında iki tür — biri seni takip etti (karşılıklıysa "Artık arkadaşsınız"), takip ettiğin
 biri bir antrenmanda rekor kırdı (antrenman bitince tek bildirim, hareket başına en iyi set). Bildirim
 **saklanmaz**: `Follow` / `WorkoutSession` / `SetEntry`'den sorgu anında türetilir (`INotificationSource`
 başına bir tür); okundu durumu tek alan `User.NotificationsSeenAt`, ekran açılınca `POST
 /api/notifications/seen`. Son 30 gün, en fazla 50. Push, hedef/seri hatırlatması ve GRINDY bildirimi kapsam
 dışı; saklanması gereken bir tür gelirse o türe özel tablo + kaynak eklenir. Ayrıntı:
 [docs/superpowers/specs/2026-09-26-bildirimler-design.md](docs/superpowers/specs/2026-09-26-bildirimler-design.md).
```

2. Domain Modeli → `User` satırına, `BirthDate` açıklamasından sonra: `` `NotificationsSeenAt` (nullable, UTC — bildirim ekranının en son açıldığı an, #325; okunmamış = bu andan sonraki olaylar) ``.

3. Yetkilendirme Kuralı istisnası bloğunun sonuna:

```markdown
> Bildirimler (#325): `GET /api/notifications`, takip ettiğin kişinin takipten sonra bitirdiği rekorlu
> antrenmanlarını (hareket adı, ağırlık, tekrar, rekor türü) gösterir. Rekorlar üç seviyede de açık
> olduğu için yeni bir paylaşım değildir; `PrivacyLevel` bu bildirimi kısıtlamaz. Not, ölçü, AI yorumu
> ve geçmişin geri kalanı bildirimde yer almaz. Uç yalnız `currentUserId`'nin bildirimlerini döner.
```

- [ ] **Step 2: Görsel tasarım spec'i**

#324 genişlemesi paragrafının hemen ardına (aynı madde içinde, "Başka hiçbir yer" cümlesinden önce):

```markdown
  **#325 genişlemesi (yalnızca mobil):** ana sayfadaki zilin okunmamış sayısı rozeti — `accent` dolgu +
  `on-accent` rakam (4.54:1); 9'dan büyükse `9+`. Bildirim satırlarının okunmamış vurgusu accent DEĞİL:
  `surface-3` zemin (okunmuş `surface-2`).
```

- [ ] **Step 3: Tüm doğrulama**

Run (sırayla):
- `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Notification|FullyQualifiedName~Follow|FullyQualifiedName~BestRecordPicker|FullyQualifiedName~Grind.Tests.Data"`
- `npm run test --workspace @grind/shared` · `npm run typecheck --workspace @grind/shared`
- `npm run test --workspace mobile` · `npm run typecheck --workspace mobile`

Expected: hepsi yeşil; her komutun geçen/toplam sayısını not et (PR gövdesine girer).

- [ ] **Step 4: Mobilde gözle deneme** (kullanıcıyla)

İki hesap (A, B), iki temada:
1. B, A'yı takip eder → A ana sayfada zilde `1` rozeti görür; ekranı açar, "B seni takip etmeye başladı" vurgulu; geri dönünce rozet yok.
2. A, B'yi geri takip eder → B'nin bildiriminde "Artık arkadaşsınız".
3. B rekorlu bir antrenmanı bitirir → A'da rozet; satırda hareketler; dokununca B'nin Rekorlar sekmesi.
4. B takibi bırakır → A'nın listesinden takip bildirimi düşer.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md
git commit -F <mesaj-dosyası>   # "docs: bildirimler CLAUDE.md ve gorsel tasarim spec'ine islendi (#325)"
```

- [ ] **Step 6: Issue notu**

```bash
gh issue comment 325 --body-file <not-dosyası>
```

Not: "Web donduruldu (#326); bu issue'nun web kısmı yapılmadı, yalnızca backend ve mobil. Tasarım: docs/superpowers/specs/2026-09-26-bildirimler-design.md"
