using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>Rekor bildiriminde hareket başına tek satır (#325): en ağır set, eşitlikte tekrarı fazla olan.</summary>
public class BestRecordPickerTests
{
    private static readonly DateTime T0 = new(2026, 9, 26, 10, 0, 0, DateTimeKind.Utc);

    private static RecordSetRow Set(long exerciseId, decimal weight, int reps, int? order = 0, int dakika = 0,
        RecordType type = RecordType.Weight) =>
        new(1, exerciseId, $"Hareket {exerciseId}", weight, reps, type, T0.AddMinutes(dakika), order);

    [Fact]
    public void Hareket_basina_en_agir_set_secilir_esitlikte_tekrari_fazla_olan()
    {
        var sonuc = BestRecordPicker.Pick([Set(1, 80, 8), Set(1, 82.5m, 6), Set(1, 82.5m, 7, type: RecordType.Reps)]);

        var tek = Assert.Single(sonuc);
        Assert.Equal((82.5m, 7, RecordType.Reps), (tek.Weight, tek.Reps, tek.RecordType));
    }

    [Fact]
    public void Hareketler_antrenmandaki_siraya_gore_listede_olmayan_sona_ilk_setine_gore()
    {
        var sonuc = BestRecordPicker.Pick([
            Set(3, 50, 5, order: null, dakika: 1),
            Set(2, 60, 5, order: 1),
            Set(4, 40, 5, order: null, dakika: 0),
            Set(1, 70, 5, order: 0)
        ]);

        Assert.Equal([1L, 2L, 4L, 3L], sonuc.Select(r => r.ExerciseId));
    }
}
