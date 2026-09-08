using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public record ExerciseMediaResponse(long Id, MediaType MediaType, string Url, DateTime CreatedAt);
