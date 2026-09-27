namespace Grind.Api.Models.Dtos.Export;

/// <summary>
/// Export metninin hangi amaçla üretildiği (#444). CLAUDE.md Faz 12 kararı korunur — "LLM'e giden
/// bağlam Faz 11'in export metnidir; ikinci bir 'LLM'e özet' biçimi yazılmaz": tek formatlayıcı,
/// iki seçenek kümesi.
///
/// <see cref="Default"/> kullanıcıya dönen <c>/api/export/text</c> içindir ve çıktısı #444 öncesiyle
/// BİREBİR aynıdır. <see cref="ForAi"/> yalnızca modele giden bağlamı daraltır.
/// </summary>
public record ExportTextOptions
{
    /// <summary>
    /// Baştaki ısınma setlerini "(ısınma)" diye işaretle ve açıklamalara ne demek olduğunu yaz.
    /// Set SİLİNMEZ: kural bir sezgidir ve özet satırları sunucu toplamlarından gelir — setleri
    /// metinden çıkarmak özetle çelişirdi.
    /// </summary>
    public bool MarkWarmups { get; init; }

    /// <summary>
    /// Hiç seti OLMAYAN ve notu da olmayan oturumları atla: modele "burada bir şey olmadı" satırı
    /// göndermek token yakar, odağı dağıtır. Setsiz ama NOTLU oturum veridir (Faz 11 Karar 8) ve
    /// bu bayrakla da korunur.
    /// </summary>
    public bool SkipEmptySessions { get; init; }

    public static ExportTextOptions Default { get; } = new();

    public static ExportTextOptions ForAi { get; } = new()
    {
        MarkWarmups = true,
        SkipEmptySessions = true
    };
}
