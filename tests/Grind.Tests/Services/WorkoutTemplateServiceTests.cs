using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutTemplateServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static async Task<(AppDbContext Context, User User, WorkoutTemplateService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var service = new WorkoutTemplateService(
            new WorkoutTemplateRepository(context), new ExerciseRepository(context),
            new UnitOfWork(context), new StubCurrentUser(user.Id));

        return (context, user, service, transaction);
    }

    private static string UniqueName() => $"Sablon {Guid.NewGuid():N}";

    private static TemplateExerciseRequest Satir(long exerciseId, int plannedSets = 4) =>
        new() { ExerciseId = exerciseId, PlannedSets = plannedSets };

    private static CreateTemplateRequest Create(string name, params TemplateExerciseRequest[] satirlar) =>
        new() { Name = name, Exercises = [.. satirlar] };

    // ---- Oluşturma ve sıralama ----

    [Fact]
    public async Task Olusturulan_sablon_listede_gorunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11, 3)));

            Assert.Equal(2, olusan.Exercises.Count);
            Assert.Contains(await service.GetAllAsync(), t => t.Id == olusan.Id);
        }
    }

    /// <summary>Sıra istemciden gelmiyor, dizideki konumdan türüyor — çakışma imkânsız.</summary>
    [Fact]
    public async Task OrderIndex_dizideki_konumdan_turer()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(11), Satir(1), Satir(6)));

            Assert.Equal([0, 1, 2], olusan.Exercises.Select(e => e.OrderIndex));
            Assert.Equal([11L, 1L, 6L], olusan.Exercises.Select(e => e.ExerciseId));
        }
    }

    [Fact]
    public async Task Bos_sablon_olusturulabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(new CreateTemplateRequest { Name = UniqueName(), Exercises = [] });

            Assert.Empty(olusan.Exercises);
        }
    }

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_sablonu_okunamaz_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = new WorkoutTemplate { User = digerKullanici, Name = UniqueName(), CreatedAt = DateTime.UtcNow };
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerSablon.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_sablonu_guncellenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = new WorkoutTemplate { User = digerKullanici, Name = UniqueName(), CreatedAt = DateTime.UtcNow };
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(
                digerSablon.Id, new UpdateTemplateRequest { Name = UniqueName(), Exercises = [] }));
        }
    }

    /// <summary>
    /// Şablona eklenen HER egzersiz id'si ayrı bir IDOR yüzeyi: başkasının egzersizini
    /// kendi şablonuna referans veremezsin.
    /// </summary>
    [Fact]
    public async Task Baskasinin_egzersizi_sablona_eklenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(digerEgzersiz.Id))));
        }
    }

    [Fact]
    public async Task Var_olmayan_egzersiz_id_si_404_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(999_999_999))));
        }
    }

    /// <summary>
    /// 404 mesajı hangi id'nin erişilemez olduğunu SÖYLEMEMELİ — söylerse saldırgan
    /// id tarayarak hangi id'lerin dolu olduğunu haritalayabilir (Faz 3 kararı).
    /// </summary>
    [Fact]
    public async Task Erisilemeyen_egzersiz_mesaji_id_sizdirmaz()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(digerEgzersiz.Id))));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(999_999_999))));

            Assert.Equal(hicYok.Message, baskasinin.Message);
            Assert.DoesNotContain(digerEgzersiz.Id.ToString(), baskasinin.Message);
        }
    }

    // ---- Egzersiz kuralları ----

    [Fact]
    public async Task Ayni_egzersiz_iki_kez_eklenemez()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(1), Satir(1, 3))));
        }
    }

    [Fact]
    public async Task Arsivlenmis_egzersiz_sablona_eklenemez()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var arsivli = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            arsivli.IsArchived = true;
            context.Add(arsivli);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(arsivli.Id))));
        }
    }

    /// <summary>Yazarken katı, okurken hoşgörülü: sonradan arşivlenen egzersiz şablonda kalır.</summary>
    [Fact]
    public async Task Sonradan_arsivlenen_egzersiz_sablonda_gorunmeye_devam_eder()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var egzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(egzersiz);
            await context.SaveChangesAsync();

            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(egzersiz.Id)));

            egzersiz.IsArchived = true;
            await context.SaveChangesAsync();

            var okunan = await service.GetByIdAsync(olusan.Id);

            Assert.Single(okunan.Exercises);
            Assert.True(okunan.Exercises[0].IsArchived);
        }
    }

    /// <summary>
    /// Arşiv kuralı yalnızca YENİ seçimlere uygulanır: şablonda zaten olan arşivlenmiş bir
    /// satırı olduğu gibi (hatta yeniden sıralanmış olarak) korumak yeni bir seçim değildir.
    /// Aksi hâlde sonradan arşivlenen tek bir egzersiz, şablonun listesini kalıcı olarak
    /// kilitlerdi — bir yeniden sıralama bile 400 dönerdi.
    /// </summary>
    [Fact]
    public async Task Sonradan_arsivlenen_egzersiz_icin_yeniden_siralama_basarili_olur()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var arsivlenecek = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(arsivlenecek);
            await context.SaveChangesAsync();

            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(arsivlenecek.Id), Satir(1)));

            arsivlenecek.IsArchived = true;
            await context.SaveChangesAsync();

            // Aynı iki satır, sırası değişmiş halde geri gönderiliyor — yeni bir seçim yok.
            var guncel = await service.UpdateAsync(olusan.Id, new UpdateTemplateRequest
            {
                Name = olusan.Name,
                Exercises = [Satir(1), Satir(arsivlenecek.Id)]
            });

            Assert.Equal(2, guncel.Exercises.Count);
            Assert.Equal([1L, arsivlenecek.Id], guncel.Exercises.Select(e => e.ExerciseId));
        }
    }

    /// <summary>Korumakla eklemek farklı: mevcut arşivli satır kalabilir ama YENİ bir
    /// arşivli egzersiz eklemek hâlâ reddedilmeli.</summary>
    [Fact]
    public async Task Sonradan_arsivlenen_egzersiz_varken_yeni_arsivli_egzersiz_eklenemez()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var arsivlenecek = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var digerArsivli = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(arsivlenecek);
            context.Add(digerArsivli);
            await context.SaveChangesAsync();

            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(arsivlenecek.Id)));

            arsivlenecek.IsArchived = true;
            digerArsivli.IsArchived = true;
            await context.SaveChangesAsync();

            // arsivlenecek zaten şablonda (korunuyor), digerArsivli YENİ bir seçim.
            await Assert.ThrowsAsync<ValidationException>(() => service.UpdateAsync(olusan.Id,
                new UpdateTemplateRequest
                {
                    Name = olusan.Name,
                    Exercises = [Satir(arsivlenecek.Id), Satir(digerArsivli.Id)]
                }));
        }
    }

    // ---- İsim çakışması ----

    [Fact]
    public async Task Ayni_sablon_adi_farkli_harf_buyuklugunde_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            await service.CreateAsync(Create(name, Satir(1)));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.CreateAsync(Create(name.ToUpperInvariant(), Satir(11))));
        }
    }

    // ---- Güncelleme ----

    [Fact]
    public async Task Update_listeyi_toptan_degistirir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));

            var guncel = await service.UpdateAsync(olusan.Id,
                new UpdateTemplateRequest { Name = olusan.Name, Exercises = [Satir(6, 5)] });

            Assert.Single(guncel.Exercises);
            Assert.Equal(6L, guncel.Exercises[0].ExerciseId);

            // Eski satırlar veritabanından GERÇEKTEN gitmiş olmalı — yalnızca yanıttan değil.
            var kalanSatirSayisi = await context.Set<TemplateExercise>()
                .CountAsync(te => te.WorkoutTemplateId == olusan.Id);
            Assert.Equal(1, kalanSatirSayisi);
        }
    }

    /// <summary>PATCH'in var olma sebebi: adı değiştirmek için listeyi göndermek gerekmesin.</summary>
    [Fact]
    public async Task Patch_yalnizca_adi_degistirince_liste_korunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));
            var yeniAd = UniqueName();

            var guncel = await service.PatchAsync(olusan.Id, new PatchTemplateRequest { Name = yeniAd });

            Assert.Equal(yeniAd, guncel.Name);
            Assert.Equal(2, guncel.Exercises.Count);
        }
    }

    [Fact]
    public async Task Patch_hicbir_alan_gonderilmezse_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(olusan.Id, new PatchTemplateRequest()));
        }
    }

    // ---- Silme (Faz 1'de konfigüre edildi, burada doğrulanıyor) ----

    // NOT: aşağıdaki iki test BİLEREK service.DeleteAsync KULLANMAZ. EF, aynı context'te
    // tracked olan child'lar için (templateRepository.Remove + SaveChangesAsync akışında)
    // veritabanına gitmeden ÖNCE kendi client-side cascade'ini uygular — yani service
    // üzerinden silinirse bu testler, migration'daki onDelete kuralı YANLIŞ yazılmış olsa
    // bile yeşil kalırdı (asıl doğrulanması gereken şey tam olarak bu kural). Bunun yerine
    // ExecuteDeleteAsync kullanılıyor: bu, tek bir "DELETE FROM WorkoutTemplates WHERE
    // Id = @id" SQL'i üretir, hiçbir child entity'yi yüklemez/izlemez/silmez — sonucu
    // üretebilecek TEK mekanizma veritabanının kendi FK kuralı (CASCADE / SET NULL) olur.

    [Fact]
    public async Task Silinen_sablonun_TemplateExercise_satirlari_da_gider()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));

            context.ChangeTracker.Clear();
            await context.Set<WorkoutTemplate>().Where(t => t.Id == olusan.Id).ExecuteDeleteAsync();

            Assert.Equal(0, await context.Set<TemplateExercise>()
                .CountAsync(te => te.WorkoutTemplateId == olusan.Id));
        }
    }

    /// <summary>
    /// Şablon silinince o şablondan başlatılmış oturum SİLİNMEZ, yalnızca TemplateId'si
    /// NULL olur — geçmiş antrenman kaydı korunmalı.
    /// </summary>
    [Fact]
    public async Task Silinen_sablonun_oturumu_silinmez_TemplateId_null_olur()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));
            var oturum = TestDatabase.NewSession(user);
            oturum.TemplateId = olusan.Id;
            context.Add(oturum);
            await context.SaveChangesAsync();

            context.ChangeTracker.Clear();
            await context.Set<WorkoutTemplate>().Where(t => t.Id == olusan.Id).ExecuteDeleteAsync();

            var kalanOturum = await context.Set<WorkoutSession>().FirstOrDefaultAsync(s => s.Id == oturum.Id);
            Assert.NotNull(kalanOturum);
            Assert.Null(kalanOturum.TemplateId);
        }
    }
}
