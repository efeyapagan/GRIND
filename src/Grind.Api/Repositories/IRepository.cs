namespace Grind.Api.Repositories;

/// <summary>
/// Her entity için geçerli olan temel veri erişimi. Bilerek dar tutulmuştur:
/// IQueryable döndürmez, çünkü sorgu kurmayı servis katmanına taşımak EF Core'u
/// oraya sızdırır (bkz. spec §Soru 2).
/// </summary>
public interface IRepository<T> where T : class
{
    /// <summary>
    /// Sahiplik kontrolü YAPMAZ — herhangi bir kullanıcının kaydını Id ile döndürür.
    /// Bu yüzden başka bir kullanıcının <c>WorkoutSession</c>, <c>SetEntry</c> veya
    /// <c>BodyWeightLog</c> kaydını da döndürebilir; çağıran servis sahipliği (örn.
    /// dönen kaydın <c>UserId</c>'sinin geçerli kullanıcıyla eşleştiğini) doğrulamak
    /// zorundadır. Doğrulamadan doğrudan dışarı vermek bir IDOR açığıdır.
    /// </summary>
    Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    void Add(T entity);

    void Remove(T entity);
}
