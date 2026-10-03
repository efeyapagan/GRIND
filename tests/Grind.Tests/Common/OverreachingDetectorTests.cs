using Grind.Api.Common.Records;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Tests.Common;

/// <summary>
/// #176: aşırı yüklenme sinyali = en az iki harekette tahmini 1RM ≥ %5 düşüşü VE efor artışı (RIR ≥ 1 düştü ya
/// da son dönemdeki oturumların en az yarısı Zor/Maksimal). DB'siz, saf.
/// Bugün 2026-03-12: son dönem 2026-02-27..03-12, önceki dönem 2026-01-30..02-26.
/// </summary>
public class OverreachingDetectorTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);
    private static long _oturum = 1;

    /// <summary>TR günü 18:00 (UTC 15:00) — gün sınırından uzak.</summary>
    private static DateTime Gun(int ay, int gun) => new(2026, ay, gun, 15, 0, 0, DateTimeKind.Utc);

    private static OverreachingSetRow Set(
        long exerciseId, DateTime startedAtUtc, decimal weight, int reps = 5, decimal? rir = null,
        SessionDifficulty? zorluk = null, ExerciseMeasurement olcum = ExerciseMeasurement.WeightReps) =>
        new(_oturum++, startedAtUtc, true, zorluk, exerciseId, $"Hareket {exerciseId}", olcum, weight, reps, rir);

    /// <summary>
    /// A ve B: önceki 80 kg × 5 (tahmini 1RM 90,00), son dönem 76 kg × 5 (85,50) → tam %5,0 düşüş. RIR 3 → 2.
    /// Değerler tahminin 2 ondalığa yuvarlanmasından etkilenmeyecek şekilde seçildi (95 kg × 5 = 106,875 → 106,88
    /// olur ve düşüş %5'in altında kalır).
    /// </summary>
    private static List<OverreachingSetRow> IkiHareketDusuyor(decimal sonAgirlikB = 76m) =>
    [
        Set(1, Gun(2, 10), 80m, rir: 3), Set(1, Gun(3, 5), 76m, rir: 2),
        Set(2, Gun(2, 12), 80m, rir: 3), Set(2, Gun(3, 6), sonAgirlikB, rir: 2),
    ];

    [Fact]
    public void Iki_harekette_dusus_ve_rir_dususu_sinyal_verir()
    {
        var sinyal = OverreachingDetector.Detect(IkiHareketDusuyor(), Bugun);

        Assert.NotNull(sinyal);
        Assert.Equal([1L, 2L], sinyal.Drops.Select(d => d.ExerciseId).Order());
        Assert.All(sinyal.Drops, d => Assert.Equal(5.0m, d.DropPercent));
        Assert.Equal(3m, sinyal.RirBefore);
        Assert.Equal(2m, sinyal.RirRecent);
    }

    [Fact]
    public void Tek_harekette_dusus_sinyal_vermez()
    {
        var setler = IkiHareketDusuyor().Where(s => s.ExerciseId == 1).ToList();

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>%4,9 düşüş sayılmaz: B 76,1 kg'a indiğinde (85,61) düşen tek hareket A kalır.</summary>
    [Fact]
    public void Yuzde_bes_altindaki_dusus_sayilmaz()
    {
        Assert.Null(OverreachingDetector.Detect(IkiHareketDusuyor(sonAgirlikB: 76.1m), Bugun));
    }

    /// <summary>"Daha az kaldırıyorum" tek başına yetmez: RIR de zorluk da girilmemişse sinyal yok.</summary>
    [Fact]
    public void Efor_verisi_yoksa_sinyal_yok()
    {
        var setler = IkiHareketDusuyor().Select(s => s with { Rir = null }).ToList();

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>Zorluk kuralı: son dönemde işaretli 2 oturumun 1'i Zor → yarısı → sinyal (RIR yok).</summary>
    [Fact]
    public void Son_donemde_oturumlarin_yarisi_zorsa_sinyal_verir()
    {
        var setler = IkiHareketDusuyor().Select(s => s with { Rir = null }).ToList();
        setler[1] = setler[1] with { Difficulty = SessionDifficulty.Hard };
        setler[3] = setler[3] with { Difficulty = SessionDifficulty.Easy };

        var sinyal = OverreachingDetector.Detect(setler, Bugun);

        Assert.NotNull(sinyal);
        Assert.Equal(1, sinyal.HardSessions);
        Assert.Equal(2, sinyal.RatedSessions);
        Assert.Null(sinyal.RirBefore);
    }

    /// <summary>RIR yalnızca birer sete girildiyse RIR kuralı değerlendirilmez (her dönemde en az 2 set).</summary>
    [Fact]
    public void Rir_iki_setten_azsa_degerlendirilmez()
    {
        var setler = IkiHareketDusuyor();
        setler[2] = setler[2] with { Rir = null };
        setler[3] = setler[3] with { Rir = null };

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>Yalnızca son dönemde çalışılan ya da ağırlıksız hareket düşüş sayılmaz.</summary>
    [Fact]
    public void Tek_donemde_calisilan_ve_agirliksiz_hareket_degerlendirilmez()
    {
        List<OverreachingSetRow> setler =
        [
            .. IkiHareketDusuyor().Where(s => s.ExerciseId == 1),
            Set(3, Gun(3, 7), 60m, rir: 1),
            Set(4, Gun(2, 10), 0m, reps: 30, rir: 3, olcum: ExerciseMeasurement.Reps),
            Set(4, Gun(3, 7), 0m, reps: 10, rir: 1, olcum: ExerciseMeasurement.Reps),
        ];

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>
    /// TR 27 Şubat 00:30'da başlayan oturum (UTC 26 Şubat 21:30) son dönemdedir. B'nin "önceki" seti aslında
    /// son dönemde olduğu için B iki dönemde çalışılmış sayılmaz → yalnızca A düşer → sinyal yok. UTC tarihi
    /// kullanılsaydı B önceki dönemde sayılır ve sinyal yanardı.
    /// </summary>
    [Fact]
    public void Gece_yarisini_asan_oturum_TR_gunune_gore_doneme_duser()
    {
        var setler = IkiHareketDusuyor();
        setler[2] = setler[2] with { SessionStartedAt = new DateTime(2026, 2, 26, 21, 30, 0, DateTimeKind.Utc) };

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }
}
