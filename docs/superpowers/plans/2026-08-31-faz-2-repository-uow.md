# Faz 2 — Repository + Unit of Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servis katmanının `DbContext`'e hiç dokunmadan çalışabilmesi için generic bir repository tabanı, dört özel repository ve bir Unit of Work kurmak.

**Architecture:** `Repository<T>` ortak `GetByIdAsync`/`Add`/`Remove` gövdesini bir kez yazar; özel repository'ler ondan türeyip yalnızca kendi somut sorgularını ekler. Hiçbir repository dışarıya `IQueryable` sızdırmaz — her sorgu adlandırılmış bir metottur ve materialize edilmiş sonuç döner. `IUnitOfWork` yalnızca `SaveChangesAsync` sunar ve repository sahiplenmez; servisler ihtiyaç duydukları repo'ları ayrı ayrı inject eder.

**Tech Stack:** .NET 10 · EF Core 10.0.11 · Npgsql 10.0.3 · PostgreSQL 17 (Docker) · xUnit

**Spec:** [docs/superpowers/specs/2026-08-31-repository-uow-design.md](../specs/2026-08-31-repository-uow-design.md)

## Global Constraints

- Hedef framework `net10.0`; entity primary key'leri `long`.
- **Hiçbir repository metodu `IQueryable` döndürmez.** Her sorgu adlandırılmış bir metottur ve `IReadOnlyList<T>`, `T?` veya `bool` döner.
- **Servis katmanı `DbContext`'i görmez.** `AppDbContext`'e yalnızca `Repositories/` ve `Data/` altındaki sınıflar dokunur.
- **`IUnitOfWork` repository sahiplenmez.** `uow.Exercises` gibi property'ler yazılmaz.
- **Sahiplik/yetkilendirme kararı bu katmanda VERİLMEZ.** Repository "şu kullanıcının erişebildiği kayıtlar" gibi sorgular sunar; kararı Faz 4+ servisleri verir.
- Entity'ler anemik POCO'dur ve bu fazda değiştirilmez. Migration üretilmez, `AppDbContext` değiştirilmez.
- Bu fazda Controller, Service ve DTO yazılmaz. Frontend'e dokunulmaz.
- Testler gerçek PostgreSQL'e karşı çalışır (`docker compose up -d`, host portu 5433). In-memory sağlayıcı kullanılmaz.
- Her test yazdığı veriyi kendi transaction'ında geri alır — veritabanı test sonrası temiz kalır.
- Her görev kendi testleriyle biter ve kendi commit'ini atar. Build çıktısı sıfır uyarı.

## Spec'ten iki bilinçli sapma

Her ikisi de gözden geçirenin reddetmesi için açıkça işaretlenmiştir.

**1. `AddAsync` yerine `Add`.** Spec `IRepository<T>` için "GetByIdAsync / AddAsync / Remove" diyor. EF Core'un `AddAsync`'i yalnızca asenkron değer üreteçleri (HiLo gibi) için anlamlıdır; bizim anahtarlarımız PostgreSQL identity ve hiçbir asenkron iş yapılmıyor. Hiç `await` edilmeyen `Task` döndüren bir metot çağıranı yanıltır. Bu yüzden `void Add(T entity)`.

**2. `BeginTransactionAsync` bu fazda YAZILMIYOR.** Spec onu `IUnitOfWork`'te sayıyor, ama: (a) bugün hiçbir tüketicisi yok — CLAUDE.md'nin kuralı zaten "tek `SaveChangesAsync`, EF bunu atomik yapar"; (b) `IDbContextTransaction` döndürmek EF Core'u servis katmanına sızdırır ve bu, spec'in kendi 2. sorusunda verilen "sızdırma" kararıyla çelişir; kendi sarmalayıcımızı yazmak ise henüz kullanıcısı olmayan bir soyutlama olur. Somut ilk tüketici belirdiğinde (büyük ihtimalle Faz 13 hesap silme) sızdırmak ile sarmalamak arasında elde gerçek bir kullanım senaryosuyla karar verilir. YAGNI.

---

## File Structure

**Yeni — üretim:**

