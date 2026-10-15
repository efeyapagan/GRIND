using Grind.Api.Common.Records;
using Grind.Api.Common.Security;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class CardioRecordService(
    ICardioEntryRepository cardioRepository,
    ICurrentUserService currentUser) : ICardioRecordService
{
    public async Task RecalculateAsync(
        long exerciseId,
        long? excludeEntryId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default)
    {
        // Kayıtlar izlenerek gelir: bellekte durdurulmuş/düzeltilmiş kayıt yeni değerleriyle görünür, atamalar
        // onları Modified yapar. Silinmek üzere olan kayıt (henüz veritabanında) hariç tutulur.
        var entries = await cardioRepository.GetForUserAndExerciseAsync(currentUser.UserId, exerciseId, cancellationToken);
        var tracker = new CardioRecordTracker();

        foreach (var entry in entries)
        {
            if (entry.Id == excludeEntryId || entry.WorkoutSessionId == excludeSessionId)
            {
                continue;
            }

            // Akan kayıt rekor değildir ve çıtayı etkilemez.
            (entry.IsDurationRecord, entry.IsDistanceRecord) = entry.DurationSeconds is { } seconds
                ? tracker.Apply(seconds, entry.DistanceKm)
                : (false, false);
        }
    }
}
