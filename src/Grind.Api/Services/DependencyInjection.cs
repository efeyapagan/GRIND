namespace Grind.Api.Services;

public static class DependencyInjection
{
    /// <summary>İş mantığı servisleri. Scoped: istek başına bir örnek, repository'lerle aynı ömür.</summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IExerciseService, ExerciseService>();
        services.AddScoped<IWorkoutTemplateService, WorkoutTemplateService>();
        services.AddScoped<IWorkoutSessionService, WorkoutSessionService>();
        services.AddScoped<IPersonalRecordService, PersonalRecordService>();
        services.AddScoped<ISetEntryService, SetEntryService>();
        services.AddScoped<IWorkoutHistoryService, WorkoutHistoryService>();
        services.AddScoped<IStatsService, StatsService>();
        services.AddScoped<IBodyWeightLogService, BodyWeightLogService>();
        services.AddScoped<IExportService, ExportService>();
        return services;
    }
}