| Dosya | Sorumluluk |
|---|---|
| `src/Grind.Api/Repositories/IRepository.cs` | `IRepository<T>` — GetByIdAsync, Add, Remove |
| `src/Grind.Api/Repositories/Repository.cs` | `Repository<T>` — ortak gövde, `AppDbContext`'i tutar |
| `src/Grind.Api/Repositories/IUserRepository.cs` | Kullanıcı adına göre arama |
| `src/Grind.Api/Repositories/UserRepository.cs` | |
| `src/Grind.Api/Repositories/IExerciseRepository.cs` | Görünür egzersizler, isim çakışması |
| `src/Grind.Api/Repositories/ExerciseRepository.cs` | |
| `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs` | Verilen zaman aralığındaki açık oturum |
| `src/Grind.Api/Repositories/WorkoutSessionRepository.cs` | |
| `src/Grind.Api/Repositories/ISetEntryRepository.cs` | PR motorunun kronolojik set sorgusu |
| `src/Grind.Api/Repositories/SetEntryRepository.cs` | |
| `src/Grind.Api/Data/IUnitOfWork.cs` | `SaveChangesAsync` |
| `src/Grind.Api/Data/UnitOfWork.cs` | |
| `src/Grind.Api/Data/DependencyInjection.cs` | `AddPersistence` — DbContext + repo'lar + UoW |

**Yeni — test:**

| Dosya | Sorumluluk |
|---|---|
| `tests/Grind.Tests/TestDatabase.cs` | Ortak bağlantı dizesi ve veri kurma yardımcıları |
| `tests/Grind.Tests/Repositories/RepositoryTests.cs` | Generic taban |
| `tests/Grind.Tests/Repositories/UserRepositoryTests.cs` | |
| `tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs` | |
| `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs` | |
| `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` | |
| `tests/Grind.Tests/Data/PersistenceRegistrationTests.cs` | DI kayıtları çözülebiliyor mu |

**Değiştirilecek:** `tests/Grind.Tests/Data/DatabaseSmokeTests.cs` (Görev 1, ortak yardımcıya taşınır) · `src/Grind.Api/Program.cs` (Görev 7, `AddPersistence` çağrısı).

---

### Task 1: Ortak test altyapısı

**Files:**
- Create: `tests/Grind.Tests/TestDatabase.cs`
- Modify: `tests/Grind.Tests/Data/DatabaseSmokeTests.cs`

**Interfaces:**
- Consumes: `Grind.Api.Data.AppDbContext`, `Grind.Api.Models.Entities.{User, WorkoutSession}`
- Produces: `Grind.Tests.TestDatabase` — `static AppDbContext CreateContext()`, `static User NewUser()`, `static WorkoutSession NewSession(User user)`, `static Exercise NewExercise(User? owner, string name)`. Sonraki bütün görevlerin testleri bunu kullanır.

`DatabaseSmokeTests` bağlantı dizesini ve iki yardımcıyı `private` olarak taşıyor. Faz 2'nin beş test dosyası da aynısına ihtiyaç duyacak; kopyalamak CLAUDE.md'nin bağlayıcı DRY kuralını çiğnerdi.

- [ ] **Step 1: Ortak yardımcıyı yaz**

`tests/Grind.Tests/TestDatabase.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests;

/// <summary>
/// Çalışan bir PostgreSQL ister (docker compose up -d). Kimlik bilgileri
/// docker-compose.yml'deki geliştirme değerleridir — gizli bilgi değildir.
/// </summary>
internal static class TestDatabase
{
    public const string ConnectionString =
        "Host=localhost;Port=5433;Database=grind;Username=grind;Password=grind_dev_password";

    public static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);

    /// <summary>Her çağrıda benzersiz kullanıcı adı — testler birbirini etkilemesin.</summary>
    public static User NewUser() => new()
    {
        Username = $"test_{Guid.NewGuid():N}",
        PasswordHash = "not-a-real-hash",
        CreatedAt = DateTime.UtcNow
    };

    public static WorkoutSession NewSession(User user) =>
        new() { User = user, StartedAt = DateTime.UtcNow };

    /// <summary><paramref name="owner"/> null ise global egzersiz üretir.</summary>
    public static Exercise NewExercise(User? owner, string name) => new()
    {
        User = owner,
        Name = name,
        Category = ExerciseCategory.Other,
        IsArchived = false
    };
}
```

- [ ] **Step 2: Testleri çalıştır — hâlâ geçmeliler**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (48/48). Yeni dosya henüz kimse tarafından kullanılmıyor, mevcut testler bozulmamalı.

- [ ] **Step 3: `DatabaseSmokeTests`'i ortak yardımcıya taşı**

