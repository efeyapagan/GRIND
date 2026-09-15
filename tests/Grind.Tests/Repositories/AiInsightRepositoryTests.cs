using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class AiInsightRepositoryTests
{
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static AiInsight NewInsight(
        User user, DateTime createdAt, AiInsightKind kind = AiInsightKind.Insight,
        WorkoutSession? session = null, SetEntry? setEntry = null) => new()
    {
        User = user,
        Kind = kind,
        WorkoutSession = session,
        SetEntry = setEntry,
        Content = "yorum",
        Model = "test-model",
        CreatedAt = createdAt
    };

    [Fact]
    public async Task Baskasinin_kaydi_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var insight = NewInsight(sahip, An);
        context.AddRange(sahip, davetsiz, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new AiInsightRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(insight.Id, davetsiz.Id));
    }

    /// <summary>Silme bu sorgunun döndürdüğü nesneyi kullanır; izlemesiz dönseydi silme hiçbir şey yazmazdı.</summary>
    [Fact]
    public async Task Kendi_kaydi_izlenerek_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var insight = NewInsight(user, An);
        context.AddRange(user, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await new AiInsightRepository(context).GetOwnedByIdAsync(insight.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal(EntityState.Unchanged, context.Entry(bulunan).State);
    }

    [Fact]
    public async Task Sayfa_yeniden_eskiye_toplam_sayiyla_ve_izlemesiz_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var eski = NewInsight(user, An.AddDays(-2));
        var enYeni = NewInsight(user, An);
        var orta = NewInsight(user, An.AddDays(-1));
        // Bilerek karışık sırada eklenir: sıra eklemeden değil sorgudan gelmeli.
        context.AddRange(user, eski, enYeni, orta);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(user.Id, null, null, null, skip: 0, take: 2);

        Assert.Equal(3, toplam);
        Assert.Equal(new[] { enYeni.Id, orta.Id }, items.Select(i => i.Id));
        Assert.Empty(context.ChangeTracker.Entries());
    }

    [Fact]
    public async Task Tur_suzgeci_uygulanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var oneri = NewInsight(user, An, AiInsightKind.Suggestion);
        context.AddRange(user, NewInsight(user, An.AddMinutes(-1)), oneri);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(user.Id, AiInsightKind.Suggestion, null, null, skip: 0, take: 20);

        Assert.Equal(1, toplam);
        Assert.Equal(oneri.Id, Assert.Single(items).Id);
    }

    [Fact]
    public async Task Oturum_ve_set_suzgecleri_uygulanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(user);
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8,
            RecordType = RecordType.None, CreatedAt = An
        };
        var oturumaBagli = NewInsight(user, An, AiInsightKind.Suggestion, session);
        var seteBagli = NewInsight(user, An, AiInsightKind.Suggestion, session, set);
        context.AddRange(user, exercise, session, set, oturumaBagli, seteBagli, NewInsight(user, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new AiInsightRepository(context);
        var (oturumdakiler, oturumToplami) = await repository
            .GetPageAsync(user.Id, null, session.Id, null, skip: 0, take: 20);
        var (settekiler, _) = await repository
            .GetPageAsync(user.Id, null, null, set.Id, skip: 0, take: 20);

        Assert.Equal(2, oturumToplami);
        Assert.Equal(
            new[] { oturumaBagli.Id, seteBagli.Id }.Order(), oturumdakiler.Select(i => i.Id).Order());
        Assert.Equal(seteBagli.Id, Assert.Single(settekiler).Id);
    }

    /// <summary>
    /// IDOR (spec Karar 13): başkasının oturum id'siyle süzmek, o oturuma bağlı YABANCI satırları değil
    /// boş sayfayı döndürmeli — sonuç her zaman kullanıcının kendi satırlarıyla sınırlı.
    /// </summary>
    [Fact]
    public async Task Baskasinin_oturumuyla_suzmek_bos_sayfa_verir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        context.AddRange(sahip, davetsiz, session, NewInsight(sahip, An, AiInsightKind.Suggestion, session));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(davetsiz.Id, null, session.Id, null, skip: 0, take: 20);

        Assert.Empty(items);
        Assert.Equal(0, toplam);
    }

    /// <summary>Yeni sütunlar gerçekten yazılıp okunuyor (veritabanından, izleyici temizlenerek).</summary>
    [Fact]
    public async Task Aralik_alanlari_kaydedilip_okunur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var insight = NewInsight(user, An);
        insight.RangeFrom = new DateOnly(2026, 2, 11);
        insight.RangeTo = new DateOnly(2026, 3, 12);
        context.AddRange(user, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var okunan = await new AiInsightRepository(context).GetOwnedByIdAsync(insight.Id, user.Id);

        Assert.Equal(new DateOnly(2026, 2, 11), okunan!.RangeFrom);
        Assert.Equal(new DateOnly(2026, 3, 12), okunan.RangeTo);
    }

    // --- GetRecentInsightTimestampsAsync (issue #76 haftalik sinir) ---

    [Fact]
    public async Task GetRecentInsightTimestampsAsync_sinirdan_eski_kayitlari_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var sinirdanOnce = An - TimeSpan.FromDays(8);
        var sinirdanSonra = An - TimeSpan.FromDays(6);
        context.AddRange(user, NewInsight(user, sinirdanOnce), NewInsight(user, sinirdanSonra));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var sonuc = await new AiInsightRepository(context)
            .GetRecentInsightTimestampsAsync(user.Id, An - TimeSpan.FromDays(7));

        Assert.Equal([sinirdanSonra], sonuc);
    }

    [Fact]
    public async Task GetRecentInsightTimestampsAsync_eskiden_yeniye_siralar()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var yeni = An;
        var eski = An - TimeSpan.FromDays(1);
        context.AddRange(user, NewInsight(user, yeni), NewInsight(user, eski));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var sonuc = await new AiInsightRepository(context)
            .GetRecentInsightTimestampsAsync(user.Id, An - TimeSpan.FromDays(7));

        Assert.Equal([eski, yeni], sonuc);
    }

    [Fact]
    public async Task GetRecentInsightTimestampsAsync_suggestion_turunu_saymaz()
    {
        // Suggestion (henuz kurulmamis, ayri bir uretim akisi) bu sinira DAHIL DEGIL.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user, NewInsight(user, An, AiInsightKind.Suggestion));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var sonuc = await new AiInsightRepository(context)
            .GetRecentInsightTimestampsAsync(user.Id, An - TimeSpan.FromDays(7));

        Assert.Empty(sonuc);
    }

    [Fact]
    public async Task GetRecentInsightTimestampsAsync_baskasinin_kaydini_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var baskasi = TestDatabase.NewUser();
        context.AddRange(sahip, baskasi, NewInsight(baskasi, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var sonuc = await new AiInsightRepository(context)
            .GetRecentInsightTimestampsAsync(sahip.Id, An - TimeSpan.FromDays(7));

        Assert.Empty(sonuc);
    }
}
