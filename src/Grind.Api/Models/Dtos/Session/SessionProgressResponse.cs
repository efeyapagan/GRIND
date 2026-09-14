namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Antrenmanin hareket listesindeki bir hareket icin "hedef vs gerceklesen" (#60, #62).
/// <paramref name="PlannedSets"/> <c>null</c> ise hareket hedefsizdir (antrenmana sonradan eklendi ya da
/// sablon disi bir harekete set girildi). <paramref name="CompletedSets"/> o antrenmanda o harekete
/// girilmis GERCEK set sayisidir -- onceden bos satir olusturulmaz. <paramref name="RestSeconds"/>
/// antrenman baslarken sablondan kopyalanir (0 = sayac yok).
/// </summary>
public record SessionProgressResponse(
    long ExerciseId,
    string ExerciseName,
    int? PlannedSets,
    int CompletedSets,
    int RestSeconds);
