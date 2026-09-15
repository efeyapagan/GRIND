namespace Grind.Api.Services.Ai;

/// <summary>
/// Kullanılacak LLM sağlayıcısı. Varsayılan <see cref="None"/> (KAPALI). Enum olması bilinçli:
/// yapılandırma bağlayıcısı tanınmayan bir adı ("Antropic") açılışta reddeder (Faz 12 spec Karar 9).
/// </summary>
public enum AiProviderKind
{
    None,
    Anthropic,

    /// <summary>
    /// GEÇİCİ/test amaçlı ikinci sağlayıcı (issue #99): gerçek bir Anthropic anahtarı olmadan
    /// uçtan uca test için, OpenRouter'ın ücretsiz (":free" ekli) modelleri.
    /// </summary>
    OpenRouter
}
