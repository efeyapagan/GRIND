using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class BodyWeightLogRepositoryTests
{
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static BodyWeightLog NewLog(User user, decimal weight, DateTime recordedAtUtc) =>
        new() { User = user, Weight = weight, RecordedAt = recordedAtUtc };

    [Fact]
    public async Task Baskasinin_kaydi_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var log = NewLog(sahip, 82.4m, An);
        context.AddRange(sahip, davetsiz, log);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(log.Id, davetsiz.Id));
    }

    /// <summary>
    /// Düzeltme ve silme bu sorgunun döndürdüğü nesneyi değiştirir; izlemesiz dönseydi
    /// SaveChanges hiçbir şey yazmazdı (spec Karar 8: yalnızca liste/aralık izlemesiz).
    /// </summary>
    [Fact]
    public async Task Kendi_kaydi_izlenerek_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var log = NewLog(user, 82.4m, An);
        context.AddRange(user, log);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var bulunan = await repository.GetOwnedByIdAsync(log.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal(EntityState.Unchanged, context.Entry(bulunan).State);
    }

    [Fact]
    public async Task Sayfa_toplam_sayiyla_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user,
            NewLog(user, 82.4m, An), NewLog(user, 82.1m, An.AddDays(1)), NewLog(user, 81.9m, An.AddDays(2)));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(user.Id, null, null, skip: 0, take: 2);

        Assert.Equal(2, items.Count);
        Assert.Equal(3, toplam);
    }

    /// <summary>Yeniden eskiye; aynı `RecordedAt`'te Id azalan (belirli sıra — Faz 8'in dersi).</summary>
    [Fact]
    public async Task Liste_yeniden_eskiye_ve_belirli_sirada_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var eski = NewLog(user, 83.0m, An.AddDays(-1));
        var ayniAnBirinci = NewLog(user, 82.4m, An);
        var ayniAnIkinci = NewLog(user, 82.5m, An);
        context.AddRange(user, eski, ayniAnBirinci, ayniAnIkinci);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, _) = await repository.GetPageAsync(user.Id, null, null, 0, 20);

        Assert.Equal([ayniAnIkinci.Id, ayniAnBirinci.Id, eski.Id], items.Select(i => i.Id));
    }

    [Fact]
    public async Task Sayfa_tarih_araligina_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var araliktaki = NewLog(user, 82.4m, An);
        context.AddRange(user, NewLog(user, 83.0m, An.AddDays(-5)), araliktaki);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(user.Id, An.AddDays(-1), An.AddDays(1), 0, 20);

        Assert.Equal(araliktaki.Id, Assert.Single(items).Id);
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Sayfa_baskasinin_kayitlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        context.AddRange(sahip, davetsiz, NewLog(sahip, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(davetsiz.Id, null, null, 0, 20);

        Assert.Empty(items);
        Assert.Equal(0, toplam);
    }

    /// <summary>Spec Karar 8: liste sonuçları izlenmez — okuma yolu change tracker'ı doldurmamalı.</summary>
    [Fact]
    public async Task Sayfa_sonuclari_izlenmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user, NewLog(user, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        await repository.GetPageAsync(user.Id, null, null, 0, 20);

        Assert.Empty(context.ChangeTracker.Entries<BodyWeightLog>());
    }

    [Fact]
    public async Task Aralik_sorgusu_kronolojik_ve_sahiplidir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var diger = TestDatabase.NewUser();
        var yeni = NewLog(user, 82.1m, An.AddDays(1));
        var eski = NewLog(user, 82.4m, An);
        context.AddRange(user, diger, yeni, eski, NewLog(diger, 90m, An), NewLog(user, 83m, An.AddDays(-9)));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var loglar = await repository.GetInRangeAsync(user.Id, An.AddDays(-1), An.AddDays(2));

        // Başkasınınki ve aralık dışındaki elenir; kalanlar eskiden yeniye.
        Assert.Equal([eski.Id, yeni.Id], loglar.Select(l => l.Id));
    }

    [Fact]
    public async Task Aralik_sorgusu_sonuclari_izlenmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user, NewLog(user, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        await repository.GetInRangeAsync(user.Id, null, null);

        Assert.Empty(context.ChangeTracker.Entries<BodyWeightLog>());
    }
}
