using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class Exercise
{
    public long Id { get; set; }

    /// <summary>null ise global (varsayılan) egzersiz; doluysa o kullanıcıya özeldir.</summary>
    public long? UserId { get; set; }

    public string Name { get; set; } = null!;

    /// <summary>
    /// Aynı hareketin farklı salonlarda/ekipmanda farklı adlandırıldığı durumlar için ikinci
    /// bir arama adı (ör. "Pec Deck" için "Chest Fly Machine"). Yalnızca global egzersiz
    /// seed'inde set edilir (#335) — kullanıcı kendi egzersizinde şimdilik kullanamaz.
    /// </summary>
    public string? AlternateName { get; set; }

    public ExerciseCategory Category { get; set; }

    /// <summary>
    /// Setlerin neyle ölçüldüğü (#346) — kilo + tekrar, yalnızca tekrar ya da süre. Kullanıcı kendi
    /// hareketinde yalnızca oluştururken seçer; sonradan değişmez (geçmiş setlerle çelişmesin).
    /// </summary>
    public ExerciseMeasurement Measurement { get; set; } = ExerciseMeasurement.WeightReps;

    /// <summary>
    /// Hareketin ekipmanı (#413) — set girişindeki "Teki" / "Toplam" ibaresi buna bakar.
    /// <c>null</c> = bilinmiyor, ibare gösterilmez. <see cref="AlternateName"/> gibi yalnızca global
    /// egzersiz seed'inde set edilir; Create/Update uçları bu alanı kabul etmez (kullanıcının
    /// hareket oluşturma arayüzü geldiğinde açılır).
    /// </summary>
    public ExerciseEquipment? Equipment { get; set; }

    public bool IsArchived { get; set; }

    public User? User { get; set; }
    public ICollection<ExerciseMedia> Media { get; set; } = [];
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<SessionExercise> SessionExercises { get; set; } = [];
    public ICollection<SetEntry> SetEntries { get; set; } = [];
}
