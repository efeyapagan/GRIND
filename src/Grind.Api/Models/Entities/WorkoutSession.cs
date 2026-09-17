using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

public class WorkoutSession
{
    public long Id { get; set; }
    public long UserId { get; set; }

    /// <summary>null ise şablonsuz açılmış bir oturum.</summary>
    public long? TemplateId { get; set; }

    public DateTime StartedAt { get; set; }

    /// <summary>null ise oturum hâlâ açık.</summary>
    public DateTime? EndedAt { get; set; }

    public string? Notes { get; set; }

    /// <summary>
    /// null ise kullanıcı zorluk seçmedi/atladı. Yalnızca <c>POST /api/sessions/{id}/finish</c>
    /// gövdesinde belirlenir; bitmiş bir oturumun zorluğu sonradan DEĞİŞTİRİLEMEZ (ayrı bir
    /// güncelleme ucu yok — <see cref="Notes"/>'un aksine).
    /// </summary>
    public SessionDifficulty? Difficulty { get; set; }

    public User User { get; set; } = null!;
    public WorkoutTemplate? Template { get; set; }
    public ICollection<SessionExercise> SessionExercises { get; set; } = [];
    public ICollection<SetEntry> SetEntries { get; set; } = [];
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
