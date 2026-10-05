using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

/// <summary>#654: haftalık hedef değişikliği geçmişiyle birlikte yazılır.</summary>
[Trait("Category", "Database")]
public class SettingsServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    /// <summary>
    /// Hedefi 3 olan kullanıcı aynı hafta önce 4, sonra 5 seçer: eski hedef geçmişe sabitlenir, bu hafta
    /// için TEK kayıt kalır (son seçim), güncel değer de 5 olur.
    /// </summary>
    [Fact]
    public async Task Ayni_hafta_iki_degisiklik_tek_kayit_birakir_ve_eski_hedef_gecmise_sabitlenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        user.WeeklyTargetDays = 3;
        context.Add(user);
        await context.SaveChangesAsync();
        // TR Perşembe 12 Mart 2026; haftanın Pazartesisi 9 Mart.
        var service = new SettingsService(
            new UserRepository(context), new WeeklyTargetChangeRepository(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id), new SahteSaat(new DateTime(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc)));

        await service.SetWeeklyTargetAsync(new UpdateWeeklyTargetRequest { WeeklyTargetDays = 4 });
        await service.SetWeeklyTargetAsync(new UpdateWeeklyTargetRequest { WeeklyTargetDays = 5 });

        var kayitlar = await context.Set<WeeklyTargetChange>()
            .Where(c => c.UserId == user.Id).OrderBy(c => c.EffectiveFromWeek).ToListAsync();
        Assert.Equal(
            [(DateOnly.MinValue, (int?)3), (new DateOnly(2026, 3, 9), 5)],
            kayitlar.Select(k => (k.EffectiveFromWeek, k.TargetDays)));
        Assert.Equal(5, user.WeeklyTargetDays);
    }
}
