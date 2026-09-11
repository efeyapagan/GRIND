namespace Grind.Api.Services.Ai;

/// <summary>
/// Kullanılacak LLM sağlayıcısı. Varsayılan <see cref="None"/> (KAPALI). Enum olması bilinçli:
/// yapılandırma bağlayıcısı tanınmayan bir adı ("Antropic") açılışta reddeder (Faz 12 spec Karar 9).
/// </summary>
public enum AiProviderKind
{
    None,
    Anthropic
}
