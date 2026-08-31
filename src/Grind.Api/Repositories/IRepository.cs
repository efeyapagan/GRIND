namespace Grind.Api.Repositories;

/// <summary>
/// Her entity için geçerli olan temel veri erişimi. Bilerek dar tutulmuştur:
/// IQueryable döndürmez, çünkü sorgu kurmayı servis katmanına taşımak EF Core'u
/// oraya sızdırır (bkz. spec §Soru 2).
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    void Add(T entity);

    void Remove(T entity);
}
