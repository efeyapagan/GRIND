using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class UserRepository(AppDbContext context) : Repository<User>(context), IUserRepository
{
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

    public Task<bool> UsernameExistsAsync(
        string username, long? excludeId = null, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Username == username && (excludeId == null || u.Id != excludeId), cancellationToken);

    public Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Id == id && u.DeletedAt == null, cancellationToken);

    // StartsWith, Npgsql'de LIKE'a çevrilirken % ve _ karakterlerini kaçırır: girdi joker olamaz.
    public async Task<IReadOnlyList<UserRef>> SearchActiveByUsernamePrefixAsync(
        string normalizedPrefix, long excludeId, int take, CancellationToken cancellationToken = default)
        => await Set
            .Where(u => u.DeletedAt == null && u.Id != excludeId && u.Username.StartsWith(normalizedPrefix))
            .OrderBy(u => u.Username)
            .Take(take)
            .Select(u => new UserRef(u.Id, u.Username))
            .ToListAsync(cancellationToken);
}
