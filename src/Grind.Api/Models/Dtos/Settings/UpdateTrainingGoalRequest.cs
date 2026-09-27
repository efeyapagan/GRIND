using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Settings;

/// <summary>
/// Antrenman hedefi (#444). <c>null</c> hedefi kaldırır — "seçilmemiş" gerçek bir durumdur ve AI
/// prompt'unu nötr bırakır. Şifre istenmez (<see cref="UpdatePrivacyLevelRequest"/> ile aynı sebep);
/// model binder geçersiz bir enum adını zaten 400'e çevirir.
/// </summary>
public class UpdateTrainingGoalRequest
{
    public TrainingGoal? TrainingGoal { get; set; }
}
