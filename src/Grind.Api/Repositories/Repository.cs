using Grind.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
{
    protected AppDbContext Context { get; } = context;

    protected DbSet<T> Set => Context.Set<T>();

    public async Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => await Set.FindAsync([id], cancellationToken);

    public void Add(T entity) => Set.Add(entity);

    public void Remove(T entity) => Set.Remove(entity);
}
