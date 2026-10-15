using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

/// <summary>
/// #647: kardiyo kayıtları. Sahiplik kaydın kendisinde değil <c>WorkoutSession.UserId</c>'de; kullanıcı alan her
/// sorgu yüklemi taşır. Sıralar belirlidir (<c>StartedAt</c>, eşitlikte <c>Id</c>).
/// </summary>
public interface ICardioEntryRepository : IRepository<CardioEntry>
{
    /// <summary>Başkasının kaydında null (IDOR). <c>Exercise</c> yüklenir, izlenir.</summary>
    Task<CardioEntry?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>Bir antrenmanın kayıtları; başkasının antrenmanında boş — çağıran sahipliği ayrıca doğrular.</summary>
    Task<IReadOnlyList<CardioEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default);

    /// <summary>Verilen antrenmanların kayıtları tek sorguda (geçmiş, export — N+1 olmasın).</summary>
    Task<IReadOnlyList<CardioEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds, long userId, CancellationToken cancellationToken = default);

    /// <summary>Antrenmanda akan kayıt (en fazla bir tane), izlenir. Sahiplik kontrolü YAPMAZ.</summary>
    Task<CardioEntry?> GetRunningForSessionAsync(long sessionId, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcının bu hareketteki tüm kayıtları, kronolojik ve izlenerek — rekor taraması.</summary>
    Task<IReadOnlyList<CardioEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcının tüm BİTMİŞ kayıtları, <c>Exercise</c> ile — rekorlar özeti.</summary>
    Task<IReadOnlyList<CardioEntry>> GetFinishedForUserAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>Antrenmanda hareket başına bitmiş kayıt sayısı — ilerlemede "tamamlanan set" yerine sayılır.</summary>
    Task<IReadOnlyDictionary<long, int>> GetFinishedCountsAsync(long sessionId, CancellationToken cancellationToken = default);

    /// <summary>Antrenmanın kayıtlarının dokunduğu hareketler — antrenman silinince rekorlar bir kez taranır.</summary>
    Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(long sessionId, CancellationToken cancellationToken = default);

    /// <summary>#184 haftalık istatistik: bitmiş her kayıt, kategorisi Cardio olan bir satırdır (hacim 0).</summary>
    Task<IReadOnlyList<WeeklySetRow>> GetWeeklyRowsAsync(long userId, CancellationToken cancellationToken = default);
}
