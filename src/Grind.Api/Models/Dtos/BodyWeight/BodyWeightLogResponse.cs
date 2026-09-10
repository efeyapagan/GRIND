namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary><c>RecordedAt</c> UTC'dir; TR gününe çevirmek görüntüleme katmanının işi (CLAUDE.md).</summary>
public record BodyWeightLogResponse(long Id, decimal Weight, DateTime RecordedAt);
