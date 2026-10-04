using Grind.Api.Models.Enums;

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

    /// <summary>
    /// Kimin görebileceği (#540; #467'deki <c>bool? IsSharedOverride</c>'ın yerini aldı).
    /// <c>null</c> = seçilmemiş: hesabın <c>PrivacyLevel</c>'inden türer (Açık→Public,
    /// Kısıtlı→Friends, Gizli→Hidden). Türeyen/etkin değer BURADA SAKLANMAZ
    /// (<see cref="Services.TemplateVisibilityRules"/>).
    /// </summary>
    public TemplateVisibility? Visibility { get; set; }

    /// <summary>
    /// <c>null</c> = kendi oluşturduğun şablon. Dolu = bir arkadaştan kaydedilmiş kopya (#467);
    /// kaynak kullanıcı adı değiştirilemediği için canlı join ile okunur, ayrıca kopyalanmaz.
    /// </summary>
    public long? SavedFromUserId { get; set; }

    /// <summary>
    /// Kaydedilen kopyayı listenin başına sabitler (#538). Yalnızca kaydedilen kopyalarda anlamlıdır:
    /// onlar son kullanıma göre dizilir, pin bu sıranın önüne geçer. Kendi şablonlarının sırası
    /// <see cref="OrderIndex"/>'tir, bu yüzden onlarda sabitleme reddedilir.
    /// </summary>
    public bool IsPinned { get; set; }

    /// <summary>
    /// #174: çevrimdışı oluşturulan şablonun cihazda üretilen tekil anahtarı -- kuyruktan tekrar gelen istek
    /// ikinci şablon açmasın (kullanıcı başına benzersiz). Anahtarsız oluşturmalarda null.
    /// </summary>
    public Guid? ClientRequestId { get; set; }

    public User User { get; set; } = null!;
    public User? SavedFromUser { get; set; }
    public ICollection<TemplateExercise> TemplateExercises { get; set; } = [];
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = [];
}
