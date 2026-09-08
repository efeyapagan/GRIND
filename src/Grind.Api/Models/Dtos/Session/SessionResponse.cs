namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// <paramref name="IsOpen"/> türetilmiştir (<c>EndedAt is null</c>) — istemcinin null
/// kontrolü yazmasına gerek kalmasın.
/// <paramref name="Progress"/> yalnızca şablonlu oturumlarda dolu gelir; şablonsuz bir
/// oturumun hedefi olmadığı için karşılaştırılacak bir şey de yoktur.
/// </summary>
public record SessionResponse(
    long Id,
    DateTime StartedAt,
    DateTime? EndedAt,
    bool IsOpen,
    long? TemplateId,
    string? TemplateName,
    string? Notes,
    IReadOnlyList<SessionProgressResponse> Progress);
