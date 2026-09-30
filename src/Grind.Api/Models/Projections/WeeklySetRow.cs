using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>
/// #184: haftalık istatistik için bir set — oturumun başlangıcı (haftayı o belirler), hacim alanları ve
/// hareketin kas grubu. Repository'nin okuma modeli.
/// </summary>
public record WeeklySetRow(DateTime SessionStartedAt, decimal Weight, int? Reps, ExerciseCategory Category);
