namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir TR gününün kilosu: o günün tartılarının ORTALAMASI, 2 ondalığa "yarım yukarı"
/// (<c>MidpointRounding.AwayFromZero</c>) yuvarlanmış (spec Karar 1). <see cref="ReadingCount"/>
/// ortalamanın kaç tartıdan geldiğini söyler — tek tartı ile üç tartının ortalaması kullanıcı için
/// farklı güvenilirlikte bilgidir.
/// </summary>
public record DailyBodyWeightResponse(DateOnly Date, decimal Weight, int ReadingCount);
