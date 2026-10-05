namespace Grind.Api.Common.Time;

/// <summary>
/// Bir kullanıcının haftalık hedefinin hangi hafta kaç gün olduğu (#654). Saf: veritabanı bilmez.
/// Değişiklik, yapıldığı haftayı DAHİL ederek ileriye geçerlidir; ilk değişiklikten önceki haftaların
/// hedefi yoktur. Hiç değişiklik kaydı yoksa hedef hiç değişmemiştir: güncel değer her haftaya uygulanır.
/// </summary>
public sealed class WeeklyTargetHistory(int? current, IEnumerable<(DateOnly FromWeek, int? Days)> changes)
{
    private readonly (DateOnly FromWeek, int? Days)[] _changes = changes.OrderBy(c => c.FromWeek).ToArray();

    /// <summary><paramref name="weekStart"/> haftasında (Pazartesi) geçerli hedef; yoksa <c>null</c>.</summary>
    public int? For(DateOnly weekStart)
    {
        if (_changes.Length == 0)
        {
            return current;
        }

        int? target = null;
        foreach (var change in _changes.TakeWhile(c => c.FromWeek <= weekStart))
        {
            target = change.Days;
        }

        return target;
    }
}
