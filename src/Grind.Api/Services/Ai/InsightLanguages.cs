namespace Grind.Api.Services.Ai;

/// <summary>
/// AI yorumunun üretildiği diller (#199). Liste SUNUCUDA durur çünkü her dil gerçek para demektir:
/// istemcinin "şu 40 dilde üret" diyebilmesi maliyet kontrolünü ortadan kaldırırdı.
///
/// Bu, istemcideki <c>DILLER</c> (packages/shared/src/i18n/dil.ts) ile AYNI olmak zorundadır; ikisini
/// <c>packages/shared/src/i18n/aiDilleri.test.ts</c> birbirine bağlar — bir dili yalnızca birine
/// eklemek CI'da patlar.
///
/// Yeni bir dil eklemek: buraya kodu ve adı, <c>DILLER</c>'e kodu, istemciye bayrağı.
/// </summary>
public static class InsightLanguages
{
    public static readonly IReadOnlyList<string> All = ["tr", "en"];

    /// <summary>
    /// Prompt'a giren insan okunur ad. Kod ("tr") bir dil adı DEĞİLDİR; modele kod vermek onu
    /// metnin bir parçası sanmaya iter.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> Names = new Dictionary<string, string>
    {
        ["tr"] = "Türkçe",
        ["en"] = "English"
    };

    /// <summary>Kolon uzunluğu: BCP-47 kodları ("pt-BR" gibi) da sığsın.</summary>
    public const int MaxCodeLength = 8;

    public static string NameFor(string code) => Names.TryGetValue(code, out var name) ? name : code;
}
