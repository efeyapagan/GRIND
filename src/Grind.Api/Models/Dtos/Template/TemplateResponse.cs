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
    IReadOnlyList<TemplateExerciseResponse> Exercises);
