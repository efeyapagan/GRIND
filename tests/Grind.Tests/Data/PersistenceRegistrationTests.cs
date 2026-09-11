using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Data;

// Sınıftaki son test gerçek veritabanına yazıyor; diğer DB testleriyle aynı etiket.
[Trait("Category", "Database")]
public class PersistenceRegistrationTests
{
    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddPersistence(TestDatabase.ConnectionString);
        return services.BuildServiceProvider(validateScopes: true);
    }

    [Theory]
    [InlineData(typeof(AppDbContext))]
    [InlineData(typeof(IUnitOfWork))]
    [InlineData(typeof(IUserRepository))]
    [InlineData(typeof(IExerciseRepository))]
    [InlineData(typeof(IWorkoutSessionRepository))]
    [InlineData(typeof(ISetEntryRepository))]
    [InlineData(typeof(IAiInsightRepository))]
    public void Kayitli_tipler_cozulebilir(Type serviceType)
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService(serviceType));
    }

    [Fact]
    public void Generic_repository_de_cozulebilir()
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IRepository<BodyWeightLog>>());
    }

    [Fact]
    public async Task UnitOfWork_degisiklikleri_kalici_hale_getirir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        IUnitOfWork unitOfWork = new UnitOfWork(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);

        var affected = await unitOfWork.SaveChangesAsync();

        Assert.Equal(1, affected);
        Assert.True(user.Id > 0);
        await transaction.RollbackAsync();
    }
}
