using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class Exercise
{
    public long Id { get; set; }

    /// <summary>null ise global (varsayılan) egzersiz; doluysa o kullanıcıya özeldir.</summary>
    public long? UserId { get; set; }

    public string Name { get; set; } = null!;
    public ExerciseCategory Category { get; set; }
    public bool IsArchived { get; set; }

    public User? User { get; set; }
    public ICollection<ExerciseMedia> Media { get; set; } = [];
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<SessionExercise> SessionExercises { get; set; } = [];
    public ICollection<SetEntry> SetEntries { get; set; } = [];
}
