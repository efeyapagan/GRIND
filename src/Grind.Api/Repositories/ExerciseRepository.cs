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
        // name.ToLowerInvariant() (.NET) ile e.Name.ToLower() (PostgreSQL) iki farklı
        // case-folding uygulaması olduğu için U+0130 (Türkçe büyük noktalı İ) gibi
        // karakterlerde birbirini tutmazlar: PostgreSQL lower('İ') = 'i' üretirken .NET'in
        // invariant eşlemesi 'İ'yi değiştirmeden bırakır. Bunun yerine tek tarafta
        // (PostgreSQL'de) case-fold yapan EF.Functions.ILike kullanılıyor. İsimdeki '%' ve
        // '_' karakterleri joker olarak yorumlanmasın diye escape karakteri olarak '\'
        // kullanılıp isim önce kaçırılıyor.
        var escaped = name
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");
        return Set.AnyAsync(
            e => (e.UserId == userId || e.UserId == null) && EF.Functions.ILike(e.Name, escaped, "\\"),
            cancellationToken);
    }
}
