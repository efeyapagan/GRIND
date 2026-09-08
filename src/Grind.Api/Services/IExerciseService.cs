using Grind.Api.Models.Dtos.Exercise;

namespace Grind.Api.Services;

/// <summary>
/// Kimlik <c>ICurrentUserService</c>'ten okunur; çağıran userId GEÇMEZ. Sebep: sahiplik
/// kararını tek bir yerde tutmak — controller'ın yanlış bir kullanıcı Id'si geçirmesi
/// imkânsız olsun.
/// </summary>
public interface IExerciseService
{
    Task<IReadOnlyList<ExerciseResponse>> GetAllAsync(
        bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <summary>Erişilemeyen kayıtta NotFoundException (404) — başkasının kaydı için 403 DEĞİL.</summary>
    Task<ExerciseResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<ExerciseResponse> CreateAsync(
        CreateExerciseRequest request, CancellationToken cancellationToken = default);

    /// <summary>Global egzersizde ForbiddenException (403).</summary>
    Task<ExerciseResponse> UpdateAsync(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken = default);

    Task ArchiveAsync(long id, CancellationToken cancellationToken = default);

    Task RestoreAsync(long id, CancellationToken cancellationToken = default);

    Task<ExerciseMediaResponse> AddMediaAsync(
        long exerciseId, AddMediaRequest request, CancellationToken cancellationToken = default);

    Task RemoveMediaAsync(
        long exerciseId, long mediaId, CancellationToken cancellationToken = default);
}
