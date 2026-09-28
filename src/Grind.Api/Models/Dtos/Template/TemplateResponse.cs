namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// <paramref name="Exercises"/> hem listede hem detayda DOLU gelir. Faz 5'te liste ucunun
/// her zaman boş <c>media</c> döndürmesi "medyası yok mu, yüklenmedi mi?" karışıklığı
/// yaratmıştı; şablon sayısı azken aynı hatayı tekrarlamaya gerek yok.
/// </summary>
public record TemplateResponse(
    long Id,
    string Name,
    DateTime CreatedAt,
    IReadOnlyList<TemplateExerciseResponse> Exercises,
    /// <summary>#467: null = varsayılan (hesabın PrivacyLevel'ine göre), true/false override.</summary>
    bool? IsSharedOverride,
    /// <summary>#467: null = kendi şablonun; dolu = bir arkadaştan kaydedilmiş kopya.</summary>
    string? SavedFromUsername,
    /// <summary>#467: bu şablonla en son ne zaman antrenman başlatıldığı; hiç başlatılmadıysa null.</summary>
    DateTime? LastUsedAt);
