namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// <c>RecordedAt</c> UTC'dir; TR gününe çevirmek görüntüleme katmanının işi (CLAUDE.md).
/// <see cref="Weight"/> ve <see cref="HeightCm"/> her zaman doludur (issue #119, kullanıcı
/// kararıyla zorunlu); <see cref="BodyFatPercent"/>, <see cref="WaistCm"/> ve <see cref="HipCm"/>
/// opsiyoneldir (bkz. <see cref="CreateBodyWeightRequest"/>).
/// </summary>
public record BodyWeightLogResponse(
    long Id,
    decimal? Weight,
    decimal? HeightCm,
    decimal? BodyFatPercent,
    decimal? WaistCm,
    decimal? HipCm,
    DateTime RecordedAt);
