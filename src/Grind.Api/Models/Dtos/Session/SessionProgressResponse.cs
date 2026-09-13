namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Şablondaki bir egzersiz için "hedef vs gerçekleşen". <paramref name="CompletedSets"/>
/// o oturumda o egzersize girilmiş GERÇEK set sayısıdır — önceden boş satır oluşturulmaz.
/// <paramref name="RestSeconds"/> şablondan canlı okunur: Bugün ekranı dinlenme süresini şablonu
/// ayrıca istemeden, oturumla aynı yanıtta alır (0 = sayaç yok).
/// </summary>
public record SessionProgressResponse(
    long ExerciseId,
    string ExerciseName,
    int PlannedSets,
    int CompletedSets,
    int RestSeconds);
