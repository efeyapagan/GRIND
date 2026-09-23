using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Validation;

/// <summary>
/// #266: RIR kaydırıcısı yarım adımlıdır (0, 0.5 … 4, 5 — "2–3 arası" = 2.5, "4+" = 5). Sütun ondalık
/// tuttuğu için 1.3 gibi hiçbir durağa düşmeyen bir değer sessizce saklanırdı; reddediyoruz.
/// 0–5 aralığı DTO'daki <c>[Range]</c>'te.
/// </summary>
public static class RirScale
{
    public static void EnsureHalfStep(decimal rir)
    {
        if (rir * 2 != decimal.Truncate(rir * 2))
        {
            throw new ValidationException("RIR yarım adımlı olmalı (0, 0,5, 1 … 4, 5).");
        }
    }
}
