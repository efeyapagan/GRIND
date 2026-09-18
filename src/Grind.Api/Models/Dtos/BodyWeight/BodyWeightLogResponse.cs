namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// <c>RecordedAt</c> UTC'dir; TR gününe çevirmek görüntüleme katmanının işi (CLAUDE.md).
/// Üç ölçü de (issue #119) opsiyoneldir ama en az biri doludur (bkz. <see cref="CreateBodyWeightRequest"/>).
/// </summary>
public record BodyWeightLogResponse(
    long Id, decimal? Weight, decimal? BodyFatPercent, decimal? WaistCm, DateTime RecordedAt);
