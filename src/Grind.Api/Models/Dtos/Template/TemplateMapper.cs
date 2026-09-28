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

    /// <summary>
    /// #467 final review: paylaşılan görünümde (`SharedTemplateService`) sahibin egzersiz listesi
    /// olduğu gibi değil, İZLEYENE görünür (ve arşivlenmemiş) olanlarla SINIRLI dönmeli --
    /// aksi hâlde izleyici, kaydedince zaten elenecek olan özel/arşivli bir egzersizin adını
    /// (Yetkilendirme Kuralı ihlali) veya kopyalanmayacak bir hareketi görür.
    /// </summary>
    public static SharedTemplateResponse ToSharedResponse(
        WorkoutTemplate template, IReadOnlyCollection<long> visibleExerciseIds) => new(
        template.Id, template.Name, ExercisesOf(template, visibleExerciseIds));

    internal static IReadOnlyList<TemplateExerciseResponse> ExercisesOf(
        WorkoutTemplate template, IReadOnlyCollection<long>? visibleExerciseIds = null) =>
        template.TemplateExercises
            .Where(te => visibleExerciseIds == null || visibleExerciseIds.Contains(te.ExerciseId))
            .OrderBy(te => te.OrderIndex)
            .Select(te => new TemplateExerciseResponse(
                te.Id, te.ExerciseId, te.Exercise.Name, te.Exercise.Category, te.Exercise.IsArchived,
                te.OrderIndex, te.PlannedSets, te.RestSeconds))
            .ToList();
}
