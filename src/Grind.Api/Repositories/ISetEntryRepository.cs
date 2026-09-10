using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface ISetEntryRepository : IRepository<SetEntry>
{
    /// <summary>
    /// Kullanıcının bu egzersizdeki tüm setleri, kronolojik sırada. PR motorunun
    /// temel sorgusu. Sahiplik WorkoutSession.UserId üzerinden gelir.
    /// Sıralama BELİRLİDİR: CreatedAt, eşitlikte Id — aynı ana düşen setlerde sonuç
    /// sorgudan sorguya değişmesin.
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
    /// Başkasının setinde null döner (IDOR koruması). Sahiplik SetEntry'nin kendi
    /// sütununda değil, WorkoutSession.UserId üzerindedir. <c>Exercise</c> yüklenir —
    /// yanıt DTO'su egzersiz adını taşıyor.
    /// </summary>
    Task<SetEntry?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bir oturumun setleri, kronolojik. Başkasının oturumunda BOŞ döner — çağıran servis
    /// "yok" ile "boş" ayrımını yapmak için oturumun sahipliğini ayrıca doğrulamalıdır.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının rekor taşıyan (<c>RecordType != None</c>) tüm setleri, <c>Exercise</c>
    /// ile birlikte. Tüm zamanların rekorları özeti bunun üzerinden hesaplanır: bir set
    /// <c>None</c> ise tanımı gereği kendisinden önce ağırlıkça ve (aynı ağırlıkta)
    /// tekrarca en az onun kadar iyi bir set vardır — dolayısıyla hiçbir maksimum yalnızca
    /// <c>None</c> satırlarda yaşayamaz ve bu filtre bilgi kaybetmez.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetRecordCarryingSetsAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu oturumda egzersiz başına kaç set girilmiş. İlerleme hesabı bunu şablonun
    /// <c>PlannedSets</c> değeriyle karşılaştırır — önceden boş SetEntry satırı
    /// oluşturulmaz (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default);
}
