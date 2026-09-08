using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

/// <summary>
/// Kısmi güncelleme (PATCH). Gerekçesi somut bir kullanım sorunu: PUT tam değiştirme
/// olduğu için yalnızca kategoriyi düzeltmek isteyen kullanıcı adı da göndermek zorunda
/// kalıyor — ve Swagger gövdeyi <c>"name": "string"</c> diye ön-doldurduğu için egzersizin
/// adı sessizce "string" oluyordu.
/// </summary>
[Trait("Category", "Database")]
public class ExercisePatchTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static async Task<(AppDbContext Context, ExerciseService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var service = new ExerciseService(
            new ExerciseRepository(context), new Repository<ExerciseMedia>(context),
            new UnitOfWork(context), new StubCurrentUser(user.Id));

        return (context, service, transaction);
    }

    private static string UniqueName() => $"Egzersiz {Guid.NewGuid():N}";

    private static CreateExerciseRequest Create(string name) =>
        new() { Name = name, Category = ExerciseCategory.Push };

    /// <summary>Asıl derdin çözümü: adı hiç göndermeden kategoriyi değiştirebilmek.</summary>
    [Fact]
    public async Task Yalnizca_kategori_gonderilince_isim_degismez()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            var olusan = await service.CreateAsync(Create(name));

            var guncel = await service.PatchAsync(
                olusan.Id, new PatchExerciseRequest { Category = ExerciseCategory.Pull });

            Assert.Equal(ExerciseCategory.Pull, guncel.Category);
            Assert.Equal(name, guncel.Name);
        }
    }

    [Fact]
    public async Task Yalnizca_isim_gonderilince_kategori_degismez()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));
            var yeniAd = UniqueName();

            var guncel = await service.PatchAsync(
                olusan.Id, new PatchExerciseRequest { Name = yeniAd });

            Assert.Equal(yeniAd, guncel.Name);
            Assert.Equal(ExerciseCategory.Push, guncel.Category);
        }
    }

    /// <summary>
    /// Boş gövde DTO doğrulamasını geçiyor (nullable alanlarda kural yok, deneyle
    /// doğrulandı: 0 hata). Sessizce 200 dönmek, çağıranın isteğinin uygulandığını
    /// sanmasına yol açardı.
    /// </summary>
    [Fact]
    public async Task Hicbir_alan_gonderilmezse_reddedilir()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(olusan.Id, new PatchExerciseRequest()));
        }
    }

    /// <summary>PATCH de PUT ile aynı isim çakışması kuralına tabi.</summary>
    [Fact]
    public async Task Baska_bir_egzersizin_adina_cevirmek_reddedilir()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Create(UniqueName()));
            var ikinci = await service.CreateAsync(Create(UniqueName()));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.PatchAsync(ikinci.Id, new PatchExerciseRequest { Name = birinci.Name }));
        }
    }

    /// <summary>Kaydın kendi adını tekrar göndermek çakışma sayılmamalı (excludeId).</summary>
    [Fact]
    public async Task Kendi_adini_tekrar_gondermek_cakisma_saymaz()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            var guncel = await service.PatchAsync(
                olusan.Id, new PatchExerciseRequest { Name = olusan.Name, Category = ExerciseCategory.Legs });

            Assert.Equal(olusan.Name, guncel.Name);
            Assert.Equal(ExerciseCategory.Legs, guncel.Category);
        }
    }

    [Fact]
    public async Task Global_egzersiz_patchlenemez_403_verir()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Id 1 = seed edilmiş global "Bench Press".
            await Assert.ThrowsAsync<ForbiddenException>(
                () => service.PatchAsync(1, new PatchExerciseRequest { Category = ExerciseCategory.Pull }));
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizi_patchlenemez_404_verir()
    {
        var (context, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.PatchAsync(digerEgzersiz.Id, new PatchExerciseRequest { Category = ExerciseCategory.Pull }));
        }
    }

    /// <summary>Trim kuralı PATCH'te de geçerli: " A " kırpıldığında 2 karakterin altına düşüyor.</summary>
    [Fact]
    public async Task Kirpildiginda_cok_kisalan_isim_reddedilir()
    {
        var (_, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(olusan.Id, new PatchExerciseRequest { Name = " A " }));
        }
    }
}
