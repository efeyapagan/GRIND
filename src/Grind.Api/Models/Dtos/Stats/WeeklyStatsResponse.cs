namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// #184: bir haftanın (Pazartesi–Pazar, TR) hacmi ve kas grubuna göre set sayıları. Kategoriler sözlük
/// değil düz alan: Swagger'dan üretilen istemci tipi net kalsın.
/// </summary>
public record WeeklyStatsRow(
    DateOnly WeekStart, decimal Volume, int PushSets, int PullSets, int LegsSets, int OtherSets);

/// <summary>
/// İlk antrenman haftasından bu haftaya, eskiden yeniye; antrenmansız haftalar sıfır. Son satır içinde
/// bulunulan (henüz bitmemiş) haftadır. Hiç set yoksa boş.
/// </summary>
public record WeeklyStatsResponse(IReadOnlyList<WeeklyStatsRow> Weeks);
