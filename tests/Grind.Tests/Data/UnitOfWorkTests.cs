using Grind.Api.Common.Exceptions;
using Grind.Api.Data;
using Grind.Api.Repositories;

namespace Grind.Tests.Data;

[Trait("Category", "Database")]
public class UnitOfWorkTests
{
    /// <summary>
    /// Servisteki uygulama-seviyesi ön-kontrolü (<c>AuthService.RegisterAsync</c>'in
    /// <c>UsernameExistsAsync</c> çağrısı) BİLEREK atlanıyor — bu test onun yerine geçmiyor,
    /// ön-kontrolün arasından geçen bir race koşulunun DB seviyesinde nasıl karşılandığını
    /// gerçek bir eşzamanlı istek göndermeden (flaky olmayacak şekilde) doğruluyor: aynı
    /// username'e sahip iki <see cref="Grind.Api.Models.Entities.User"/> doğrudan eklenip
    /// unique index'in (IX_Users_Username) bunu 23505 ile reddettiği ve
    /// <see cref="UnitOfWork"/>'ün bunu jenerik bir <see cref="ConflictException"/>'a
    /// çevirdiği kontrol ediliyor.
    /// </summary>
    [Fact]
    public async Task SaveChangesAsync_unique_ihlalinde_ConflictException_firlatir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);
        var unitOfWork = new UnitOfWork(context);

        var first = TestDatabase.NewUser();
        repository.Add(first);
        await unitOfWork.SaveChangesAsync();

        var second = TestDatabase.NewUser();
        second.Username = first.Username;
        repository.Add(second);

        await Assert.ThrowsAsync<ConflictException>(() => unitOfWork.SaveChangesAsync());

        await transaction.RollbackAsync();
    }
}
