using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
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
            skip: query.Skip(),   // taşma korumalı — bkz. PagedRangeQuery.Skip
            take: query.PageSize,
            cancellationToken);

        // Setler oturum başına değil, sayfanın tamamı için TEK sorguda çekilir (N+1 yok).
        var sets = await setEntryRepository.GetForSessionsAsync(
            sessions.Select(s => s.Id).ToList(), currentUser.UserId, query.ExerciseId, cancellationToken);

        var items = HistoryMapping.ToSessionResponses(sessions, sets);

        return new PagedResponse<HistorySessionResponse>(
            items, query.Page, query.PageSize, totalCount);
    }
}
