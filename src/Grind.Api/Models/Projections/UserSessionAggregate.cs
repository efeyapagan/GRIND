namespace Grind.Api.Models.Projections;

/// <summary>
/// <see cref="SessionAggregate"/>'in çok kullanıcılı hali (#418): bir oturumun toplamları ve
/// SAHİBİ. TR gününe gruplama çağıranın işidir (bkz. TurkeyDay.LocalDateOf) -- tek sorguda
/// birden fazla arkadaşın haftası okunur, arkadaş başına istek atılmaz.
/// </summary>
public record UserSessionAggregate(long UserId, DateTime StartedAt, int SetCount, decimal Volume);
