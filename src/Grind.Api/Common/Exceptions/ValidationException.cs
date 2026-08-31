namespace Grind.Api.Common.Exceptions;

/// <summary>Servis katmanının iş kuralı doğrulaması başarısız (DataAnnotations'ın ötesi).</summary>
public class ValidationException(string message) : Exception(message);
