namespace Grind.Api.Models.Entities;

public class WorkoutTemplate
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
}
