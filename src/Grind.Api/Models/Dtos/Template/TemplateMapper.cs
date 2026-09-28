using Grind.Api.Models.Entities;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// `WorkoutTemplate` -> yanıt DTO'su eşlemesi TEK yerde (#467): `WorkoutTemplateService`
/// (kendi şablonların) ve `SharedTemplateService` (arkadaştan görünenler) aynı satır eşlemesini
/// paylaşır, kopyalamaz (DRY).
/// </summary>
public static class TemplateMapper
{
    public static TemplateResponse ToResponse(WorkoutTemplate template, DateTime? lastUsedAt) => new(
        template.Id,
        template.Name,
        template.CreatedAt,
        ExercisesOf(template),
        template.IsSharedOverride,
        template.SavedFromUser?.Username,
        lastUsedAt);

    public static SharedTemplateResponse ToSharedResponse(WorkoutTemplate template) => new(
        template.Id, template.Name, ExercisesOf(template));

    internal static IReadOnlyList<TemplateExerciseResponse> ExercisesOf(WorkoutTemplate template) =>
        template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new TemplateExerciseResponse(
                te.Id, te.ExerciseId, te.Exercise.Name, te.Exercise.Category, te.Exercise.IsArchived,
                te.OrderIndex, te.PlannedSets, te.RestSeconds))
            .ToList();
}
