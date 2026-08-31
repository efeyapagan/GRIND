namespace Grind.Api.Common.Exceptions;

/// <summary>Mevcut durumla çakışma — örn. kullanılmakta olan bir kullanıcı adı.</summary>
public class ConflictException(string message) : Exception(message);
