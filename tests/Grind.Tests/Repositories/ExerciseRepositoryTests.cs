using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
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
    public async Task GetVisibleAsync_isme_gore_sirali_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var suffix = Guid.NewGuid().ToString("N");
        var first = TestDatabase.NewExercise(user, $"Aaa_Once_{suffix}");
        var second = TestDatabase.NewExercise(user, $"Zzz_Sonra_{suffix}");
        context.Exercises.AddRange(second, first); // ekleme sırası bilerek ters
        await context.SaveChangesAsync();

        var visible = await repository.GetVisibleAsync(user.Id);

        var firstIndex = visible.ToList().FindIndex(e => e.Id == first.Id);
        var secondIndex = visible.ToList().FindIndex(e => e.Id == second.Id);
        Assert.True(firstIndex >= 0 && secondIndex >= 0);
        Assert.True(firstIndex < secondIndex);
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
    public async Task GetVisibleByIdAsync_arsivlenmis_egzersizi_de_dondurur()
    {
        // Geçmiş SetEntry/TemplateExercise kayıtları arşivlenmiş bir egzersize referans
        // verebilir; bu metod bilerek arşiv filtresi uygulamaz, aksi halde o kayıtlar
        // çözülemez hale gelir.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var archived = TestDatabase.NewExercise(user, $"Arsiv_{Guid.NewGuid():N}");
        archived.IsArchived = true;
        context.Exercises.Add(archived);
        await context.SaveChangesAsync();

        var found = await repository.GetVisibleByIdAsync(archived.Id, user.Id);

        Assert.NotNull(found);
        Assert.True(found.IsArchived);
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

    [Fact]
    public async Task NameExistsAsync_turkce_buyuk_I_noktali_ile_ayni_ismi_yakalar()
    {
        // PostgreSQL'in lower('İ') = 'i' ürettiği, .NET'in ToLowerInvariant()'ının ise
        // 'İ'yi değiştirmeden bıraktığı durum. İki farklı case-folding birbirini
        // tutmazsa aynı bayt dizisi "farklı isim" sanılır ve global egzersiz gölgelenebilir.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"İncline_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(user, name));
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, name));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_yuzde_karakterini_joker_olarak_yorumlamaz()
    {
        // ILike'a escape'siz geçilirse '%' ve '_' joker sayılır ve alakasız bir isimle
        // eşleşebilir. Escape doğru uygulanmışsa sadece bayt-bayt aynı isim eşleşmeli.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"100%_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(user, name));
        await context.SaveChangesAsync();

        Assert.False(await repository.NameExistsAsync(user.Id, "100%_totally_different_name"));
        Assert.True(await repository.NameExistsAsync(user.Id, name));
        await transaction.RollbackAsync();
    }

    /// <summary>
    /// Yeniden adlandırmanın çalışması için gerekli: kaydın kendi adı kendisiyle çakışmamalı.
    /// Bu olmadan yalnızca kategoriyi değiştirmek bile 409 verirdi.
    /// </summary>
    [Fact]
    public async Task NameExistsAsync_dislanan_kaydi_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        repository.Add(exercise);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, exercise.Name));
        Assert.False(await repository.NameExistsAsync(user.Id, exercise.Name, excludeId: exercise.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_dislama_varken_baska_kaydi_saymaya_devam_eder()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var name = $"Egzersiz {Guid.NewGuid():N}";
        var first = TestDatabase.NewExercise(user, name);
        var second = TestDatabase.NewExercise(user, $"{name} ikinci");
        repository.Add(first);
        repository.Add(second);
        await context.SaveChangesAsync();

        // second'ı first'ün adına çevirmeye çalışıyoruz: dışlama second'da olsa bile
        // first hâlâ o adı tutuyor, yani çakışma var.
        Assert.True(await repository.NameExistsAsync(user.Id, name, excludeId: second.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_istenirse_medyayi_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        exercise.Media.Add(new ExerciseMedia
        {
            MediaType = MediaType.Video,
            Url = "https://ornek.com/video.mp4",
            CreatedAt = DateTime.UtcNow
        });
        repository.Add(exercise);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var withMedia = await repository.GetVisibleByIdAsync(exercise.Id, user.Id, includeMedia: true);

        Assert.NotNull(withMedia);
        Assert.Single(withMedia.Media);
        Assert.Equal("https://ornek.com/video.mp4", withMedia.Media.Single().Url);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_varsayilan_olarak_medyayi_yuklemez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        exercise.Media.Add(new ExerciseMedia
        {
            MediaType = MediaType.Gif,
            Url = "https://ornek.com/hareket.gif",
            CreatedAt = DateTime.UtcNow
        });
        repository.Add(exercise);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var withoutMedia = await repository.GetVisibleByIdAsync(exercise.Id, user.Id);

        Assert.NotNull(withoutMedia);
        Assert.Empty(withoutMedia.Media);

        await transaction.RollbackAsync();
    }
}
