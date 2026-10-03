# Kişi menüsü + arkadaşlık isteği (#628) — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Başkasının profilinde Instagram düzeni kurulacak: "Takiptesin ⌄" bir kişi menüsü açar, sağda bir arkadaşlık düğmesi durur. Arkadaşlık isteği kabul edilince iki taraf karşılıklı takibe geçer. Sessize alma tüm bildirimleri kapatır. Kendi takip listelerinde her satırda bir eylem düğmesi bulunur.

**Architecture:**
- Backend:
  - Yeni `FriendRequest` tablosu: bekleyen istek `RejectedAt = null`, reddedilen istek dolu `RejectedAt` ile durur; ret sayacı buradan sayılır.
  - `Follow.NotificationsMuted` alanı eklenir.
  - İş mantığı iki serviste yaşar: `FriendRequestService` (gönder / geri çek / kabul / ret) ve `FollowService` (arkadaşlıktan çıkar / takipçiden çıkar / sessize al + profil alanları).
  - Bildirimler yeni bir `INotificationSource` ve repository sorgularındaki ortak sessize alma süzgecinden geçer.
- İstemci:
  - `packages/shared`: mutasyonlar ve saf eşlemeler.
  - `mobile/`: `ArkadaslikDugmesi`, `KisiMenusu`, liste satırı eylemi ve bildirim satırında Kabul/Reddet.

**Tech Stack:** ASP.NET Core (.NET 10), EF Core + PostgreSQL, xUnit · TypeScript, TanStack Query, vitest · React Native + Expo, NativeWind, jest-expo.

**Spec:** [docs/superpowers/specs/2026-10-03-kisi-menusu-arkadaslik-istegi-design.md](../specs/2026-10-03-kisi-menusu-arkadaslik-istegi-design.md)

