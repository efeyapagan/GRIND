using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Enums;

namespace Grind.Api.Services;

/// <summary>
/// Kişisel rekor motoru. CLAUDE.md'deki <c>PersonalRecordCalculator</c>'ın bu kod
/// tabanındaki karşılığı; ortak karar noktası
/// <see cref="Grind.Api.Common.Records.RecordTracker.Apply"/>'dır.
///
/// SÖZLEŞME: hiçbir metot <c>SaveChangesAsync</c> ÇAĞIRMAZ. Commit sınırı çağıran
/// serviste kalır — böylece "set ekle + rekorları güncelle" ve "oturum sil + etkilenen
/// egzersizleri yeniden hesapla" TEK bir unit of work altında toplanabilir (CLAUDE.md).
/// </summary>
public interface IPersonalRecordService
{
    /// <summary>
    /// Henüz kaydedilmemiş bir setin rekor tipini hesaplar. Geçmiş satırlara DOKUNMAZ —
    /// <c>RecordType</c> tarihsel bir anlık görüntüdür, sonradan yeniden yazılmaz.
    /// </summary>
    Task<RecordType> EvaluateNewAsync(
        long exerciseId, decimal weight, int reps, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının bu egzersizdeki TÜM setlerini kronolojik sırayla yeniden tarar ve her
    /// satırın <c>RecordType</c>'ını sıfırdan yazar.
    /// </summary>
    /// <param name="excludeSetId">
    /// Silinmek üzere işaretlenmiş ama henüz commit edilmemiş set. EF identity map bu satırı
    /// sorguda hâlâ döndürür; hariç tutulmazsa yeniden hesap onu saymaya devam eder ve
    /// sonraki set rekora terfi etmez.
    /// </param>
    /// <param name="excludeSessionId">
    /// Silinmek üzere olan oturum. CASCADE veritabanına henüz gitmediği için o oturumun
    /// setleri de sorguda geri gelir. Aynı sebep, oturum ölçeğinde.
    /// </param>
    Task RecalculateAsync(
        long exerciseId,
        long? excludeSetId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tüm zamanların rekorları. Hiç seti olmayan egzersiz listede yer almaz.
    /// </summary>
    Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(
        CancellationToken cancellationToken = default);
}
