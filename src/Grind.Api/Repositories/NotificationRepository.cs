using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class NotificationRepository(AppDbContext context) : INotificationRepository
{
    /// <summary>#628: <paramref name="userId"/>'nin sessize aldığı kişilere giden takip satırları — süzgeç tek yerde.</summary>
    private IQueryable<Follow> Muted(long userId)
        => context.Set<Follow>().Where(m => m.FollowerId == userId && m.NotificationsMuted);

    public async Task<IReadOnlyList<FollowEvent>> GetFollowEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
    {
        var muted = Muted(userId);
        return await context.Set<Follow>()
            .Where(f => f.FolloweeId == userId && f.Follower.DeletedAt == null && f.CreatedAt >= since
                        && !muted.Any(m => m.FolloweeId == f.FollowerId))
            .OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Take(take)
            .Select(f => new FollowEvent(
                f.Id, f.CreatedAt, new UserRef(f.Follower.Id, f.Follower.Username, f.Follower.DisplayName)))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RecordSessionEvent>> GetRecordSessionEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
        => await (
                from f in context.Set<Follow>()
                where f.FollowerId == userId && !f.NotificationsMuted && f.Followee.DeletedAt == null
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
                e.WorkoutSessionId, e.ExerciseId, e.Exercise.Name, e.Weight, e.Reps, e.DurationSeconds, e.RecordType, e.CreatedAt,
                e.WorkoutSession.SessionExercises
                    .Where(x => x.ExerciseId == e.ExerciseId)
                    .Select(x => (int?)x.OrderIndex)
                    .FirstOrDefault(),
                e.Exercise.Measurement))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<FriendSessionDayRow>> GetFriendGoalSessionsAsync(
        long userId, DateTime since, CancellationToken cancellationToken = default)
        => await (
                from f in context.Set<Follow>()
                where f.FollowerId == userId && !f.NotificationsMuted
                      && f.Followee.DeletedAt == null
                      && f.Followee.WeeklyTargetDays != null
                      && f.Followee.PrivacyLevel != PrivacyLevel.Gizli
                      // Karsilikli takip = arkadaslik (#281): tek yonlu takip bildirim uretmez.
                      && context.Set<Follow>().Any(g => g.FollowerId == f.FolloweeId && g.FolloweeId == userId)
                join s in context.Set<WorkoutSession>() on f.FolloweeId equals s.UserId
                where s.StartedAt >= since && s.StartedAt > f.CreatedAt && s.SetEntries.Any()
                select new FriendSessionDayRow(
                    s.Id,
                    s.StartedAt,
                    f.Followee.WeeklyTargetDays!.Value,
                    new UserRef(f.Followee.Id, f.Followee.Username, f.Followee.DisplayName)))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<FriendRequestEvent>> GetFriendRequestEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default)
    {
        var muted = Muted(userId);
        return await context.Set<FriendRequest>()
            .Where(r => r.TargetId == userId && r.RejectedAt == null && r.CreatedAt >= since
                        && r.Requester.DeletedAt == null
                        && !muted.Any(m => m.FolloweeId == r.RequesterId))
            .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .Take(take)
            .Select(r => new FriendRequestEvent(
                r.Id, r.CreatedAt, new UserRef(r.Requester.Id, r.Requester.Username, r.Requester.DisplayName)))
            .ToListAsync(cancellationToken);
    }
}
