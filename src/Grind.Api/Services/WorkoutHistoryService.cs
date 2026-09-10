using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class WorkoutHistoryService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    IExerciseRepository exerciseRepository,
    ICurrentUserService currentUser) : IWorkoutHistoryService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<PagedResponse<HistorySessionResponse>> GetAsync(
        HistoryQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        if (query.ExerciseId is { } exerciseId)
        {
            // Sahiplik ÖNCE doğrulanır: aksi halde başkasının egzersiz id'siyle filtrelemek
            // boş liste döndürür ve "bu id var ama sende yok" bilgisini sızdırırdı.
            _ = await exerciseRepository.GetVisibleByIdAsync(
                    exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                ?? throw new NotFoundException(ExerciseNotFound);
        }

        var (sessions, totalCount) = await sessionRepository.GetHistoryPageAsync(
            currentUser.UserId,
            fromUtc,
            toUtc,
            query.ExerciseId,
            // (Page - 1) * PageSize denetimsiz (unchecked) int çarpımıyla hesaplanıyordu —
            // proje CheckForOverflowUnderflow açmıyor, yani taşma exception fırlatmak yerine
            // sessizce sarıyor. `int.MaxValue` gibi geçerli (spec: [Range(1, int.MaxValue)])
            // bir sayfa numarasında bu, negatif bir skip üretir; `.Skip()` bunu Postgres'e
            // negatif bir OFFSET olarak iletir ve "OFFSET must not be negative" ile patlar
            // (yakalanmamış exception → 500). `long`'a genişletip `int.MaxValue`'da
            // sınırlamak taşmayı önler; sonuç zaten mevcut satır sayısını fazlasıyla aşıyor,
            // bu yüzden pratikte "sayfanın sonunu geçmiş" boş sonuçla aynı davranışı üretir.
            skip: (int)Math.Min((long)(query.Page - 1) * query.PageSize, int.MaxValue),
            take: query.PageSize,
            cancellationToken);

        // Setler oturum başına değil, sayfanın tamamı için TEK sorguda çekilir (N+1 yok).
        var sets = await setEntryRepository.GetForSessionsAsync(
            sessions.Select(s => s.Id).ToList(), currentUser.UserId, query.ExerciseId, cancellationToken);

        var setsBySession = sets
            .GroupBy(s => s.WorkoutSessionId)
            .ToDictionary(g => g.Key, IReadOnlyList<SetEntry> (g) => g.ToList());

        var items = sessions
            .Select(s => ToResponse(s, setsBySession.GetValueOrDefault(s.Id, [])))
            .ToList();

        return new PagedResponse<HistorySessionResponse>(
            items, query.Page, query.PageSize, totalCount);
    }

    private static HistorySessionResponse ToResponse(
        WorkoutSession session, IReadOnlyList<SetEntry> sets) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        session.Template?.Name,
        session.Notes,
        // Toplamlar DÖNEN setlerden hesaplanıyor: egzersiz filtresi varsa toplam da filtreli
        // olur ve listeyle tutarlı kalır (spec Karar 8).
        sets.Sum(s => s.Weight * s.Reps),
        sets.Count,
        sets.Select(ToSetResponse).ToList());

    private static SetEntryResponse ToSetResponse(SetEntry set) => new(
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
