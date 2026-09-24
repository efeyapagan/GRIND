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

    // StartsWith, Npgsql'de LIKE'a çevrilirken % ve _ karakterlerini kaçırır; ILIKE desenindeki
    // girdi de elle kaçırılır: girdi joker olamaz.
    public async Task<IReadOnlyList<UserRef>> SearchActiveAsync(
        string normalizedUsernamePrefix, string displayNameWordPrefix, long excludeId, int take,
        CancellationToken cancellationToken = default)
    {
        var word = EscapeLike(displayNameWordPrefix);
        return await Set
            .Where(u => u.DeletedAt == null && u.Id != excludeId
                        && (u.Username.StartsWith(normalizedUsernamePrefix)
                            || EF.Functions.ILike(u.DisplayName!, word + "%", LikeEscape)
                            || EF.Functions.ILike(u.DisplayName!, "% " + word + "%", LikeEscape)))
            .OrderBy(u => u.Username)
            .Take(take)
            .Select(u => new UserRef(u.Id, u.Username, u.DisplayName))
            .ToListAsync(cancellationToken);
    }

    private const string LikeEscape = "\\";

    private static string EscapeLike(string value)
        => value.Replace(LikeEscape, LikeEscape + LikeEscape).Replace("%", LikeEscape + "%").Replace("_", LikeEscape + "_");
}
