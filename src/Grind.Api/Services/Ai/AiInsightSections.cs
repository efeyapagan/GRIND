using System.Text.RegularExpressions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Tek LLM çağrısının çok dilli yanıtını dillere böler (#199). Saf: veritabanı, saat, ağ yok.
///
/// Neden tek çağrı: uzun export metni GİRDİ tokenlarının çoğunu oluşturur ve dil başına bir çağrı
/// onu her seferinde yeniden ödetirdi. Tek çağrıda model her dili ayrı bir bölüm olarak yazar.
///
/// DİKKAT: yanıt bir MODEL ÇIKTISIDIR, sözleşme değil — işaret bozulabilir, atlanabilir. Ücret
/// çağrı anında doğduğu için hiçbir bozulma yorumu KAYBETTİRMEMELİ: işaret hiç yoksa tüm metin
/// istenen ilk dile yazılır.
/// </summary>
public static partial class AiInsightSections
{
    public static string Marker(string language) => $"===GRIND:{language}===";

    /// <summary>
    /// İSTENEN dili değil, HERHANGİ bir dil işaretini yakalar: istenmeyen bir dil (modelin fazladan
    /// yazdığı) de bir bölüm SINIRI olmalı, yoksa metni önceki bölümün içinde kalır.
    /// </summary>
    [GeneratedRegex(@"^[ \t]*===GRIND:([A-Za-z-]+)===[ \t]*$", RegexOptions.Multiline)]
    private static partial Regex MarkerPattern();

    public static IReadOnlyDictionary<string, string> Split(
        string content, IReadOnlyList<string> languages)
    {
        var sonuc = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var isaretler = MarkerPattern().Matches(content);

        if (isaretler.Count == 0)
        {
            // Model hiç işaret yazmadı: yanıtı çöpe atmak yerine ilk dilin metni say.
            var tamami = content.Trim();
            if (tamami.Length > 0 && languages.Count > 0)
            {
                sonuc[languages[0]] = tamami;
            }

            return sonuc;
        }

        for (var i = 0; i < isaretler.Count; i++)
        {
            var isaret = isaretler[i];
            var dil = isaret.Groups[1].Value;

            if (!languages.Contains(dil, StringComparer.OrdinalIgnoreCase) || sonuc.ContainsKey(dil))
            {
                continue;
            }

            var bolumBasi = isaret.Index + isaret.Length;
            var bolumSonu = i + 1 < isaretler.Count ? isaretler[i + 1].Index : content.Length;

            // Yalnızca uçlar kırpılır: bölümün kendi satır sonları (başlıklar, maddeler) korunur.
            var metin = content[bolumBasi..bolumSonu].Trim();
            if (metin.Length > 0)
            {
                sonuc[dil] = metin;
            }
        }

        return sonuc;
    }
}
