using Grind.Api.Models.Dtos.Session;

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
    /// Siler; bağlı SetEntry satırları CASCADE ile gider.
    /// FAZ 8 NOTU: rekor taşıyan setler silinince ilgili egzersizler için
    /// RecalculateRecords çağrılmalı. Bugün SetEntry üreten endpoint olmadığı için
    /// silinen oturumda yeniden hesaplanacak rekor yok.
    /// </summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
