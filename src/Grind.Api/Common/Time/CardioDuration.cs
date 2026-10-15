namespace Grind.Api.Common.Time;

/// <summary>
/// #647: akan kardiyonun süresi — Durdur ve antrenmanı bitirmek (arka kapı) aynı kuralla keser. En az 1 sn (kayıt
/// boş kalmasın), en çok 4 saat (unutulan kardiyo antrenmanı günlerce şişirmesin).
/// </summary>
public static class CardioDuration
{
    public const int MaxSeconds = 14400;

    public static int Between(DateTime startedAt, DateTime stoppedAt)
        => (int)Math.Clamp(Math.Round((stoppedAt - startedAt).TotalSeconds), 1, MaxSeconds);
}
