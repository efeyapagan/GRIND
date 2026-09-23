using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class SetEntry
{
    public long Id { get; set; }
    public long WorkoutSessionId { get; set; }
    public long ExerciseId { get; set; }

    /// <summary>Kilogram. 0 geçerlidir — barfiks/dips gibi vücut ağırlığı hareketleri.</summary>
    public decimal Weight { get; set; }

    public int Reps { get; set; }

    /// <summary>Bu set kaydedildiği anda bir rekor kırdı mı — tarihsel anlık görüntü.</summary>
    public RecordType RecordType { get; set; }

    /// <summary>
    /// Reps in Reserve — yarım adımlı (#266): 2.5 = "2–3 arası", 5 = "4+". #266 öncesi kayıtlarda
    /// 5'ten büyük olabilir; gösterimde "4+" sayılır.
    /// </summary>
    public decimal? Rir { get; set; }

    public DateTime CreatedAt { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
