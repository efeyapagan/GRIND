namespace Grind.Api.Services;

public static class DependencyInjection
{
    /// <summary>İş mantığı servisleri. Scoped: istek başına bir örnek, repository'lerle aynı ömür.</summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IExerciseService, ExerciseService>();
        services.AddScoped<IWorkoutTemplateService, WorkoutTemplateService>();
        return services;
    }
}
