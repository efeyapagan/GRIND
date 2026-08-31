namespace Grind.Api.Common.Security;

/// <summary>
/// JWT claim tipleri. Tek yerde durur: token'ı üreten, okuyan ve loglayan kod aynı
/// sabitleri kullanır. .NET'in eski claim eşlemesi kapatıldığı için (MapInboundClaims =
/// false) bu adlar token'da göründükleri hâlleriyle kullanılır.
/// </summary>
public static class AppClaims
{
    public const string UserId = "sub";
    public const string Username = "unique_name";
}
