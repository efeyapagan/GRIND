using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class UserAvatarRepository(AppDbContext context) : Repository<UserAvatar>(context), IUserAvatarRepository
{
    public Task<UserAvatar?> GetByUserIdAsync(long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(a => a.UserId == userId, cancellationToken);

    public Task<DateTime?> GetUpdatedAtAsync(long userId, CancellationToken cancellationToken = default)
        => Set.Where(a => a.UserId == userId)
            .Select(a => (DateTime?)a.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<long, DateTime>> GetUpdatedAtsAsync(
        IReadOnlyCollection<long> userIds, CancellationToken cancellationToken = default)
        => await Set.Where(a => userIds.Contains(a.UserId))
            .ToDictionaryAsync(a => a.UserId, a => a.UpdatedAt, cancellationToken);

    public Task<UserAvatar?> GetByActiveUsernameAsync(
        string normalizedUsername, CancellationToken cancellationToken = default)
        => Set.AsNoTracking()
            .FirstOrDefaultAsync(a => a.User.Username == normalizedUsername && a.User.DeletedAt == null,
                cancellationToken);
}
