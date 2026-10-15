using Grind.Api.Models.Dtos.Cardio;

namespace Grind.Api.Services;

/// <summary>#647: kardiyo kaydının akışı — Başlat, Durdur, düzelt, sil. Hepsi yalnızca geçerli kullanıcının verisi.</summary>
public interface ICardioEntryService
{
    Task<IReadOnlyList<CardioEntryResponse>> GetForSessionAsync(long sessionId, CancellationToken cancellationToken = default);

    Task<CardioEntryResponse> StartAsync(long sessionId, StartCardioRequest request, CancellationToken cancellationToken = default);

    Task<CardioEntryResponse> StopAsync(long id, StopCardioRequest request, CancellationToken cancellationToken = default);

    Task<CardioEntryResponse> UpdateAsync(long id, UpdateCardioRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
