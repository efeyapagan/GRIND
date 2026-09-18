namespace Grind.Api.Models.Entities;

public class BodyWeightLog
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public decimal? Weight { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public decimal? WaistCm { get; set; }
    public DateTime RecordedAt { get; set; }

    public User User { get; set; } = null!;
}
