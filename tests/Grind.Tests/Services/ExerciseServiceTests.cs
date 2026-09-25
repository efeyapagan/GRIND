using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class ExerciseServiceTests
{
    /// <summary>Sabit bir kullanıcıyı temsil eder; gerçek HttpContext'e ihtiyaç yok.</summary>
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static ExerciseService ServiceFor(AppDbContext context, User user) =>
        new(new ExerciseRepository(context), new Repository<ExerciseMedia>(context),
            new UnitOfWork(context), new StubCurrentUser(user.Id));

    private static string UniqueName() => $"Egzersiz {Guid.NewGuid():N}";

    /// <summary>Bir kullanıcı ve onun için hazır bir servis üretir.</summary>
    private static async Task<(AppDbContext Context, User User, ExerciseService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();
        return (context, user, ServiceFor(context, user), transaction);
    }

    private static CreateExerciseRequest Create(string name) =>
        new() { Name = name, Category = ExerciseCategory.Push };

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_egzersizi_okunamaz_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerEgzersiz.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizi_guncellenemez_403_DEGIL_404_verir()
    {
        // 403 dönmek "böyle bir kayıt var ama senin değil" bilgisini sızdırırdı; saldırgan
        // Id tarayarak hangi Id'lerin dolu olduğunu haritalayabilirdi (Faz 3 kararı).
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(
                digerEgzersiz.Id, new UpdateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Pull }));
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizine_medya_eklenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.AddMediaAsync(
                digerEgzersiz.Id, new AddMediaRequest { MediaType = MediaType.Video, Url = "https://a.co/v.mp4" }));
        }
    }

    [Fact]
    public async Task Bulunamadi_mesaji_sahiplik_hakkinda_bilgi_vermez()
    {
        // 404-over-403 kararını koruyan test: mesaj "size ait değil" gibi bir şey derse
        // durum kodunu nötrleştirmenin bir anlamı kalmaz.
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetByIdAsync(digerEgzersiz.Id));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetByIdAsync(999_999_999));

            Assert.Equal(hicYok.Message, baskasinin.Message);
        }
    }

    // ---- Global egzersizler ----

    [Fact]
    public async Task Global_egzersiz_guncellenemez_403_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Id 1 = seed edilmiş global "Bench Press".
            await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateAsync(
                1, new UpdateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Pull }));
        }
    }

    [Fact]
    public async Task Global_egzersiz_arsivlenemez_403_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ForbiddenException>(() => service.ArchiveAsync(1));
        }
    }

    [Fact]
    public async Task Global_egzersize_medya_eklenemez_403_verir()
    {
        // ExerciseMedia'nın sahibi yok: global bir egzersize eklenen medya BÜTÜN kullanıcılara
        // görünürdü. "Global kaydı değiştiremezsin" kuralı bu yüzden medyaya da uzanıyor.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ForbiddenException>(() => service.AddMediaAsync(
                1, new AddMediaRequest { MediaType = MediaType.Video, Url = "https://a.co/v.mp4" }));
        }
    }

    [Fact]
    public async Task Global_egzersiz_okunabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var global = await service.GetByIdAsync(1);

            Assert.True(global.IsGlobal);
            Assert.NotEmpty(global.Name);
        }
    }

    // ---- İsim çakışması ----

    [Fact]
    public async Task Ayni_isim_farkli_harf_buyuklugunde_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            await service.CreateAsync(Create(name));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.CreateAsync(Create(name.ToUpperInvariant())));
        }
    }

    [Fact]
    public async Task Global_bir_egzersizin_adi_tekrar_kullanilamaz()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var globalAd = (await new ExerciseRepository(context).GetVisibleByIdAsync(1, 0))!.Name;

            await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Create(globalAd)));
        }
    }

    [Fact]
    public async Task Arsivlenmis_bir_egzersizin_adi_hala_dolu_sayilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            var olusan = await service.CreateAsync(Create(name));
            await service.ArchiveAsync(olusan.Id);

            await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Create(name)));
        }
    }

    [Fact]
    public async Task Yalnizca_kategori_degistirmek_cakisma_saymaz()
    {
        // excludeId olmadan bu 409 verirdi — kayıt kendi adıyla çakışırdı.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            var olusan = await service.CreateAsync(Create(name));

            var guncel = await service.UpdateAsync(olusan.Id,
                new UpdateExerciseRequest { Name = name, Category = ExerciseCategory.Legs });

            Assert.Equal(ExerciseCategory.Legs, guncel.Category);
            Assert.Equal(name, guncel.Name);
        }
    }

    // ---- Arşivleme ----

    [Fact]
    public async Task Arsivlenen_egzersiz_varsayilan_listede_gorunmez_ama_istenirse_gorunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));
            await service.ArchiveAsync(olusan.Id);

            var varsayilan = await service.GetAllAsync();
            var arsivDahil = await service.GetAllAsync(includeArchived: true);

            Assert.DoesNotContain(varsayilan, e => e.Id == olusan.Id);
            Assert.Contains(arsivDahil, e => e.Id == olusan.Id && e.IsArchived);
        }
    }

    [Fact]
    public async Task Arsivden_geri_alinabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));
            await service.ArchiveAsync(olusan.Id);

            await service.RestoreAsync(olusan.Id);

            Assert.Contains(await service.GetAllAsync(), e => e.Id == olusan.Id);
        }
    }

    // ---- Takma ad (#335) ----

    [Fact]
    public async Task AlternateName_GetById_ve_GetAll_yanitina_yansir()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var egzersiz = TestDatabase.NewExercise(user, UniqueName());
            egzersiz.AlternateName = "Takma Ad";
            context.Add(egzersiz);
            await context.SaveChangesAsync();

            var detay = await service.GetByIdAsync(egzersiz.Id);
            var liste = await service.GetAllAsync();

            Assert.Equal("Takma Ad", detay.AlternateName);
            Assert.Contains(liste, e => e.Id == egzersiz.Id && e.AlternateName == "Takma Ad");
        }
    }

    [Fact]
    public async Task AlternateName_verilmemis_egzersizde_null_doner()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            Assert.Null(olusan.AlternateName);
        }
    }

    // ---- Medya ----

    [Fact]
    public async Task Kendi_egzersizine_medya_eklenip_silinebilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            var medya = await service.AddMediaAsync(olusan.Id,
                new AddMediaRequest { MediaType = MediaType.Gif, Url = "https://ornek.com/hareket.gif" });

            var medyali = await service.GetByIdAsync(olusan.Id);
            Assert.Single(medyali.Media);

            await service.RemoveMediaAsync(olusan.Id, medya.Id);

            Assert.Empty((await service.GetByIdAsync(olusan.Id)).Media);
        }
    }

    [Fact]
    public async Task Baska_egzersize_ait_medya_silinemez_404_verir()
    {
        // mediaId'nin gerçekten bu egzersize ait olduğu doğrulanmazsa, kullanıcı kendi
        // egzersizinin Id'siyle başkasının medyasını silebilirdi.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Create(UniqueName()));
            var ikinci = await service.CreateAsync(Create(UniqueName()));
            var ikincininMedyasi = await service.AddMediaAsync(ikinci.Id,
                new AddMediaRequest { MediaType = MediaType.Video, Url = "https://ornek.com/v.mp4" });

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.RemoveMediaAsync(birinci.Id, ikincininMedyasi.Id));
        }
    }

    // ---- Oluşturma ----

    [Fact]
    public async Task Olusturulan_egzersiz_kullaniciya_ait_ve_global_degil()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            Assert.False(olusan.IsGlobal);
            Assert.False(olusan.IsArchived);
            Assert.Contains(await service.GetAllAsync(), e => e.Id == olusan.Id);
        }
    }

    /// <summary>
    /// [Required], <c>AllowEmptyStrings = false</c> olduğunda dizeyi TRIM'leyip kontrol eder —
    /// yani "   " (yalnızca boşluk) gerçek bir HTTP isteğinde zaten DTO katmanında reddedilir,
    /// servise hiç ulaşmaz. Bu guard'ın asıl var olma sebebi PADDED bir isim: " A " gibi,
    /// [Required]'i VE [StringLength(MinimumLength = 2)]'yi geçer (uzunluğu 3), ama Trim'den
    /// sonra tek karaktere düşer — bunu ancak servis, Trim'den SONRA uzunluğa bakarak yakalar.
    /// "   " için servisi doğrudan (DTO doğrulamasını atlayarak) çağırmak da aynı guard'a
    /// takılır — bu ayrı bir savunma katmanı, ama guard'ın VAR OLMA sebebi o değil.
    /// </summary>
    [Theory]
    [InlineData(" A ")]
    [InlineData("   ")]
    public async Task Trim_sonrasi_kisa_kalan_isim_reddedilir(string name)
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(new CreateExerciseRequest { Name = name, Category = ExerciseCategory.Push }));
        }
    }
}
