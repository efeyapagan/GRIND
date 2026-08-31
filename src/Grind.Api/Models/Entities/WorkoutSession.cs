namespace Grind.Api.Models.Entities;

public class WorkoutSession
{
    public long Id { get; set; }
    public long UserId { get; set; }

    /// <summary>null ise şablonsuz açılmış bir oturum.</summary>
    public long? TemplateId { get; set; }

    public DateTime StartedAt { get; set; }

    /// <summary>null ise oturum hâlâ açık.</summary>
    public DateTime? EndedAt { get; set; }

    public string? Notes { get; set; }

    public User User { get; set; } = null!;
    public WorkoutTemplate? Template { get; set; }
    public ICollection<SetEntry> SetEntries { get; set; } = [];
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
