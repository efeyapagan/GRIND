using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Yorum listesinin süzgeçleri + sayfalama (Faz 12 spec Karar 13). Hepsi opsiyonel, verilenler VE'lenir,
/// sonuç her zaman kullanıcının kendi yorumlarıyla sınırlıdır. Tanımsız bir <c>kind</c> model bağlamada
/// 400 alır.
/// </summary>
public class AiInsightQuery : PagedQuery
{
    /// <summary>
    /// Tanımsız bir değer 400 alır: bu, ASP.NET Core'un varsayılan
    /// <c>MvcOptions.SuppressBindingUndefinedValueToEnumType = false</c> davranışına dayanır (uçtan uca
    /// <c>kind=Foo</c>/<c>kind=7</c> testleriyle doğrulanır) — bir framework güncellemesi bu varsayılanı
    /// değiştirirse burası ilk bakılacak yer olsun.
    /// </summary>
    public AiInsightKind? Kind { get; set; }

    public long? WorkoutSessionId { get; set; }

    public long? SetEntryId { get; set; }
}
