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
    public AiInsightKind? Kind { get; set; }

    public long? WorkoutSessionId { get; set; }

    public long? SetEntryId { get; set; }
}
