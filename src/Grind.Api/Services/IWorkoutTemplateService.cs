using Grind.Api.Models.Dtos.Template;

namespace Grind.Api.Services;

public interface IWorkoutTemplateService
{
    Task<IReadOnlyList<TemplateResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Başkasının şablonunda NotFoundException (404).</summary>
    Task<TemplateResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<TemplateResponse> CreateAsync(
        CreateTemplateRequest request, CancellationToken cancellationToken = default);

    Task<TemplateResponse> UpdateAsync(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken = default);

    /// <summary>Yalnızca null olmayan alanlar uygulanır; hiçbiri yoksa ValidationException (400).</summary>
    Task<TemplateResponse> PatchAsync(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// GERÇEK siler (Exercise'ın aksine). TemplateExercise satırları CASCADE ile gider,
    /// WorkoutSession.TemplateId SET NULL olur — geçmiş oturum silinmez.
    /// </summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
