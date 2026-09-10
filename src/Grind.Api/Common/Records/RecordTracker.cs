using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Records;

/// <summary>
/// Kişisel rekor tespitinin TEK karar noktası. Veritabanı bilmez, zaman bilmez, kullanıcı
/// bilmez — yalnızca kendisine verilen setleri kronolojik sırada görür.
///
/// CLAUDE.md'nin DRY emri: "AddSet akışındaki 'bu set önceki en iyiyi geçiyor mu' kontrolü
/// ortak bir yardımcı fonksiyonda tutulup her iki akışta da (ekleme ve yeniden hesaplama)
/// aynı fonksiyon çağrılmalı." O fonksiyon <see cref="Apply"/>'dır. İkinci bir yerde
/// "&gt;" karşılaştırması yazmak bu kuralın ihlalidir.
///
/// Örnek durumu YÜRÜR: her <see cref="Apply"/> çağrısı hem sınıflandırır hem "yürüyen en
/// iyiler"i ilerletir. Bu yüzden bir örnek TEK bir (kullanıcı, egzersiz) serisi için
/// kullanılır ve yeniden kullanılmaz.
/// </summary>
public sealed class RecordTracker
{
    // Nullable, `0m` DEĞİL: Weight = 0 geçerli bir ağırlıktır (barfiks/dips). Sıfırla
    // başlatmak ilk 0 kg'lık seti "0 > 0 değil" diye rekor saymamaya yol açardı.
    private decimal? _maxWeight;

    // Ağırlık kovası -> o kovadaki en çok tekrar. decimal anahtar güvenli: 100.0m ile
    // 100.00m hem Equals hem GetHashCode bakımından aynı (ölçüldü) — EF'ten (6,2)
    // ölçeğiyle dönen değerler ayrı kovaya düşmez.
    private readonly Dictionary<decimal, int> _maxRepsByWeight = [];

    /// <summary>
    /// Bir seti sınıflandırır VE durumu ilerletir. Çağrı sırası kronolojik olmalıdır.
    /// </summary>
    public RecordType Apply(decimal weight, int reps)
    {
        var result = Classify(weight, reps);
        Observe(weight, reps);
        return result;
    }

    private RecordType Classify(decimal weight, int reps)
    {
        // Hiç önceki maksimum yoksa "çıtayı sen koydun" — ilk set her zaman ağırlık rekoru.
        if (_maxWeight is not { } maxWeight || weight > maxWeight)
        {
            return RecordType.Weight;
        }

        // DİKKAT (spec Soru 1/A): o ağırlıkta hiç önceki kayıt YOKSA rekor değildir.
        // TryGetValue'nun false dönmesi "geçilecek bir şey yok" demektir, "her şeyi geçtin"
        // demek DEĞİL — burada `out var best` yerine `best = 0` varsaymak, her indirme
        // setini sahte bir PR rozetiyle işaretlerdi.
        if (_maxRepsByWeight.TryGetValue(weight, out var bestReps) && reps > bestReps)
        {
            return RecordType.Reps;
        }

        return RecordType.None;
    }

    private void Observe(decimal weight, int reps)
    {
        if (_maxWeight is not { } maxWeight || weight > maxWeight)
        {
            _maxWeight = weight;
        }

        // Rekor OLMAYAN setler de kovayı besler: 60x15 rekor değildir ama sonraki 60x18'in
        // kıyas noktasıdır.
        if (!_maxRepsByWeight.TryGetValue(weight, out var bestReps) || reps > bestReps)
        {
            _maxRepsByWeight[weight] = reps;
        }
    }
}
