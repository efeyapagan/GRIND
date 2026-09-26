namespace Grind.Api.Models.Entities;

public class WorkoutTemplate
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Kullanıcının kendi sıralaması (#344 — antrenman ekranında basılı tutup sürükleme).
    /// Varsayılan 0'dır ve liste <c>OrderIndex, Name</c> ile sıralanır: hiç sürükleme yapmamış
    /// kullanıcıda tüm satırlar 0'da kalıp bugünkü ALFABETİK sırayı korur, bu yüzden migration'ın
    /// veri taşımasına gerek yoktur. Sürüklenince <see cref="Services.IWorkoutTemplateService.ReorderAsync"/>
    /// tüm satırlara 0..n-1 yazar — indeks istemciden değil konumdan türer.
    /// </summary>
    public int OrderIndex { get; set; }

    public User User { get; set; } = null!;
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
}
