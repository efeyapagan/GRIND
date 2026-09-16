using Grind.Api.Common.Time;
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
    /// <summary>
    /// Oturumları, verilen setleri oturumlarına dağıtarak DTO'ya çevirir; sırası
    /// <paramref name="sessions"/>'ın sırasıdır. Seti olmayan oturum boş listeyle döner. Setler
    /// verilen sırayla (kronolojik) kalır. Geçmiş ucu ve export aynı birleştirmeyi kullanır (DRY).
    /// </summary>
    public static IReadOnlyList<HistorySessionResponse> ToSessionResponses(
        IReadOnlyList<WorkoutSession> sessions, IReadOnlyList<SetEntry> sets)
    {
        var setsBySession = sets
            .GroupBy(s => s.WorkoutSessionId)
            .ToDictionary(g => g.Key, IReadOnlyList<SetEntry> (g) => g.ToList());

        return sessions
            .Select(s => ToSessionResponse(s, setsBySession.GetValueOrDefault(s.Id, [])))
            .ToList();
    }

    public static HistorySessionResponse ToSessionResponse(
        WorkoutSession session, IReadOnlyList<SetEntry> sets) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        DurationCalculator.SecondsBetween(session.StartedAt, session.EndedAt),
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
