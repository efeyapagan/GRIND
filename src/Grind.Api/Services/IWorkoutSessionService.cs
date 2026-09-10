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
