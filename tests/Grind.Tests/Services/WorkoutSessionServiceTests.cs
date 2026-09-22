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
        var currentUser = new StubCurrentUser(user.Id);
        var setRepository = new SetEntryRepository(context);
        var recordService = new PersonalRecordService(setRepository, currentUser);
        var service = new WorkoutSessionService(
            new WorkoutSessionRepository(context), new WorkoutTemplateRepository(context),
            setRepository, new SessionExerciseRepository(context), new ExerciseRepository(context),
            new UnitOfWork(context), currentUser, saat, recordService);

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
            // Issue #73: açık oturumda süre hesaplanamaz -- "şu ana kadar geçen süre" ile
            // doldurmak, devam eden bir oturumu bitmiş gibi gösterirdi.
            Assert.Null(sonuc.Session.DurationSeconds);
        }
    }

    /// <summary>
    /// FIX 1 REGRESYON TESTİ: eskiden `StartAsync`'in idempotent (var olan oturumu döndüren)
    /// dalı, `FindOpenTodayAsync`'in Include'suz döndürdüğü session'ı doğrudan `ProgressAsync`'e
    /// veriyordu; guard `Template is null` olduğu için bu şablonlu bir oturumda bile sessizce
    /// `templateName: null, progress: []` üretiyordu. Şablonsuz başlatılan bir testte bu ayrım
    /// hiç görünmezdi — bu yüzden burada BİLEREK şablonlu başlatılıyor.
    /// </summary>
    [Fact]
    public async Task Ayni_gun_ikinci_baslatma_var_olan_oturumu_dondurur()
    {
        var (context, user, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();

            var ilk = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });
            saat.UtcNow = saat.UtcNow.AddHours(1);

            // ChangeTracker.Clear() ÖNEMLİ: temizlenmezse EF'in identity map'i ilk
            // StartAsync'in zaten yüklediği Template navigasyonunu aynı context'te
            // bedavaya taşır ve bu test, üretimde her isteğin kendi (temiz) DbContext'iyle
            // geldiği gerçek hatayı YAKALAYAMAZ — bu satır olmadan aşağıdaki assertion'lar
            // kırık kodla bile (yanlışlıkla) yeşil kalır.
            context.ChangeTracker.Clear();

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.False(ikinci.Created);
            Assert.Equal(ilk.Session.Id, ikinci.Session.Id);
            Assert.Equal(sablon.Name, ikinci.Session.TemplateName);
            Assert.NotEmpty(ikinci.Session.Progress);
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
            await service.FinishAsync(ilk.Session.Id, new FinishSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.True(ikinci.Created);
            Assert.NotEqual(ilk.Session.Id, ikinci.Session.Id);
        }
    }

    /// <summary>
    /// BU FAZIN MANŞET TESTİ (issue #191). Eskiden TR 23:00'te açılan bir oturum, ertesi gün TR
    /// 00:30'da "bugünün açık oturumu" SAYILMIYORDU (takvim günü değişti diye) — kullanıcı gece
    /// antrenmanına devam edemiyor, yeni seti yeni bir oturuma düşüp antrenman ikiye bölünüyordu.
    /// Artık sınır takvim günü değil, süre penceresi (<see cref="WorkoutSessionService"/>'teki
    /// `AcikOturumPenceresi`, 6 saat): 1.5 saat sonrası hâlâ pencerenin İÇİNDE, oturum AYNI kalmalı.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_asan_acik_oturum_pencere_icindeyse_bulunur()
    {
        // TR 23:00 = UTC 20:00.
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var dun = await service.StartAsync(new StartSessionRequest());
            Assert.True(dun.Created);

            // TR ertesi gün 00:30 = UTC 21:30 -- başlangıçtan 1.5 saat sonra, 6 saatlik pencere içinde.
            saat.UtcNow = new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc);

            var acik = await service.GetOpenAsync();
            Assert.Equal(dun.Session.Id, acik.Id);

            var tekrarBaslatma = await service.StartAsync(new StartSessionRequest());
            Assert.False(tekrarBaslatma.Created);
            Assert.Equal(dun.Session.Id, tekrarBaslatma.Session.Id);
        }
    }

    /// <summary>
    /// Pencerenin (6 saat) DIŞINDA kalan, kapatılmayı unutulmuş bir oturum yine de "açık" sayılıp
    /// yeni setleri yutmamalı (CLAUDE.md'deki "unutulan açık session" korumasının süre bazlı hâli).
    /// </summary>
    [Fact]
    public async Task Pencere_disinda_kalan_unutulmus_acik_oturum_bulunmaz_yeni_oturum_acilir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 10, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var eski = await service.StartAsync(new StartSessionRequest());
            Assert.True(eski.Created);

            // 8 saat sonra -- 6 saatlik pencerenin dışında.
            saat.UtcNow = new DateTime(2026, 3, 10, 18, 0, 0, DateTimeKind.Utc);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetOpenAsync());

            var yeni = await service.StartAsync(new StartSessionRequest());
            Assert.True(yeni.Created);
            Assert.NotEqual(eski.Session.Id, yeni.Session.Id);
        }
    }

    /// <summary>Pencere içinde kalırken açık oturum bulunmaya devam etmeli.</summary>
    [Fact]
    public async Task Pencere_icindeki_acik_oturum_bulunur()
    {
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 19, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            saat.UtcNow = new DateTime(2026, 3, 10, 20, 45, 0, DateTimeKind.Utc);   // 1 saat 45 dk sonra

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

            var bitmis = await service.FinishAsync(sonuc.Session.Id, new FinishSessionRequest());

            Assert.False(bitmis.IsOpen);
            Assert.Equal(saat.UtcNow, bitmis.EndedAt);
            Assert.Equal(3600, bitmis.DurationSeconds);
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
            await service.FinishAsync(sonuc.Session.Id, new FinishSessionRequest());

            await Assert.ThrowsAsync<ConflictException>(() => service.FinishAsync(sonuc.Session.Id, new FinishSessionRequest()));
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

            await Assert.ThrowsAsync<NotFoundException>(() => service.FinishAsync(digerOturum.Id, new FinishSessionRequest()));
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

            // ChangeTracker.Clear() BURADA (silmeden ÖNCE): SetEntry hâlâ aynı context'te
            // tracked kalsaydı, EF'in kendi client-side cascade'i devreye girip DELETE
            // üretirdi ve test FK'de ON DELETE CASCADE olmasa bile yeşil kalırdı. Temizlik
            // sonrası sonucu üretebilecek TEK mekanizma veritabanının kendi FK kuralı kalır.
            context.ChangeTracker.Clear();
            await service.DeleteAsync(sonuc.Session.Id);

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

    // ---- Faz 8: set ekleme akışının kullandığı seam ----

    /// <summary>
    /// Seam'in VAROLUŞ SEBEBİ: kaydetmez. Set ekleme akışı oturumu ve yeni seti TEK
    /// SaveChangesAsync altında commit edebilsin diye. Kaydetseydi, arada "hiç seti olmayan
    /// boş oturum" penceresi kalırdı (istemci tam o anda çökerse kalıcı olarak).
    /// </summary>
    [Fact]
    public async Task Seam_yeni_oturumu_kaydetmez()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.True(created);
            Assert.Equal(0, session.Id);   // henüz DB'ye gitmedi, Id atanmadı
            Assert.Equal(0, await context.Set<WorkoutSession>()
                .CountAsync(s => s.UserId == user.Id));
        }
    }

    [Fact]
    public async Task Seam_bugunun_acik_oturumunu_dondurur()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.False(created);
            Assert.Equal(acilan.Session.Id, session.Id);
        }
    }

    /// <summary>
    /// Issue #191: takvim günü seam'i artık sınır DEĞİL. 23:00'te açılıp kapatılmayan oturum,
    /// ertesi TR gününde de (pencere içindeyse) AYNI oturum olarak kullanılmaya devam etmeli --
    /// bkz. <see cref="Gece_yarisini_asan_acik_oturum_pencere_icindeyse_bulunur"/>.
    /// </summary>
    [Fact]
    public async Task Seam_dunden_kalan_acik_oturum_pencere_icindeyse_kullanilir()
    {
        // TR 10 Mart 23:00 = UTC 10 Mart 20:00
        var (_, _, service, saat, transaction) = await CreateAsync(
            new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var dunku = await service.StartAsync(new StartSessionRequest());

            // TR 11 Mart 00:30 = UTC 10 Mart 21:30 — ertesi TR günü, ama pencere (6 saat) içinde.
            saat.UtcNow = new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc);

            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.False(created);
            Assert.Equal(dunku.Session.Id, session.Id);
        }
    }

    [Fact]
    public async Task Seam_baskasinin_sablonuyla_oturum_acmaz()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();
            var digerSablon = NewTemplate(digerKullanici);
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetOrOpenTodayAsync(digerSablon.Id, null));
        }
    }

    /// <summary>
    /// Seam ile açılıp commit edilen oturum, StartAsync tarafından "var olan" sayılmalı —
    /// yani iki akış AYNI "bugünün açık oturumu" tanımını paylaşıyor (DRY'ın gözlemlenebilir
    /// sonucu). Ayrı ayrı yazılsalardı bu test iki oturum görürdü.
    /// </summary>
    [Fact]
    public async Task Seam_ile_acilan_oturum_StartAsync_tarafindan_yeniden_acilmaz()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var (session, _) = await service.GetOrOpenTodayAsync(null, null);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.False(sonuc.Created);
            Assert.Equal(session.Id, sonuc.Session.Id);
        }
    }

    // ---- Faz 8: silme sonrası rekor yeniden hesabı ----

    /// <summary>
    /// Setleri elle kurar (SetEntryService'e bağımlı olmadan): iki oturum, aynı egzersiz.
    /// Birinci oturumdaki 100'lük rekor silinince, ikinci oturumdaki 90'lık set rekora
    /// terfi etmeli. Yeniden hesap hiç çağrılmazsa 90'lık set None kalır.
    /// </summary>
    [Fact]
    public async Task Oturum_silinince_etkilenen_egzersizin_rekorlari_yeniden_hesaplanir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var kalacak = TestDatabase.NewSession(user);
            context.AddRange(exercise, silinecek, kalacak);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            var agir = new SetEntry
            {
                WorkoutSession = silinecek, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
            };
            var hafif = new SetEntry
            {
                WorkoutSession = kalacak, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
            };
            context.AddRange(agir, hafif);
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            var kalan = await context.Set<SetEntry>().SingleAsync(s => s.Id == hafif.Id);

            Assert.Equal(RecordType.Weight, kalan.RecordType);
            Assert.Equal(0, await context.Set<SetEntry>().CountAsync(s => s.Id == agir.Id));
        }
    }

    /// <summary>
    /// İki farklı egzersize dokunan bir oturum silinince İKİSİ de yeniden hesaplanmalı —
    /// distinct liste üzerinden, her set için ayrı ayrı değil.
    /// </summary>
    [Fact]
    public async Task Oturum_silinince_dokundugu_her_egzersiz_yeniden_hesaplanir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinciEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var ikinciEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var kalacak = TestDatabase.NewSession(user);
            context.AddRange(birinciEgzersiz, ikinciEgzersiz, silinecek, kalacak);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            var kalanlar = new List<SetEntry>();

            foreach (var exercise in new[] { birinciEgzersiz, ikinciEgzersiz })
            {
                context.Add(new SetEntry
                {
                    WorkoutSession = silinecek, Exercise = exercise,
                    Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
                });
                var kalan = new SetEntry
                {
                    WorkoutSession = kalacak, Exercise = exercise,
                    Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
                };
                context.Add(kalan);
                kalanlar.Add(kalan);
            }
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            foreach (var kalan in kalanlar)
            {
                var guncel = await context.Set<SetEntry>().SingleAsync(s => s.Id == kalan.Id);
                Assert.Equal(RecordType.Weight, guncel.RecordType);
            }
        }
    }

    [Fact]
    public async Task Oturum_silinince_baskasinin_rekorlarina_dokunulmaz()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var digerKullanici = TestDatabase.NewUser();
            context.AddRange(exercise, silinecek, digerKullanici);
            await context.SaveChangesAsync();

            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            context.Add(new SetEntry
            {
                WorkoutSession = silinecek, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
            });
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
            };
            context.Add(digerSet);
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            var guncel = await context.Set<SetEntry>().SingleAsync(s => s.Id == digerSet.Id);

            Assert.Equal(RecordType.None, guncel.RecordType);
        }
    }

    /// <summary>REGRESYON: setsiz oturum silme Faz 7'de çalışıyordu, çalışmaya devam etmeli.</summary>
    [Fact]
    public async Task Setsiz_oturum_silinebilir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            await service.DeleteAsync(acilan.Session.Id);

            Assert.Equal(0, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    // ---- #60/#62: antrenmanin hareket listesi ----

    /// <summary>
    /// Sablon hareketleri (sira, hedef, dinlenme) antrenman baslarken KOPYALANIR. Sablon sonradan
    /// degisse de baslamis antrenmanin ilerlemesi degismez -- eskiden ilerleme sablondan canli
    /// uretildigi icin degisirdi.
    /// </summary>
    [Fact]
    public async Task Sablonla_baslayinca_hareketler_kopyalanir_ve_sablon_degisikligi_ilerlemeyi_etkilemez()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = new WorkoutTemplate
            {
                User = user,
                Name = $"Sablon {Guid.NewGuid():N}",
                CreatedAt = DateTime.UtcNow,
                TemplateExercises =
                {
                    new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = 4, RestSeconds = 120 },
                    new TemplateExercise { ExerciseId = 2, OrderIndex = 1, PlannedSets = 3, RestSeconds = 60 }
                }
            };
            context.Add(sablon);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });

            sablon.TemplateExercises.Clear();
            sablon.TemplateExercises.Add(new TemplateExercise { ExerciseId = 3, OrderIndex = 0, PlannedSets = 5 });
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var detay = await service.GetByIdAsync(sonuc.Session.Id);

            Assert.Collection(
                detay.Progress,
                ilk =>
                {
                    Assert.Equal(1, ilk.ExerciseId);
                    Assert.Equal(4, ilk.PlannedSets);
                    Assert.Equal(120, ilk.RestSeconds);
                },
                ikinci =>
                {
                    Assert.Equal(2, ikinci.ExerciseId);
                    Assert.Equal(3, ikinci.PlannedSets);
                    Assert.Equal(60, ikinci.RestSeconds);
                });
        }
    }

    [Fact]
    public async Task Eklenen_hareket_sona_hedefsiz_eklenir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            var yeni = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.AddRange(sablon, yeni);
            await context.SaveChangesAsync();
            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });

            var guncel = await service.AddExerciseAsync(
                sonuc.Session.Id, new AddSessionExerciseRequest { ExerciseId = yeni.Id });

            Assert.Equal(2, guncel.Progress.Count);
            var eklenen = guncel.Progress[1];
            Assert.Equal(yeni.Id, eklenen.ExerciseId);
            Assert.Null(eklenen.PlannedSets);
            Assert.Equal(TemplateExercise.DefaultRestSeconds, eklenen.RestSeconds);
            Assert.Equal(0, eklenen.CompletedSets);
        }
    }

    [Fact]
    public async Task Gecersiz_hareket_eklemeleri_reddedilir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);   // ExerciseId = 1 zaten listede
            var digerKullanici = TestDatabase.NewUser();
            var yabanci = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            var arsivli = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            arsivli.IsArchived = true;
            context.AddRange(sablon, digerKullanici, yabanci, arsivli);
            await context.SaveChangesAsync();
            var id = (await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id })).Session.Id;

            await Assert.ThrowsAsync<ConflictException>(
                () => service.AddExerciseAsync(id, new AddSessionExerciseRequest { ExerciseId = 1 }));
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.AddExerciseAsync(id, new AddSessionExerciseRequest { ExerciseId = yabanci.Id }));
            await Assert.ThrowsAsync<ValidationException>(
                () => service.AddExerciseAsync(id, new AddSessionExerciseRequest { ExerciseId = arsivli.Id }));
        }
    }

    /// <summary>Gecmis antrenmani duzenlemek kapsam disi: bitmis oturum 409.</summary>
    [Fact]
    public async Task Bitmis_oturuma_hareket_eklenemez_ve_kaldirilamaz_409_verir()
    {
        var (context, user, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();
            var id = (await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id })).Session.Id;
            saat.UtcNow = saat.UtcNow.AddHours(1);
            await service.FinishAsync(id, new FinishSessionRequest());

            await Assert.ThrowsAsync<ConflictException>(
                () => service.AddExerciseAsync(id, new AddSessionExerciseRequest { ExerciseId = 2 }));
            await Assert.ThrowsAsync<ConflictException>(() => service.RemoveExerciseAsync(id, 1));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumuna_hareket_eklenemez_ve_kaldirilamaz_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.AddExerciseAsync(digerOturum.Id, new AddSessionExerciseRequest { ExerciseId = 1 }));
            await Assert.ThrowsAsync<NotFoundException>(() => service.RemoveExerciseAsync(digerOturum.Id, 1));
        }
    }

    /// <summary>
    /// Kaldirma: satir ve YALNIZCA o hareketin bu antrenmandaki setleri gider; digerinin seti kalir.
    /// Silinen 100'luk rekor yuzunden baska bir antrenmandaki 90'lik set rekora terfi etmeli --
    /// yeniden hesap hic calismazsa None kalir.
    /// </summary>
    [Fact]
    public async Task Hareket_kaldirilinca_satiri_ve_yalnizca_onun_setleri_gider_rekorlar_yeniden_hesaplanir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var kaldirilacak = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var kalacak = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var sablon = new WorkoutTemplate
            {
                User = user,
                Name = $"Sablon {Guid.NewGuid():N}",
                CreatedAt = DateTime.UtcNow,
                TemplateExercises =
                {
                    new TemplateExercise { Exercise = kaldirilacak, OrderIndex = 0, PlannedSets = 3 },
                    new TemplateExercise { Exercise = kalacak, OrderIndex = 1, PlannedSets = 3 }
                }
            };
            // KAPALI: yalnizca rekor-yeniden-hesap testine bir "baska antrenman" konteyneri olarak
            // lazim -- ayni kullanicinin AYNI ANDA iki acik oturumu olamaz, ve acik birakilirsa
            // `service.StartAsync` asagida bunu (gercek DateTime.UtcNow ile olusturuldugu icin,
            // sahte saatten bagimsiz olarak) "son pencerede acik oturum" sanip yanlislikla bulurdu.
            var baskaOturum = TestDatabase.NewSession(user);
            baskaOturum.EndedAt = baskaOturum.StartedAt.AddMinutes(30);
            context.AddRange(kaldirilacak, kalacak, sablon, baskaOturum);
            await context.SaveChangesAsync();
            var id = (await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id })).Session.Id;

            var an = VarsayilanAn;
            context.AddRange(
                new SetEntry
                {
                    WorkoutSessionId = id, Exercise = kaldirilacak,
                    Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
                },
                new SetEntry
                {
                    WorkoutSessionId = id, Exercise = kalacak,
                    Weight = 50m, Reps = 10, RecordType = RecordType.Weight, CreatedAt = an
                });
            var sonraki = new SetEntry
            {
                WorkoutSession = baskaOturum, Exercise = kaldirilacak,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
            };
            context.Add(sonraki);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            await service.RemoveExerciseAsync(id, kaldirilacak.Id);

            context.ChangeTracker.Clear();
            Assert.Equal(0, await context.Set<SetEntry>()
                .CountAsync(s => s.WorkoutSessionId == id && s.ExerciseId == kaldirilacak.Id));
            Assert.Equal(1, await context.Set<SetEntry>()
                .CountAsync(s => s.WorkoutSessionId == id && s.ExerciseId == kalacak.Id));
            Assert.Equal(RecordType.Weight, (await context.Set<SetEntry>().SingleAsync(s => s.Id == sonraki.Id)).RecordType);

            var detay = await service.GetByIdAsync(id);
            Assert.Equal(kalacak.Id, Assert.Single(detay.Progress).ExerciseId);
        }
    }

    [Fact]
    public async Task Antrenmanda_olmayan_hareketi_kaldirmak_404_verir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);   // yalnizca ExerciseId = 1
            context.Add(sablon);
            await context.SaveChangesAsync();
            var id = (await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id })).Session.Id;

            await Assert.ThrowsAsync<NotFoundException>(() => service.RemoveExerciseAsync(id, 2));
        }
    }
}