## Global Constraints
- **Web'e dokunulmaz** (#326). Yalnızca `src/`, `tests/`, `packages/shared/`, `mobile/`, `docs/`, `CLAUDE.md`.
- **Migration** yalnızca `dotnet ef migrations add <Ad> --project src/Grind.Api --output-dir Data/Migrations` ile üretilir, elle düzenlenmez.
- **Yeni kullanıcı metinleri:** `packages/shared/src/i18n/tr.ts` + `en.ts`, aynı commit'te, `t(...)` ile. Satır içi metin yok.
- **Backend hata `detail`'leri** Türkçe (dilim 2 öncesi kural). İstemci bu metinlere dayanmaz.
- **Kimlik** yalnızca `currentUser.UserId`'den alınır. İstek satırı hiçbir zaman Id ile aranmaz, her zaman `(RequesterId, TargetId)` çiftiyle aranır.
- **Ret sınırı:** `FriendRequestService.RejectionLimit = 3`.
- **Renkler:** JS tarafında `useIkonRenk()` / `useRenkPaleti()`. Modül seviyesinde renk okunmaz.
- **Yeni kart/menü yüzeyi** cam olur (`CamKatmanlari` / `Modal cam`).
- **API tiplerinin üretimi** (API 5098'de çalışırken, repo DIŞINDAKİ bir klasörden): `npm exec --yes --package=openapi-typescript@7.13.0 -- openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o "C:/coding projects/GRIND/packages/shared/src/api/schema.d.ts"`
- **Commit mesajı:** Write ile scratchpad'e yazılır, `git commit -F` ile atılır. Son satırlar:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_0193FMeyAxmEbF8rgqhZ8W2j
  ```
- **Backend testleri** yalnızca ilgili filtreyle koşulur. Yeni tablo eklendiği için `FullyQualifiedName~Grind.Tests.Data` her backend görevinde filtreye dahildir.

## Review Focus
1. **Eşzamanlı çift "Arkadaş ekle" dokunuşu:** ikinci istek kısmi benzersiz indekse takılır. Kullanıcı hata görmemeli, 204 dönmeli. Task 2'de idempotentlik testi ve `catch (ConflictException)` dalı karşılar; inceleme dalı kontrol eder.
2. **İstek bekliyorken karşı taraf beni zaten takip ediyorsa ve ben de ediyorsam** (arada elle karşılıklı takip kurulduysa): kabul mükerrer `Follow` satırı açmamalı, unique ihlali vermemeli (Task 2, "kabul eksik satırları ekler" testi önceden var olan takip satırıyla kurulur).
3. **Sessize aldığım kişiyi takipten çıkıp yeniden takip edersem** sessize alma geri gelmemeli. Yeni satır `false` ile açılır (Task 3'te test edilir).
4. **Pasif hesabın bekleyen isteği** bildirimde görünmemeli (Task 5'te test edilir).
5. **Bildirimden kabul ederken istek bu arada geri çekilmişse** (404): satır sessizce kaybolmalı, uygulama çökmemeli. `useArkadaslikYaniti` hata durumunda da bildirimleri tazeler (Task 6'da test edilir).

---

### Task 1: Veri modeli — `FriendRequest` + `Follow.NotificationsMuted`

**Files:**
- Create: `src/Grind.Api/Models/Entities/FriendRequest.cs`
- Create: `src/Grind.Api/Data/Configurations/FriendRequestConfiguration.cs`
- Modify: `src/Grind.Api/Models/Entities/Follow.cs`
- Modify: `src/Grind.Api/Data/AppDbContext.cs` (DbSet)
- Create (üretilir): `src/Grind.Api/Data/Migrations/*_FriendRequests.cs`
- Test: `tests/Grind.Tests/Data/ModelShapeTests.cs`, `IndexTests.cs`, `CheckConstraintTests.cs`, `DeleteBehaviorTests.cs`

**Interfaces:**
- Produces:
  - `FriendRequest { long Id; long RequesterId; long TargetId; DateTime CreatedAt; DateTime? RejectedAt; User Requester; User Target; }`
  - `Follow.NotificationsMuted : bool`
  - `AppDbContext.FriendRequests`

- [ ] **Step 1: Failing data testlerini yaz**

`ModelShapeTests.cs`: `expected` dizisine `"FriendRequest"` eklenir (alfabetik sıra: `"Follow"`'dan sonra) ve yorum satırına `FriendRequest: arkadaslik istegi (#628).` eklenir:
```csharp
            "AiInsight", "AiInsightTranslation", "BodyWeightLog", "Exercise", "ExerciseMedia", "Follow",
            "FriendRequest", "SessionExercise", "SetEntry", "TemplateExercise", "User", "UserAvatar",
            "WorkoutSession", "WorkoutTemplate"
```

`IndexTests.cs` (takip testinin altına):
```csharp
    /// <summary>
    /// #628: bir çift arasında aynı anda tek BEKLEYEN istek — reddedilenler (`RejectedAt` dolu) ret
    /// sınırı için saklanır ve benzersizliğe girmez. Gelen istekler TargetId'den okunur.
    /// </summary>
    [Fact]
    public void Bekleyen_arkadaslik_istegi_cift_basina_tektir()
    {
        var cift = IndexOn<FriendRequest>("RequesterId", "TargetId");
        Assert.True(cift.IsUnique);
        Assert.Equal("\"RejectedAt\" IS NULL", cift.GetFilter());
        Assert.False(IndexOn<FriendRequest>("TargetId").IsUnique);
    }
```

`CheckConstraintTests.cs` (Follow satırının yanına, aynı `SqlOf` yardımcısıyla):
```csharp
    [Fact]
    public void Kendine_arkadaslik_istegi_yasaktir()
        => Assert.Contains("\"RequesterId\" <> \"TargetId\"", SqlOf<FriendRequest>("CK_FriendRequest_NotSelf"));
```

`DeleteBehaviorTests.cs` (Follow satırlarının yanına):
```csharp
    [Fact]
    public void Arkadaslik_istegi_kullanici_silinmesini_engeller()
    {
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<FriendRequest>("RequesterId"));
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<FriendRequest>("TargetId"));
    }
```

`ColumnMappingTests.cs`'te varsayılan değer testi deseni varsa `Follow.NotificationsMuted` için ekle. Yoksa bu adımı atla; alan `bool` olduğu için NOT NULL zaten garantidir.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Grind.Tests.Data"`
Expected: derleme hatası (`FriendRequest` yok).

- [ ] **Step 3: Entity + konfigürasyon + DbSet**

`src/Grind.Api/Models/Entities/FriendRequest.cs`:
```csharp
namespace Grind.Api.Models.Entities;

/// <summary>
/// Arkadaşlık isteği (#628). Arkadaşlık yine SAKLANMAZ (karşılıklı takip, #281); bu satır yalnızca iki
/// kişiyi tek adımda karşılıklı takibe getiren isteğin kendisidir. <see cref="RejectedAt"/> <c>null</c> =
/// bekliyor; dolu = reddedildi — reddedilen satırlar ret sınırı için sayılır, ayrı bir sayaç tutulmaz.
/// Kabul edilince çiftin tüm satırları silinir (sayaç sıfırlanır).
/// </summary>
public class FriendRequest
{
    public long Id { get; set; }
    public long RequesterId { get; set; }
    public long TargetId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RejectedAt { get; set; }

    public User Requester { get; set; } = null!;
    public User Target { get; set; } = null!;
}
```

`src/Grind.Api/Data/Configurations/FriendRequestConfiguration.cs`:
```csharp
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> builder)
    {
        // Kullanıcı hard-delete edilmez (Faz 13); Follow ile aynı gerekçe.
        builder.HasOne(r => r.Requester)
            .WithMany()
            .HasForeignKey(r => r.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Target)
            .WithMany()
            .HasForeignKey(r => r.TargetId)
            .OnDelete(DeleteBehavior.Restrict);

        // Çift başına tek BEKLEYEN istek; eşzamanlı çift dokunuşu DB yakalar. Reddedilenler süzgeç dışında.
        builder.HasIndex(r => new { r.RequesterId, r.TargetId })
            .IsUnique()
            .HasFilter("\"RejectedAt\" IS NULL");
        builder.HasIndex(r => r.TargetId);

        builder.ToTable(t => t.HasCheckConstraint("CK_FriendRequest_NotSelf", "\"RequesterId\" <> \"TargetId\""));
    }
}
```

`Follow.cs`'e (CreatedAt'in altına):
```csharp
    /// <summary>
    /// #628: <see cref="Follower"/>, bu kişiden gelen TÜM bildirimleri istemiyor. Takip satırında yaşar —
    /// takibi bırakınca sessize alma da kalkar (menü yalnızca takip ederken açılır).
    /// </summary>
    public bool NotificationsMuted { get; set; }
```

`AppDbContext.cs`'e `Follows` satırının altına:
```csharp
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
```
(Konfigürasyonlar `ApplyConfigurationsFromAssembly` ile yükleniyorsa başka bir şey gerekmez; değilse `OnModelCreating`'e `FollowConfiguration`'ın yanına ekle.)

- [ ] **Step 4: Migration üret**

Run: `dotnet ef migrations add FriendRequests --project src/Grind.Api --output-dir Data/Migrations`
Üretilen dosyada şunlar olmalı: `FriendRequests` tablosu, filtreli unique indeks, CHECK ve `Follows.NotificationsMuted boolean NOT NULL DEFAULT false`. Dosya elle düzenlenmez.

- [ ] **Step 5: Yeşil**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Grind.Tests.Data"`
Expected: PASS.

- [ ] **Step 6: Commit** — `feat: arkadaslik istegi tablosu ve sessize alma alani (#628)`

---

### Task 2: `FriendRequestService` — gönder / geri çek / kabul / ret

**Files:**
- Create: `src/Grind.Api/Repositories/IFriendRequestRepository.cs`, `FriendRequestRepository.cs`
- Create: `src/Grind.Api/Services/IFriendRequestService.cs`, `FriendRequestService.cs`
- Modify: `src/Grind.Api/Data/DependencyInjection.cs` (repository), `src/Grind.Api/Services/DependencyInjection.cs` (servis)
- Test: `tests/Grind.Tests/Services/FriendRequestServiceTests.cs`

**Interfaces:**
- Consumes: Task 1 entity'leri. `IFollowRepository.GetAsync(followerId, followeeId)`, `IUserRepository.GetActiveByUsernameOrThrowAsync`, `IUnitOfWork`, `ICurrentUserService`, `TimeProvider`.
- Produces:
  - `IFriendRequestRepository : IRepository<FriendRequest>` metotları:
    - `Task<FriendRequest?> GetPendingAsync(long requesterId, long targetId, CancellationToken ct = default)`
    - `Task<int> CountRejectedAsync(long requesterId, long targetId, CancellationToken ct = default)`
    - `Task<IReadOnlyList<FriendRequest>> GetPairAsync(long a, long b, CancellationToken ct = default)`
  - `IFriendRequestService` metotları: `SendAsync(string username, ct)`, `WithdrawAsync(...)`, `AcceptAsync(...)`, `RejectAsync(...)`
  - `FriendRequestService.RejectionLimit = 3`

- [ ] **Step 1: Failing testleri yaz**

`tests/Grind.Tests/Services/FriendRequestServiceTests.cs`:
```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

/// <summary>
/// Arkadaşlık isteği (#628): kabul iki tarafı karşılıklı takibe getirir, ret takipleri değiştirmez,
/// aynı kişiye üst üste 3 retten sonra istek gönderilemez (geri çekilen sayılmaz).
/// </summary>
[Trait("Category", "Database")]
public class FriendRequestServiceTests
{
    private static readonly DateTime An = new(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private sealed class SahteSaat : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(An, TimeSpan.Zero);
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

    private static FriendRequestService ServiceFor(AppDbContext context, User current)
        => new(new FriendRequestRepository(context), new FollowRepository(context), new UserRepository(context),
            new UnitOfWork(context), new StubCurrentUser(current), new SahteSaat());

    private static Task<bool> TakipVarMi(AppDbContext context, User a, User b)
        => context.Follows.AnyAsync(f => f.FollowerId == a.Id && f.FolloweeId == b.Id);

    private static Task<List<FriendRequest>> Istekler(AppDbContext context)
        => context.FriendRequests.AsNoTracking().ToListAsync();

    [Fact]
    public async Task Istek_bekleyen_satir_acar_ikinci_istek_noop()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);
            await ServiceFor(context, ben).SendAsync(ali.Username);

            var istek = Assert.Single(await Istekler(context));
            Assert.Equal((ben.Id, ali.Id, (DateTime?)null), (istek.RequesterId, istek.TargetId, istek.RejectedAt));
        }
    }

    [Fact]
    public async Task Zaten_arkadassa_istek_acilmaz()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            context.AddRange(
                new Follow { FollowerId = ben.Id, FolloweeId = ali.Id, CreatedAt = An },
                new Follow { FollowerId = ali.Id, FolloweeId = ben.Id, CreatedAt = An });
            await context.SaveChangesAsync();

            await ServiceFor(context, ben).SendAsync(ali.Username);

            Assert.Empty(await Istekler(context));
        }
    }

    [Fact]
    public async Task Kendine_istek_400()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => ServiceFor(context, users[0]).SendAsync(users[0].Username));
        }
    }

    /// <summary>Üst üste 3 ret → 4. istek 400; geri çekilen istekler sayılmaz.</summary>
    [Fact]
    public async Task Uc_retten_sonra_istek_gonderilemez_geri_cekilen_sayilmaz()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);
            await ServiceFor(context, ben).WithdrawAsync(ali.Username);
            for (var i = 0; i < FriendRequestService.RejectionLimit; i++)
            {
                await ServiceFor(context, ben).SendAsync(ali.Username);
                await ServiceFor(context, ali).RejectAsync(ben.Username);
            }

            await Assert.ThrowsAsync<ValidationException>(() => ServiceFor(context, ben).SendAsync(ali.Username));
        }
    }

    /// <summary>
    /// Kabul: eksik takip satırları eklenir (var olan tekrar eklenmez — Review Focus 2), çiftin TÜM
    /// istekleri (karşı yöndeki bekleyen ve reddedilmişler dahil) silinir.
    /// </summary>
    [Fact]
    public async Task Kabul_karsilikli_takip_kurar_ciftin_isteklerini_siler()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            context.Add(new Follow { FollowerId = ali.Id, FolloweeId = ben.Id, CreatedAt = An });
            context.Add(new FriendRequest { RequesterId = ali.Id, TargetId = ben.Id, CreatedAt = An, RejectedAt = An });
            context.Add(new FriendRequest { RequesterId = ben.Id, TargetId = ali.Id, CreatedAt = An });
            await context.SaveChangesAsync();
            await ServiceFor(context, ali).SendAsync(ben.Username);

            await ServiceFor(context, ben).AcceptAsync(ali.Username);

            Assert.True(await TakipVarMi(context, ben, ali));
            Assert.True(await TakipVarMi(context, ali, ben));
            Assert.Equal(1, await context.Follows.CountAsync(f => f.FollowerId == ali.Id && f.FolloweeId == ben.Id));
            Assert.Empty(await Istekler(context));
        }
    }

    [Fact]
    public async Task Ret_takipleri_degistirmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ali).SendAsync(ben.Username);

            await ServiceFor(context, ben).RejectAsync(ali.Username);

            Assert.False(await TakipVarMi(context, ben, ali));
            Assert.False(await TakipVarMi(context, ali, ben));
            Assert.Equal(An, Assert.Single(await Istekler(context)).RejectedAt);
        }
    }

    /// <summary>IDOR: kendi gönderdiğin isteği "kabul" edemezsin — bana gelen bir istek yok, 404.</summary>
    [Fact]
    public async Task Gonderen_kendi_istegini_kabul_edemez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);

            await Assert.ThrowsAsync<NotFoundException>(() => ServiceFor(context, ben).AcceptAsync(ali.Username));
            Assert.False(await TakipVarMi(context, ali, ben));
        }
    }
}
```
Not (Review Focus 1): çift istek sözleşmesini `Istek_bekleyen_satir_acar_ikinci_istek_noop` sabitler. Gerçek yarışı (iki istek ön-kontrolü birlikte geçer) `SendAsync`'teki `catch (ConflictException)` karşılar; bu dal `FollowAsync`'teki desenin aynısıdır ve ayrı bir yarış testi yazılmaz. İnceleme bu dalın varlığını kontrol eder.

- [ ] **Step 2: Kırmızı**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FriendRequestServiceTests"`
Expected: derleme hatası.

- [ ] **Step 3: Repository**

`IFriendRequestRepository.cs`:
```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

/// <summary>Arkadaşlık istekleri (#628). Satırlar her zaman (gönderen, hedef) çiftiyle aranır — Id ile değil.</summary>
public interface IFriendRequestRepository : IRepository<FriendRequest>
{
    /// <summary><paramref name="requesterId"/>'den <paramref name="targetId"/>'ye bekleyen istek.</summary>
    Task<FriendRequest?> GetPendingAsync(long requesterId, long targetId, CancellationToken cancellationToken = default);

    /// <summary>Bu yönde reddedilmiş istek sayısı (ret sınırı).</summary>
    Task<int> CountRejectedAsync(long requesterId, long targetId, CancellationToken cancellationToken = default);

    /// <summary>Çiftin iki yöndeki TÜM satırları (bekleyen + reddedilmiş).</summary>
    Task<IReadOnlyList<FriendRequest>> GetPairAsync(long a, long b, CancellationToken cancellationToken = default);
}
```

`FriendRequestRepository.cs`:
```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class FriendRequestRepository(AppDbContext context)
    : Repository<FriendRequest>(context), IFriendRequestRepository
{
    public Task<FriendRequest?> GetPendingAsync(long requesterId, long targetId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(
            r => r.RequesterId == requesterId && r.TargetId == targetId && r.RejectedAt == null, cancellationToken);

    public Task<int> CountRejectedAsync(long requesterId, long targetId, CancellationToken cancellationToken = default)
        => Set.CountAsync(
            r => r.RequesterId == requesterId && r.TargetId == targetId && r.RejectedAt != null, cancellationToken);

    public async Task<IReadOnlyList<FriendRequest>> GetPairAsync(long a, long b, CancellationToken cancellationToken = default)
        => await Set
            .Where(r => (r.RequesterId == a && r.TargetId == b) || (r.RequesterId == b && r.TargetId == a))
            .ToListAsync(cancellationToken);
}
```
`Data/DependencyInjection.cs`'e `IFollowRepository` satırının altına: `services.AddScoped<IFriendRequestRepository, FriendRequestRepository>();`

- [ ] **Step 4: Servis**

`IFriendRequestService.cs`:
```csharp
namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık isteği (#628). Hedef kullanıcı adıyla verilir; pasif/olmayan hedef 404, kendine 400.
/// Kabul ve ret yalnızca BANA gelen, geri çekme yalnızca BENİM gönderdiğim isteğe uygulanır.
/// </summary>
public interface IFriendRequestService
{
    /// <summary>İdempotent: zaten arkadaşsa ya da istek bekliyorsa hiçbir şey yapmaz. Ret sınırı dolmuşsa 400.</summary>
    Task SendAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>İdempotent: bekleyen istek yoksa hiçbir şey yapmaz. Geri çekilen istek ret sınırına sayılmaz.</summary>
    Task WithdrawAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>Ondan bana bekleyen istek yoksa 404. Eksik takipleri ekler, çiftin isteklerini siler.</summary>
    Task AcceptAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>Ondan bana bekleyen istek yoksa 404. Takipler değişmez.</summary>
    Task RejectAsync(string username, CancellationToken cancellationToken = default);
}
```

`FriendRequestService.cs`:
```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class FriendRequestService(
    IFriendRequestRepository requestRepository,
    IFollowRepository followRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFriendRequestService
{
    /// <summary>Aynı kişiye üst üste bu kadar ret sonrası yeni istek gönderilemez (kullanıcı kararı, #628).</summary>
    public const int RejectionLimit = 3;

    public async Task SendAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await OtherAsync(username, cancellationToken);
        var me = currentUser.UserId;

        if (await followRepository.GetAsync(me, target.Id, cancellationToken) is not null
            && await followRepository.GetAsync(target.Id, me, cancellationToken) is not null)
            return;
        if (await requestRepository.GetPendingAsync(me, target.Id, cancellationToken) is not null)
            return;
        if (await requestRepository.CountRejectedAsync(me, target.Id, cancellationToken) >= RejectionLimit)
            throw new ValidationException("Bu kişiye daha fazla arkadaşlık isteği gönderemezsin.");

        requestRepository.Add(new FriendRequest
        {
            RequesterId = me,
            TargetId = target.Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        });

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (ConflictException)
        {
            // Eşzamanlı çift istek: kısmi benzersiz indeks ikinciyi durdurur, sonuç yine "istek bekliyor".
        }
    }

    public async Task WithdrawAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await OtherAsync(username, cancellationToken);
        var request = await requestRepository.GetPendingAsync(currentUser.UserId, target.Id, cancellationToken);
        if (request is null)
            return;

        requestRepository.Remove(request);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AcceptAsync(string username, CancellationToken cancellationToken = default)
    {
        var requester = await OtherAsync(username, cancellationToken);
        var me = currentUser.UserId;
        _ = await IncomingOrThrowAsync(requester.Id, cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (await followRepository.GetAsync(requester.Id, me, cancellationToken) is null)
            followRepository.Add(new Follow { FollowerId = requester.Id, FolloweeId = me, CreatedAt = now });
        if (await followRepository.GetAsync(me, requester.Id, cancellationToken) is null)
            followRepository.Add(new Follow { FollowerId = me, FolloweeId = requester.Id, CreatedAt = now });

        // Çiftin TÜM satırları: karşı yöndeki bekleyen istek ve ret geçmişi de temizlenir (sayaç sıfırlanır).
        foreach (var request in await requestRepository.GetPairAsync(me, requester.Id, cancellationToken))
            requestRepository.Remove(request);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RejectAsync(string username, CancellationToken cancellationToken = default)
    {
        var requester = await OtherAsync(username, cancellationToken);
        var request = await IncomingOrThrowAsync(requester.Id, cancellationToken);
        request.RejectedAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> OtherAsync(string username, CancellationToken cancellationToken)
    {
        var other = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        if (other.Id == currentUser.UserId)
            throw new ValidationException("Kendine arkadaşlık isteği gönderemezsin.");
        return other;
    }

    private async Task<FriendRequest> IncomingOrThrowAsync(long requesterId, CancellationToken cancellationToken)
        => await requestRepository.GetPendingAsync(requesterId, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException("Arkadaşlık isteği bulunamadı.");
}
```
`Services/DependencyInjection.cs`'e `IFollowService` satırının altına: `services.AddScoped<IFriendRequestService, FriendRequestService>();`

- [ ] **Step 5: Yeşil**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FriendRequestServiceTests|FullyQualifiedName~Grind.Tests.Data"`
Expected: PASS.

- [ ] **Step 6: Commit** — `feat: arkadaslik istegi servisi -- gonder, geri cek, kabul, ret (#628)`

---

### Task 3: `FollowService` — arkadaşlıktan çıkar, takipçiden çıkar, sessize al, profil alanları

**Files:**
- Modify: `src/Grind.Api/Services/IFollowService.cs`, `FollowService.cs`
- Create: `src/Grind.Api/Models/Enums/FriendRequestState.cs`
- Modify: `src/Grind.Api/Models/Dtos/Social/UserProfileResponse.cs`
- Test: `tests/Grind.Tests/Services/FollowServiceTests.cs`

**Interfaces:**
- Consumes: `IFriendRequestRepository` (Task 2), `FriendRequestService.RejectionLimit`
- Produces:
  - `IFollowService.RemoveFriendshipAsync(string username, ct)`
  - `IFollowService.RemoveFollowerAsync(string username, ct)`
  - `IFollowService.SetMutedAsync(string username, bool muted, ct)`
  - `enum FriendRequestState { None, Sent, Received }`
  - `UserProfileResponse` sonuna eklenen alanlar: `FriendRequestState FriendRequest, bool CanSendFriendRequest, bool NotificationsMuted`

- [ ] **Step 1: Failing testler**

`FollowServiceTests.ServiceFor`'u yeni bağımlılıkla güncelle:
```csharp
        return new FollowService(
            followRepository, new UserRepository(context), avatarRepository,
            new UserSummaryBuilder(followRepository, avatarRepository, currentUser),
            new FriendRequestRepository(context),
            new UnitOfWork(context), currentUser, new SahteSaat());
```
Dosyanın sonuna eklenecek testler:
```csharp
    // ---- #628: arkadaşlıktan çıkar / takipçiden çıkar / sessize al ----

    private static Task<bool> TakipVarMi(AppDbContext context, User a, User b)
        => context.Follows.AnyAsync(f => f.FollowerId == a.Id && f.FolloweeId == b.Id);

    [Fact]
    public async Task Arkadasliktan_cikar_iki_yondeki_takibi_siler()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            await ServiceFor(context, a).FollowAsync(b.Username);
            await ServiceFor(context, b).FollowAsync(a.Username);

            await ServiceFor(context, a).RemoveFriendshipAsync(b.Username);

            Assert.False(await TakipVarMi(context, a, b));
            Assert.False(await TakipVarMi(context, b, a));
        }
    }

    [Fact]
    public async Task Takipciden_cikar_yalnizca_onun_takibini_siler()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            await ServiceFor(context, a).FollowAsync(b.Username);
            await ServiceFor(context, b).FollowAsync(a.Username);

            await ServiceFor(context, a).RemoveFollowerAsync(b.Username);

            Assert.False(await TakipVarMi(context, b, a));
            Assert.True(await TakipVarMi(context, a, b));
        }
    }

    [Fact]
    public async Task Takip_etmeden_sessize_alma_400()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => ServiceFor(context, users[0]).SetMutedAsync(users[1].Username, true));
        }
    }

    /// <summary>Review Focus 3: sessize alma takip satırında yaşar — bırakıp yeniden takip edince sıfırdan başlar.</summary>
    [Fact]
    public async Task Sessize_alma_profilde_gorunur_yeniden_takipte_sifirlanir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            var aGozuyle = ServiceFor(context, a);
            await aGozuyle.FollowAsync(b.Username);
            await aGozuyle.SetMutedAsync(b.Username, true);
            Assert.True((await aGozuyle.GetProfileAsync(b.Username)).NotificationsMuted);

            await aGozuyle.UnfollowAsync(b.Username);
            await aGozuyle.FollowAsync(b.Username);

            Assert.False((await aGozuyle.GetProfileAsync(b.Username)).NotificationsMuted);
        }
    }

    [Fact]
    public async Task Profil_istek_yonunu_ve_ret_sinirini_soyler()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            context.Add(new FriendRequest { RequesterId = a.Id, TargetId = b.Id, CreatedAt = An });
            for (var i = 0; i < FriendRequestService.RejectionLimit; i++)
                context.Add(new FriendRequest { RequesterId = b.Id, TargetId = a.Id, CreatedAt = An, RejectedAt = An });
            await context.SaveChangesAsync();

            var aGozuyle = await ServiceFor(context, a).GetProfileAsync(b.Username);
            Assert.Equal((FriendRequestState.Sent, true), (aGozuyle.FriendRequest, aGozuyle.CanSendFriendRequest));

            var bGozuyle = await ServiceFor(context, b).GetProfileAsync(a.Username);
            Assert.Equal((FriendRequestState.Received, false), (bGozuyle.FriendRequest, bGozuyle.CanSendFriendRequest));
        }
    }
```

- [ ] **Step 2: Kırmızı** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FollowServiceTests"` → derleme hatası.

- [ ] **Step 3: Enum + DTO**

`Models/Enums/FriendRequestState.cs`:
```csharp
namespace Grind.Api.Models.Enums;

/// <summary>Bakanın gözünden bekleyen arkadaşlık isteğinin yönü (#628). Karşılıklı takipte her zaman None.</summary>
public enum FriendRequestState
{
    None,

    /// <summary>Bakan istek gönderdi, cevap bekleniyor.</summary>
    Sent,

    /// <summary>O bakana istek gönderdi.</summary>
    Received
}
```
`UserProfileResponse`'un parametre listesinin sonuna (özet yorumunun sonuna "#628: arkadaşlık isteği yönü, ret sınırı ve sessize alma bakanın gözünden." cümlesi eklenir):
```csharp
    PrivacyLevel PrivacyLevel,
    FriendRequestState FriendRequest,
    bool CanSendFriendRequest,
    bool NotificationsMuted);
```

- [ ] **Step 4: Servis**

`FollowService` birincil kurucusuna `IFriendRequestRepository friendRequestRepository` parametresi `IUserSummaryBuilder summaryBuilder`'dan hemen sonra eklenir. `GetProfileAsync`'in dönüşü şöyle olur:
```csharp
        var relation = relations(target.Id);
        var me = currentUser.UserId;
        var self = target.Id == me;
        var friendRequest = self || relation == FollowRelation.Friends
            ? FriendRequestState.None
            : await friendRequestRepository.GetPendingAsync(me, target.Id, cancellationToken) is not null
                ? FriendRequestState.Sent
                : await friendRequestRepository.GetPendingAsync(target.Id, me, cancellationToken) is not null
                    ? FriendRequestState.Received
                    : FriendRequestState.None;
        var canSend = !self
            && await friendRequestRepository.CountRejectedAsync(me, target.Id, cancellationToken)
                < FriendRequestService.RejectionLimit;
        var muted = !self
            && (await followRepository.GetAsync(me, target.Id, cancellationToken))?.NotificationsMuted == true;

        return new UserProfileResponse(
            target.Username,
            target.DisplayName,
            target.BirthDate is { } birthDate ? AgeCalculator.AgeOn(birthDate, today) : null,
            avatarUpdatedAt is not null,
            avatarUpdatedAt is { } updatedAt ? AvatarVersion.Of(updatedAt) : null,
            counts.Friends, counts.Followers, counts.Following, relation, target.PrivacyLevel,
            friendRequest, canSend, muted);
```
Yeni metotlar (`UnfollowAsync`'in altına):
```csharp
    public async Task RemoveFriendshipAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var rows = new[]
        {
            await followRepository.GetAsync(currentUser.UserId, target.Id, cancellationToken),
            await followRepository.GetAsync(target.Id, currentUser.UserId, cancellationToken)
        }.OfType<Follow>().ToList();
        if (rows.Count == 0)
            return;

        foreach (var row in rows)
            followRepository.Remove(row);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveFollowerAsync(string username, CancellationToken cancellationToken = default)
    {
        var follower = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var follow = await followRepository.GetAsync(follower.Id, currentUser.UserId, cancellationToken);
        if (follow is null)
            return;

        followRepository.Remove(follow);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task SetMutedAsync(string username, bool muted, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var follow = await followRepository.GetAsync(currentUser.UserId, target.Id, cancellationToken)
                     ?? throw new ValidationException("Takip etmediğin birini sessize alamazsın.");
        follow.NotificationsMuted = muted;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
```
`IFollowService`'e:
```csharp
    /// <summary>#628: iki yöndeki takibi de siler — arkadaşlık biter, kimse kimseyi takip etmez. İdempotent.</summary>
    Task RemoveFriendshipAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>#628: o kişinin BENİ takibini siler (Instagram'daki "Kaldır"). İdempotent.</summary>
    Task RemoveFollowerAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>#628: takip ettiğim birinden gelen tüm bildirimleri kapatır/açar. Takip etmiyorsam 400.</summary>
    Task SetMutedAsync(string username, bool muted, CancellationToken cancellationToken = default);
```
Ayrıca `IFollowService` özet yorumundaki "doğrudan takip (onay yok)" ifadesinin yanına "(arkadaşlık isteği ayrı: `IFriendRequestService`, #628)" eklenir.

- [ ] **Step 5: Yeşil** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FollowServiceTests"` → PASS.

- [ ] **Step 6: Commit** — `feat: arkadasliktan cikar, takipciden cikar, sessize al (#628)`

---

### Task 4: Uçlar (`UsersController`)

**Files:**
- Modify: `src/Grind.Api/Controllers/UsersController.cs`
- Create: `src/Grind.Api/Models/Dtos/Social/MuteRequest.cs`
- Test: `tests/Grind.Tests/Integration/FollowEndpointsTests.cs`

**Interfaces:**
- Consumes: `IFriendRequestService` (Task 2), yeni `IFollowService` metotları (Task 3)
- Produces (HTTP):
  - `POST|DELETE /api/users/{u}/friend-request`
  - `POST /api/users/{u}/friend-request/accept`
  - `POST /api/users/{u}/friend-request/reject`
  - `DELETE /api/users/{u}/friendship`
  - `DELETE /api/users/{u}/follower`
  - `PUT /api/users/{u}/mute` (`{ "muted": bool }`)
  - Hepsi 204 döner.

- [ ] **Step 1: Failing entegrasyon testleri** (`FollowEndpointsTests` sonuna):
```csharp
    /// <summary>#628: istek → profilde Received → kabul → iki taraf arkadaş; arkadaşlıktan çıkar ikisini de siler.</summary>
    [Fact]
    public async Task Arkadaslik_istegi_kabul_ve_arkadasliktan_cikar()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{bAdi}/friend-request", null)).StatusCode);
        var bGozuyle = await b.GetFromJsonAsync<UserProfileResponse>($"/api/users/{aAdi}/profile", Json);
        Assert.Equal(FriendRequestState.Received, bGozuyle!.FriendRequest);

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/friend-request/accept", null)).StatusCode);
        var profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.Friends, profil!.Relation);

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/users/{bAdi}/friendship")).StatusCode);
        profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.None, profil!.Relation);
    }

    [Fact]
    public async Task Gelen_istek_yokken_kabul_404()
    {
        var (a, _) = await RegisteredClientAsync();
        var (_, bAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await a.PostAsync($"/api/users/{bAdi}/friend-request/reject", null)).StatusCode);
    }

    [Fact]
    public async Task Takipciden_cikar_ve_sessize_al_uclari()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();
        await a.PostAsync($"/api/users/{bAdi}/follow", null);
        await b.PostAsync($"/api/users/{aAdi}/follow", null);

        Assert.Equal(HttpStatusCode.NoContent,
            (await a.PutAsJsonAsync($"/api/users/{bAdi}/mute", new { muted = true })).StatusCode);
        Assert.True((await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json))!.NotificationsMuted);

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/users/{bAdi}/follower")).StatusCode);
        var profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.Following, profil!.Relation);
    }
```

- [ ] **Step 2: Kırmızı** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FollowEndpointsTests"` → 404/405.

- [ ] **Step 3: Uçlar**

`Models/Dtos/Social/MuteRequest.cs`:
```csharp
namespace Grind.Api.Models.Dtos.Social;

/// <summary>#628: takip ettiğim birinden gelen bildirimleri kapat (<c>true</c>) / aç.</summary>
public record MuteRequest(bool Muted);
```
`UsersController` birincil kurucusuna `IFriendRequestService friendRequestService` eklenir. `Unfollow` ucunun altına:
```csharp
    /// <summary>#628: arkadaşlık isteği gönder — zaten arkadaşsa/bekliyorsa no-op; 3 retten sonra 400.</summary>
    [HttpPost("{username}/friend-request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.SendAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: gönderdiğim isteği geri çek — idempotent.</summary>
    [HttpDelete("{username}/friend-request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WithdrawFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.WithdrawAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: bana gelen isteği kabul et — iki taraf karşılıklı takip eder. İstek yoksa 404.</summary>
    [HttpPost("{username}/friend-request/accept")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcceptFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.AcceptAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: bana gelen isteği reddet — takipler değişmez. İstek yoksa 404.</summary>
    [HttpPost("{username}/friend-request/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.RejectAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: arkadaşlıktan çıkar — iki yöndeki takip de silinir. İdempotent.</summary>
    [HttpDelete("{username}/friendship")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFriendship(string username, CancellationToken cancellationToken)
    {
        await followService.RemoveFriendshipAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: bu kişiyi takipçilerimden çıkar. İdempotent.</summary>
    [HttpDelete("{username}/follower")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFollower(string username, CancellationToken cancellationToken)
    {
        await followService.RemoveFollowerAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: takip ettiğim birinden gelen tüm bildirimleri kapat/aç. Takip etmiyorsam 400.</summary>
    [HttpPut("{username}/mute")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetMuted(string username, MuteRequest request, CancellationToken cancellationToken)
    {
        await followService.SetMutedAsync(username, request.Muted, cancellationToken);
        return NoContent();
    }
```

- [ ] **Step 4: Yeşil** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~FollowEndpointsTests"` → PASS.

- [ ] **Step 5: Commit** — `feat: arkadaslik istegi, takipciden cikar ve sessize al uclari (#628)`

---

### Task 5: Bildirimler — `FriendRequest` türü + sessize alma süzgeci

**Files:**
- Modify: `src/Grind.Api/Models/Enums/NotificationKind.cs`, `Models/Projections/NotificationProjections.cs`
- Modify: `src/Grind.Api/Repositories/INotificationRepository.cs`, `NotificationRepository.cs`
- Create: `src/Grind.Api/Services/FriendRequestNotificationSource.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Services/NotificationServiceTests.cs`, `WeeklyGoalNotificationSourceTests.cs`

**Interfaces:**
- Produces:
  - `NotificationKind.FriendRequest`
  - `record FriendRequestEvent(long RequestId, DateTime OccurredAt, UserRef Actor)`
  - `INotificationRepository.GetFriendRequestEventsAsync(long userId, DateTime since, int take, ct)`

- [ ] **Step 1: Failing testler**

`NotificationServiceTests.ServiceFor` kaynak listesine `new FriendRequestNotificationSource(repository)` eklenir. Yeni testler:
```csharp
    // ---- #628: arkadaşlık isteği + sessize alma ----

    [Fact]
    public async Task Bekleyen_istek_bildirimdir_reddedilen_ve_pasif_gonderen_degildir()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (ben, ali, veli) = (users[0], users[1], users[2]);
            context.Add(new FriendRequest { RequesterId = ali.Id, TargetId = ben.Id, CreatedAt = Simdi.AddHours(-1) });
            context.Add(new FriendRequest { RequesterId = veli.Id, TargetId = ben.Id, CreatedAt = Simdi.AddHours(-2), RejectedAt = Simdi });
            await context.SaveChangesAsync();

            var bildirim = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal((NotificationKind.FriendRequest, ali.Username), (bildirim.Kind, bildirim.Actor.Username));

            ali.DeletedAt = Simdi;
            await context.SaveChangesAsync();
            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }

    /// <summary>Sessize aldığım kişiden takip, rekor ve istek bildirimi gelmez (haftalık hedef ayrı dosyada).</summary>
    [Fact]
    public async Task Sessize_alinan_kisiden_hicbir_bildirim_gelmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            var benim = await TakipAsync(context, ben, ali, Simdi.AddHours(-5));
            await TakipAsync(context, ali, ben, Simdi.AddHours(-4));
            var hareket = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddHours(-1), (hareket, 100, 5, RecordType.Weight));
            context.Add(new FriendRequest { RequesterId = ali.Id, TargetId = ben.Id, CreatedAt = Simdi.AddHours(-3) });
            await context.SaveChangesAsync();
            Assert.Equal(3, (await ServiceFor(context, ben).GetAsync()).Count);

            benim.NotificationsMuted = true;
            await context.SaveChangesAsync();

            Assert.Empty(await ServiceFor(context, ben).GetAsync());
        }
    }
```
Not: ikinci testte `ali`'nin bana isteği karşılıklı takip varken durur. Bu, sorgunun ilişkiye bakmadığını gösterir ve süzgeç testi için yeterlidir.

`WeeklyGoalNotificationSourceTests` sonuna:
```csharp
    [Fact]
    public async Task Sessize_alinan_arkadas_icin_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 1);
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-1));
            (await context.Follows.SingleAsync(f => f.FollowerId == ben.Id && f.FolloweeId == arkadas.Id))
                .NotificationsMuted = true;
            await context.SaveChangesAsync();

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }
```

- [ ] **Step 2: Kırmızı** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~NotificationServiceTests|FullyQualifiedName~WeeklyGoalNotificationSourceTests"`

- [ ] **Step 3: Uygulama**

`NotificationKind.cs` sonuna:
```csharp
    /// <summary>Bana gelen, bekleyen arkadaşlık isteği (#628) — kabul/ret edilince kaybolur.</summary>
    FriendRequest
```
`NotificationProjections.cs` sonuna:
```csharp
/// <summary>Bana gelen bekleyen arkadaşlık isteği (#628); <see cref="OccurredAt"/> = <c>CreatedAt</c>.</summary>
public record FriendRequestEvent(long RequestId, DateTime OccurredAt, UserRef Actor);
```
`INotificationRepository`'ye:
```csharp
    /// <summary>#628: bana gelen BEKLEYEN arkadaşlık istekleri, en yeni önce; gönderen pasifse dışarıda.</summary>
    Task<IReadOnlyList<FriendRequestEvent>> GetFriendRequestEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);
```
Arayüzün özet yorumuna şu cümle eklenir: "#628: sessize alınan aktörler (benim → onun takip satırında `NotificationsMuted`) HER sorguda dışarıda kalır."

`NotificationRepository` değişiklikleri:
```csharp
    /// <summary>#628: <paramref name="userId"/>'nin sessize aldığı kişilere giden takip satırları — süzgeç tek yerde.</summary>
    private IQueryable<Follow> Muted(long userId)
        => context.Set<Follow>().Where(m => m.FollowerId == userId && m.NotificationsMuted);
```
- **`GetFollowEventsAsync`:** sorgudan önce `var muted = Muted(userId);` yazılır, `Where`'e `&& !muted.Any(m => m.FolloweeId == f.FollowerId)` eklenir.
- **`GetRecordSessionEventsAsync` ve `GetFriendGoalSessionsAsync`:** `f` benim takip satırım olduğu için ilk `where`'e `&& !f.NotificationsMuted` eklenir.
- **Yeni metot:**
```csharp
    public async Task<IReadOnlyList<FriendRequestEvent>> GetFriendRequestEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
    {
        var muted = Muted(userId);
        return await context.Set<FriendRequest>()
            .Where(r => r.TargetId == userId && r.RejectedAt == null && r.CreatedAt >= since
                        && r.Requester.DeletedAt == null
                        && !muted.Any(m => m.FolloweeId == r.RequesterId))
            .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .Take(take)
            .Select(r => new FriendRequestEvent(
                r.Id, r.CreatedAt, new UserRef(r.Requester.Id, r.Requester.Username, r.Requester.DisplayName)))
            .ToListAsync(cancellationToken);
    }
```
(Yerel değişkene atanan `IQueryable` EF tarafından alt sorgu olarak satır içine alınır; lambda içinde metot çağırmak çevrilemezdi.)

`Services/FriendRequestNotificationSource.cs`:
```csharp
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>#628: "sana arkadaşlık isteği gönderdi" — saklanan bir istek satırından türer; kabul/ret edilince kaybolur.</summary>
public class FriendRequestNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
        => (await repository.GetFriendRequestEventsAsync(userId, since, limit, cancellationToken))
            .Select(e => new NotificationItem(NotificationKind.FriendRequest, e.OccurredAt, e.RequestId, e.Actor, null))
            .ToList();
}
```
`Services/DependencyInjection.cs`'e: `services.AddScoped<INotificationSource, FriendRequestNotificationSource>();`

- [ ] **Step 4: Yeşil** — Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Notification|FullyQualifiedName~WeeklyGoal|FullyQualifiedName~Grind.Tests.Data"` → PASS.

- [ ] **Step 5: Commit** — `feat: arkadaslik istegi bildirimi ve sessize alma suzgeci (#628)`

---

### Task 6: Ortak paket — API tipleri, mutasyonlar, eşlemeler, metinler

**Files:**
- Regenerate: `packages/shared/src/api/schema.d.ts`
- Modify: `packages/shared/src/api/queries.ts`
- Modify: `packages/shared/src/lib/takip.ts`
- Create: `packages/shared/src/lib/takip.test.ts`
- Create: `packages/shared/src/api/arkadaslik.test.ts`
- Modify: `packages/shared/src/i18n/tr.ts`, `en.ts`

**Interfaces:**
- Consumes: Task 4 uçları, Task 5 `FriendRequest` türü
- Produces:
  - `KullaniciProfili`'ye eklenen alanlar: `friendRequest: 'None' | 'Sent' | 'Received'`, `canSendFriendRequest: boolean`, `notificationsMuted: boolean`
  - `Bildirim.kind` birleşimine `'FriendRequest'` eklenir.
  - Mutasyonlar:
    - `useArkadaslikIstegi()` → `mutate({ kullaniciAdi, gonder: boolean })`
    - `useArkadaslikYaniti()` → `mutate({ kullaniciAdi, kabul: boolean })`
    - `useArkadasliktanCikar()` → `mutate({ kullaniciAdi })`
    - `useTakipcidenCikar()` → `mutate({ kullaniciAdi })`
    - `useSessizeAl()` → `mutate({ kullaniciAdi, sessiz: boolean })`
  - `lib/takip.ts`:
    - `type ArkadaslikDurumu = 'ekle' | 'gonderildi' | 'gelen' | 'arkadas' | 'sinirDoldu'`
    - `arkadaslikDurumu(p: Pick<KullaniciProfili,'relation'|'friendRequest'|'canSendFriendRequest'>): ArkadaslikDurumu | null`
    - `takipMenusuAcilir(iliski: TakipIliskisi): boolean`
    - `type ListeSatiriEylemi = 'arkadasliktanCikar' | 'takibiBirak' | 'takipcidenCikar'`
    - `listeSatiriEylemi(liste: TakipListesiTuru, kendiListem: boolean): ListeSatiriEylemi | null`
  - i18n anahtarları (grup `takip`):
    - Düğme etiketleri: `takiptesin`, `arkadasEkle`, `istekGonderildi`, `istegiYanitla`, `arkadassiniz`, `istekGonderilemez`
    - Menü satırları: `arkadasliktanCikar`, `takipcidenCikar`, `sessizeAl`, `sessizdenCikar`
    - Kabul/ret: `kabulEt`, `reddet`
    - Onay metinleri: `arkadasliktanCikarOnay`, `takibiBirakOnay`, `takipcidenCikarOnay`, `istegiGeriCekOnay`
    - Menü erişilebilirlik etiketi: `menuEtiketi`
  - i18n anahtarı (grup `bildirimler`): `arkadaslikIstegi`

- [ ] **Step 1: API'yi çalıştır, tipleri üret**

Run (bir terminalde): `dotnet run --project src/Grind.Api --urls http://localhost:5098`
Run (repo dışından, ör. `C:/Users/eyapa`): Global Constraints'teki `openapi-typescript@7.13.0` komutu.
Beklenen: `schema.d.ts`'te `FriendRequestState`, `MuteRequest` ve `UserProfileResponse.friendRequest` görünür. API'yi durdur.

- [ ] **Step 2: Failing testler**

`packages/shared/src/lib/takip.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { arkadaslikDurumu, listeSatiriEylemi, takipMenusuAcilir } from './takip';

describe('arkadaslikDurumu (#628)', () => {
  test.each([
    [{ relation: 'Self', friendRequest: 'None', canSendFriendRequest: false }, null],
    [{ relation: 'Friends', friendRequest: 'None', canSendFriendRequest: true }, 'arkadas'],
    [{ relation: 'Following', friendRequest: 'Sent', canSendFriendRequest: true }, 'gonderildi'],
    [{ relation: 'FollowedBy', friendRequest: 'Received', canSendFriendRequest: true }, 'gelen'],
    [{ relation: 'None', friendRequest: 'None', canSendFriendRequest: false }, 'sinirDoldu'],
    [{ relation: 'None', friendRequest: 'None', canSendFriendRequest: true }, 'ekle'],
  ] as const)('%o -> %s', (profil, beklenen) => {
    expect(arkadaslikDurumu(profil)).toBe(beklenen);
  });

  // Gelen istek, ret sınırından önce gelir: sınır yalnızca BENİM göndermemi kısıtlar, kabul etmemi değil.
  test('gelen istek ret sinirina takilmaz', () => {
    expect(arkadaslikDurumu({ relation: 'None', friendRequest: 'Received', canSendFriendRequest: false })).toBe('gelen');
  });
});

test('takip menusu yalnizca takip ederken acilir', () => {
  expect(['Self', 'None', 'Following', 'FollowedBy', 'Friends'].filter((i) => takipMenusuAcilir(i as never)))
    .toEqual(['Following', 'Friends']);
});

test('liste satiri eylemi yalnizca kendi listende, listeye gore', () => {
  expect(listeSatiriEylemi('friends', true)).toBe('arkadasliktanCikar');
  expect(listeSatiriEylemi('following', true)).toBe('takibiBirak');
  expect(listeSatiriEylemi('followers', true)).toBe('takipcidenCikar');
  expect(listeSatiriEylemi('followers', false)).toBeNull();
});
```

`packages/shared/src/api/arkadaslik.test.ts` (`oturumSilindiTazele.test.ts` deseni — saf tazeleme yardımcısı test edilir; paylaşılan pakette hook render altyapısı yok):
```ts
import { QueryClient } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { queryKeys, takipSorgulariniTazele } from './queries';

/**
 * #628: takip/arkadaşlık değişince profil, listeler, arama, arkadaş verisi ve bildirimler eskir. Kabul/ret
 * bu yardımcıyı `onSettled`'da çağırır (Review Focus 5): istek bu arada geri çekildiyse (404) bildirim
 * satırı yine listeden düşer.
 */
test('takip sorgulari tazelenince bildirimler ve profil de eskir', () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  takipSorgulariniTazele(client);

  for (const queryKey of [
    queryKeys.kullaniciProfiliAll, queryKeys.takipListesiAll, queryKeys.kullaniciAramaAll,
    queryKeys.arkadasAll, queryKeys.bildirimlerAll,
  ]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
  }
});
```

- [ ] **Step 3: Kırmızı** — Run: `npm run test --workspace @grind/shared -- takip arkadaslik`

- [ ] **Step 4: `lib/takip.ts`** (dosyanın sonuna; üstteki import satırı `import type { KullaniciProfili, TakipIliskisi, TakipListesiTuru } from '../api/queries';` olur):
```ts
/** Sağdaki arkadaşlık düğmesinin hali (#628). Kendin için `null`. */
export type ArkadaslikDurumu = 'ekle' | 'gonderildi' | 'gelen' | 'arkadas' | 'sinirDoldu';

