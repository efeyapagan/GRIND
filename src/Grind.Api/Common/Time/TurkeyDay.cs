namespace Grind.Api.Common.Time;

/// <summary>
/// Bir UTC anını, o anın karşılık geldiği TÜRKİYE yerel gününün UTC aralığına çevirir.
///
/// Neden gerekli: zaman damgaları UTC saklanıyor, ama "bugün" kullanıcının yaşadığı gün.
/// Gece 23:00'te (TR) başlayan bir antrenman UTC'de zaten ertesi güne geçmiştir; UTC gününe
/// göre gruplamak o antrenmanı yanlış güne düşürür (CLAUDE.md).
///
/// Sabit +03:00 yerine <see cref="TimeZoneInfo"/> kullanılıyor ki Türkiye yeniden yaz
/// saatine geçerse uygulama kendiliğinden uysun. Bedeli: çalışma ortamında saat dilimi
/// veritabanı (tzdata/ICU) bulunmalı.
///
/// DİKKAT (tzdata eksikliği): <see cref="Turkey"/> bir <c>static readonly</c> alan
/// initializer'ı olduğu için, tzdata eksik bir imajda doğrudan bir
/// <see cref="TimeZoneNotFoundException"/> ALINMAZ — çalışma zamanı bunu bir
/// <see cref="System.TypeInitializationException"/> içine sarar ve bu, başlangıçta değil
/// bu tipi kullanan İLK istek anında fırlar; o andan sonra tip süreç ömrü boyunca kalıcı
/// olarak "başarısız" işaretlenir, yani sonraki HER oturum isteği de 500 döner (ve
/// GlobalExceptionHandler bunun için özel bir eşleme taşımaz). Loglarda düz
/// <c>TimeZoneNotFoundException</c> arayan biri bunu bulamaz.
/// </summary>
public static class TurkeyDay
{
    private const string TimeZoneId = "Europe/Istanbul";

    private static readonly TimeZoneInfo Turkey = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    /// <summary>
    /// <paramref name="utcInstant"/> anının düştüğü TR gününün başlangıcı (dahil) ve
    /// bitişi (hariç), UTC olarak. TR gece yarısı bugün UTC 21:00'e denk gelir.
    /// </summary>
    public static (DateTime FromUtcInclusive, DateTime ToUtcExclusive) RangeFor(DateTime utcInstant)
    {
        if (utcInstant.Kind == DateTimeKind.Local)
        {
            throw new ArgumentException(
                "TurkeyDay yalnızca UTC an kabul eder; yerel bir DateTime gün sınırını sessizce kaydırır.",
                nameof(utcInstant));
        }

        var localInstant = TimeZoneInfo.ConvertTimeFromUtc(utcInstant, Turkey);
        var localDayStart = DateTime.SpecifyKind(localInstant.Date, DateTimeKind.Unspecified);

        return (
            TimeZoneInfo.ConvertTimeToUtc(localDayStart, Turkey),
            TimeZoneInfo.ConvertTimeToUtc(localDayStart.AddDays(1), Turkey));
    }
}
