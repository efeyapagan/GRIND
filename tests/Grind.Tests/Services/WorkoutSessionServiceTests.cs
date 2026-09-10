using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutSessionServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    /// <summary>Saati elde tutmak, gün sınırı testlerinin tek yolu.</summary>
    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime VarsayilanAn => new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, WorkoutSessionService Service, SahteSaat Saat, IAsyncDisposable Transaction)>
        CreateAsync(DateTime? an = null)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(an ?? VarsayilanAn);
        var service = new WorkoutSessionService(
            new WorkoutSessionRepository(context), new WorkoutTemplateRepository(context),
            new SetEntryRepository(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id), saat);

        return (context, user, service, saat, transaction);
    }

    private static WorkoutTemplate NewTemplate(User user, int plannedSets = 4) => new()
    {
        User = user,
        Name = $"Sablon {Guid.NewGuid():N}",
        CreatedAt = DateTime.UtcNow,
        TemplateExercises = { new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = plannedSets } }
    };

    // ---- Başlatma ----

    [Fact]
    public async Task Baslatilan_oturum_acik_ve_kullaniciya_ait()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.True(sonuc.Created);
            Assert.True(sonuc.Session.IsOpen);
            Assert.Null(sonuc.Session.EndedAt);
            Assert.Null(sonuc.Session.TemplateId);
        }
    }

    [Fact]
    public async Task Ayni_gun_ikinci_baslatma_var_olan_oturumu_dondurur()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ilk = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.False(ikinci.Created);
            Assert.Equal(ilk.Session.Id, ikinci.Session.Id);
        }
    }

    [Fact]
    public async Task Bitmis_oturum_varken_yeni_oturum_acilir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ilk = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);
            await service.FinishAsync(ilk.Session.Id);
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.True(ikinci.Created);
            Assert.NotEqual(ilk.Session.Id, ikinci.Session.Id);
        }
    }

    /// <summary>
    /// BU FAZIN MANŞET TESTİ. TR 23:00'te açılan oturum, ertesi gün TR 00:30'da
    /// "bugünün açık oturumu" SAYILMAMALI — yoksa kullanıcı kapatmayı unuttuğunda
    /// ertesi günün setleri dünkü oturuma (ve dünkü tarihe) düşer.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_gecince_dunun_acik_oturumu_bugunun_sayilmaz()
    {
        // TR 23:00 = UTC 20:00.
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var dun = await service.StartAsync(new StartSessionRequest());
            Assert.True(dun.Created);

            // TR ertesi gün 00:30 = UTC 21:30.
            saat.UtcNow = new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetOpenAsync());

            var bugun = await service.StartAsync(new StartSessionRequest());
            Assert.True(bugun.Created);
            Assert.NotEqual(dun.Session.Id, bugun.Session.Id);
        }
    }

    /// <summary>Aynı TR gününde kalırken açık oturum bulunmaya devam etmeli.</summary>
    [Fact]
    public async Task Ayni_TR_gununde_acik_oturum_bulunur()
    {
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 19, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            saat.UtcNow = new DateTime(2026, 3, 10, 20, 45, 0, DateTimeKind.Utc);   // TR 23:45, hâlâ aynı gün

            var acik = await service.GetOpenAsync();
            Assert.Equal(acilan.Session.Id, acik.Id);
        }
    }

    [Fact]
    public async Task Acik_oturum_yokken_GetOpenAsync_404_verir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetOpenAsync());
        }
    }

    // ---- Şablon referansı ----

    [Fact]
    public async Task Sablonlu_oturum_sablon_adini_ve_ilerlemeyi_tasir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });
            var detay = await service.GetByIdAsync(sonuc.Session.Id);

            Assert.Equal(sablon.Name, detay.TemplateName);
            Assert.Single(detay.Progress);
            Assert.Equal(4, detay.Progress[0].PlannedSets);
            Assert.Equal(0, detay.Progress[0].CompletedSets);
        }
    }

    [Fact]
    public async Task Baskasinin_sablonuyla_oturum_acilamaz_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = NewTemplate(digerKullanici);
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.StartAsync(new StartSessionRequest { TemplateId = digerSablon.Id }));
        }
    }

    [Fact]
    public async Task Var_olmayan_sablonla_oturum_acilamaz_404_verir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.StartAsync(new StartSessionRequest { TemplateId = 999_999_999 }));
        }
    }

    // ---- İlerleme ----

    [Fact]
    public async Task Ilerleme_gercek_set_sayisini_yansitir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });

            for (var i = 0; i < 2; i++)
            {
                context.Add(new SetEntry
                {
                    WorkoutSessionId = sonuc.Session.Id,
                    ExerciseId = 1,
                    Weight = 60m,
                    Reps = 8,
                    RecordType = RecordType.None,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await context.SaveChangesAsync();

            var detay = await service.GetByIdAsync(sonuc.Session.Id);

            Assert.Equal(4, detay.Progress[0].PlannedSets);
            Assert.Equal(2, detay.Progress[0].CompletedSets);
        }
    }

    [Fact]
    public async Task Sablonsuz_oturumda_ilerleme_bostur()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.Empty((await service.GetByIdAsync(sonuc.Session.Id)).Progress);
        }
    }

    // ---- Bitirme ve not ----

    [Fact]
    public async Task Bitirme_EndedAt_yazar_ve_oturumu_kapatir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var bitmis = await service.FinishAsync(sonuc.Session.Id);

            Assert.False(bitmis.IsOpen);
            Assert.Equal(saat.UtcNow, bitmis.EndedAt);
        }
    }

    [Fact]
    public async Task Bitmis_oturumu_tekrar_bitirmek_reddedilir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);
            await service.FinishAsync(sonuc.Session.Id);

            await Assert.ThrowsAsync<ConflictException>(() => service.FinishAsync(sonuc.Session.Id));
        }
    }

    [Fact]
    public async Task Not_guncellenebilir_ve_temizlenebilir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            var notlu = await service.UpdateNotesAsync(
                sonuc.Session.Id, new UpdateSessionNotesRequest { Notes = "Omuz sıkıştı" });
            Assert.Equal("Omuz sıkıştı", notlu.Notes);

            var temiz = await service.UpdateNotesAsync(
                sonuc.Session.Id, new UpdateSessionNotesRequest { Notes = null });
            Assert.Null(temiz.Notes);
        }
    }

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_oturumu_okunamaz_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerOturum.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumu_bitirilemez_ve_silinemez_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.FinishAsync(digerOturum.Id));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerOturum.Id));
        }
    }

    [Fact]
    public async Task Bulunamadi_mesaji_sahiplik_hakkinda_bilgi_vermez()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerOturum.Id));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(999_999_999));

            Assert.Equal(hicYok.Message, baskasinin.Message);
        }
    }

    // ---- Silme ----

    [Fact]
    public async Task Silinen_oturumun_setleri_de_gider()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            context.Add(new SetEntry
            {
                WorkoutSessionId = sonuc.Session.Id,
                ExerciseId = 1,
                Weight = 60m,
                Reps = 8,
                RecordType = RecordType.None,
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            await service.DeleteAsync(sonuc.Session.Id);
            context.ChangeTracker.Clear();

            Assert.Equal(0, await context.Set<SetEntry>()
                .CountAsync(s => s.WorkoutSessionId == sonuc.Session.Id));
            Assert.Null(await context.Set<WorkoutSession>()
                .FirstOrDefaultAsync(s => s.Id == sonuc.Session.Id));
        }
    }

    [Fact]
    public async Task Liste_yalnizca_kendi_oturumlarini_dondurur()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(TestDatabase.NewSession(digerKullanici));
            await context.SaveChangesAsync();

            var kendi = await service.StartAsync(new StartSessionRequest());
            var liste = await service.GetAllAsync();

            Assert.Single(liste);
            Assert.Equal(kendi.Session.Id, liste[0].Id);
        }
    }
}