export function arkadaslikDurumu(
  profil: Pick<KullaniciProfili, 'relation' | 'friendRequest' | 'canSendFriendRequest'>,
): ArkadaslikDurumu | null {
  if (profil.relation === 'Self') return null;
  if (profil.relation === 'Friends') return 'arkadas';
  if (profil.friendRequest === 'Sent') return 'gonderildi';
  if (profil.friendRequest === 'Received') return 'gelen';
  return profil.canSendFriendRequest ? 'ekle' : 'sinirDoldu';
}

/** "Takiptesin ⌄": yalnızca takip ederken sol düğme kişi menüsünü açar (#628). */
export function takipMenusuAcilir(iliski: TakipIliskisi): boolean {
  return iliski === 'Following' || iliski === 'Friends';
}

export type ListeSatiriEylemi = 'arkadasliktanCikar' | 'takibiBirak' | 'takipcidenCikar';

const LISTE_EYLEMI = {
  friends: 'arkadasliktanCikar',
  following: 'takibiBirak',
  followers: 'takipcidenCikar',
} as const satisfies Record<TakipListesiTuru, ListeSatiriEylemi>;

/** Kendi takip listemde satırın sağındaki eylem (#628); başkasının listesinde bugünkü takip düğmesi kalır. */
export function listeSatiriEylemi(liste: TakipListesiTuru, kendiListem: boolean): ListeSatiriEylemi | null {
  return kendiListem ? LISTE_EYLEMI[liste] : null;
}
```
`takipDugmesi` doc yorumu da güncellenir: "Takip ediyorsan (#628) mobil sol düğme `takipMenusuAcilir` ile 'Takiptesin ⌄' çizer; bu eşleme web ve başkasının listesi için kalır."

- [ ] **Step 5: `api/queries.ts`**

- **`KullaniciProfili`**'ye alanlar eklenir:
```ts
  /** #628: bekleyen arkadaşlık isteğinin yönü (bakanın gözünden). */
  friendRequest: 'None' | 'Sent' | 'Received';
  /** #628: false = 3 ret sınırına ulaşıldı. */
  canSendFriendRequest: boolean;
  /** #628: bu kişiden gelen bildirimler kapalı mı. */
  notificationsMuted: boolean;
