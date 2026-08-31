namespace Grind.Api.Models.Entities;

public class User
{
    public long Id { get; set; }
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public ICollection<Exercise> Exercises { get; set; } = [];
    public ICollection<WorkoutTemplate> WorkoutTemplates { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
    public ICollection<BodyWeightLog> BodyWeightLogs { get; set; } = [];
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
