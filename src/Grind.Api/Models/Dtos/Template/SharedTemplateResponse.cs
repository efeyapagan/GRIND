namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Bir arkadaşın paylaştığı şablonun salt-okunur görünümü (#467) — sahiplik/paylaşım alanları
/// TAŞIMAZ, bakan zaten görünürlük kontrolünden geçmiş.
/// </summary>
public record SharedTemplateResponse(
    long Id,
    string Name,
    IReadOnlyList<TemplateExerciseResponse> Exercises);
