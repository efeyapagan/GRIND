using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// <paramref name="IsArchived"/> bilerek gösteriliyor: arşivlenmiş bir egzersiz yeni
/// şablonlara EKLENEMEZ ama var olan şablonlarda görünmeye devam eder — arayüz bunu
/// "artık kullanılmıyor" rozetiyle gösterebilsin.
/// </summary>
public record TemplateExerciseResponse(
    long Id,
    long ExerciseId,
    string ExerciseName,
    ExerciseCategory Category,
    bool IsArchived,
    int OrderIndex,
    int PlannedSets);