```
- **`dogrulanmisKullaniciProfili`:**
  - Koşula `|| !yanit.friendRequest || yanit.canSendFriendRequest === undefined || yanit.notificationsMuted === undefined` eklenir.
  - Dönüşe `friendRequest: yanit.friendRequest, canSendFriendRequest: yanit.canSendFriendRequest, notificationsMuted: yanit.notificationsMuted` eklenir.
- **`Bildirim.kind`:** `'Follow' | 'Records' | 'WeeklyGoal' | 'FriendRequest'`.
- **Mutasyonlar** (`useTakipEt`'in altına). Önce tazeleme ortak bir yardımcıya çıkarılır ve `useTakipEt` de onu kullanır (DRY):
```ts
/** Takip/arkadaşlık değişince eskiyen her şey (#284, #628) -- tek liste. */
export function takipSorgulariniTazele(queryClient: QueryClient) {
  for (const queryKey of [
    queryKeys.kullaniciProfiliAll,
    queryKeys.takipListesiAll,
    queryKeys.kullaniciAramaAll,
    queryKeys.arkadasAll,
    queryKeys.bildirimlerAll,
  ]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
```
(`useTakipEt.onSuccess` → `() => takipSorgulariniTazele(queryClient)`. `QueryClient` tipi `@tanstack/react-query`'den import edilir; zaten import edilmiyorsa ekle.)
```ts
/** #628: arkadaşlık isteği gönder (`gonder: true`) ya da geri çek. */
export function useArkadaslikIstegi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kullaniciAdi, gonder }: { kullaniciAdi: string; gonder: boolean }): Promise<void> => {
      await request<void>(kullaniciYolu(kullaniciAdi, 'friend-request'), { method: gonder ? 'POST' : 'DELETE' });
    },
    onSuccess: () => takipSorgulariniTazele(queryClient),
  });
}

