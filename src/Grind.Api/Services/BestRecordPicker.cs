using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>Bir antrenmanın rekor setlerinden hareket başına en iyisi (#325) — saf, veritabanına dokunmaz.</summary>
public static class BestRecordPicker
{
    public static IReadOnlyList<NotificationRecordResponse> Pick(IEnumerable<RecordSetRow> sets) =>
        sets.GroupBy(s => s.ExerciseId)
            .Select(g => (
                // #346: bir hareketin setleri ya tekrar ya süre taşır; süreli harekette kilo hep 0, en uzun kazanır.
                Best: g.OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps)
                    .ThenByDescending(s => s.DurationSeconds).First(),
                Order: g.First().OrderIndex ?? int.MaxValue,
                FirstAt: g.Min(s => s.CreatedAt)))
            .OrderBy(x => x.Order).ThenBy(x => x.FirstAt).ThenBy(x => x.Best.ExerciseId)
            .Select(x => new NotificationRecordResponse(
                x.Best.ExerciseId, x.Best.ExerciseName, x.Best.Weight, x.Best.Reps, x.Best.DurationSeconds,
                x.Best.RecordType))
            .ToList();
}
