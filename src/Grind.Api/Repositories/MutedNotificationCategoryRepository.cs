using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class MutedNotificationCategoryRepository(AppDbContext context)
    : Repository<MutedNotificationCategory>(context), IMutedNotificationCategoryRepository
{
    public async Task<IReadOnlyList<MutedNotificationCategory>> GetForUserAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set.Where(m => m.UserId == userId).ToListAsync(cancellationToken);
}