/**
 * #628: bana gelen isteği kabul et / reddet. HATADA da tazelenir: istek bu arada geri çekildiyse (404)
 * bildirim satırı listeden düşmeli, ekran eski satırda kalmamalı.
 */
export function useArkadaslikYaniti() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kullaniciAdi, kabul }: { kullaniciAdi: string; kabul: boolean }): Promise<void> => {
      await request<void>(kullaniciYolu(kullaniciAdi, `friend-request/${kabul ? 'accept' : 'reject'}`), { method: 'POST' });
    },
    onSettled: () => takipSorgulariniTazele(queryClient),
  });
}

/** #628: arkadaşlıktan çıkar — iki yöndeki takip de silinir. */
export function useArkadasliktanCikar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kullaniciAdi }: { kullaniciAdi: string }): Promise<void> => {
      await request<void>(kullaniciYolu(kullaniciAdi, 'friendship'), { method: 'DELETE' });
    },
    onSuccess: () => takipSorgulariniTazele(queryClient),
  });
}

/** #628: bu kişiyi takipçilerimden çıkar. */
export function useTakipcidenCikar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kullaniciAdi }: { kullaniciAdi: string }): Promise<void> => {
      await request<void>(kullaniciYolu(kullaniciAdi, 'follower'), { method: 'DELETE' });
    },
    onSuccess: () => takipSorgulariniTazele(queryClient),
  });
}

