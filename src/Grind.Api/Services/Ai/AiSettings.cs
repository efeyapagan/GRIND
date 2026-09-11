namespace Grind.Api.Services.Ai;

/// <summary>
/// "Ai" yapılandırma bölümü (Faz 12 spec Karar 9). <see cref="ApiKey"/> user-secrets / ortam
/// değişkeninde tutulur, appsettings.json'a YAZILMAZ. <see cref="InputUsdPerMillionTokens"/> ve
/// <see cref="OutputUsdPerMillionTokens"/> burada bir C# varsayılanı TAŞIMAZ — dağıtılan varsayılan
/// fiyatlar appsettings.json'da, varsayılan <see cref="Model"/>'in yanında tanımlıdır; model
/// değiştirilirse fiyatlar da orada güncellenmeli. Fiyat yapılandırılmazsa maliyet null kalır.
/// </summary>
public class AiSettings
{
    public AiProviderKind Provider { get; set; } = AiProviderKind.None;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "claude-opus-5";

    /// <summary>Akışsız istek için güvenli çıktı tavanı.</summary>
    public int MaxTokens { get; set; } = 16000;

    public int TimeoutSeconds { get; set; } = 180;

    public decimal? InputUsdPerMillionTokens { get; set; }

    public decimal? OutputUsdPerMillionTokens { get; set; }
}
