namespace Grind.Api.Models.Entities;

/// <summary>
/// #647: bir kardiyo kaydı — ağırlık setlerinden (<see cref="SetEntry"/>) ayrı, böylece rekor, hacim, 1RM ve plato
/// mantığı kardiyoya dokunmaz. Başlat ile açılır (<see cref="DurationSeconds"/> null = akıyor), Durdur ya da
/// antrenmanı bitirmek süreyi yazar. Süre dışındaki kutular isteğe bağlıdır ve yalnızca hareketin sorduğu
/// kutular dolu olabilir (<see cref="Common.Validation.CardioFieldCatalog"/>).
/// </summary>
public class CardioEntry
{
    public long Id { get; set; }
    public long WorkoutSessionId { get; set; }
    public long ExerciseId { get; set; }

    /// <summary>Başlat'a basılan an (UTC, istemci zamanı — çevrimdışı kuyruk geç gönderebilir).</summary>
    public DateTime StartedAt { get; set; }

    /// <summary><c>null</c> = kardiyo hâlâ akıyor. Bir antrenmanda aynı anda tek akan kayıt olur.</summary>
    public int? DurationSeconds { get; set; }

    public decimal? SpeedKmh { get; set; }
    public decimal? InclinePercent { get; set; }
    public int? Level { get; set; }
    public int? Damper { get; set; }
    public decimal? DistanceKm { get; set; }
    public int? Cadence { get; set; }
    public int? Floors { get; set; }
    public int? Steps { get; set; }
    public int? Jumps { get; set; }
    public int? Watts { get; set; }

    /// <summary>Kaydedildiği anın rekor görüntüsü (<see cref="SetEntry.RecordType"/> gerekçesi). İkisi birden olabilir.</summary>
    public bool IsDurationRecord { get; set; }

    public bool IsDistanceRecord { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>#174: çevrimdışı kuyruğun tekil anahtarı; aynı antrenmanda benzersiz.</summary>
    public Guid? ClientRequestId { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
