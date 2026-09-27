using Grind.Api.Common.Records;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class PersonalRecordService(
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser) : IPersonalRecordService
{
    public async Task<RecordType> EvaluateNewAsync(
        long exerciseId,
        ExerciseMeasurement measurement,
        decimal weight,
        int? reps,
        int? durationSeconds,
        CancellationToken cancellationToken = default)
    {
        var history = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        var tracker = new RecordTracker(measurement);

        foreach (var set in history)
        {
            // Sonuç BİLEREK atılıyor: amaç yürüyen en iyileri kurmak, geçmişi düzeltmek değil.
            tracker.Apply(set.Weight, set.Reps, set.DurationSeconds);
        }

        return tracker.Apply(weight, reps, durationSeconds);
    }

    public async Task RecalculateAsync(
        long exerciseId,
        long? excludeSetId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default)
    {
        var sets = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        if (sets.Count == 0)
        {
            return;
        }

        // #346: ölçüm tipi hareketin kendisinden — setler hareketiyle birlikte okunur.
        var tracker = new RecordTracker(sets[0].Exercise.Measurement);

        foreach (var set in sets)
        {
            if (set.Id == excludeSetId || set.WorkoutSessionId == excludeSessionId)
            {
                continue;
            }

            // Entity'ler tracked geliyor; atama onları Modified yapar. SaveChanges YOK.
            set.RecordType = tracker.Apply(set.Weight, set.Reps, set.DurationSeconds);
        }
    }

    public Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(
        CancellationToken cancellationToken = default)
        => GetAllTimeForUserAsync(currentUser.UserId, cancellationToken);

    public async Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeForUserAsync(
        long userId, CancellationToken cancellationToken = default)
    {
        var records = await setEntryRepository.GetAllForUserAsync(userId, cancellationToken);

        // Gruplama bellekte yapılıyor: "yalnızca rekor taşıyan satırlar" filtresi bilgi
        // kaybediyordu (bkz. spec düzeltme notu, 2026-09-10 final inceleme) — bu yüzden
        // kullanıcının TÜM setleri okunuyor. Bir kullanıcının set sayısı binlere çıkarsa bu
        // gruplama SQL tarafına (GROUP BY) taşınmalı.
        return records
            .GroupBy(s => s.ExerciseId)
            .Select(BuildSummary)
            .OfType<ExerciseRecordResponse>()
            .OrderBy(r => r.ExerciseName)
            .ToList();
    }

    /// <summary>
    /// #346: süreli harekette yalnızca süreli setler sayılır; hareket süreliye dönmeden önce "0 kg × n" girilmiş
    /// eski setler bir süre rekoru değildir. Hiç süreli seti yoksa özet yoktur (<c>null</c>).
    /// </summary>
    private static ExerciseRecordResponse? BuildSummary(IGrouping<long, SetEntry> group)
    {
        var exercise = group.First().Exercise;

        if (exercise.Measurement == ExerciseMeasurement.Duration)
        {
            var longest = group
                .Where(s => s.DurationSeconds is not null)
                .OrderByDescending(s => s.DurationSeconds)
                .ThenBy(s => s.CreatedAt).ThenBy(s => s.Id)
                .FirstOrDefault();

            return longest is null
                ? null
                : new ExerciseRecordResponse(
                    group.Key, exercise.Name, exercise.Category,
                    0m, null, longest.CreatedAt,
                    null, 0m, longest.CreatedAt,
                    exercise.Measurement, longest.DurationSeconds);
        }

        var bestWeight = group
            .OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps)
            .ThenBy(s => s.CreatedAt).ThenBy(s => s.Id)
            .First();

        var bestReps = group
            .OrderByDescending(s => s.Reps).ThenByDescending(s => s.Weight)
            .ThenBy(s => s.CreatedAt).ThenBy(s => s.Id)
            .First();

        return new ExerciseRecordResponse(
            group.Key,
            bestWeight.Exercise.Name,
            bestWeight.Exercise.Category,
            bestWeight.Weight,
            bestWeight.Reps,
            bestWeight.CreatedAt,
            bestReps.Reps,
            bestReps.Weight,
            bestReps.CreatedAt,
            exercise.Measurement,
            BestDurationSeconds: null);
    }
}
