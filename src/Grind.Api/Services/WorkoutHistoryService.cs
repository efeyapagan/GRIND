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

    public Task<PagedResponse<HistorySessionResponse>> GetAsync(
        HistoryQuery query, CancellationToken cancellationToken = default)
        => GetForUserAsync(currentUser.UserId, query, cancellationToken);

    public async Task<PagedResponse<HistorySessionResponse>> GetForUserAsync(
        long userId, HistoryQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        if (query.ExerciseId is { } exerciseId)
        {
            // Sahiplik ÖNCE doğrulanır: aksi halde başkasının egzersiz id'siyle filtrelemek
            // boş liste döndürür ve "bu id var ama sende yok" bilgisini sızdırırdı.
            _ = await exerciseRepository.GetVisibleByIdAsync(
                    exerciseId, userId, cancellationToken: cancellationToken)
                ?? throw new NotFoundException(ExerciseNotFound);
        }

        var (sessions, totalCount) = await sessionRepository.GetHistoryPageAsync(
            userId,
            fromUtc,
            toUtc,
            query.ExerciseId,
            skip: query.Skip(),   // taşma korumalı — bkz. PagedRangeQuery.Skip
            take: query.PageSize,
            cancellationToken);

        // Setler oturum başına değil, sayfanın tamamı için TEK sorguda çekilir (N+1 yok). Hareket filtresi
        // BİLEREK sorguda değil eşlemede uygulanır: dinlenme (#71) oturumun tüm setlerinden hesaplanmalı.
        var sets = await setEntryRepository.GetForSessionsAsync(
            sessions.Select(s => s.Id).ToList(), userId, cancellationToken);

        var items = HistoryMapping.ToSessionResponses(sessions, sets, query.ExerciseId);

        return new PagedResponse<HistorySessionResponse>(
            items, query.Page, query.PageSize, totalCount);
    }
}
