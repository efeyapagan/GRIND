using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class ExerciseMedia
{
    public long Id { get; set; }
    public long ExerciseId { get; set; }
    public MediaType MediaType { get; set; }
    public string Url { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public Exercise Exercise { get; set; } = null!;
}
