using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Settings;

/// <summary>
/// Haftalık antrenman hedefi (#97). <c>null</c> hedefi kaldırır — alan bu yüzden [Required] DEĞİL;
/// [Range] <c>null</c>'ı geçirir, yalnızca verilen sayıyı sınırlar. Şifre istenmez: bir hedef hassas bir
/// hesap işlemi değil (profil ucunun aksine).
/// </summary>
public class UpdateWeeklyTargetRequest
{
    [Range(1, 7, ErrorMessage = "Haftalık hedef 1 ile 7 gün arasında olmalı.")]
    public int? WeeklyTargetDays { get; set; }
}
