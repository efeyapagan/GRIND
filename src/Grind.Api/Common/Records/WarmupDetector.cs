namespace Grind.Api.Common.Records;

/// <summary>
/// "Bu hareketin baştaki kaç seti ısınmaydı" kuralının TEK yeri (#444, kullanıcı tanımı).
/// Veritabanı, saat ve kültür bilmez — yalnızca BİR oturumdaki BİR hareketin setlerini,
/// yapıldıkları sırayla görür. <see cref="RecordTracker"/> ve <c>StreakCalculator</c> ile aynı
/// desen: kural saf bir fonksiyonda yaşar.
///
/// Kural:
/// <list type="bullet">
/// <item>Baştan başlayarak, ağırlığı bir SONRAKİ setten kesin daha hafif olan setler ısınmadır.</item>
/// <item>İlk artmayan sette durulur — düz giden ağırlık ısınma DEĞİLDİR.</item>
/// <item>En fazla <see cref="MaxWarmupSets"/> set ısınma sayılır.</item>
/// </list>
///
/// DİKKAT: bu bir SEZGİDİR, veri değil — <c>SetEntry</c>'de "bu bir ısınma setidir" diye bir alan
/// yok. Bu yüzden çıktısı bir seti SİLMEK için değil, İŞARETLEMEK için kullanılır: yanlış tahmin
/// ettiğinde işaret kurtarılabilir, silme veri kaybıdır.
/// </summary>
public static class WarmupDetector
{
    /// <summary>Kullanıcının kuralı "bir veya iki set" diyor; üçüncü artış artık piramittir.</summary>
    public const int MaxWarmupSets = 2;

    /// <summary>
    /// Baştaki ısınma seti sayısı. <c>count + 1 &lt; Count</c> koşulu sayesinde en az bir çalışma
    /// seti HER ZAMAN kalır: tek setlik bir hareket hiç ısınma taşımaz.
    /// </summary>
    public static int WarmupCount(IReadOnlyList<decimal> weightsInOrder)
    {
        var count = 0;

        while (count < MaxWarmupSets
               && count + 1 < weightsInOrder.Count
               && weightsInOrder[count] < weightsInOrder[count + 1])
        {
            count++;
        }

        return count;
    }
}
