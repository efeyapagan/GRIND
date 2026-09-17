using Grind.Api.Common.Rest;
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
    /// kronolojik sırada döner. Geçmiş ucu ve export aynı birleştirmeyi kullanır (DRY).
    ///
    /// <paramref name="sets"/> oturumların TÜM setleri olmalı: dinlenme (#71) oturumdaki bir önceki sete göre
    /// ölçülür ve arada kalan başka hareketin setleri görünmezse süre uzar. Hareket filtresi bu yüzden sorguda
    /// değil burada, dinlenme hesaplandıktan SONRA uygulanır (<paramref name="exerciseId"/>).
    /// </summary>
    public static IReadOnlyList<HistorySessionResponse> ToSessionResponses(
        IReadOnlyList<WorkoutSession> sessions, IReadOnlyList<SetEntry> sets, long? exerciseId = null)
    {
        var setsBySession = sets
            .GroupBy(s => s.WorkoutSessionId)
            .ToDictionary(g => g.Key, IReadOnlyList<SetEntry> (g) => g.ToList());

        return sessions
            .Select(s => ToSessionResponse(s, setsBySession.GetValueOrDefault(s.Id, []), exerciseId))
            .ToList();
    }

    private static HistorySessionResponse ToSessionResponse(
        WorkoutSession session, IReadOnlyList<SetEntry> sets, long? exerciseId)
    {
        var rests = RestIntervalCalculator.ForSession(sets);
        var shown = ToSetResponses(
            exerciseId is { } id ? sets.Where(s => s.ExerciseId == id) : sets, rests);

        return new HistorySessionResponse(
            session.Id,
            session.StartedAt,
            session.EndedAt,
            session.Template?.Name,
            session.Notes,
            session.Difficulty,
            // Toplamlar GÖSTERİLEN setlerden hesaplanıyor: geçmiş ucunda egzersiz filtresi varsa toplam da
            // filtreli olur ve listeyle tutarlı kalır (Faz 9 spec Karar 8).
            shown.Sum(s => s.Weight * s.Reps),
            shown.Count,
            RestIntervalCalculator.Median(shown.Select(s => s.RestSeconds)),
            shown);
    }

    /// <summary>
    /// Setleri kronolojik sırayla DTO'ya çevirir; <paramref name="rests"/>
    /// <see cref="RestIntervalCalculator.ForSession"/>'ın oturumun tüm setleri için ürettiği sözlüktür.
    /// </summary>
    public static IReadOnlyList<SetEntryResponse> ToSetResponses(
        IEnumerable<SetEntry> sets, IReadOnlyDictionary<long, int?> rests) => sets
        .OrderBy(s => s.CreatedAt)
        .ThenBy(s => s.Id)
        .Select(s => new SetEntryResponse(
            s.Id,
            s.WorkoutSessionId,
            s.ExerciseId,
            s.Exercise.Name,
            s.Weight,
            s.Reps,
            s.RecordType,
            s.Rir,
            s.CreatedAt,
            rests.GetValueOrDefault(s.Id)))
        .ToList();
}
