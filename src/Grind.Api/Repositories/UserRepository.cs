using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class UserRepository(AppDbContext context) : Repository<User>(context), IUserRepository
{
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Username == username, cancellationToken);

    public Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Id == id && u.DeletedAt == null, cancellationToken);
}
