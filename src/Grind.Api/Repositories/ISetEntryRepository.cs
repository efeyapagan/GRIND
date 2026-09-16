using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;

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
    /// Bir antrenmanda bir hareketin setleri, izlenerek (silinmek uzere). Hareket antrenmandan
    /// kaldirilinca kullanilir (#60). Sahiplik kontrolu YAPMAZ -- cagiran antrenmani once dogrulamali.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForSessionAndExerciseAsync(
        long sessionId, long exerciseId, CancellationToken cancellationToken = default);

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

    /// <summary>
    /// Egzersiz başına hacim (ağırlık × tekrar) ve set sayısı; gruplama ve toplama SQL'de.
    /// Aralık filtresi setin <c>CreatedAt</c>'ine değil OTURUMUN <c>StartedAt</c>'ine bakar
    /// (spec Karar 7): gece yarısını aşan bir antrenmanda ikisi farklı güne düşer ve takvimle
    /// hacim ayrışırdı.
    /// </summary>
    Task<IReadOnlyList<ExerciseVolume>> GetVolumeByExerciseAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen oturumların setleri TEK sorguda, <c>Exercise</c> ile birlikte, kronolojik
    /// (CreatedAt, eşitlikte Id). Geçmiş sayfası bunu kullanır: oturum başına ayrı sorgu N+1 olurdu.
    /// Egzersiz filtresi BİLEREK yok: dinlenme (#71) oturumun tüm setlerinden hesaplanır, filtre eşlemede uygulanır.
    /// Sahiplik yüklemi burada da taşınır — oturumlar zaten doğrulanmış olsa bile (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds,
        long userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Oturumu aralıkta BAŞLAMIŞ tüm setler, <c>Exercise</c> ile birlikte, kronolojik (CreatedAt,
    /// eşitlikte Id), izlemesiz. Filtre setin <c>CreatedAt</c>'ine değil oturumun <c>StartedAt</c>'ine
    /// bakar (Faz 9 Karar 7). Böylece <see cref="IWorkoutSessionRepository.GetInRangeAsync"/> ile aynı
    /// sınırları kullanır: TUTARLI BİR ANLIK GÖRÜNTÜDE (snapshot) dönen her setin oturumu o listede
    /// yer alır. Bu iki sorgu ayrı ayrı çalışır (bkz. <c>ExportService</c>) — aralarında yeni bir
    /// oturumda yazılan bir set teorik olarak dışarıda kalabilir; kişisel ölçekte kabul edilebilir.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının bir egzersize ait, oturumu verilen UTC aralığında BAŞLAMIŞ setleri; oturumuyla
    /// (<c>StartedAt</c> için) birlikte ve izlemesiz. Hareket ilerleme grafiği (dilim 3) okur. Aralık
    /// filtresi <see cref="GetInRangeAsync"/> ile aynı yardımcıdan gelir.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForExerciseInRangeAsync(
        long userId,
        long exerciseId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);
}
