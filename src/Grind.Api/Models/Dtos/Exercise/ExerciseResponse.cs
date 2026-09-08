using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// <c>UserId</c> bilerek dışarı verilmiyor: istemcinin ihtiyacı olan tek şey kaydın
/// düzenlenebilir olup olmadığı, o da <see cref="IsGlobal"/> ile anlatılıyor. Ham sahip
/// kimliğini yayınlamak başka kullanıcıların Id'lerini sızdırma yolu açar.
/// </summary>
public record ExerciseResponse(
    long Id,
    string Name,
    ExerciseCategory Category,
    bool IsArchived,
    bool IsGlobal,
    IReadOnlyList<ExerciseMediaResponse> Media);
