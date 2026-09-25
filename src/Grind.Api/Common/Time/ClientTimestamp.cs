using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Time;

/// <summary>
/// Istemciden (mobil/web) opsiyonel bir zaman damgasi kabul eden uclerin ortak deseni (issue #262).
/// Ilk olarak <c>BodyWeightLogService</c>'te (issue #119) kullanildi -- istemci saati birkac
/// saniye/dakika ileride olabilir, "simdi"yi gonderen bir istek 400 almamali. Iki ayri kural icat
/// etmek yerine (DRY) bu tek yerden paylasilir.
/// </summary>
public static class ClientTimestamp
{
    public static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    /// <summary>
    /// <paramref name="clientTime"/> verilmezse sunucu saatine (<paramref name="timeProvider"/>) duser;
    /// verilmisse UTC'ye cevirir (<c>UtcDateTime</c> Kind=Utc doner -- Npgsql bunu ister) ve
    /// toleranstan fazla ileride olani <paramref name="futureErrorMessage"/> ile reddeder.
    /// </summary>
    public static DateTime Resolve(DateTimeOffset? clientTime, TimeProvider timeProvider, string futureErrorMessage)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (clientTime is not { } girilenZaman)
        {
            return now;
        }

        var utc = girilenZaman.UtcDateTime;
        if (utc > now + FutureTolerance)
        {
            throw new ValidationException(futureErrorMessage);
        }

        return utc;
    }
}
