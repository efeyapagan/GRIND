namespace Grind.Api.Data;

/// <summary>
/// İş operasyonunun kaydetme sınırı. CLAUDE.md'nin kuralı: anlamlı her iş
/// operasyonu tek bir SaveChangesAsync altında toplanır; EF Core bunu atomik yapar,
/// ayrı bir açık transaction genelde gerekmez.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
