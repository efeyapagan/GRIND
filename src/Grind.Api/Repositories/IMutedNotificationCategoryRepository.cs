using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IMutedNotificationCategoryRepository : IRepository<MutedNotificationCategory>
{
    /// <summary>Kullanıcının kapattığı kategorilerin satırları (#410).</summary>
    Task<IReadOnlyList<MutedNotificationCategory>> GetForUserAsync(
        long userId, CancellationToken cancellationToken = default);
}
