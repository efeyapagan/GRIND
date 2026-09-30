using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Tests.Common;

/// <summary>#184: İlerleme sekmesinin haftalık satırları. DB'siz, saf.</summary>
public class WeeklyStatsCalculatorTests
{
    /// <summary>2026-03-12 Perşembe; haftası 2026-03-09 Pazartesi başlar.</summary>
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    private static WeeklySetRow Set(DateTime startedAtUtc, decimal weight, int? reps, ExerciseCategory category) =>
        new(startedAtUtc, weight, reps, category);

    [Fact]
    public void Hic_set_yoksa_bos_liste_doner()
    {
        Assert.Empty(WeeklyStatsCalculator.Build([], Bugun));
    }

    /// <summary>
    /// Oturum Pazar 23:30'da (TR, UTC 20:30) başladıysa setleri o haftadadır — antrenmanın hangi güne ait
    /// olduğu kuralı (CLAUDE.md): başladığı gün. Pazartesi 00:30'da başlayan ertesi haftadadır.
    /// </summary>
    [Fact]
    public void Set_oturumun_basladigi_TR_gununun_haftasina_duser()
    {
        var pazarGecesi = new DateTime(2026, 3, 8, 20, 30, 0, DateTimeKind.Utc);
        var pazartesiGecesi = new DateTime(2026, 3, 8, 21, 30, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build(
            [Set(pazarGecesi, 100m, 5, ExerciseCategory.Push), Set(pazartesiGecesi, 60m, 10, ExerciseCategory.Pull)],
            Bugun);

        Assert.Equal(
            [
                new WeeklyStatsRow(new DateOnly(2026, 3, 2), 500m, 1, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 9), 600m, 0, 1, 0, 0),
            ],
            haftalar);
    }

    /// <summary>İlk antrenman haftasından bu haftaya aradaki boş haftalar sıfırla doldurulur.</summary>
    [Fact]
    public void Bos_haftalar_bu_haftaya_kadar_sifirla_doldurulur()
    {
        var subatOrtasi = new DateTime(2026, 2, 17, 15, 0, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build([Set(subatOrtasi, 50m, 10, ExerciseCategory.Legs)], Bugun);

        Assert.Equal(
            [
                new WeeklyStatsRow(new DateOnly(2026, 2, 16), 500m, 0, 0, 1, 0),
                new WeeklyStatsRow(new DateOnly(2026, 2, 23), 0m, 0, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 2), 0m, 0, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 9), 0m, 0, 0, 0, 0),
            ],
            haftalar);
    }

    /// <summary>
    /// #346: süreli set (tekrar yok) ve ağırlıksız set hacme 0 katar ama kategorisine sayılır.
    /// </summary>
    [Fact]
    public void Agirliksiz_ve_sureli_setler_hacme_eklenmez_ama_kategorisine_sayilir()
    {
        var an = new DateTime(2026, 3, 10, 15, 0, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build(
            [
                Set(an, 0m, null, ExerciseCategory.Other),
                Set(an, 0m, 20, ExerciseCategory.Other),
                Set(an, 80m, 8, ExerciseCategory.Push),
            ],
            Bugun);

        Assert.Equal([new WeeklyStatsRow(new DateOnly(2026, 3, 9), 640m, 1, 0, 0, 2)], haftalar);
    }
}
