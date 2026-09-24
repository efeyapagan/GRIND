using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>
/// Başkasının Geçmiş ve Rekorları (#282, #294'te gizlilik seviyesine göre genişledi) — Yetkilendirme
/// Kuralı'na kontrollü istisna: kapı artık arkadaşlık değil hedefin <c>PrivacyLevel</c>'i, yetki her
/// istekte veritabanından okunur, pasif/olmayan hedef 404. Geçmiş/rekor hesabının kendisi
/// <c>WorkoutHistoryServiceTests</c> / <c>PersonalRecordServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class PublicActivityServiceTests
{
    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private static readonly DateTime An = new(2026, 9, 24, 12, 0, 0, DateTimeKind.Utc);

    /// <summary>A ve B kullanıcıları; B'nin kendi özel egzersiziyle tek setlik bir antrenmanı var.</summary>
    private static async Task<(AppDbContext Context, User A, User B, Exercise BEgzersizi, IAsyncDisposable Transaction)>
        CreateAsync(PrivacyLevel bSeviyesi = PrivacyLevel.Kisitli)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var (a, b) = (TestDatabase.NewUser(), TestDatabase.NewUser());
        b.PrivacyLevel = bSeviyesi;
        var egzersiz = TestDatabase.NewExercise(b, $"Egzersiz {Guid.NewGuid():N}");
        var oturum = TestDatabase.NewSession(b);
        oturum.StartedAt = An;
        context.AddRange(a, b, egzersiz, oturum, new SetEntry
        {
            WorkoutSession = oturum, Exercise = egzersiz,
            Weight = 80m, Reps = 5, RecordType = RecordType.Weight, CreatedAt = An
        });
        await context.SaveChangesAsync();

        return (context, a, b, egzersiz, transaction);
    }

    /// <summary>Aynı context, farklı "oturum açmış" kullanıcı.</summary>
    private static PublicActivityService ServiceFor(AppDbContext context, User viewer)
    {
        var current = new StubCurrentUser(viewer);
        return new PublicActivityService(
            new UserRepository(context),
            new WorkoutHistoryService(
                new WorkoutSessionRepository(context), new SetEntryRepository(context),
                new ExerciseRepository(context), current),
            new PersonalRecordService(new SetEntryRepository(context), current),
            current);
    }

    /// <summary>Açık hesapta arkadaş olmayan bir yabancı bile tüm geçmişi (setleriyle) ve rekorları okur.</summary>
    [Fact]
    public async Task Acik_hesapta_yabanci_tum_gecmisi_ve_rekorlari_gorur()
    {
        var (context, a, b, egzersiz, transaction) = await CreateAsync(PrivacyLevel.Acik);
        await using (transaction)
        {
            var service = ServiceFor(context, a);

            var gecmis = await service.GetHistoryAsync(b.Username, new HistoryQuery());
            var oturum = Assert.Single(gecmis.Items);
            Assert.Equal(80m, Assert.Single(oturum.Sets).Weight);

            var rekor = Assert.Single(await service.GetRecordsAsync(b.Username));
            Assert.Equal(egzersiz.Id, rekor.ExerciseId);
            Assert.Equal(80m, rekor.BestWeight);
        }
    }

    /// <summary>Kısıtlı hesapta yabancı yalnızca son 5 antrenmanı görür; rekorlar seviyeden bağımsız tam.</summary>
    [Fact]
    public async Task Kisitli_hesapta_yabanci_son_bes_antrenmani_gorur()
    {
        var (context, a, b, _, transaction) = await CreateAsync(PrivacyLevel.Kisitli);
        await using (transaction)
        {
            for (var i = 0; i < 7; i++)
            {
                var oturum = TestDatabase.NewSession(b);
                oturum.StartedAt = An.AddDays(-i - 1);
                context.Add(oturum);
            }
            await context.SaveChangesAsync();
            var service = ServiceFor(context, a);

            var gecmis = await service.GetHistoryAsync(b.Username, new HistoryQuery { PageSize = 100 });
            Assert.Equal(PublicActivityService.RestrictedHistoryLimit, gecmis.Items.Count);

            var rekor = Assert.Single(await service.GetRecordsAsync(b.Username));
            Assert.Equal(80m, rekor.BestWeight);
        }
    }

    /// <summary>Gizli hesapta yabancı geçmişte boş liste alır (403 DEĞİL — bu bir yetki hatası değil), rekorlar yine görünür.</summary>
    [Fact]
    public async Task Gizli_hesapta_yabanci_gecmiste_bos_liste_alir_rekorlar_gorunur()
    {
        var (context, a, b, _, transaction) = await CreateAsync(PrivacyLevel.Gizli);
        await using (transaction)
        {
            var service = ServiceFor(context, a);

            var gecmis = await service.GetHistoryAsync(b.Username, new HistoryQuery());
            Assert.Empty(gecmis.Items);
            Assert.Equal(0, gecmis.TotalCount);

            var rekor = Assert.Single(await service.GetRecordsAsync(b.Username));
            Assert.Equal(80m, rekor.BestWeight);
        }
    }

    /// <summary>Kendi adıyla çağırmak seviyeden bağımsız tam erişim verir — Gizli'de bile.</summary>
    [Fact]
    public async Task Kullanici_kendi_verisini_seviyeden_bagimsiz_tam_gorur()
    {
        var (context, _, b, _, transaction) = await CreateAsync(PrivacyLevel.Gizli);
        await using (transaction)
        {
            var service = ServiceFor(context, b);

            Assert.Single((await service.GetHistoryAsync(b.Username, new HistoryQuery())).Items);
            Assert.Single(await service.GetRecordsAsync(b.Username));
        }
    }

    /// <summary>Pasif hesap, olmayan hesapla aynı 404'ü alır.</summary>
    [Fact]
    public async Task Pasif_ya_da_olmayan_hedef_404()
    {
        var (context, a, b, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            b.DeletedAt = An;
            await context.SaveChangesAsync();
            var service = ServiceFor(context, a);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetHistoryAsync(b.Username, new HistoryQuery()));
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetRecordsAsync($"yok_{Guid.NewGuid():N}"));
        }
    }

    /// <summary>
    /// Hareket filtresi hedefin gözünden çözülür: yabancının özel egzersiziyle filtrelemek 404 değil,
    /// o hareketin oturumlarını döndürür (bakanın görebildiği egzersizlerle sınırlı değil).
    /// </summary>
    [Fact]
    public async Task Yabancinin_ozel_egzersiziyle_filtrelenebilir()
    {
        var (context, a, b, egzersiz, transaction) = await CreateAsync(PrivacyLevel.Acik);
        await using (transaction)
        {
            var gecmis = await ServiceFor(context, a).GetHistoryAsync(
                b.Username, new HistoryQuery { ExerciseId = egzersiz.Id });

            Assert.Single(gecmis.Items);
        }
    }
}
