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
        long exerciseId, decimal weight, int reps, CancellationToken cancellationToken = default)
    {
        var history = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        var tracker = new RecordTracker();

        foreach (var set in history)
        {
            // Sonuç BİLEREK atılıyor: amaç yürüyen en iyileri kurmak, geçmişi düzeltmek değil.
            tracker.Apply(set.Weight, set.Reps);
        }

        return tracker.Apply(weight, reps);
    }

    public async Task RecalculateAsync(
        long exerciseId,
        long? excludeSetId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default)
    {
        var sets = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        var tracker = new RecordTracker();

        foreach (var set in sets)
        {
            if (set.Id == excludeSetId || set.WorkoutSessionId == excludeSessionId)
            {
                continue;
            }

            // Entity'ler tracked geliyor; atama onları Modified yapar. SaveChanges YOK.
            set.RecordType = tracker.Apply(set.Weight, set.Reps);
        }
    }

    public async Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await setEntryRepository.GetRecordCarryingSetsAsync(
            currentUser.UserId, cancellationToken);

        // Filtre SQL'de, gruplama bellekte: rekor taşıyan satırlar bir egzersizde onlarca
        // olur, binlerce değil. Karşılığında eşitlik kuralları (aynı ağırlıkta en çok tekrar,
        // sonra en erken tarih) tek satırda okunabilir kalıyor.
        return records
            .GroupBy(s => s.ExerciseId)
            .Select(BuildSummary)
            .OrderBy(r => r.ExerciseName)
            .ToList();
    }

    private static ExerciseRecordResponse BuildSummary(IGrouping<long, SetEntry> group)
    {
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
            bestReps.CreatedAt);
    }
}
