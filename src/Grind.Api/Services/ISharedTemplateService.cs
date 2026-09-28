using Grind.Api.Models.Dtos.Template;

namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık-şartlı şablon paylaşımı (#467) — `PublicActivityService`'in gizlilik-tabanlı
/// (arkadaşlıksız) kapısından AYRI: burada arkadaşlık HÂLÂ şarttır.
/// </summary>
public interface ISharedTemplateService
{
    /// <summary>Arkadaş değilsen boş liste (403 değil — görünürlük kuralı, yetki hatası değil).</summary>
    Task<IReadOnlyList<SharedTemplateResponse>> GetSharedTemplatesAsync(
        string username, CancellationToken cancellationToken = default);

    /// <summary>Görünür değilse NotFoundException (404) — hangi şablonun var olduğunu sızdırmaz.</summary>
    Task<SharedTemplateResponse> GetSharedTemplateDetailAsync(
        string username, long templateId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Anlık görüntü olarak kopyalar: kaydedene GÖRÜNÜR olmayan (kaynağın özel) egzersizler
    /// atlanır. Kopyalanacak hiçbir satır kalmazsa (şablon boş değilken) ValidationException (400).
    /// </summary>
    Task<Grind.Api.Models.Dtos.Template.TemplateResponse> SaveTemplateAsync(
        string username, long templateId, CancellationToken cancellationToken = default);
}
