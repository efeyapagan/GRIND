using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class SetEntry
{
    public long Id { get; set; }
    public long WorkoutSessionId { get; set; }
    public long ExerciseId { get; set; }

    /// <summary>Kilogram. 0 geçerlidir — barfiks/dips gibi vücut ağırlığı hareketleri.</summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// <c>null</c> yalnızca süreli sette (#346, <see cref="ExerciseMeasurement.Duration"/>): bir set ya
    /// tekrarla ya süreyle ölçülür, ikisi birden değil (check constraint).
    /// </summary>
    public int? Reps { get; set; }

    /// <summary>
    /// Süreli setin süresi, saniye (#346). Yalnızca <see cref="ExerciseMeasurement.Duration"/>
    /// hareketlerinde dolu; o setlerde <see cref="Reps"/> ve <see cref="Rir"/> boş, <see cref="Weight"/> 0'dır.
    /// </summary>
    public int? DurationSeconds { get; set; }

    /// <summary>Bu set kaydedildiği anda bir rekor kırdı mı — tarihsel anlık görüntü.</summary>
    public RecordType RecordType { get; set; }

    /// <summary>
    /// Reps in Reserve — yarım adımlı (#266): 2.5 = "2–3 arası", 5 = "4+". #266 öncesi kayıtlarda
    /// 5'ten büyük olabilir; gösterimde "4+" sayılır.
    /// </summary>
    public decimal? Rir { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// #174: çevrimdışı kuyruktan gelen isteğin cihazda üretilen tekil anahtarı. Yanıtı kaybolan isteğin
    /// tekrar denenmesi seti iki kez yazmasın diye aynı antrenmanda benzersizdir; anahtarsız setlerde null.
    /// </summary>
    public Guid? ClientRequestId { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
