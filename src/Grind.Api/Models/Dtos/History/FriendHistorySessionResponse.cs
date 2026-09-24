using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Arkadaşın geçmişindeki bir oturum (#282): <see cref="HistorySessionResponse"/>'un <c>Notes</c>'SUZ hâli.
/// Oturum notu kişiseldir ve arkadaşla paylaşılmaz; <c>Notes = null</c> atamak yerine ayrı tip, notun bir
/// eşleme hatasıyla sızmasını derleme zamanında imkânsız kılar. Alanların anlamı için
/// <see cref="HistorySessionResponse"/>.
/// </summary>
public record FriendHistorySessionResponse(
    long SessionId,
    DateTime StartedAt,
    DateTime? EndedAt,
    long? DurationSeconds,
    string? TemplateName,
    SessionDifficulty? Difficulty,
    decimal TotalVolume,
    int SetCount,
    int? MedianRestSeconds,
    IReadOnlyList<SetEntryResponse> Sets)
{
    public static FriendHistorySessionResponse From(HistorySessionResponse s) => new(
        s.SessionId, s.StartedAt, s.EndedAt, s.DurationSeconds, s.TemplateName, s.Difficulty,
        s.TotalVolume, s.SetCount, s.MedianRestSeconds, s.Sets);
}
