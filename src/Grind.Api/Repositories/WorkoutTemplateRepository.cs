using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WorkoutTemplateRepository(AppDbContext context)
    : Repository<WorkoutTemplate>(context), IWorkoutTemplateRepository
{
    public async Task<IReadOnlyList<WorkoutTemplate>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default)
        => await WithExercises(Set)
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

    public Task<WorkoutTemplate?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => WithExercises(Set)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);

    public Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        // Escaping ve ILike gerekçesi ExerciseRepository.NameExistsAsync'te ayrıntılı
        // anlatıldı: .NET'in ToLowerInvariant'ı ile PostgreSQL'in lower()'ı Türkçe İ'de
        // ayrışıyor, ve isimdeki % / _ joker olarak yorumlanmamalı.
        var escaped = name
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");

        return Set.AnyAsync(
            t => t.UserId == userId
                 && (excludeId == null || t.Id != excludeId)
                 && EF.Functions.ILike(t.Name, escaped, "\\"),
            cancellationToken);
    }

    /// <summary>Liste ve detay aynı şekli döndürüyor — Faz 5'teki "liste boş medya döndürüyor"
    /// karışıklığı tekrarlanmasın diye şablon listesi de egzersizleriyle birlikte geliyor.</summary>
    private static IQueryable<WorkoutTemplate> WithExercises(IQueryable<WorkoutTemplate> query)
        => query
            .Include(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
            .ThenInclude(te => te.Exercise);
}