`tests/Grind.Tests/Data/DatabaseSmokeTests.cs` içinde `ConnectionString` sabitini, `CreateContext()`, `CreateUser()` ve `CreateSession()` metotlarını **sil**. Kalan çağrıları şöyle değiştir:

- `CreateContext()` → `TestDatabase.CreateContext()`
- `CreateUser()` → `TestDatabase.NewUser()`
- `CreateSession(user)` → `TestDatabase.NewSession(user)`

Sınıfın başına `using Grind.Tests;` eklemeye gerek yok — aynı ad alanının üstündedir. `Grind.Api.Models.Enums` using'i hâlâ gerekiyorsa bırak, kullanılmıyorsa sil (sıfır uyarı kuralı).

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (48/48), sıfır derleme uyarısı.

- [ ] **Step 5: Commit**

```bash
git add tests/Grind.Tests/TestDatabase.cs tests/Grind.Tests/Data/DatabaseSmokeTests.cs
git commit -m "test: ortak veritabani test yardimcisi (TestDatabase)"
```

---

### Task 2: `IRepository<T>` ve `Repository<T>`

**Files:**
- Create: `src/Grind.Api/Repositories/IRepository.cs`, `src/Grind.Api/Repositories/Repository.cs`
- Test: `tests/Grind.Tests/Repositories/RepositoryTests.cs`

**Interfaces:**
- Consumes: `Grind.Tests.TestDatabase`, `Grind.Api.Data.AppDbContext`
- Produces: `Grind.Api.Repositories.IRepository<T> where T : class` — `Task<T?> GetByIdAsync(long id, CancellationToken ct = default)`, `void Add(T entity)`, `void Remove(T entity)`. Ve `Grind.Api.Repositories.Repository<T>` — constructor `Repository(AppDbContext context)`, `protected AppDbContext Context`, `protected DbSet<T> Set`. Görev 3-6'daki özel repository'ler bundan türer.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Repositories/RepositoryTests.cs`:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class RepositoryTests
{
    [Fact]
    public async Task GetByIdAsync_var_olan_kaydi_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        var found = await repository.GetByIdAsync(user.Id);

        Assert.NotNull(found);
        Assert.Equal(user.Username, found.Username);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetByIdAsync_olmayan_kayitta_null_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new Repository<User>(context);

        Assert.Null(await repository.GetByIdAsync(-1));
    }

    [Fact]
    public async Task Add_kaydi_kalici_hale_getirir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.True(user.Id > 0);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Remove_kaydi_siler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();
        var id = user.Id;

        repository.Remove(user);
        await context.SaveChangesAsync();

        Assert.Null(await context.Users.FirstOrDefaultAsync(u => u.Id == id));
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter RepositoryTests`
Expected: FAIL — derleme hatası, `Grind.Api.Repositories` ad alanı yok.

- [ ] **Step 3: Arayüzü yaz**

`src/Grind.Api/Repositories/IRepository.cs`:

```csharp
namespace Grind.Api.Repositories;

/// <summary>
/// Her entity için geçerli olan temel veri erişimi. Bilerek dar tutulmuştur:
/// IQueryable döndürmez, çünkü sorgu kurmayı servis katmanına taşımak EF Core'u
/// oraya sızdırır (bkz. spec §Soru 2).
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    void Add(T entity);

    void Remove(T entity);
}
```

- [ ] **Step 4: Implementasyonu yaz**

`src/Grind.Api/Repositories/Repository.cs`:

```csharp
using Grind.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
{
    protected AppDbContext Context { get; } = context;

    protected DbSet<T> Set => Context.Set<T>();

    public async Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => await Set.FindAsync([id], cancellationToken);

    public void Add(T entity) => Set.Add(entity);

    public void Remove(T entity) => Set.Remove(entity);
}
```

`FindAsync` birincil anahtarı modelden okur; bu yüzden `T`'nin `Id` taşıdığını derleme zamanında bilmeye gerek yok ve ortak bir taban sınıf gerekmiyor.

