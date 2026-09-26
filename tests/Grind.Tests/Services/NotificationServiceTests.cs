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
    public async Task Otuz_gunden_once_biten_rekorlu_antrenman_gelmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await TakipAsync(context, ben, ali, Simdi.AddDays(-40));
            var bench = await HareketAsync(context, ali, "Bench");
            await AntrenmanAsync(context, ali, Simdi.AddDays(-31), (bench, 100, 5, RecordType.Weight));
            await AntrenmanAsync(context, ali, Simdi.AddDays(-29), (bench, 105, 5, RecordType.Weight));

            var rekor = Assert.Single(await ServiceFor(context, ben).GetAsync());
            Assert.Equal(105m, Assert.Single(rekor.Records!).Weight);
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
