namespace Grind.Api.Models.Projections;

public record TemplateSessionVolume(long SessionId, long TemplateId, DateTime StartedAt, decimal Volume);
