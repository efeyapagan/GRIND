using Grind.Api.Common.Records;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Common;

/// <summary>
/// #346: ağırlıksız (<see cref="ExerciseMeasurement.Reps"/>) ve süreli
/// (<see cref="ExerciseMeasurement.Duration"/>) hareketlerin rekor kuralları. Kilolu hareketlerin
/// kuralları <see cref="RecordTrackerTests"/>'te ve değişmedi.
/// </summary>
public class RecordTrackerMeasurementTests
{
    /// <summary>0 kg'lık bir crunch'ta "ağırlık rekoru" demek anlamsız: çıtayı koyan ilk set tekrar rekorudur.</summary>
    [Fact]
    public void Tekrar_hareketinde_ilk_set_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Reps);

        Assert.Equal(RecordType.Reps, izleyici.Apply(0m, 20, null));
    }

    [Fact]
    public void Tekrar_hareketinde_ayni_ek_agirlikta_daha_cok_tekrar_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Reps);
        izleyici.Apply(0m, 20, null);

        Assert.Equal(RecordType.Reps, izleyici.Apply(0m, 25, null));
        Assert.Equal(RecordType.None, izleyici.Apply(0m, 25, null));
    }

    /// <summary>Ek ağırlık (elde plaka) önceki en ağırını geçerse bu yine ağırlık rekorudur.</summary>
    [Fact]
    public void Tekrar_hareketinde_daha_fazla_ek_agirlik_agirlik_rekorudur()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Reps);
        izleyici.Apply(0m, 20, null);

        Assert.Equal(RecordType.Weight, izleyici.Apply(5m, 12, null));
    }

    [Fact]
    public void Sure_hareketinde_ilk_set_ve_daha_uzun_sure_sure_rekorudur()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Duration);

        Assert.Equal(RecordType.Duration, izleyici.Apply(0m, null, 60));
        Assert.Equal(RecordType.Duration, izleyici.Apply(0m, null, 75));
    }

    /// <summary>Eşitlik rekor değildir — kilolu hareketlerdeki kuralın aynısı.</summary>
    [Fact]
    public void Sure_hareketinde_esit_ya_da_kisa_sure_rekor_degildir()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Duration);
        izleyici.Apply(0m, null, 60);

        Assert.Equal(RecordType.None, izleyici.Apply(0m, null, 60));
        Assert.Equal(RecordType.None, izleyici.Apply(0m, null, 45));
    }

    /// <summary>
    /// Plank #346'dan önce "0 kg × n" diye girilebiliyordu; o eski setlerin süresi yok. Rekor değildirler
    /// ve çıtayı da etkilemezler — ilk gerçek süreli set yine rekor olur.
    /// </summary>
    [Fact]
    public void Sure_hareketinde_suresi_olmayan_eski_set_yok_sayilir()
    {
        var izleyici = new RecordTracker(ExerciseMeasurement.Duration);

        Assert.Equal(RecordType.None, izleyici.Apply(0m, 90, null));
        Assert.Equal(RecordType.Duration, izleyici.Apply(0m, null, 30));
    }
}
