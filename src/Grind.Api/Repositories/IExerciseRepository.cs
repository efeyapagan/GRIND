using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IExerciseRepository : IRepository<Exercise>
{
    /// <summary>Kullanıcının kendi egzersizleri + global egzersizler, isme göre sıralı.</summary>
    Task<IReadOnlyList<Exercise>> GetVisibleAsync(
        long userId, bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yalnızca kullanıcının erişebildiği bir egzersizi döndürür; başkasının özel
    /// egzersizinde null döner (IDOR koruması). Arşivlenmiş egzersizler bilerek dahil
    /// edilir — geçmiş <c>SetEntry</c>/<c>TemplateExercise</c> kayıtları bu egzersize
    /// referans verir ve çözülebilir kalmalıdır; burada arşiv filtresi uygulamak
    /// geçmiş kayıtları bozar.
    /// </summary>
    /// <param name="includeMedia">
    /// true ise <c>Media</c> koleksiyonu da yüklenir. Varsayılan false: yazma akışlarının
    /// çoğu medyaya dokunmuyor, gereksiz join yapılmasın.
    /// </param>
    Task<Exercise?> GetVisibleByIdAsync(
        long id, long userId, bool includeMedia = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu isim kullanıcı için zaten dolu mu — kendi egzersizlerinde veya globallerde,
    /// büyük/küçük harf gözetmeden, arşivliler dâhil.
    /// </summary>
    /// <param name="excludeId">
    /// Verilirse bu Id'li kayıt sayılmaz. Yeniden adlandırmada gerekli: kaydın kendi adı
    /// kendisiyle çakışmamalı, yoksa yalnızca kategoriyi değiştirmek bile 409 verirdi.
    /// </param>
    Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
}
