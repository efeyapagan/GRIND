using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class NotificationRepository(AppDbContext context) : INotificationRepository
{
    public async Task<IReadOnlyList<FollowEvent>> GetFollowEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
        => await context.Set<Follow>()
            .Where(f => f.FolloweeId == userId && f.Follower.DeletedAt == null && f.CreatedAt >= since)
            .OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Take(take)
            .Select(f => new FollowEvent(
                f.Id, f.CreatedAt, new UserRef(f.Follower.Id, f.Follower.Username, f.Follower.DisplayName)))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RecordSessionEvent>> GetRecordSessionEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
        => await (
                from f in context.Set<Follow>()
                where f.FollowerId == userId && f.Followee.DeletedAt == null
                join s in context.Set<WorkoutSession>() on f.FolloweeId equals s.UserId
                where s.EndedAt != null && s.EndedAt > f.CreatedAt && s.EndedAt >= since
                      && s.SetEntries.Any(e => e.RecordType != RecordType.None)
                orderby s.EndedAt descending, s.Id descending
                select new RecordSessionEvent(
                    s.Id, s.EndedAt!.Value, new UserRef(f.Followee.Id, f.Followee.Username, f.Followee.DisplayName)))
            .Take(take)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RecordSetRow>> GetRecordSetsAsync(
        IReadOnlyCollection<long> sessionIds, CancellationToken cancellationToken = default)
        => await context.Set<SetEntry>()
            .Where(e => sessionIds.Contains(e.WorkoutSessionId) && e.RecordType != RecordType.None)
            .Select(e => new RecordSetRow(
                e.WorkoutSessionId, e.ExerciseId, e.Exercise.Name, e.Weight, e.Reps, e.RecordType, e.CreatedAt,
                e.WorkoutSession.SessionExercises
                    .Where(x => x.ExerciseId == e.ExerciseId)
                    .Select(x => (int?)x.OrderIndex)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);
}
