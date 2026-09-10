namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir TR gününün toplamları. <see cref="SessionCount"/> ayrı bir alan çünkü bir günde birden
/// fazla antrenman olabilir (CLAUDE.md: sabah/akşam) ve "3 set / 1 oturum" ile "3 set / 2 oturum"
/// kullanıcı için farklı bilgilerdir.
/// </summary>
public record DailyVolumeResponse(DateOnly Date, decimal Volume, int SetCount, int SessionCount);