- [ ] **Step 5: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (52/52).

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories
git commit -m "feat(data): IRepository<T> ve Repository<T> temel implementasyonu"
```

---

### Task 3: `IUserRepository`

**Files:**
- Create: `src/Grind.Api/Repositories/IUserRepository.cs`, `src/Grind.Api/Repositories/UserRepository.cs`
- Test: `tests/Grind.Tests/Repositories/UserRepositoryTests.cs`

**Interfaces:**
- Consumes: `Repository<T>`, `IRepository<T>`
- Produces: `IUserRepository : IRepository<User>` — `Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default)`, `Task<bool> UsernameExistsAsync(string username, CancellationToken ct = default)`. Faz 4 `AuthService` bunları kullanacak.

Kullanıcı adları veritabanında **her zaman küçük harf** durur (persistence spec §2): normalizasyon kayıt anında servis katmanında yapılır. Bu repository tam eşleşme arar ve normalizasyon yapmaz — iki yerde normalize etmek kuralı ikiye böler.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Repositories/UserRepositoryTests.cs`:

```csharp
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class UserRepositoryTests
{
    [Fact]
    public async Task GetByUsernameAsync_kullaniciyi_bulur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        var found = await repository.GetByUsernameAsync(user.Username);

        Assert.NotNull(found);
        Assert.Equal(user.Id, found.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetByUsernameAsync_olmayan_kullanicida_null_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new UserRepository(context);

        Assert.Null(await repository.GetByUsernameAsync($"yok_{Guid.NewGuid():N}"));
    }

    [Fact]
    public async Task UsernameExistsAsync_var_olan_icin_true_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.True(await repository.UsernameExistsAsync(user.Username));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task UsernameExistsAsync_olmayan_icin_false_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new UserRepository(context);

        Assert.False(await repository.UsernameExistsAsync($"yok_{Guid.NewGuid():N}"));
    }

    [Fact]
    public async Task Buyuk_harfli_arama_eslesmez_normalizasyon_servisin_isi()
    {
        // Veritabanında kullanıcı adları her zaman küçük harf durur; normalizasyon
        // kayıt anında AuthService'te yapılır (Faz 4). Repository tam eşleşme arar.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetByUsernameAsync(user.Username.ToUpperInvariant()));
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter UserRepositoryTests`
Expected: FAIL — `UserRepository` tipi yok.

- [ ] **Step 3: Arayüzü ve implementasyonu yaz**

`src/Grind.Api/Repositories/IUserRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IUserRepository : IRepository<User>
{
    /// <summary>
    /// Tam eşleşme arar. Kullanıcı adları veritabanında her zaman küçük harf durur;
    /// normalizasyon kayıt anında servis katmanında yapılır.
    /// </summary>
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/UserRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class UserRepository(AppDbContext context) : Repository<User>(context), IUserRepository
{
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Username == username, cancellationToken);
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (57/57).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories/UserRepositoryTests.cs
git commit -m "feat(data): IUserRepository - kullanici adiyla arama"
```

---

### Task 4: `IExerciseRepository`

**Files:**
- Create: `src/Grind.Api/Repositories/IExerciseRepository.cs`, `src/Grind.Api/Repositories/ExerciseRepository.cs`
- Test: `tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs`

**Interfaces:**
- Consumes: `Repository<T>`, `IRepository<T>`
- Produces: `IExerciseRepository : IRepository<Exercise>` — `Task<IReadOnlyList<Exercise>> GetVisibleAsync(long userId, bool includeArchived = false, CancellationToken ct = default)`, `Task<Exercise?> GetVisibleByIdAsync(long id, long userId, CancellationToken ct = default)`, `Task<bool> NameExistsAsync(long userId, string name, CancellationToken ct = default)`. Faz 5, 6 ve 8 bunları kullanacak.

**"Görünür" tanımı:** `UserId == userId` (kendi egzersizi) **veya** `UserId == null` (global). Başka bir kullanıcının özel egzersizi hiçbir zaman dönmez — CLAUDE.md'nin IDOR kuralının veri erişim ayağı budur.

**İsim çakışması arşivlileri de kapsar.** `Exercise(UserId, Name)` unique index'i arşivlenince ismi serbest bırakmaz (bkz. persistence spec §3), yani arşivli bir isim yine de çakışır. Faz 5 bunu "çakışma" değil "arşivden çıkar" olarak yorumlayacak; repository sadece gerçeği söyler.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs`:

