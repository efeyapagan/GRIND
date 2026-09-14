namespace Grind.Api.Models.Entities;

/// <summary>
/// Bir antrenmanin hareket listesindeki tek hareket (#60, #62). Sablonla baslarken sablonun
/// hareketleri buraya KOPYALANIR; sonradan eklenen hareket ve set girilen sablon disi hareket de
/// buraya girer. Sablondan kopyalanan degerler bilincli bir anlik goruntudur (bkz.
/// <c>SetEntry.RecordType</c> notu): sablon sonradan degisse de baslamis antrenman degismez.
/// </summary>
public class SessionExercise
{
    public long Id { get; set; }
    public long WorkoutSessionId { get; set; }
    public long ExerciseId { get; set; }

    /// <summary>Kartlarin sirasi.</summary>
    public int OrderIndex { get; set; }

    /// <summary>
    /// Hedef set sayisi; <c>null</c> = hedefsiz (antrenmana sonradan eklenen hareket).
    /// Agirlik/tekrar burada YOKTUR -- onlar SetEntry'de yasar.
    /// </summary>
    public int? PlannedSets { get; set; }

    /// <summary>Setler arasi dinlenme (saniye), 0-900. <c>0</c> = bu harekette dinlenme sayaci yok.</summary>
    public int RestSeconds { get; set; } = TemplateExercise.DefaultRestSeconds;

    public WorkoutSession WorkoutSession { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
