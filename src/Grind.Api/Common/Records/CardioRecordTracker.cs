namespace Grind.Api.Common.Records;

/// <summary>
/// #647: kardiyo rekorunun TEK karar noktası (<see cref="RecordTracker"/> deseni): bir (kullanıcı, hareket) serisini
/// kronolojik sırada görür. Süre ve mesafe ayrı çıtalardır; çıtayı ilk kayıt koyar, eşitlik rekor değildir.
/// Mesafesiz kayıt mesafe çıtasını etkilemez. Örnek durumu yürüdüğü için tek seri için kullanılır.
/// </summary>
public sealed class CardioRecordTracker
{
    private int? _maxDurationSeconds;
    private decimal? _maxDistanceKm;

    public (bool Duration, bool Distance) Apply(int durationSeconds, decimal? distanceKm)
    {
        var durationRecord = _maxDurationSeconds is not { } maxDuration || durationSeconds > maxDuration;
        if (durationRecord)
        {
            _maxDurationSeconds = durationSeconds;
        }

        var distanceRecord = distanceKm is { } distance && (_maxDistanceKm is not { } maxDistance || distance > maxDistance);
        if (distanceRecord)
        {
            _maxDistanceKm = distanceKm;
        }

        return (durationRecord, distanceRecord);
    }
}
