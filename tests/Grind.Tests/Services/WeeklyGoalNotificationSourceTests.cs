using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

/// <summary>
/// #419: "arkadaşın haftalık hedefini tamamladı" bildiriminin TÜRETME kuralları. Kapı #418'in
/// aynısı: yalnızca arkadaşlar, <c>Gizli</c> yok, hedefi olmayan yok.
///
/// Gerçek veritabanına yazar ama her test kendi transaction'ında geri alınır
/// (NotificationServiceTests ile aynı desen).
/// </summary>
[Trait("Category", "Database")]
public class WeeklyGoalNotificationSourceTests
{
    /// <summary>Haftanın ortası: hafta sınırına takılmadan gün eklenip çıkarılabilsin.</summary>
    private static readonly DateOnly Carsamba = new(2026, 9, 23);

    private static DateTime SaatOnda(DateOnly gun)
    {
        var (baslangic, _) = TurkeyDay.RangeForLocalDate(gun);
        return baslangic.AddHours(10);
    }

    private static DateTime Simdi => SaatOnda(Carsamba).AddHours(5);

    private static async Task<(AppDbContext Context, User[] Users, IAsyncDisposable Transaction)> KurAsync(int n)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var users = Enumerable.Range(0, n).Select(_ => TestDatabase.NewUser()).ToArray();
        context.AddRange(users);
        await context.SaveChangesAsync();
        return (context, users, transaction);
    }

    private static async Task ArkadasAsync(AppDbContext context, User a, User b, DateTime ne)
    {
        context.Add(new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = ne });
        context.Add(new Follow { FollowerId = b.Id, FolloweeId = a.Id, CreatedAt = ne });
        await context.SaveChangesAsync();
    }

    /// <summary>Verilen TR gününde, seti olan bir antrenman.</summary>
    private static async Task AntrenmanAsync(AppDbContext context, User sahip, DateOnly gun)
    {
        var exercise = TestDatabase.NewExercise(sahip, $"H {Guid.NewGuid():N}"[..12]);
        context.Add(exercise);
        var session = new WorkoutSession { UserId = sahip.Id, StartedAt = SaatOnda(gun) };
        context.Add(session);
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise, Weight = 50, Reps = 10,
            RecordType = RecordType.None, CreatedAt = session.StartedAt,
        });
        await context.SaveChangesAsync();
    }

    private static async Task HedefAsync(AppDbContext context, User kullanici, int? gun)
    {
        kullanici.WeeklyTargetDays = gun;
        await context.SaveChangesAsync();
    }

    private static Task<IReadOnlyList<NotificationItem>> BildirimlerAsync(AppDbContext context, User ben)
        => new WeeklyGoalNotificationSource(new NotificationRepository(context))
            .GetAsync(ben.Id, Simdi.AddDays(-30), 50);

    [Fact]
    public async Task Arkadas_hedefini_tamamlayinca_bildirim_uretilir()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 2);
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-2));
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-1));

            var bildirim = Assert.Single(await BildirimlerAsync(context, ben));

            Assert.Equal(NotificationKind.WeeklyGoal, bildirim.Kind);
            Assert.Equal(arkadas.Username, bildirim.Actor.Username);
            // Hedefi TAMAMLAYAN oturumun anı: ikinci gün.
            Assert.Equal(SaatOnda(Carsamba.AddDays(-1)), bildirim.OccurredAt);
        }
    }

    /// <summary>Hedefe bir kez ulaşılır: aynı haftada sonraki antrenmanlar ikinci bildirim üretmez.</summary>
    [Fact]
    public async Task Ayni_hafta_ikinci_kez_uretilmez()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 2);
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-2));
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-1));
            await AntrenmanAsync(context, arkadas, Carsamba);

            Assert.Single(await BildirimlerAsync(context, ben));
        }
    }

    [Fact]
    public async Task Hedefe_ulasilmadiysa_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 4);
            await AntrenmanAsync(context, arkadas, Carsamba);

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    [Fact]
    public async Task Hedefi_olmayan_arkadas_icin_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, null);
            await AntrenmanAsync(context, arkadas, Carsamba);

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    /// <summary>#418'deki kararla aynı: gizli kullanıcının ilerlemesi hiçbir yolla paylaşılmaz.</summary>
    [Fact]
    public async Task Gizli_arkadas_icin_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 1);
            arkadas.PrivacyLevel = PrivacyLevel.Gizli;
            await context.SaveChangesAsync();
            await AntrenmanAsync(context, arkadas, Carsamba);

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    /// <summary>Tek yönlü takip arkadaşlık değildir (#281) -- bildirim de yok.</summary>
    [Fact]
    public async Task Karsilikli_olmayan_takip_icin_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, takipEttigim) = (users[0], users[1]);
            context.Add(new Follow { FollowerId = ben.Id, FolloweeId = takipEttigim.Id, CreatedAt = Simdi.AddDays(-10) });
            await context.SaveChangesAsync();
            await HedefAsync(context, takipEttigim, 1);
            await AntrenmanAsync(context, takipEttigim, Carsamba);

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    /// <summary>
    /// Arkadaşlıktan ÖNCEKİ antrenmanlar sayılmaz (RecordNotificationSource ile aynı kural):
    /// yeni eklenen arkadaşın geçmişi bildirim seli yaratmamalı.
    /// </summary>
    [Fact]
    public async Task Arkadasliktan_once_yapilan_antrenman_sayilmaz()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, SaatOnda(Carsamba).AddMinutes(-1));
            await HedefAsync(context, arkadas, 2);
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-2));
            await AntrenmanAsync(context, arkadas, Carsamba);

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    [Fact]
    public async Task Pasif_arkadas_icin_bildirim_yok()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-10));
            await HedefAsync(context, arkadas, 1);
            await AntrenmanAsync(context, arkadas, Carsamba);
            arkadas.DeletedAt = Simdi;
            await context.SaveChangesAsync();

            Assert.Empty(await BildirimlerAsync(context, ben));
        }
    }

    /// <summary>Her hafta kendi hedefini ayrı tamamlar: iki hafta, iki bildirim.</summary>
    [Fact]
    public async Task Iki_farkli_hafta_iki_bildirim_uretir()
    {
        var (context, users, transaction) = await KurAsync(2);
        await using (transaction)
        {
            var (ben, arkadas) = (users[0], users[1]);
            await ArkadasAsync(context, ben, arkadas, Simdi.AddDays(-30));
            await HedefAsync(context, arkadas, 1);
            await AntrenmanAsync(context, arkadas, Carsamba);
            await AntrenmanAsync(context, arkadas, Carsamba.AddDays(-7));

            Assert.Equal(2, (await BildirimlerAsync(context, ben)).Count);
        }
    }
}
