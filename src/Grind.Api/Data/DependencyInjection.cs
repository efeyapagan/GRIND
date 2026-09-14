using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Data;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IExerciseRepository, ExerciseRepository>();
        services.AddScoped<IWorkoutSessionRepository, WorkoutSessionRepository>();
        services.AddScoped<ISessionExerciseRepository, SessionExerciseRepository>();
        services.AddScoped<ISetEntryRepository, SetEntryRepository>();
        services.AddScoped<IWorkoutTemplateRepository, WorkoutTemplateRepository>();
        services.AddScoped<IBodyWeightLogRepository, BodyWeightLogRepository>();
        services.AddScoped<IAiInsightRepository, AiInsightRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
