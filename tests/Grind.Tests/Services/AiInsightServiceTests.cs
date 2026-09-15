using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Grind.Api.Services.Ai;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class AiInsightServiceTests
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
    /// Çağrıları kaydeden sahte sağlayıcı. Çağrı anında bekleyen izlenmiş değişiklik olup olmadığını da
    /// kaydeder: LLM beklenirken yazma bekliyorsa transaction/kilit sınırı yanlış yerdedir (spec Karar 6).
    /// </summary>
    private sealed class SahteSaglayici(AppDbContext context, Exception? hata = null) : IAiInsightProvider
    {
        public int CagriSayisi { get; private set; }
        public string? Talimat { get; private set; }
        public string? Veri { get; private set; }
        public bool CagriAnindaBekleyenDegisiklikVardi { get; private set; }

        public Task<AiCompletion> CompleteAsync(
            string instructions, string trainingData, CancellationToken cancellationToken = default)
        {
            CagriSayisi++;
            Talimat = instructions;
            Veri = trainingData;
            CagriAnindaBekleyenDegisiklikVardi = context.ChangeTracker.HasChanges();

            return hata is null
                ? Task.FromResult(new AiCompletion("Güzel gidiyorsun.", "claude-opus-5", 1500, 0.0123m))
                : Task.FromException<AiCompletion>(hata);
        }
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00): "bugün" 12 Mart, varsayılan aralık 11 Şubat – 12 Mart.</summary>
    private static readonly DateTime Simdi = new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        return (context, user, exercise, transaction);
    }

    /// <summary>
    /// GERÇEK export yolu: sağlayıcıya giden metnin Faz 11'in metni olduğu ancak böyle sınanır.
    /// </summary>
    private static AiInsightService CreateService(AppDbContext context, long userId, IAiInsightProvider provider)
    {
        var currentUser = new StubCurrentUser(userId);
        var saat = new SahteSaat(Simdi);
        var sessions = new WorkoutSessionRepository(context);
        var sets = new SetEntryRepository(context);
        var bodyWeights = new BodyWeightLogRepository(context);
        var export = new ExportService(
            sessions,
            sets,
            bodyWeights,
            new StatsService(sessions, sets, bodyWeights, currentUser, saat),
            new PersonalRecordService(sets, currentUser),
            currentUser,
            saat);

        return new AiInsightService(
            new AiInsightRepository(context), export, provider, new UnitOfWork(context), currentUser, saat);
    }

    private static void SeedSession(AppDbContext context, User user, Exercise exercise, DateTime startedAtUtc)
    {
        var session = TestDatabase.NewSession(user);
        session.StartedAt = startedAtUtc;
        context.Add(session);
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8,
            RecordType = RecordType.None, CreatedAt = startedAtUtc
        });
    }

    private static AiInsight NewInsight(User user, DateTime createdAt, AiInsightKind kind = AiInsightKind.Insight)
        => new() { User = user, Kind = kind, Content = "yorum", Model = "test-model", CreatedAt = createdAt };

    private static Task<int> SatirSayisiAsync(AppDbContext context, long userId)
        => context.Set<AiInsight>().CountAsync(a => a.UserId == userId);

    // ---- Üretim ----

    [Fact]
    public async Task Uretilen_yorum_saglayici_alanlari_ve_varsayilan_araligiyla_kaydedilir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var yanit = await CreateService(context, user.Id, new SahteSaglayici(context))
                .GenerateAsync(new GenerateInsightRequest());

            // Veritabanından okunur: izleyicideki nesneye bakmak yanlış bir yazımı gizlerdi.
            context.ChangeTracker.Clear();
            var satir = await context.Set<AiInsight>().SingleAsync(a => a.Id == yanit.Id);

            Assert.Equal(user.Id, satir.UserId);
            Assert.Equal(AiInsightKind.Insight, satir.Kind);
            Assert.Null(satir.WorkoutSessionId);
            Assert.Null(satir.SetEntryId);
            Assert.Equal(new DateOnly(2026, 2, 11), satir.RangeFrom);
            Assert.Equal(new DateOnly(2026, 3, 12), satir.RangeTo);
            Assert.Equal("Güzel gidiyorsun.", satir.Content);
            Assert.Equal("claude-opus-5", satir.Model);
            Assert.Equal(1500, satir.TokensUsed);
            Assert.Equal(0.0123m, satir.EstimatedCostUsd);
            Assert.Equal(Simdi, satir.CreatedAt);
            Assert.Equal(new DateOnly(2026, 2, 11), yanit.RangeFrom);
        }
    }

    /// <summary>Bağlam Faz 11'in export metnidir (devreden not 3); talimat servis katmanından gelir.</summary>
    [Fact]
    public async Task Saglayiciya_talimat_ve_araligin_export_metni_gider()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(AiInsightPrompt.Instructions, saglayici.Talimat);
            Assert.Contains("Aralık: 2026-02-11 – 2026-03-12", saglayici.Veri);
            Assert.Contains(exercise.Name, saglayici.Veri);
        }
    }

    /// <summary>Bir LLM'e "veri yok" dedirtmek için para ödenmez (spec Karar 4).</summary>
    [Fact]
    public async Task Verisiz_aralik_400_verir_saglayici_cagrilmaz_satir_yazilmaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var saglayici = new SahteSaglayici(context);

            var hata = await Assert.ThrowsAsync<ValidationException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal("Bu aralıkta yorumlanacak kayıt yok.", hata.Message);
            Assert.Equal(0, saglayici.CagriSayisi);
            Assert.Equal(0, await SatirSayisiAsync(context, user.Id));
        }
    }

    /// <summary>AYIRT EDİCİ: varsayılan aralık tüm geçmiş değil son 30 gün — 40 gün önceki oturum sayılmaz.</summary>
    [Fact]
    public async Task Otuz_gunden_eski_veri_varsayilan_araliga_girmez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-40));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await Assert.ThrowsAsync<ValidationException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal(0, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Yalnizca_tarti_olan_aralik_da_yorumlanir()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new BodyWeightLog { User = user, Weight = 82.4m, RecordedAt = Simdi.AddDays(-2) });
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Saglayici_hatasinda_satir_yazilmaz()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(
                context, new ServiceUnavailableException("AI yorumlama şu an kapalı."));

            await Assert.ThrowsAsync<ServiceUnavailableException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal(0, await SatirSayisiAsync(context, user.Id));
        }
    }

    /// <summary>
    /// Spec Karar 6: yorum satırı sağlayıcı DÖNDÜKTEN sonra eklenir. Önce eklenseydi LLM beklenirken
    /// bekleyen bir yazma olurdu — sıralama değişirse bu test düşer.
    /// </summary>
    [Fact]
    public async Task Saglayici_cagrildiginda_bekleyen_degisiklik_yoktur()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
            Assert.False(saglayici.CagriAnindaBekleyenDegisiklikVardi);
        }
    }

    [Fact]
    public async Task Cok_uzun_aralik_400_verir_saglayici_cagrilmaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var saglayici = new SahteSaglayici(context);

            await Assert.ThrowsAsync<ValidationException>(() => CreateService(context, user.Id, saglayici)
                .GenerateAsync(new GenerateInsightRequest
                {
                    From = new DateOnly(2024, 1, 1), To = new DateOnly(2025, 1, 1)
                }));

            Assert.Equal(0, saglayici.CagriSayisi);
        }
    }

    // ---- Okuma ve silme ----

    [Fact]
    public async Task Liste_yeniden_eskiye_doner_ve_ture_gore_suzulur()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eski = NewInsight(user, Simdi.AddDays(-2));
            var yeni = NewInsight(user, Simdi.AddDays(-1), AiInsightKind.Suggestion);
            context.AddRange(eski, yeni);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            var hepsi = await service.GetPageAsync(new AiInsightQuery());
            var yorumlar = await service.GetPageAsync(new AiInsightQuery { Kind = AiInsightKind.Insight });

            Assert.Equal(new[] { yeni.Id, eski.Id }, hepsi.Items.Select(i => i.Id));
            Assert.Equal(2, hepsi.TotalCount);
            Assert.Equal(eski.Id, Assert.Single(yorumlar.Items).Id);
        }
    }

    [Fact]
    public async Task Silinen_yorum_artik_bulunamaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var insight = NewInsight(user, Simdi);
            context.Add(insight);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            Assert.Equal("yorum", (await service.GetByIdAsync(insight.Id)).Content);

            await service.DeleteAsync(insight.Id);

            var hata = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(insight.Id));
            Assert.Equal("Yorum bulunamadı.", hata.Message);
        }
    }

    /// <summary>IDOR: başkasının yorumu HER FİİLDE 404, listede de yok.</summary>
    [Fact]
    public async Task Baskasinin_yorumu_okunamaz_silinemez_listede_gorunmez()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerYorum = NewInsight(digerKullanici, Simdi);
            context.AddRange(digerKullanici, digerYorum);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerYorum.Id));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerYorum.Id));
            Assert.Equal(0, (await service.GetPageAsync(new AiInsightQuery())).TotalCount);
        }
    }

    // --- Haftalik uretim siniri (issue #76) ---

    [Fact]
    public async Task Pencerede_iki_yorum_varken_ucuncu_uretim_reddedilir_saglayici_HIC_CAGRILMAZ()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            context.AddRange(
                NewInsight(user, Simdi.AddDays(-6)),
                NewInsight(user, Simdi.AddDays(-2)));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var saglayici = new SahteSaglayici(context);
            var service = CreateService(context, user.Id, saglayici);

            var hata = await Assert.ThrowsAsync<RateLimitExceededException>(
                () => service.GenerateAsync(new GenerateInsightRequest()));

            // Ucretli cagri HIC yapilmadi -- sinir kontrolu export okumadan ve saglayicidan ONCE.
            Assert.Equal(0, saglayici.CagriSayisi);
            // En eski kayit (6 gun once) pencereden 7 gun sonra cikar -- yani (Simdi - 6) + 7 = Simdi + 1 gun.
            Assert.Contains("Sonraki hakkın 13.03.2026 20:00", hata.Message);
            // DB'de hala sadece 2 satir var -- basarisiz deneme yeni bir satir YAZMADI.
            Assert.Equal(2, await SatirSayisiAsync(context, user.Id));
        }
    }

    [Fact]
    public async Task Pencerede_bir_yorum_varken_ikinci_uretim_izin_verilir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            context.Add(NewInsight(user, Simdi.AddDays(-3)));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var saglayici = new SahteSaglayici(context);
            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
            Assert.Equal(2, await SatirSayisiAsync(context, user.Id));
        }
    }

    [Fact]
    public async Task Pencere_disindaki_yedi_gunden_eski_yorumlar_sinira_dahil_edilmez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            // Ikisi de pencerenin (son 7 gun) DISINDA -- sinir sifirlanmis olmali.
            context.AddRange(
                NewInsight(user, Simdi.AddDays(-10)),
                NewInsight(user, Simdi.AddDays(-8)));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var saglayici = new SahteSaglayici(context);
            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Suggestion_turu_haftalik_sinira_dahil_edilmez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            // Ikisi de Suggestion (henuz kurulmamis, ayri bir uretim akisi) -- Insight sinirini doldurmaz.
            context.AddRange(
                NewInsight(user, Simdi.AddDays(-1), AiInsightKind.Suggestion),
                NewInsight(user, Simdi.AddDays(-2), AiInsightKind.Suggestion));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var saglayici = new SahteSaglayici(context);
            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Baskasinin_yorumlari_kendi_sinirini_etkilemez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            var digerKullanici = TestDatabase.NewUser();
            context.AddRange(
                digerKullanici,
                NewInsight(digerKullanici, Simdi.AddDays(-1)),
                NewInsight(digerKullanici, Simdi.AddDays(-2)));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var saglayici = new SahteSaglayici(context);
            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
        }
    }
}
