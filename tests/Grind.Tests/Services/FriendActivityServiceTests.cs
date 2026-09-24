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
/// Arkadaşın Geçmiş ve Rekorları (#282) — Yetkilendirme Kuralı'na kontrollü istisna: yalnızca karşılıklı
/// takip (arkadaşlık) açar, yetki her istekte veritabanından okunur, pasif/olmayan hedef 404.
/// Geçmiş/rekor hesabının kendisi <c>WorkoutHistoryServiceTests</c> / <c>PersonalRecordServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class FriendActivityServiceTests
{
    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private static readonly DateTime An = new(2026, 9, 24, 12, 0, 0, DateTimeKind.Utc);

    /// <summary>A ve B kullanıcıları; B'nin kendi özel egzersiziyle tek setlik bir antrenmanı var.</summary>
    private static async Task<(AppDbContext Context, User A, User B, Exercise BEgzersizi, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var (a, b) = (TestDatabase.NewUser(), TestDatabase.NewUser());
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

    private static Follow Takip(User follower, User followee) =>
        new() { Follower = follower, Followee = followee, CreatedAt = An };

    private static async Task ArkadasYapAsync(AppDbContext context, User a, User b)
    {
        context.AddRange(Takip(a, b), Takip(b, a));
        await context.SaveChangesAsync();
    }

    /// <summary>Aynı context, farklı "oturum açmış" kullanıcı.</summary>
    private static FriendActivityService ServiceFor(AppDbContext context, User viewer)
    {
        var current = new StubCurrentUser(viewer);
        return new FriendActivityService(
            new UserRepository(context),
            new FollowRepository(context),
            new WorkoutHistoryService(
                new WorkoutSessionRepository(context), new SetEntryRepository(context),
                new ExerciseRepository(context), current),
            new PersonalRecordService(new SetEntryRepository(context), current),
            current);
    }

    /// <summary>Arkadaş, arkadaşının geçmişini (setleriyle) ve rekorlarını okur — kendi verisini değil.</summary>
    [Fact]
    public async Task Arkadas_arkadasinin_gecmisini_ve_rekorlarini_gorur()
    {
        var (context, a, b, egzersiz, transaction) = await CreateAsync();
        await using (transaction)
        {
            await ArkadasYapAsync(context, a, b);
            var service = ServiceFor(context, a);

            var gecmis = await service.GetHistoryAsync(b.Username, new HistoryQuery());
            var oturum = Assert.Single(gecmis.Items);
            Assert.Equal(80m, Assert.Single(oturum.Sets).Weight);

            var rekor = Assert.Single(await service.GetRecordsAsync(b.Username));
            Assert.Equal(egzersiz.Id, rekor.ExerciseId);
            Assert.Equal(80m, rekor.BestWeight);
        }
    }

    /// <summary>
    /// Tek yönlü takip arkadaşlık değildir: A yalnızca B'yi takip ediyor da olsa, yalnızca B A'yı takip
    /// ediyor da olsa A, B'nin verisini göremez (403 — profil başlığı zaten açık, var olduğu sızmaz).
    /// </summary>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Tek_yonlu_takipte_erisim_yok(bool aTakipEdiyor)
    {
        var (context, a, b, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(aTakipEdiyor ? Takip(a, b) : Takip(b, a));
            await context.SaveChangesAsync();
            var service = ServiceFor(context, a);

            await Assert.ThrowsAsync<ForbiddenException>(() => service.GetHistoryAsync(b.Username, new HistoryQuery()));
            await Assert.ThrowsAsync<ForbiddenException>(() => service.GetRecordsAsync(b.Username));
        }
    }

    /// <summary>Kendi adıyla çağırmak serbest: kendi verisidir, takip satırı gerekmez (kendini takip yasak).</summary>
    [Fact]
    public async Task Kullanici_kendi_verisini_de_gorur()
    {
        var (context, _, b, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var service = ServiceFor(context, b);

            Assert.Single((await service.GetHistoryAsync(b.Username, new HistoryQuery())).Items);
            Assert.Single(await service.GetRecordsAsync(b.Username));
        }
    }

    /// <summary>Yetki her istekte okunur: takipten çıkıldığı anda erişim biter.</summary>
    [Fact]
    public async Task Takipten_cikinca_erisim_biter()
    {
        var (context, a, b, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await ArkadasYapAsync(context, a, b);
            var service = ServiceFor(context, a);
            await service.GetRecordsAsync(b.Username);

            context.Remove(context.Set<Follow>().Single(f => f.FollowerId == b.Id && f.FolloweeId == a.Id));
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<ForbiddenException>(() => service.GetRecordsAsync(b.Username));
        }
    }

    /// <summary>Pasif hesap, olmayan hesapla aynı 404'ü alır — arkadaşlık satırları dursa bile.</summary>
    [Fact]
    public async Task Pasif_ya_da_olmayan_hedef_404()
    {
        var (context, a, b, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await ArkadasYapAsync(context, a, b);
            b.DeletedAt = An;
            await context.SaveChangesAsync();
            var service = ServiceFor(context, a);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetHistoryAsync(b.Username, new HistoryQuery()));
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetRecordsAsync($"yok_{Guid.NewGuid():N}"));
        }
    }

    /// <summary>
    /// Hareket filtresi hedefin gözünden çözülür: arkadaşın özel egzersiziyle filtrelemek 404 değil,
    /// o hareketin oturumlarını döndürür (bakanın görebildiği egzersizlerle sınırlı değil).
    /// </summary>
    [Fact]
    public async Task Arkadasin_ozel_egzersiziyle_filtrelenebilir()
    {
        var (context, a, b, egzersiz, transaction) = await CreateAsync();
        await using (transaction)
        {
            await ArkadasYapAsync(context, a, b);

            var gecmis = await ServiceFor(context, a).GetHistoryAsync(
                b.Username, new HistoryQuery { ExerciseId = egzersiz.Id });

            Assert.Single(gecmis.Items);
        }
    }
}