/** #628: takip ettiğim birinden gelen tüm bildirimleri kapat/aç. */
export function useSessizeAl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kullaniciAdi, sessiz }: { kullaniciAdi: string; sessiz: boolean }): Promise<void> => {
      await request<void>(kullaniciYolu(kullaniciAdi, 'mute'), { method: 'PUT', body: { muted: sessiz } });
    },
    onSuccess: () => takipSorgulariniTazele(queryClient),
  });
}
```
`request`'in gövde parametresinin adını mevcut bir `PUT` çağrısından teyit et (ör. `grep -n "method: 'PUT'" packages/shared/src/api/queries.ts`). Ad farklıysa (`json`/`body`) ona uy.

- [ ] **Step 6: i18n**

`tr.ts` → `takip` grubuna:
```ts
    takiptesin: 'Takiptesin',
    arkadasEkle: 'Arkadaş ekle',
    istekGonderildi: 'İstek gönderildi',
    istegiYanitla: 'İsteği yanıtla',
    arkadassiniz: 'Arkadaşsınız',
    istekGonderilemez: 'İstek gönderilemez',
    arkadasliktanCikar: 'Arkadaşlıktan çıkar',
    takipcidenCikar: 'Takipçiden çıkar',
    sessizeAl: 'Sessize al',
    sessizdenCikar: 'Sessizden çıkar',
    kabulEt: 'Kabul et',
    reddet: 'Reddet',
    arkadasliktanCikarOnay: '{{ad}} ile arkadaşlığınız biter; ikiniz de birbirinizi takipten çıkarsınız.',
    takibiBirakOnay: '{{ad}} artık takip edilmeyecek.',
    takipcidenCikarOnay: '{{ad}} seni artık takip etmeyecek. Ona bildirim gitmez.',
    istegiGeriCekOnay: '{{ad}} kişisine gönderdiğin arkadaşlık isteği geri çekilsin mi?',
    menuEtiketi: '{{ad}} için seçenekler',
```
`bildirimler` grubuna: `arkadaslikIstegi: '{{ad}} sana arkadaşlık isteği gönderdi',`

`en.ts` → aynı anahtarlar:
```ts
    takiptesin: 'Following',
    arkadasEkle: 'Add friend',
    istekGonderildi: 'Request sent',
    istegiYanitla: 'Respond',
    arkadassiniz: 'Friends',
    istekGonderilemez: "Can't send request",
    arkadasliktanCikar: 'Remove friend',
    takipcidenCikar: 'Remove follower',
    sessizeAl: 'Mute',
    sessizdenCikar: 'Unmute',
    kabulEt: 'Accept',
    reddet: 'Decline',
    arkadasliktanCikarOnay: 'You and {{ad}} will no longer be friends; you will both unfollow each other.',
    takibiBirakOnay: "You'll stop following {{ad}}.",
    takipcidenCikarOnay: "{{ad}} will no longer follow you. They won't be notified.",
    istegiGeriCekOnay: 'Cancel your friend request to {{ad}}?',
    menuEtiketi: 'Options for {{ad}}',
