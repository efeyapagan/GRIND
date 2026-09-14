using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

/// <summary>
/// Antrenmanin hareket listesi (#60, #62). Hicbir metot sahiplik kontrolu YAPMAZ: sahiplik
/// antrenmandadir ve cagiran servis antrenmani ONCE sahiplik sorgusuyla dogrulamalidir (IDOR).
/// </summary>
public interface ISessionExerciseRepository : IRepository<SessionExercise>
{
    /// <summary>Antrenmanin hareketleri <c>OrderIndex</c> sirasiyla, <c>Exercise</c> ile birlikte (ilerleme yanitinda ad).</summary>
    Task<IReadOnlyList<SessionExercise>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default);

    /// <summary>Antrenmandaki tek hareket; listede yoksa null.</summary>
    Task<SessionExercise?> GetAsync(
        long sessionId, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>Sona eklenecek hareketin sirasi: en buyuk <c>OrderIndex</c> + 1, bos listede 0.</summary>
    Task<int> GetNextOrderIndexAsync(long sessionId, CancellationToken cancellationToken = default);
}
