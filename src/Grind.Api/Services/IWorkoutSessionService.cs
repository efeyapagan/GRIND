using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Entities;

namespace Grind.Api.Services;

/// <summary>Başlatma sonucu: <paramref name="Created"/> false ise var olan açık oturum döndü.</summary>
public record StartSessionResult(SessionResponse Session, bool Created);

public interface IWorkoutSessionService
{
    Task<IReadOnlyList<SessionResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Başkasının oturumunda NotFoundException (404).</summary>
    Task<SessionResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bugüne (TR yerel günü) ait açık oturum; yoksa NotFoundException.
    /// Dünden kalan açık bir oturum BULUNMAZ — zorla da kapatılmaz, öylece kalır.
    /// </summary>
    Task<SessionResponse> GetOpenAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// SERVİS-İÇİ SEAM — controller'dan ÇAĞRILMAZ (DTO değil entity döndürür).
    ///
    /// Bugüne (TR yerel günü) ait açık oturumu döndürür; yoksa yenisini oluşturup change
    /// tracker'a ekler ama <c>SaveChangesAsync</c> ÇAĞIRMAZ. Çağıran, kendi yazımıyla
    /// (ör. yeni bir <c>SetEntry</c>) birlikte TEK bir unit of work altında commit eder.
    ///
    /// Sebebi (Faz 7'den devreden zorunluluk): set ekleme akışının alternatifleri
    /// (a) <c>StartAsync</c>'i çağırmak — iki ayrı commit, arada seti olmayan boş oturum
    /// penceresi; (b) gün sınırı mantığını set servisinde tekrar yazmak — DRY ihlali.
    /// </summary>
    /// <returns><c>Created</c> true ise oturum YENİ oluşturuldu ve henüz Id'si yoktur.</returns>
    Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(
        long? templateId, string? notes, CancellationToken cancellationToken = default);

    /// <summary>
    /// SERVİS-İÇİ SEAM — controller'dan ÇAĞRILMAZ, <c>SaveChangesAsync</c> ÇAĞIRMAZ (#62).
    /// Hareket antrenmanın listesinde yoksa sona HEDEFSİZ ekler; varsa hiçbir şey yapmaz. Set ekleme
    /// akışı bunu seti yazmadan önce çağırır ki set ve liste satırı TEK commit'te gitsin. Henüz
    /// kaydedilmemiş (yeni açılmış) bir oturumla da çalışır.
    /// </summary>
    Task EnsureExerciseAsync(
        WorkoutSession session, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Antrenmana hareket ekler (#62): sona, hedefsiz. Başkasının/olmayan antrenman ve görünmeyen
    /// egzersiz NotFoundException (404); bitmiş antrenman ya da zaten listede ConflictException (409);
    /// arşivlenmiş egzersiz ValidationException (400).
    /// </summary>
    Task<SessionResponse> AddExerciseAsync(
        long id, AddSessionExerciseRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Hareketi antrenmandan kaldırır (#60): liste satırı ve o hareketin bu antrenmandaki BÜTÜN
    /// setleri silinir, hareketin rekorları BİR KEZ yeniden hesaplanır — tek commit. Başkasının
    /// antrenmanı ya da listede olmayan hareket 404; bitmiş antrenman 409.
    /// </summary>
    Task RemoveExerciseAsync(long id, long exerciseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bugüne ait açık oturum varsa onu döndürür (<c>Created = false</c>), yoksa yeni açar.
    /// İdempotent: iki kez tıklanan "Antrenmana Başla" hata üretmez.
    /// </summary>
    Task<StartSessionResult> StartAsync(
        StartSessionRequest request, CancellationToken cancellationToken = default);

    /// <summary>Zaten bitmiş oturumda ConflictException (409) — gerçek bitiş zamanı kaybolmasın.</summary>
    Task<SessionResponse> FinishAsync(long id, CancellationToken cancellationToken = default);

    Task<SessionResponse> UpdateNotesAsync(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Siler; bağlı SetEntry satırları CASCADE ile gider. Silinen oturumun dokunduğu her
    /// egzersiz için rekorlar BİR KEZ yeniden hesaplanır — aynı commit içinde.
    /// </summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