```
`bildirimler.arkadaslikIstegi: '{{ad}} sent you a friend request',`

- [ ] **Step 7: Yeşil**

Run: `npm run test --workspace @grind/shared` ve `npm run typecheck --workspace @grind/shared`
Expected: PASS (`katalog.test.ts` dahil).

- [ ] **Step 8: Commit** — `feat: arkadaslik istegi sorgulari, eslemeleri ve metinleri (#628)`

---

### Task 7: Mobil — profilde iki düğme, `ArkadaslikDugmesi`, `KisiMenusu`

**Files:**
- Create: `mobile/src/ui/onayIste.ts`
- Create: `mobile/src/components/ArkadaslikDugmesi.tsx` + `.test.tsx`
- Create: `mobile/src/components/KisiMenusu.tsx` + `.test.tsx`
- Modify: `mobile/src/components/TakipDugmesi.tsx` (+ test)
- Modify: `mobile/app/(tabs)/profile/u/[username]/_layout.tsx`

**Interfaces:**
- Consumes: Task 6 mutasyonları ve eşlemeleri, `useCevrimiciEylem`, `Modal` (`cam`), `ProfilFotografi`.
- Produces:
  - `onayIste({ mesaj, eylemEtiketi, onEvet })` (RN `Alert.alert`; iptal + yıkıcı düğme)
  - `<ArkadaslikDugmesi profil={KullaniciProfili} />`
  - `<KisiMenusu profil={KullaniciProfili} acik onKapat />`
  - `TakipDugmesi`'ne opsiyonel `onMenu?: () => void` prop'u: verildiyse ve `takipMenusuAcilir(iliski)` doğruysa düğme "Takiptesin ⌄" olur ve `onMenu`'yü çağırır.

- [ ] **Step 1: Failing testler**

`mobile/src/components/ArkadaslikDugmesi.test.tsx`:
```tsx
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ArkadaslikDugmesi from './ArkadaslikDugmesi';

const istek = jest.fn();
const yanit = jest.fn();
const cikar = jest.fn();
jest.mock('@grind/shared/api/queries', () => ({
  useArkadaslikIstegi: () => ({ mutate: istek, isPending: false, isError: false }),
  useArkadaslikYaniti: () => ({ mutate: yanit, isPending: false, isError: false }),
  useArkadasliktanCikar: () => ({ mutate: cikar, isPending: false, isError: false }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));

const temel = {
  username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, age: null,
  friendCount: 0, followerCount: 0, followingCount: 0, privacyLevel: 'Kisitli', notificationsMuted: false,
} as const;

beforeEach(() => jest.clearAllMocks());

test('ekle halinde istek gonderir', async () => {
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'None', friendRequest: 'None', canSendFriendRequest: true }} />);
  fireEvent.press(screen.getByRole('button', { name: 'Arkadaş ekle' }));
  expect(istek).toHaveBeenCalledWith({ kullaniciAdi: 'ali', gonder: true });
});

test('arkadas halinde onaydan sonra arkadasliktan cikarir', async () => {
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'Friends', friendRequest: 'None', canSendFriendRequest: true }} />);
  fireEvent.press(screen.getByRole('button', { name: 'Arkadaşsınız' }));
  expect(uyari).toHaveBeenCalled();
  expect(cikar).toHaveBeenCalledWith({ kullaniciAdi: 'ali' });
});

test('gelen istekte kabul secenegi kabul eder', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.find((d) => d.text === 'Kabul et')?.onPress?.());
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'FollowedBy', friendRequest: 'Received', canSendFriendRequest: true }} />);
  fireEvent.press(screen.getByRole('button', { name: 'İsteği yanıtla' }));
  expect(yanit).toHaveBeenCalledWith({ kullaniciAdi: 'ali', kabul: true });
});

test('sinir dolunca dugme pasif', async () => {
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'None', friendRequest: 'None', canSendFriendRequest: false }} />);
  expect(screen.getByRole('button', { name: 'İstek gönderilemez' })).toBeDisabled();
});
```

`mobile/src/components/KisiMenusu.test.tsx`:
```tsx
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import KisiMenusu from './KisiMenusu';

const istek = jest.fn();
const sessiz = jest.fn();
const takip = jest.fn();
const cikar = jest.fn();
jest.mock('@grind/shared/api/queries', () => ({
  useArkadaslikIstegi: () => ({ mutate: istek, isPending: false, isError: false }),
  useSessizeAl: () => ({ mutate: sessiz, isPending: false, isError: false }),
  useTakipEt: () => ({ mutate: takip, isPending: false, isError: false }),
  useArkadasliktanCikar: () => ({ mutate: cikar, isPending: false, isError: false }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));
jest.mock('./ProfilFotografi', () => () => null);

const profil = {
  username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, age: null,
  friendCount: 0, followerCount: 0, followingCount: 0, privacyLevel: 'Kisitli',
  relation: 'Following', friendRequest: 'None', canSendFriendRequest: true, notificationsMuted: false,
} as const;

beforeEach(() => jest.clearAllMocks());

test('satirlar sirayla: arkadaslik, sessize al, takibi birak', async () => {
  await render(<KisiMenusu profil={profil} acik onKapat={jest.fn()} />);
  expect(screen.getAllByRole('button').map((d) => d.props.accessibilityLabel).filter(Boolean)).toEqual(
    expect.arrayContaining(['Arkadaş ekle', 'Sessize al', 'Takibi bırak']),
  );
});

test('sessize al dogrudan calisir ve menuyu kapatir', async () => {
  const kapat = jest.fn();
  await render(<KisiMenusu profil={profil} acik onKapat={kapat} />);
  fireEvent.press(screen.getByRole('button', { name: 'Sessize al' }));
  expect(sessiz).toHaveBeenCalledWith({ kullaniciAdi: 'ali', sessiz: true }, expect.anything());
});

test('takibi birak onay ister', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<KisiMenusu profil={profil} acik onKapat={jest.fn()} />);
  fireEvent.press(screen.getByRole('button', { name: 'Takibi bırak' }));
  expect(takip).toHaveBeenCalledWith({ kullaniciAdi: 'ali', takipEt: false }, expect.anything());
});
```
`TakipDugmesi.test.tsx`'e:
```tsx
test('menu verilince takip ederken Takiptesin cizer ve menuyu acar', async () => {
  const menu = jest.fn();
  await render(<TakipDugmesi kullaniciAdi="ali" iliski="Following" onMenu={menu} />);
  fireEvent.press(screen.getByRole('button', { name: 'Takiptesin' }));
  expect(menu).toHaveBeenCalled();
});
```
(`fireEvent`'i import satırına ekle.)

- [ ] **Step 2: Kırmızı** — Run: `npm run test --workspace mobile -- ArkadaslikDugmesi KisiMenusu TakipDugmesi`

- [ ] **Step 3: `onayIste`**

`mobile/src/ui/onayIste.ts`:
```ts
import { Alert } from 'react-native';
import i18n from 'i18next';

/**
 * Yıkıcı bir takip/arkadaşlık eylemi öncesi yerel onay (#628). Düğme sırası sabit: [Vazgeç, eylem] —
 * testler ikinci düğmeyi eylem sayar.
 */
export function onayIste({ mesaj, eylemEtiketi, onEvet }: { mesaj: string; eylemEtiketi: string; onEvet: () => void }) {
  Alert.alert(eylemEtiketi, mesaj, [
    { text: i18n.t('ortak.vazgec'), style: 'cancel' },
    { text: eylemEtiketi, style: 'destructive', onPress: onEvet },
  ]);
}
```
(Projede i18n örneği `i18next`'ten mi yoksa `mobile/src/i18n`'den mi içe aktarılıyor, `grep -rn "from 'i18next'" mobile/src | head -3` ile kontrol et ve ona uy.)

- [ ] **Step 4: `ArkadaslikDugmesi`**

```tsx
import { Alert, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useArkadaslikIstegi, useArkadaslikYaniti, useArkadasliktanCikar, type KullaniciProfili,
} from '@grind/shared/api/queries';
import { arkadaslikDurumu, type ArkadaslikDurumu } from '@grind/shared/lib/takip';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import { onayIste } from '../ui/onayIste';
import CamDolgu from '../ui/CamDolgu';

const ETIKET = {
  ekle: 'takip.arkadasEkle',
  gonderildi: 'takip.istekGonderildi',
  gelen: 'takip.istegiYanitla',
  arkadas: 'takip.arkadassiniz',
  sinirDoldu: 'takip.istekGonderilemez',
} as const satisfies Record<ArkadaslikDurumu, string>;

/**
 * Profilde sağdaki düğme (#628) — Instagram'daki "Mesaj Gönder"in yeri. Arkadaş ekle birincil (accent),
 * diğer haller hafif dolgu (TakipDugmesi'nin ikincil dili).
 */
export default function ArkadaslikDugmesi({ profil }: { profil: KullaniciProfili }) {
  const { t } = useTranslation();
  const cevrimici = useCevrimiciEylem();
  const istek = useArkadaslikIstegi();
  const yanit = useArkadaslikYaniti();
  const cikar = useArkadasliktanCikar();
  const durum = arkadaslikDurumu(profil);
  if (!durum) return null;

  const kullaniciAdi = profil.username;
  const ad = profil.displayName ?? profil.username;
  const bekliyor = istek.isPending || yanit.isPending || cikar.isPending;
  const hata = istek.isError || yanit.isError || cikar.isError;

  const bas = cevrimici(() => {
    switch (durum) {
      case 'ekle':
        istek.mutate({ kullaniciAdi, gonder: true });
        return;
      case 'gonderildi':
        onayIste({ mesaj: t('takip.istegiGeriCekOnay', { ad }), eylemEtiketi: t('takip.istekGonderildi'),
          onEvet: () => istek.mutate({ kullaniciAdi, gonder: false }) });
        return;
      case 'gelen':
        Alert.alert(t('takip.istegiYanitla'), undefined, [
          { text: t('ortak.vazgec'), style: 'cancel' },
          { text: t('takip.reddet'), style: 'destructive', onPress: () => yanit.mutate({ kullaniciAdi, kabul: false }) },
          { text: t('takip.kabulEt'), onPress: () => yanit.mutate({ kullaniciAdi, kabul: true }) },
        ]);
        return;
      case 'arkadas':
        onayIste({ mesaj: t('takip.arkadasliktanCikarOnay', { ad }), eylemEtiketi: t('takip.arkadasliktanCikar'),
          onEvet: () => cikar.mutate({ kullaniciAdi }) });
        return;
      case 'sinirDoldu':
        return;
    }
  });

  const birincil = durum === 'ekle';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(ETIKET[durum])}
        disabled={bekliyor || durum === 'sinirDoldu'}
        onPress={bas}
        className={`h-10 flex-1 items-center justify-center rounded-xl px-3 ${birincil ? 'bg-accent' : 'bg-transparent'} ${
          bekliyor || durum === 'sinirDoldu' ? 'opacity-60' : ''
        }`}
      >
        {!birincil && <CamDolgu opaklik={0.1} yaricap={12} />}
        <Text className={`text-label ${birincil ? 'font-bold text-on-accent' : 'text-fg'}`}>{t(ETIKET[durum])}</Text>
      </Pressable>
      {hata && (
        <Text accessibilityRole="alert" className="text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </Text>
      )}
    </>
  );
}
```
Not: `onayIste` `[Vazgeç, eylem]` sırasıyla çağrılır. Testteki `dugmeler?.[1]` eylem düğmesidir. "gelen" halinde test düğmeyi metinle (`'Kabul et'`) bulur.

- [ ] **Step 5: `TakipDugmesi` — `onMenu`**

Prop listesine `onMenu?: () => void` eklenir ve `takipMenusuAcilir` import edilir (`@grind/shared/lib/takip`). `if (!dugme) return null;` satırından sonra:
```tsx
  // #628: takip ediyorsan ve menü veriliyse doğrudan bırakmak yerine "Takiptesin ⌄" kişi menüsünü açar.
  if (onMenu && takipMenusuAcilir(iliski)) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('takip.takiptesin')}
        onPress={onMenu}
        className={`flex-row items-center justify-center gap-1 rounded-xl ${BOYUT[boyut]} bg-transparent`}
      >
        <CamDolgu opaklik={0.1} yaricap={12} />
        <Text className="text-label text-fg">{t('takip.takiptesin')}</Text>
        <ChevronDown color={ikonRenk.fg} size={16} />
      </Pressable>
    );
  }
```
(`ChevronDown` lucide'den, `ikonRenk` için `const ikonRenk = useIkonRenk();` hook'u bileşenin başında, erken `return`'lerden ÖNCE çağrılır — hook sırası kuralı.)

- [ ] **Step 6: `KisiMenusu`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, UserMinus, UserPlus, UserX } from 'lucide-react-native';
import {
  useArkadaslikIstegi, useArkadasliktanCikar, useSessizeAl, useTakipEt, type KullaniciProfili,
} from '@grind/shared/api/queries';
import { arkadaslikDurumu } from '@grind/shared/lib/takip';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import Modal from '../ui/Modal';
import { onayIste } from '../ui/onayIste';
import { useIkonRenk } from '../ui/renkler';
import ProfilFotografi from './ProfilFotografi';

interface Satir {
  etiket: string;
  ikon: typeof Bell;
  tehlikeli?: boolean;
  onPress: () => void;
}

/**
 * "Takiptesin ⌄" menüsü (#628): Instagram'daki kişi menüsünün sadeleşmiş hali — cam pencere, üstte fotoğraf
 * ve ad, altında arkadaşlık · sessize al · takibi bırak. Yıkıcı satırlar onay ister. Kısıtla ayrı dilimde.
 */
export default function KisiMenusu({ profil, acik, onKapat }: { profil: KullaniciProfili; acik: boolean; onKapat: () => void }) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const cevrimici = useCevrimiciEylem();
  const istek = useArkadaslikIstegi();
  const cikar = useArkadasliktanCikar();
  const sessiz = useSessizeAl();
  const takip = useTakipEt();
  const kullaniciAdi = profil.username;
  const ad = profil.displayName ?? profil.username;
  const kapatinca = { onSuccess: onKapat };

  const arkadaslik = arkadaslikDurumu(profil);
  const arkadaslikSatiri: Satir | null =
    arkadaslik === 'arkadas'
      ? { etiket: t('takip.arkadasliktanCikar'), ikon: UserMinus, tehlikeli: true,
          onPress: () => onayIste({ mesaj: t('takip.arkadasliktanCikarOnay', { ad }), eylemEtiketi: t('takip.arkadasliktanCikar'),
            onEvet: () => cikar.mutate({ kullaniciAdi }, kapatinca) }) }
      : arkadaslik === 'gonderildi'
        ? { etiket: t('takip.istekGonderildi'), ikon: UserPlus,
            onPress: () => onayIste({ mesaj: t('takip.istegiGeriCekOnay', { ad }), eylemEtiketi: t('takip.istekGonderildi'),
              onEvet: () => istek.mutate({ kullaniciAdi, gonder: false }, kapatinca) }) }
        : arkadaslik === 'ekle'
          ? { etiket: t('takip.arkadasEkle'), ikon: UserPlus, onPress: () => istek.mutate({ kullaniciAdi, gonder: true }, kapatinca) }
          : null; // 'gelen' sağ düğmeden yanıtlanır; 'sinirDoldu' satır göstermez.

  const satirlar: Satir[] = [
    ...(arkadaslikSatiri ? [arkadaslikSatiri] : []),
    profil.notificationsMuted
      ? { etiket: t('takip.sessizdenCikar'), ikon: Bell, onPress: () => sessiz.mutate({ kullaniciAdi, sessiz: false }, kapatinca) }
      : { etiket: t('takip.sessizeAl'), ikon: BellOff, onPress: () => sessiz.mutate({ kullaniciAdi, sessiz: true }, kapatinca) },
    { etiket: t('takip.takibiBirak'), ikon: UserX, tehlikeli: true,
      onPress: () => onayIste({ mesaj: t('takip.takibiBirakOnay', { ad }), eylemEtiketi: t('takip.takibiBirak'),
        onEvet: () => takip.mutate({ kullaniciAdi, takipEt: false }, kapatinca) }) },
  ];
  const hata = istek.isError || cikar.isError || sessiz.isError || takip.isError;

  return (
    <Modal acik={acik} onKapat={onKapat} baslik={t('takip.menuEtiketi', { ad })} cam>
      <View className="items-center gap-2 pb-2">
        <ProfilFotografi profil={profil} boyut="orta" />
        <Text className="text-label text-fg">{profil.username}</Text>
      </View>
      <View className="flex-col">
        {satirlar.map((s, i) => (
          <View key={s.etiket}>
            {i > 0 && <View className="mx-3 h-px bg-surface-4" />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s.etiket}
              onPress={cevrimici(s.onPress)}
              className="h-13 flex-row items-center justify-between rounded-xl px-3"
            >
              <Text className={`text-body-lg ${s.tehlikeli ? 'text-danger' : 'text-fg'}`}>{s.etiket}</Text>
              <s.ikon color={s.tehlikeli ? ikonRenk.danger : ikonRenk.fg} size={20} />
            </Pressable>
          </View>
        ))}
      </View>
      {hata && (
        <Text accessibilityRole="alert" className="px-3 pt-2 text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </Text>
      )}
    </Modal>
  );
}
```
`Modal`'ın başlığı görsel olarak kullanıcı adını tekrar ediyorsa, `Modal`'ın `baslik` prop'unun nasıl çizildiğine bak (`mobile/src/ui/Modal.tsx`). Başlık zaten kapat düğmesiyle birlikte üst satırda çiziliyorsa `ProfilFotografi` altındaki tekrar eden `Text`'i kaldır.

Ayırıcı: `CLAUDE.md` Karar 9'a göre cam içindeki satırlar saç teli ayırıcıyla ayrılır (#615). Projede `CamAyirici` bileşeni var; `View className="mx-3 h-px bg-surface-4"` yerine onu kullan (`mobile/src/ui/CamAyirici.tsx`'e bakıp prop'larına uy).

- [ ] **Step 7: Profil düzeni**

`u/[username]/_layout.tsx` → `BaskasininBasligi`:
```tsx
  const [menuAcik, setMenuAcik] = useState(false);
  ...
      <ProfilBasligi kisi={profil.data} sayaclar={profil.data}>
        <TakipDugmesi kullaniciAdi={profil.data.username} iliski={profil.data.relation} onMenu={() => setMenuAcik(true)} />
        <ArkadaslikDugmesi profil={profil.data} />
      </ProfilBasligi>
      <KisiMenusu profil={profil.data} acik={menuAcik} onKapat={() => setMenuAcik(false)} />
```
`adYani` (Arkadaş rozeti) kaldırılır. Kullanılmayan `Rozet` importu ve `arkadas` değişkeni de silinir. `useState` hook'u erken `return`'lerden ÖNCE çağrılır. `useState`'i `react`'tan içe aktar.

- [ ] **Step 8: Yeşil**

Run: `npm run test --workspace mobile -- ArkadaslikDugmesi KisiMenusu TakipDugmesi cevrilmemisMetin` ve `npm run typecheck --workspace mobile` → PASS.

- [ ] **Step 9: Commit** — `feat: profilde Takiptesin menusu ve arkadaslik dugmesi (#628)`

---

### Task 8: Mobil — kendi takip listelerimde satır eylemi

**Files:**
- Modify: `mobile/src/components/KullaniciSatiri.tsx` (+ `KullaniciSatiri.test.tsx`)
- Modify: `mobile/src/components/TakipListesi.tsx`

**Interfaces:**
- Consumes: `listeSatiriEylemi` (Task 6), `useArkadasliktanCikar`, `useTakipcidenCikar`, `useTakipEt`, `onayIste` (Task 7), `useAuth`
- Produces: `KullaniciSatiri`'ye opsiyonel prop `eylem?: ListeSatiriEylemi | null`

- [ ] **Step 1: Failing test** (`KullaniciSatiri.test.tsx`'teki mevcut mock'a `useArkadasliktanCikar`, `useTakipcidenCikar` eklenir; mutate'ler `jest.fn()`):
```tsx
test.each([
  ['arkadasliktanCikar', 'Arkadaşlıktan çıkar'],
  ['takibiBirak', 'Takibi bırak'],
  ['takipcidenCikar', 'Takipçiden çıkar'],
] as const)('kendi listemde %s onaydan sonra calisir', async (eylem, etiket) => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<KullaniciSatiri kisi={{ ...kisi, relation: 'Friends' }} eylem={eylem} />);
  fireEvent.press(screen.getByRole('button', { name: etiket }));
  expect(mutasyonlar[eylem]).toHaveBeenCalled();
});
```
Burada `mutasyonlar` şöyle tanımlanır: `{ arkadasliktanCikar: cikarMock, takibiBirak: takipMock, takipcidenCikar: takipciMock }`. Mock adları dosyadaki mevcut düzene göre seçilir, `kisi` de dosyadaki mevcut fixture'dır. `takibiBirak` için beklenen çağrı `({ kullaniciAdi, takipEt: false })`'tır; `toHaveBeenCalled` yeterlidir.

- [ ] **Step 2: Kırmızı** — Run: `npm run test --workspace mobile -- KullaniciSatiri`

- [ ] **Step 3: Uygulama**

`KullaniciSatiri`:
```tsx
const EYLEM_METNI = {
  arkadasliktanCikar: { etiket: 'takip.arkadasliktanCikar', onay: 'takip.arkadasliktanCikarOnay' },
  takibiBirak: { etiket: 'takip.takibiBirak', onay: 'takip.takibiBirakOnay' },
  takipcidenCikar: { etiket: 'takip.takipcidenCikar', onay: 'takip.takipcidenCikarOnay' },
} as const satisfies Record<ListeSatiriEylemi, { etiket: string; onay: string }>;
```
Bileşen gövdesi:
```tsx
export default function KullaniciSatiri({ kisi, eylem = null }: { kisi: KullaniciOzeti; eylem?: ListeSatiriEylemi | null }) {
  ...
  const cevrimici = useCevrimiciEylem();
  const cikar = useArkadasliktanCikar();
  const takipci = useTakipcidenCikar();
  const takip = useTakipEt();
  const ad = kisi.displayName ?? kisi.username;
  const calistir = (e: ListeSatiriEylemi) =>
    e === 'arkadasliktanCikar' ? cikar.mutate({ kullaniciAdi: kisi.username })
      : e === 'takipcidenCikar' ? takipci.mutate({ kullaniciAdi: kisi.username })
        : takip.mutate({ kullaniciAdi: kisi.username, takipEt: false });
```
Sağ uç:
```tsx
      {eylem ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(EYLEM_METNI[eylem].etiket)}
          onPress={cevrimici(() => onayIste({
            mesaj: t(EYLEM_METNI[eylem].onay, { ad }),
            eylemEtiketi: t(EYLEM_METNI[eylem].etiket),
            onEvet: () => calistir(eylem),
          }))}
          className="h-9 items-center justify-center rounded-xl px-3"
        >
          <CamDolgu opaklik={0.1} yaricap={12} />
          <Text className="text-label text-fg">{t(EYLEM_METNI[eylem].etiket)}</Text>
        </Pressable>
      ) : kisi.relation === 'Friends' ? (
        <Rozet ton="acik">{t('takip.arkadas')}</Rozet>
      ) : (
        <TakipDugmesi kullaniciAdi={kisi.username} iliski={kisi.relation} boyut="kucuk" />
      )}
```
Bileşenin doc yorumu da güncellenir: "#628: kendi listende (`eylem`) satırın sağında listeye göre bir eylem durur, onay ister."

`TakipListesi`:
```tsx
  const { username: ben } = useAuth();
  const kendiListem = ben !== null && ad.toLowerCase() === ben.toLowerCase();
  const eylem = listeSatiriEylemi(liste, kendiListem);
  ...
      renderItem={({ item }) => <KullaniciSatiri kisi={item} eylem={eylem} />}
```
(`useAuth` yolu: `../auth/AuthContext`.)

- [ ] **Step 4: Yeşil** — Run: `npm run test --workspace mobile -- KullaniciSatiri cevrilmemisMetin` ve `npm run typecheck --workspace mobile`

- [ ] **Step 5: Commit** — `feat: kendi takip listelerinde satir eylemleri (#628)`

---

### Task 9: Mobil — bildirimde Kabul et / Reddet

**Files:**
- Modify: `mobile/src/components/BildirimSatiri.tsx` (+ `BildirimSatiri.test.tsx`)

**Interfaces:**
- Consumes: `useArkadaslikYaniti` (Task 6), `Bildirim.kind === 'FriendRequest'`

- [ ] **Step 1: Failing test** (mevcut mock'a `useArkadaslikYaniti: () => ({ mutate: yanit, isPending: false, isError: false })` eklenir; fixture dosyadakidir):
```tsx
test('arkadaslik isteginde kabul ve reddet dugmeleri yaniti gonderir', async () => {
  await render(<BildirimSatiri bildirim={{ ...bildirim, kind: 'FriendRequest', records: [] }} />);
  expect(screen.getByText(/sana arkadaşlık isteği gönderdi/)).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));
  expect(yanit).toHaveBeenCalledWith({ kullaniciAdi: bildirim.actor.username, kabul: true });

  fireEvent.press(screen.getByRole('button', { name: 'Reddet' }));
  expect(yanit).toHaveBeenCalledWith({ kullaniciAdi: bildirim.actor.username, kabul: false });
});
```

- [ ] **Step 2: Kırmızı** — Run: `npm run test --workspace mobile -- BildirimSatiri`

- [ ] **Step 3: Uygulama**

Metin bloğuna:
```tsx
          {bildirim.kind === 'FriendRequest' && t('bildirimler.arkadaslikIstegi', { ad })}
```
Tarih satırından ÖNCE:
```tsx
        {bildirim.kind === 'FriendRequest' && (
          <View className="flex-row gap-2 pt-1">
            <Pressable
              accessibilityRole="button"
              disabled={yanit.isPending}
              onPress={cevrimici(() => yanit.mutate({ kullaniciAdi: kisi.username, kabul: true }))}
              className="h-9 flex-1 items-center justify-center rounded-xl bg-accent"
            >
              <Text className="text-label font-bold text-on-accent">{t('takip.kabulEt')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={yanit.isPending}
              onPress={cevrimici(() => yanit.mutate({ kullaniciAdi: kisi.username, kabul: false }))}
              className="h-9 flex-1 items-center justify-center rounded-xl"
            >
              <CamDolgu opaklik={0.1} yaricap={12} />
              <Text className="text-label text-fg">{t('takip.reddet')}</Text>
            </Pressable>
          </View>
        )}
```
Bileşenin başına `const yanit = useArkadaslikYaniti();` ve `const cevrimici = useCevrimiciEylem();` eklenir. Testte `useCevrimiciEylem` dosyadaki diğer testlerle aynı biçimde mock'lanır (`jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }))`). İç `Pressable`'lar satırın `onPress`'ini tetiklememeli; RN'de iç `Pressable` dokunmayı yuttuğu için ek bir şey gerekmez. Doc yorumuna "#628: arkadaşlık isteği satır içinde Kabul et / Reddet ile yanıtlanır." eklenir.

- [ ] **Step 4: Yeşil** — Run: `npm run test --workspace mobile -- BildirimSatiri cevrilmemisMetin`

- [ ] **Step 5: Commit** — `feat: bildirimde arkadaslik istegini kabul et / reddet (#628)`

---

### Task 10: Belgeler + tam doğrulama

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md**

1. **Kapsam ve Sıra** listesine (Çevrimdışı maddesinin altına):
```markdown
- **Kişi menüsü + arkadaşlık isteği (#628, 2026-10-03)** — yalnızca mobil: başkasının profilinde Instagram
  düzeni — solda "Takiptesin ⌄" (kişi menüsü: arkadaşlık · Sessize al · Takibi bırak), sağda arkadaşlık
  düğmesi. Arkadaşlık hâlâ karşılıklı takiptir; **arkadaşlık isteği** kabul edilince eksik takip satırları
  açılır (iki taraf arkadaş olur), ret takipleri değiştirmez, aynı kişiye üst üste 3 retten sonra istek
  gönderilemez (geri çekilen sayılmaz). Arkadaşlıktan çıkar İKİ yöndeki takibi siler; Takibi bırak yalnız
  benimkini. Sessize al (`Follow.NotificationsMuted`) o kişiden gelen TÜM bildirimleri kapatır. Kendi takip
  listelerinde satır başına Arkadaşlıktan çıkar / Takibi bırak / Takipçiden çıkar. Kısıtla sonraki dilim.
  Ayrıntı: [docs/superpowers/specs/2026-10-03-kisi-menusu-arkadaslik-istegi-design.md](docs/superpowers/specs/2026-10-03-kisi-menusu-arkadaslik-istegi-design.md).
```
2. **Domain Modeli**'nde `Follow` satırına `, NotificationsMuted (#628 — takip edenin bu kişiden bildirim istemediği; takip satırıyla yaşar, takibi bırakınca kalkar)` eklenir. Altına yeni madde:
```markdown
- **FriendRequest** (#628): `Id`, `RequesterId` (FK → User, RESTRICT), `TargetId` (FK → User, RESTRICT),
  `CreatedAt`, `RejectedAt` (nullable — `null` = bekliyor, dolu = reddedildi; ret sınırı bu satırlardan
  sayılır, sayaç saklanmaz) — çift başına tek bekleyen istek (kısmi benzersiz indeks), kendine istek CHECK ile
  yasak; kabulde çiftin tüm satırları silinir
```
3. **Takip ve arkadaşlık kararının** sonuna şu cümle eklenir: "#628: takip hâlâ doğrudandır; arkadaşlık isteği onu DEĞİŞTİRMEZ, yalnızca iki kişiyi tek adımda karşılıklı takibe getirir (kabulde eksik `Follow` satırları açılır). İstek bir bildirim türüdür (`FriendRequest`) — saklanan ilk tür; kaynağı istek tablosudur."
4. **Bildirimler (#325) maddesine** şu cümle eklenir: "#628: sessize alınan kişiden (`Follow.NotificationsMuted`) hiçbir tür gelmez; süzgeç `NotificationRepository`'de tek yerde."

- [ ] **Step 2: Tam doğrulama**

Run:
- `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Follow|FullyQualifiedName~FriendRequest|FullyQualifiedName~Notification|FullyQualifiedName~WeeklyGoal|FullyQualifiedName~Grind.Tests.Data"`
- `npm run test --workspace @grind/shared` · `npm run typecheck --workspace @grind/shared`
- `npm run test --workspace mobile` · `npm run typecheck --workspace mobile`

Expected: hepsi PASS. Sayıları komut çıktısından al, elle sayma.

- [ ] **Step 3: Commit** — `docs: CLAUDE.md -- kisi menusu ve arkadaslik istegi (#628)`

- [ ] **Step 4: Telefonda gözle deneme (kullanıcı)**

Görsel iş kuralı: push'ta dur, kullanıcı telefonda baksın. Kullanıcıya şu deneme listesi verilir:
- profil düğmeleri
- menü
- istek → bildirim → kabul
- listeler
- iki tema
- İngilizce
