namespace Grind.Api.Common.Security;

/// <summary>
/// Aktif isteğin kullanıcısı. Kimlik yoksa fırlatır — bu uygulamada kimliksiz bir istek
/// yalnızca [Authorize] unutulduğunda oluşur ve bu bir programlama hatasıdır.
/// </summary>
public interface ICurrentUserService
{
    long UserId { get; }

    string Username { get; }
}