```csharp
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class ExerciseRepositoryTests
{
    [Fact]
    public async Task GetVisibleAsync_kendi_ve_global_egzersizleri_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var mine = TestDatabase.NewExercise(user, $"Benim_{Guid.NewGuid():N}");
        context.Exercises.Add(mine);
        await context.SaveChangesAsync();

        var visible = await repository.GetVisibleAsync(user.Id);

        Assert.Contains(visible, e => e.Id == mine.Id);
        Assert.Contains(visible, e => e.Name == "Bench Press" && e.UserId == null);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleAsync_baskasinin_ozel_egzersizini_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var secret = TestDatabase.NewExercise(owner, $"Gizli_{Guid.NewGuid():N}");
        context.Exercises.Add(secret);
        await context.SaveChangesAsync();

        var visible = await repository.GetVisibleAsync(stranger.Id);

        Assert.DoesNotContain(visible, e => e.Id == secret.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleAsync_arsivlileri_varsayilan_olarak_gizler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var archived = TestDatabase.NewExercise(user, $"Arsiv_{Guid.NewGuid():N}");
        archived.IsArchived = true;
        context.Exercises.Add(archived);
        await context.SaveChangesAsync();

        Assert.DoesNotContain(await repository.GetVisibleAsync(user.Id), e => e.Id == archived.Id);
        Assert.Contains(await repository.GetVisibleAsync(user.Id, includeArchived: true), e => e.Id == archived.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_baskasinin_egzersizinde_null_dondurur()
    {
        // IDOR koruması: yalnızca Id ile sorgulayıp sahiplik kontrolünü atlamak
        // CLAUDE.md'nin açıkça yasakladığı şey.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var secret = TestDatabase.NewExercise(owner, $"Gizli_{Guid.NewGuid():N}");
        context.Exercises.Add(secret);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetVisibleByIdAsync(secret.Id, stranger.Id));
        Assert.NotNull(await repository.GetVisibleByIdAsync(secret.Id, owner.Id));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_global_egzersizi_herkese_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var benchPress = await repository.GetVisibleByIdAsync(1, user.Id); // seed: Bench Press

        Assert.NotNull(benchPress);
        Assert.Null(benchPress.UserId);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_buyuk_kucuk_harf_gozetmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"Kablo_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(user, name));
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, name.ToUpperInvariant()));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_global_isimleri_de_kapsar()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var repository = new ExerciseRepository(context);

        Assert.True(await repository.NameExistsAsync(user.Id, "bench press"));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_arsivli_ismi_de_dolu_sayar()
    {
        // Unique index arşivlenince ismi serbest bırakmıyor; repository gerçeği söyler,
        // "arşivden çıkar" yorumunu Faz 5 yapar.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"Arsivli_{Guid.NewGuid():N}";
        var archived = TestDatabase.NewExercise(user, name);
        archived.IsArchived = true;
        context.Exercises.Add(archived);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, name));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_baskasinin_ismini_cakisma_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var name = $"Ozel_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(owner, name));
        await context.SaveChangesAsync();

        Assert.False(await repository.NameExistsAsync(stranger.Id, name));
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter ExerciseRepositoryTests`
Expected: FAIL — `ExerciseRepository` tipi yok.

- [ ] **Step 3: Arayüzü ve implementasyonu yaz**

`src/Grind.Api/Repositories/IExerciseRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IExerciseRepository : IRepository<Exercise>
{
    /// <summary>Kullanıcının kendi egzersizleri + global egzersizler, isme göre sıralı.</summary>
    Task<IReadOnlyList<Exercise>> GetVisibleAsync(
        long userId, bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yalnızca kullanıcının erişebildiği bir egzersizi döndürür; başkasının özel
    /// egzersizinde null döner (IDOR koruması).
    /// </summary>
    Task<Exercise?> GetVisibleByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu isim kullanıcı için zaten dolu mu — kendi egzersizlerinde veya globallerde,
    /// büyük/küçük harf gözetmeden, arşivliler dâhil.
    /// </summary>
    Task<bool> NameExistsAsync(long userId, string name, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/ExerciseRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class ExerciseRepository(AppDbContext context)
    : Repository<Exercise>(context), IExerciseRepository
{
    public async Task<IReadOnlyList<Exercise>> GetVisibleAsync(
        long userId, bool includeArchived = false, CancellationToken cancellationToken = default)
        => await Set
            .Where(e => (e.UserId == userId || e.UserId == null) && (includeArchived || !e.IsArchived))
            .OrderBy(e => e.Name)
            .ToListAsync(cancellationToken);

    public Task<Exercise?> GetVisibleByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(
            e => e.Id == id && (e.UserId == userId || e.UserId == null), cancellationToken);

    public Task<bool> NameExistsAsync(
        long userId, string name, CancellationToken cancellationToken = default)
    {
        // ILike kullanılmıyor: isimdeki '%' ve '_' karakterleri joker olarak yorumlanır
        // ve yanlış eşleşme üretir. lower() karşılaştırması güvenli.
        var normalized = name.ToLowerInvariant();
        return Set.AnyAsync(
            e => (e.UserId == userId || e.UserId == null) && e.Name.ToLower() == normalized,
            cancellationToken);
    }
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (66/66).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs
git commit -m "feat(data): IExerciseRepository - gorunur egzersizler ve isim cakismasi"
```

