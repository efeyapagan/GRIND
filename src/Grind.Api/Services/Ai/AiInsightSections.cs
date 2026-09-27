using System.Text.Json;
using System.Text.RegularExpressions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Tek LLM çağrısının çok dilli yanıtını dillere böler (#199, #463). Saf: veritabanı, saat, ağ yok.
///
/// Yanıt TEK bir JSON nesnesidir; dış anahtarlar dil kodları, değerler o dilin yorum nesnesi:
/// <c>{"tr": {"ozet": ..., ...}, "en": {...}}</c>. Saklanan içerik ALT nesnedir — dil sarmalayıcısı
/// taşınmaz, çünkü istemci ayrıştırıcısı (<c>yorumIcerigi.ts</c>) doğrudan yorum nesnesini bekler.
///
/// #463'e kadar burada metin içinde <c>===GRIND:tr===</c> gibi bir işaret aranıyordu. O düzen
/// kırılgandı: model işareti bozduğunda ya da atladığında kullanıcı ekranda ham metin/JSON
/// görüyordu. Artık biçim sağlayıcıya da zorlatılıyor (<c>response_format</c>) ve burada tek bir
/// <c>JsonDocument.Parse</c> var.
///
/// Neden tek çağrı: uzun export metni GİRDİ tokenlarının çoğunu oluşturur ve dil başına bir çağrı
/// onu her seferinde yeniden ödetirdi.
///
/// KURAL: ücret çağrı anında doğduğu için hiçbir bozulma yorumu KAYBETTİRMEZ — hiçbir dil
/// ayıklanamazsa tüm metin istenen İLK dile yazılır ve istemci onu düz metin olarak gösterir.
/// </summary>
public static partial class AiInsightSections
{
    /// <summary>Model JSON'u bazen ``` bloguna sarar; bu bozuk bir yanıt değil.</summary>
    [GeneratedRegex(@"^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$")]
    private static partial Regex KodBlogu();

    public static IReadOnlyDictionary<string, string> Split(
        string content, IReadOnlyList<string> languages)
    {
        var sonuc = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var govde = (KodBlogu().Match(content) is { Success: true } blok
            ? blok.Groups[1].Value
            : content).Trim();

        if (govde.Length == 0)
        {
            return sonuc;
        }

        try
        {
            using var belge = JsonDocument.Parse(govde);
            if (belge.RootElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var dil in languages)
                {
                    // Nesne olmayan bir değer (ör. düz metin) ATLANIR: istemci onu yorum
                    // nesnesi sanıp çözümleyemez, yarım bir kart göstermektense o dil hiç olmasın.
                    if (belge.RootElement.TryGetProperty(dil, out var bolum)
                        && bolum.ValueKind == JsonValueKind.Object)
                    {
                        sonuc[dil] = bolum.GetRawText();
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Aşağıdaki geri düşmeye bırakılır: yanıt kaybedilmez.
        }

        if (sonuc.Count == 0 && languages.Count > 0)
        {
            sonuc[languages[0]] = content.Trim();
        }

        return sonuc;
    }
}
