namespace Grind.Api.Common;

/// <summary>
/// Profil fotoğrafının sürümü (#280): son yüklemenin Unix ms'i. İstemcide önbellek kırıcı, sunucuda
/// <c>ETag</c>; kendi profilin (#280) ve başkasının başlığı/satırları (#284) aynı değeri üretir.
/// </summary>
public static class AvatarVersion
{
    public static long Of(DateTime updatedAt)
        => new DateTimeOffset(DateTime.SpecifyKind(updatedAt, DateTimeKind.Utc)).ToUnixTimeMilliseconds();
}
