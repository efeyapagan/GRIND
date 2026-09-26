using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Şablon listesinin yeni sırası (#344 — antrenman ekranında basılı tutup sürükleme).
/// Kullanıcının TÜM şablonlarının id'leri, istenen sırayla gelir; eksik, fazla, tekrar eden
/// ya da başkasına ait bir id isteği TOPTAN reddettirir.
///
/// <c>WorkoutTemplate.OrderIndex</c> alanına yazılacak indeks gövdede TAŞINMAZ, dizideki
/// konumdan türer — <c>TemplateExercise</c>'in sırasında olduğu gibi (bkz.
/// <c>WorkoutTemplateService.ReplaceExercisesAsync</c>): böylece çakışan indeks, boşluk ya da
/// negatif değer oluşamaz.
/// </summary>
public class ReorderTemplatesRequest
{
    /// <summary>
    /// <see cref="UpdateTemplateRequest.Exercises"/> ile aynı desen: nullable ve
    /// initializer'sız — JSON'dan tamamen atlanan alan da <c>[Required]</c>'a takılsın diye.
    /// </summary>
    [Required(ErrorMessage = "Şablon sırası zorunlu.")]
    public List<long>? TemplateIds { get; set; }
}