---

### Task 5: `IWorkoutSessionRepository`

**Files:**
- Create: `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs`, `src/Grind.Api/Repositories/WorkoutSessionRepository.cs`
- Test: `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs`

**Interfaces:**
- Consumes: `Repository<T>`, `IRepository<T>`
- Produces: `IWorkoutSessionRepository : IRepository<WorkoutSession>` — `Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(long userId, DateTime fromUtcInclusive, DateTime toUtcExclusive, CancellationToken ct = default)`. Faz 7 bunu kullanacak.

**Zaman dilimi politikası burada DEĞİL.** CLAUDE.md "açık session" için `EndedAt IS NULL` **ve** `StartedAt`'in TR yerel saatiyle bugün olmasını istiyor. Repository UTC bir aralık alır; o aralığı TR yerel gününden hesaplamak servisin işidir — çünkü "şu an" bilgisi ve saat dilimi politikası oraya aittir. Repository'ye gömmek onu test edilemez ve zamana bağımlı hale getirirdi.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs`:

```csharp
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutSessionRepositoryTests
{
    [Fact]
    public async Task Araliktaki_acik_oturumu_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.NotNull(found);
        Assert.Equal(session.Id, found.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Kapanmis_oturumu_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        session.EndedAt = DateTime.UtcNow.AddMinutes(30);
        context.WorkoutSessions.Add(session);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Aralik_disindaki_acik_oturumu_dondurmez()
    {
        // Unutulmuş açık session senaryosu: günler önce açılmış, hâlâ kapanmamış.
        // Bugünün aralığında aranınca çıkmamalı, yoksa yeni set eski tarihe düşer.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var oldSession = TestDatabase.NewSession(user);
        oldSession.StartedAt = DateTime.UtcNow.AddDays(-3);
        context.WorkoutSessions.Add(oldSession);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_kullanicinin_acik_oturumunu_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        context.WorkoutSessions.Add(TestDatabase.NewSession(owner));
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            stranger.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter WorkoutSessionRepositoryTests`
Expected: FAIL — `WorkoutSessionRepository` tipi yok.

- [ ] **Step 3: Arayüzü ve implementasyonu yaz**

`src/Grind.Api/Repositories/IWorkoutSessionRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IWorkoutSessionRepository : IRepository<WorkoutSession>
{
    /// <summary>
    /// Kullanıcının verilen UTC aralığında başlamış ve hâlâ açık (EndedAt null) oturumu.
    /// Aralığı TR yerel gününden hesaplamak servisin işidir — saat dilimi politikası
    /// bu katmana ait değildir.
    /// </summary>
    Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(
        long userId,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/WorkoutSessionRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WorkoutSessionRepository(AppDbContext context)
    : Repository<WorkoutSession>(context), IWorkoutSessionRepository
{
    public Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(
        long userId,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default)
        => Set
            .Where(s => s.UserId == userId
                        && s.EndedAt == null
                        && s.StartedAt >= fromUtcInclusive
                        && s.StartedAt < toUtcExclusive)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (70/70).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs
git commit -m "feat(data): IWorkoutSessionRepository - aralikta acik oturum"
```

---

### Task 6: `ISetEntryRepository`

**Files:**
- Create: `src/Grind.Api/Repositories/ISetEntryRepository.cs`, `src/Grind.Api/Repositories/SetEntryRepository.cs`
- Test: `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs`

**Interfaces:**
- Consumes: `Repository<T>`, `IRepository<T>`
- Produces: `ISetEntryRepository : IRepository<SetEntry>` — `Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(long userId, long exerciseId, CancellationToken ct = default)`, `Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(long sessionId, CancellationToken ct = default)`. Faz 8 (PR motoru) ve Faz 7 (session silme sonrası yeniden hesaplama) bunları kullanacak.

**Sahiplik join üzerinden gelir.** `SetEntry`'de `UserId` yoktur (3NF kararı, persistence spec §2); kullanıcı `WorkoutSession.UserId` üzerinden bulunur. `SetEntry(ExerciseId, WorkoutSessionId)` index'i bu join'i karşılamak için var.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs`:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class SetEntryRepositoryTests
{
    private const long PullUpId = 6;   // seed
    private const long SquatId = 11;   // seed

    private static SetEntry NewSet(WorkoutSession session, long exerciseId, int reps, DateTime createdAt)
        => new()
        {
            WorkoutSession = session,
            ExerciseId = exerciseId,
            Weight = 0m,
            Reps = reps,
            CreatedAt = createdAt
        };

    [Fact]
    public async Task Setleri_kronolojik_sirada_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);

        var now = DateTime.UtcNow;
        context.SetEntries.Add(NewSet(session, PullUpId, 8, now.AddMinutes(-10)));
        context.SetEntries.Add(NewSet(session, PullUpId, 6, now));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(user.Id, PullUpId);

        Assert.Equal(2, sets.Count);
        Assert.Equal(8, sets[0].Reps);
        Assert.Equal(6, sets[1].Reps);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_egzersizin_setlerini_karistirmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        context.SetEntries.Add(NewSet(session, PullUpId, 8, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, SquatId, 5, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(user.Id, PullUpId);

        Assert.Single(sets);
        Assert.Equal(PullUpId, sets[0].ExerciseId);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_kullanicinin_setlerini_dondurmez()
    {
        // Sahiplik WorkoutSession üzerinden geliyor; join yanlış kurulursa bu test düşer.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var ownerSession = TestDatabase.NewSession(owner);
        context.WorkoutSessions.Add(ownerSession);
        context.SetEntries.Add(NewSet(ownerSession, PullUpId, 8, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(stranger.Id, PullUpId);

        Assert.Empty(sets);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Oturumdaki_egzersiz_idlerini_tekrarsiz_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        context.SetEntries.Add(NewSet(session, PullUpId, 8, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, PullUpId, 6, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, SquatId, 5, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var ids = await repository.GetDistinctExerciseIdsForSessionAsync(session.Id);

        Assert.Equal(2, ids.Count);
        Assert.Contains(PullUpId, ids);
        Assert.Contains(SquatId, ids);
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter SetEntryRepositoryTests`
Expected: FAIL — `SetEntryRepository` tipi yok.

- [ ] **Step 3: Arayüzü ve implementasyonu yaz**

`src/Grind.Api/Repositories/ISetEntryRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface ISetEntryRepository : IRepository<SetEntry>
{
    /// <summary>
    /// Kullanıcının bu egzersizdeki tüm setleri, kronolojik sırada. PR motorunun
    /// temel sorgusu. Sahiplik WorkoutSession.UserId üzerinden gelir.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bir oturumdaki setlerin dokunduğu egzersizlerin tekrarsız listesi. Oturum
    /// silindiğinde her egzersiz için rekorların BİR KEZ yeniden hesaplanması için.
    /// </summary>
    Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/SetEntryRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class SetEntryRepository(AppDbContext context)
    : Repository<SetEntry>(context), ISetEntryRepository
{
    public async Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.ExerciseId == exerciseId && s.WorkoutSession.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .Select(s => s.ExerciseId)
            .Distinct()
            .ToListAsync(cancellationToken);
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (74/74).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs
git commit -m "feat(data): ISetEntryRepository - PR motorunun kronolojik set sorgusu"
```

---

### Task 7: `IUnitOfWork` ve DI kayıtları

**Files:**
- Create: `src/Grind.Api/Data/IUnitOfWork.cs`, `src/Grind.Api/Data/UnitOfWork.cs`, `src/Grind.Api/Data/DependencyInjection.cs`
- Modify: `src/Grind.Api/Program.cs`
- Test: `tests/Grind.Tests/Data/PersistenceRegistrationTests.cs`

**Interfaces:**
- Consumes: Görev 2-6'nın bütün repository arayüzleri ve implementasyonları
- Produces: `Grind.Api.Data.IUnitOfWork` — `Task<int> SaveChangesAsync(CancellationToken ct = default)`. Ve `Grind.Api.Data.DependencyInjection.AddPersistence(this IServiceCollection services, string connectionString)`. Faz 3+ servisleri `IUnitOfWork`'ü inject edecek.

`AddPersistence` **bağlantı dizesini parametre olarak alır**, `IConfiguration` almaz: test edilebilirliği artırır ve kaydın yapılandırma okumasıyla ilgisi yoktur.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Data/PersistenceRegistrationTests.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Data;

// Sınıftaki son test gerçek veritabanına yazıyor; diğer DB testleriyle aynı etiket.
[Trait("Category", "Database")]
public class PersistenceRegistrationTests
{
    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddPersistence(TestDatabase.ConnectionString);
        return services.BuildServiceProvider();
    }

    [Theory]
    [InlineData(typeof(AppDbContext))]
    [InlineData(typeof(IUnitOfWork))]
    [InlineData(typeof(IUserRepository))]
    [InlineData(typeof(IExerciseRepository))]
    [InlineData(typeof(IWorkoutSessionRepository))]
    [InlineData(typeof(ISetEntryRepository))]
    public void Kayitli_tipler_cozulebilir(Type serviceType)
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService(serviceType));
    }

    [Fact]
    public void Generic_repository_de_cozulebilir()
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IRepository<BodyWeightLog>>());
    }

    [Fact]
    public async Task UnitOfWork_degisiklikleri_kalici_hale_getirir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        IUnitOfWork unitOfWork = new UnitOfWork(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);

        var affected = await unitOfWork.SaveChangesAsync();

        Assert.Equal(1, affected);
        Assert.True(user.Id > 0);
        await transaction.RollbackAsync();
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter PersistenceRegistrationTests`
Expected: FAIL — `AddPersistence` ve `IUnitOfWork` yok.

- [ ] **Step 3: Unit of Work'ü yaz**

`src/Grind.Api/Data/IUnitOfWork.cs`:

```csharp
namespace Grind.Api.Data;

/// <summary>
/// İş operasyonunun kaydetme sınırı. CLAUDE.md'nin kuralı: anlamlı her iş
/// operasyonu tek bir SaveChangesAsync altında toplanır; EF Core bunu atomik yapar,
/// ayrı bir açık transaction genelde gerekmez.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Data/UnitOfWork.cs`:

```csharp
namespace Grind.Api.Data;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => context.SaveChangesAsync(cancellationToken);
}
```

- [ ] **Step 4: DI uzantısını yaz**

`src/Grind.Api/Data/DependencyInjection.cs`:

```csharp
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Data;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IExerciseRepository, ExerciseRepository>();
        services.AddScoped<IWorkoutSessionRepository, WorkoutSessionRepository>();
        services.AddScoped<ISetEntryRepository, SetEntryRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
```

- [ ] **Step 5: `Program.cs`'i bu uzantıyı kullanacak şekilde değiştir**

Mevcut satırı:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));
```

şununla değiştir:

```csharp
builder.Services.AddPersistence(builder.Configuration.GetConnectionString("Postgres")!);
```

`using Microsoft.EntityFrameworkCore;` artık `Program.cs`'te kullanılmıyorsa sil (sıfır uyarı kuralı). `using Grind.Api.Data;` kalmalı.

- [ ] **Step 6: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (82/82).

- [ ] **Step 7: Uygulamanın hâlâ ayağa kalktığını doğrula**

Run: `dotnet build --configuration Release`
Expected: 0 uyarı, 0 hata.

- [ ] **Step 8: Commit**

```bash
git add src/Grind.Api/Data src/Grind.Api/Program.cs tests/Grind.Tests/Data/PersistenceRegistrationTests.cs
git commit -m "feat(data): IUnitOfWork ve AddPersistence DI kayitlari"
```

- [ ] **Step 9: `PLAN.md`'de Faz 2'yi kapat**

`PLAN.md` içindeki Faz 2 maddelerini `- [x]` yap; durum tablosunda Faz 2 satırını ✅, Faz 3 satırını `⏳ sırada` yap.

```bash
git add PLAN.md
git commit -m "docs: Faz 2 tamamlandi"
```

---

## Doğrulama Özeti

Faz 2 şu koşullar sağlandığında bitmiştir:

- `dotnet build --configuration Release` 0 uyarı, 0 hata
- `dotnet test tests/Grind.Tests` tamamı yeşil (Docker çalışırken)
- Hiçbir repository metodu `IQueryable` döndürmüyor
- `AppDbContext`'e yalnızca `Repositories/` ve `Data/` altındaki sınıflar dokunuyor
- `IUnitOfWork` hiçbir repository property'si taşımıyor
- Entity, konfigürasyon ve migration dosyalarına dokunulmadı
