using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class ExerciseRepository(AppDbContext context)
    : Repository<Exercise>(context), IExerciseRepository
{
    public async Task<IReadOnlyList<Exercise>> GetVisibleAsync(
        long userId, bool includeArchived = false, CancellationToken cancellationToken = default)
        => await Set
            .Where(e => (e.UserId == userId || e.UserId == null) && (includeArchived || !e.IsArchived))
            .OrderBy(e => e.Name)
            .ToListAsync(cancellationToken);

    public Task<Exercise?> GetVisibleByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(
            e => e.Id == id && (e.UserId == userId || e.UserId == null), cancellationToken);

    public Task<bool> NameExistsAsync(
        long userId, string name, CancellationToken cancellationToken = default)
    {
        // ILike kullanılmıyor: isimdeki '%' ve '_' karakterleri joker olarak yorumlanır
        // ve yanlış eşleşme üretir. lower() karşılaştırması güvenli.
        var normalized = name.ToLowerInvariant();
        return Set.AnyAsync(
            e => (e.UserId == userId || e.UserId == null) && e.Name.ToLower() == normalized,
            cancellationToken);
    }
}
