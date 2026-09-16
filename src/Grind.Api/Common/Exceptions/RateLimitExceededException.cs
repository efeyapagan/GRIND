namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Kullanıcı, belirli bir süre içinde izin verilen deneme/istek sayısını aştı (örn. haftada en
/// fazla 2 AI yorumu). Mesaj, kullanıcının ne zaman tekrar deneyebileceğini AÇIKÇA söylemelidir --
/// "tekrar dene" demek, ne zaman denemesi gerektiğini bilmeyen bir kullanıcıyı hemen tekrar
/// denemeye ve aynı hatayı almaya iter.
/// </summary>
public class RateLimitExceededException(string message) : Exception(message);
