using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface ISetEntryRepository : IRepository<SetEntry>
{
    /// <summary>
    /// Kullanıcının bu egzersizdeki tüm setleri, kronolojik sırada. PR motorunun
    /// temel sorgusu. Sahiplik WorkoutSession.UserId üzerinden gelir.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bir oturumdaki setlerin dokunduğu egzersizlerin tekrarsız listesi. Oturum
    /// silindiğinde her egzersiz için rekorların BİR KEZ yeniden hesaplanması için.
    /// </summary>
    Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu oturumda egzersiz başına kaç set girilmiş. İlerleme hesabı bunu şablonun
    /// <c>PlannedSets</c> değeriyle karşılaştırır — önceden boş SetEntry satırı
    /// oluşturulmaz (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default);
}
