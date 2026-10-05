using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IWeeklyTargetChangeRepository : IRepository<WeeklyTargetChange>
{
    /// <summary>Verilen kullanıcıların tüm hedef değişiklikleri (#654); sıra garanti edilmez.</summary>
    Task<IReadOnlyList<WeeklyTargetChange>> GetForUsersAsync(
        IReadOnlyCollection<long> userIds, CancellationToken cancellationToken = default);
}
