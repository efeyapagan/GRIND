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

            // Liste ve detay yanitlari da B'nin ozel egzersizini ICERMEMELI (#467 final review):
            // izleyicinin gordugu ile kopyaladigi arasinda fark olmamali (IDOR/veri sizintisi kurali).
            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            var listedeki = Assert.Single(liste, s => s.Id == sablon.Id);
            Assert.DoesNotContain(listedeki.Exercises, e => e.ExerciseId == bOzelEgzersiz.Id);

            var detay = await ServiceFor(context, a).GetSharedTemplateDetailAsync(b.Username, sablon.Id);
            Assert.DoesNotContain(detay.Exercises, e => e.ExerciseId == bOzelEgzersiz.Id);

            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);

            // Yalnizca global egzersiz kopyalanir; B'nin ozel egzersizi A'ya GORUNMEZ (IDOR kurali).
            Assert.Single(kopya.Exercises);
            Assert.DoesNotContain(kopya.Exercises, e => e.ExerciseId == bOzelEgzersiz.Id);
        }
    }

    [Fact]
    public async Task Arsivlenmis_global_egzersiz_listede_detayda_ve_kopyada_gorunmez()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var arsivliEgzersiz = TestDatabase.NewExercise(null, $"Arsivli Global {Guid.NewGuid():N}");
            arsivliEgzersiz.IsArchived = true;
            context.Add(arsivliEgzersiz);
            await context.SaveChangesAsync();
            context.Add(new TemplateExercise { WorkoutTemplateId = sablon.Id, ExerciseId = arsivliEgzersiz.Id, OrderIndex = 1, PlannedSets = 3 });
            await context.SaveChangesAsync();

            var liste = await ServiceFor(context, a).GetSharedTemplatesAsync(b.Username);
            var listedeki = Assert.Single(liste, s => s.Id == sablon.Id);
            Assert.DoesNotContain(listedeki.Exercises, e => e.ExerciseId == arsivliEgzersiz.Id);

            var detay = await ServiceFor(context, a).GetSharedTemplateDetailAsync(b.Username, sablon.Id);
            Assert.DoesNotContain(detay.Exercises, e => e.ExerciseId == arsivliEgzersiz.Id);

            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);
            Assert.DoesNotContain(kopya.Exercises, e => e.ExerciseId == arsivliEgzersiz.Id);
        }
    }

    [Fact]
    public async Task Kaydetme_uzun_isim_ve_kullanici_adinda_100_karakteri_asmaz()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Sablon adi 100 karakterin neredeyse tamami; B'nin kullanici adi da uzun olsun ki
            // "{ad} ({kullanici})" eki toplamda 100'u kesin assin.
            sablon.Name = new string('A', 95);
            b.Username = $"kullanici-adi-{new string('u', 30)}";
            await context.SaveChangesAsync();

            context.Add(new WorkoutTemplate { User = a, Name = sablon.Name, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username, sablon.Id);

            Assert.True(kopya.Name.Length <= 100, $"Beklenen <= 100, gelen: {kopya.Name.Length}");
            Assert.Contains(b.Username, kopya.Name);
        }
    }

    [Fact]
    public async Task Kaydetme_dogru_buyuk_kucuk_harfli_kullanici_adini_kullanir()
    {
        var (context, a, b, sablon, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new WorkoutTemplate { User = a, Name = sablon.Name, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            // Rota parametresi farkli harf case'inde gelse bile (case-insensitive kullanici adi
            // aramasi) isim eki DB'deki dogru case'i kullanmali, rotanin ham degerini degil.
            var kopya = await ServiceFor(context, a).SaveTemplateAsync(b.Username.ToUpperInvariant(), sablon.Id);

            Assert.Equal($"{sablon.Name} ({b.Username})", kopya.Name);
        }
    }
}
