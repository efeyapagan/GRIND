using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Bitirme anında opsiyonel zorluk seçimi. <c>StartSessionRequest</c> ile aynı desen: gövdesiz
/// (zero-byte) bir <c>POST .../finish</c> geçerli olmalı, bu yüzden alan nullable ve controller
/// null gövdeyi <c>?? new()</c> ile karşılar. Zorluk yalnızca BURADA belirlenir — bitmiş bir
/// oturumun zorluğunu değiştiren ayrı bir uç yoktur (<see cref="UpdateSessionNotesRequest"/>'in
/// aksine).
/// </summary>
public class FinishSessionRequest
{
    /// <summary>null ise kullanıcı zorluk seçmedi/atladı.</summary>
    public SessionDifficulty? Difficulty { get; set; }
}
