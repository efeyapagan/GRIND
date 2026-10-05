using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Haftalık hedef (#97) auth servisine eklenmedi: kimlik doğrulama değil bir uygulama ayarı, şifre de
/// istemiyor (SRP). Aralık (1–7) DTO'da [Range] ve veritabanında CHECK ile korunur.
/// </summary>
public class SettingsService(
    IUserRepository userRepository,
    IWeeklyTargetChangeRepository targetChangeRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : ISettingsService
{
    public async Task SetWeeklyTargetAsync(
        UpdateWeeklyTargetRequest request, CancellationToken cancellationToken = default)
    {
        // Kimlik token'dan gelir, gövdeden değil: değişen ayar her zaman çağıranın kendisininki.
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException("Oturum geçersiz.");

        // #654: değişiklik bu haftadan (dahil) ileriye geçerlidir; geçmiş haftalar eski hedefleriyle kalır.
        var buHafta = StreakCalculator.WeekStart(TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime));
        var degisiklikler = await targetChangeRepository.GetForUsersAsync([user.Id], cancellationToken);

        if (degisiklikler.Count == 0 && user.WeeklyTargetDays is not null)
        {
            // İlk değişiklik: o güne kadarki hedef geçmişin tamamına sabitlenir, yoksa önceki haftalar
            // hedefsiz kalır ve seri sıfırlanırdı.
            targetChangeRepository.Add(new WeeklyTargetChange
            {
                UserId = user.Id, EffectiveFromWeek = DateOnly.MinValue, TargetDays = user.WeeklyTargetDays,
            });
        }

        if (degisiklikler.FirstOrDefault(d => d.EffectiveFromWeek == buHafta) is { } buHaftaninki)
        {
            buHaftaninki.TargetDays = request.WeeklyTargetDays;
        }
        else
        {
            targetChangeRepository.Add(new WeeklyTargetChange
            {
                UserId = user.Id, EffectiveFromWeek = buHafta, TargetDays = request.WeeklyTargetDays,
            });
        }

        user.WeeklyTargetDays = request.WeeklyTargetDays;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task SetPrivacyLevelAsync(
        UpdatePrivacyLevelRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException("Oturum geçersiz.");

        user.PrivacyLevel = request.PrivacyLevel;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task SetTrainingGoalAsync(
        UpdateTrainingGoalRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException("Oturum geçersiz.");

        user.TrainingGoal = request.TrainingGoal;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
