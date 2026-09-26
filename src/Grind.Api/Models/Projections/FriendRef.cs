using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>
/// Arkadaş karşılaştırması (#418) için bir arkadaşın kimliği + satırı çizmeye yeten alanlar.
/// Repository'nin okuma modeli, DTO değil. <see cref="PrivacyLevel"/> ve
/// <see cref="WeeklyTargetDays"/> burada taşınır ki kişi başına ikinci bir sorgu gerekmesin.
/// </summary>
public record FriendRef(
    long Id,
    string Username,
    string? DisplayName,
    PrivacyLevel PrivacyLevel,
    int? WeeklyTargetDays);
