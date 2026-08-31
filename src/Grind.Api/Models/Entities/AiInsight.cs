using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class AiInsight
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public AiInsightKind Kind { get; set; }
    public long? WorkoutSessionId { get; set; }
    public long? SetEntryId { get; set; }
    public string Content { get; set; } = null!;
    public string Model { get; set; } = null!;
    public int? TokensUsed { get; set; }
    public decimal? EstimatedCostUsd { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public WorkoutSession? WorkoutSession { get; set; }
    public SetEntry? SetEntry { get; set; }
}
