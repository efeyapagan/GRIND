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
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IExerciseProgressService, ExerciseProgressService>();
        services.AddScoped<IBodyWeightLogService, BodyWeightLogService>();
        services.AddScoped<IExportService, ExportService>();
        services.AddScoped<IAiInsightService, AiInsightService>();
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IProfileService, ProfileService>();
        return services;
    }
}
