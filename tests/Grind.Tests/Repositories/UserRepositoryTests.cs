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

    // ---- Faz 13: hesap pasifleştirme ----

    /// <summary>Kimlikli her istekte çağrılan kontrol: aktif kullanıcı için true.</summary>
    [Fact]
    public async Task Aktif_kullanici_ExistsActiveAsync_ile_bulunur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        Assert.True(await new UserRepository(context).ExistsActiveAsync(user.Id));
    }

    /// <summary>
    /// AYIRT EDİCİ: satır DURUYOR ama pasif. Sorgu yalnızca varlığa baksaydı bu test geçmezdi ve
    /// pasifleştirilen bir hesap elindeki token'la 7 gün daha çalışmaya devam ederdi.
    /// </summary>
    [Fact]
    public async Task Pasif_kullanici_ExistsActiveAsync_ile_bulunmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        user.DeletedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(user);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        Assert.False(await new UserRepository(context).ExistsActiveAsync(user.Id));
    }

    [Fact]
    public async Task Olmayan_kullanici_ExistsActiveAsync_ile_bulunmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        Assert.False(await new UserRepository(context).ExistsActiveAsync(-1));
    }
}
