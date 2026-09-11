using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;

namespace Grind.Api.Services;

/// <summary>
/// Bir oturumu ve setlerini geçmiş DTO'suna çevirir. Geçmiş ucu (Faz 9) ve export (Faz 11) aynı
/// oturumu aynı şekilde göstersin diye tek yerde (DRY). Oturumun <c>Template</c>'i ve setlerin
/// <c>Exercise</c>'i YÜKLÜ olmalıdır.
/// </summary>
internal static class HistoryMapping
{
    public static HistorySessionResponse ToSessionResponse(
        WorkoutSession session, IReadOnlyList<SetEntry> sets) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        session.Template?.Name,
        session.Notes,
        // Toplamlar VERİLEN setlerden hesaplanıyor: geçmiş ucunda egzersiz filtresi varsa toplam da
        // filtreli olur ve listeyle tutarlı kalır (Faz 9 spec Karar 8).
        sets.Sum(s => s.Weight * s.Reps),
        sets.Count,
        sets.Select(ToSetResponse).ToList());

    public static SetEntryResponse ToSetResponse(SetEntry set) => new(
        set.Id,
        set.WorkoutSessionId,
        set.ExerciseId,
        set.Exercise.Name,
        set.Weight,
        set.Reps,
        set.RecordType,
        set.Rir,
        set.CreatedAt);
}
