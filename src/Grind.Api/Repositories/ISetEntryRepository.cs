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
    /// Kullanıcının TÜM setleri, <c>Exercise</c> ile birlikte. Tüm zamanların rekorları özeti
    /// bunun üzerinden hesaplanır. Yalnızca <c>RecordType != None</c> satırlarıyla sınırlamak
    /// YANLIŞTIR: bir set, o ağırlıkta hiç geçmişi olmadığı için <c>None</c> kalabilir (Soru
    /// 1/A) ve yine de tüm zamanların en çok tekrarını taşıyabilir (örn. 100 kg × 8'den sonra
    /// atılan 60 kg × 15'lik bir indirme seti — 60 kg'da hiç kıyas yok, set <c>None</c>, ama
    /// 15 tekrar tüm zamanların rekoru). Bkz. spec düzeltme notu (2026-09-10, final inceleme).
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetAllForUserAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu oturumda egzersiz başına kaç set girilmiş. İlerleme hesabı bunu şablonun
    /// <c>PlannedSets</c> değeriyle karşılaştırır — önceden boş SetEntry satırı
    /// oluşturulmaz (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default);
}
