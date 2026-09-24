using Grind.Api.Models.Dtos.Settings;

namespace Grind.Api.Services;

/// <summary>Kullanıcının kendi uygulama ayarları (#97). Kimlik her zaman token'dan gelir.</summary>
public interface ISettingsService
{
    /// <summary>Haftalık antrenman hedefini ayarlar; <c>null</c> hedefi kaldırır.</summary>
    Task SetWeeklyTargetAsync(UpdateWeeklyTargetRequest request, CancellationToken cancellationToken = default);

    /// <summary>Antrenman geçmişi ve rekorların başkalarına görünürlüğünü ayarlar (#294).</summary>
    Task SetPrivacyLevelAsync(UpdatePrivacyLevelRequest request, CancellationToken cancellationToken = default);
}
