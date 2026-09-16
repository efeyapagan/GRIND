namespace Grind.Api.Models.Entities;

public class User
{
    public long Id { get; set; }
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Hesabın pasifleştirildiği an (UTC); <c>null</c> ise hesap aktiftir (Faz 13 spec Karar 1).
    /// Pasifleştirme HİÇBİR satırı silmez — kullanıcının oturumları, setleri, rekorları, tartıları ve
    /// yorumları olduğu gibi kalır; doğru şifreyle giriş yapmak hesabı geri açar.
    /// </summary>
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// Haftalık antrenman hedefi, gün sayısı (1–7); <c>null</c> = hedef yok (#97). Tek sayısal bir öznitelik,
    /// 3NF'yi ihlal etmez. Hedef serisi saklanmaz, takvim sorgusunda bu GÜNCEL değerle hesaplanır.
    /// </summary>
    public int? WeeklyTargetDays { get; set; }

    public ICollection<Exercise> Exercises { get; set; } = [];
    public ICollection<WorkoutTemplate> WorkoutTemplates { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
    public ICollection<BodyWeightLog> BodyWeightLogs { get; set; } = [];
    public ICollection<AiInsight> AiInsights { get; set; } = [];
}
