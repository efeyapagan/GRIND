using Grind.Api.Models.Entities;

namespace Grind.Api.Common.Progress;

/// <summary>
/// Bir hareketin oturumdaki pozisyonu (1, 2, 3…) — issue #230. Kaynak
/// <see cref="SessionExercise.OrderIndex"/> (kullanıcının PLANLADIĞI sıra, #229 ile
/// değiştirilebilir) DEĞİL, o hareketin oturumdaki İLK setinin <c>CreatedAt</c>'idir: pozisyon
/// yorgunluk birikimini açıklamak için var, yorgunluk ise fiilen NE YAPILDIĞINA bağlıdır — kullanıcı
/// kartları yeniden sıralayıp farklı sırada çalışmış olabilir. Bu yaklaşım #60/#62 migration'ından
/// ÖNCEKİ (<c>SessionExercise</c> satırı olmayan) antrenmanlar için de ek veri gerektirmeden çalışır.
///
/// Saf ve durumsuz (<see cref="Grind.Api.Common.Rest.RestIntervalCalculator"/> ile aynı desen);
/// sonuç SAKLANMAZ, sorgu anında hesaplanır.
/// </summary>
public static class ExercisePositionCalculator
{
    /// <summary>
    /// Tek bir oturumun TÜM setleri (herhangi bir hareket, sıra fark etmez) → hareket id'si başına
    /// pozisyon (1'den başlar). Filtrelenmiş bir alt küme VERİLMEMELİ —
    /// <see cref="Grind.Api.Common.Rest.RestIntervalCalculator"/> ile aynı gerekçe: görünmeyen bir
    /// hareketin sette daha erken bir CreatedAt'i varsa, geri kalan hareketlerin pozisyonu kayar.
    /// </summary>
    public static IReadOnlyDictionary<long, int> ForSession(IEnumerable<SetEntry> sets) => sets
        .GroupBy(s => s.ExerciseId)
        .Select(g => (ExerciseId: g.Key, FirstCreatedAt: g.Min(s => s.CreatedAt)))
        .OrderBy(x => x.FirstCreatedAt)
        .Select((x, i) => (x.ExerciseId, Position: i + 1))
        .ToDictionary(x => x.ExerciseId, x => x.Position);
}
