using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WeeklyTargetChangeRepository(AppDbContext context)
    : Repository<WeeklyTargetChange>(context), IWeeklyTargetChangeRepository
{
    public async Task<IReadOnlyList<WeeklyTargetChange>> GetForUsersAsync(
        IReadOnlyCollection<long> userIds, CancellationToken cancellationToken = default)
        => await Set.Where(c => userIds.Contains(c.UserId)).ToListAsync(cancellationToken);
}
