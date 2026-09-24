namespace Grind.Api.Models.Projections;

/// <summary>Takip listeleri ve arama için kullanıcının kimliği — repository'nin okuma modeli, DTO değil.</summary>
public record UserRef(long Id, string Username, string? DisplayName);
