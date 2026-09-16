using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Haftalık hedef (#97) auth servisine eklenmedi: kimlik doğrulama değil bir uygulama ayarı, şifre de
/// istemiyor (SRP). Aralık (1–7) DTO'da [Range] ve veritabanında CHECK ile korunur.
/// </summary>
public class SettingsService(
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : ISettingsService
{
    public async Task SetWeeklyTargetAsync(
        UpdateWeeklyTargetRequest request, CancellationToken cancellationToken = default)
    {
        // Kimlik token'dan gelir, gövdeden değil: değişen ayar her zaman çağıranın kendisininki.
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException("Oturum geçersiz.");

        user.WeeklyTargetDays = request.WeeklyTargetDays;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
