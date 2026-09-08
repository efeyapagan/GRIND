using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tam değiştirme (PUT): ad ve egzersiz listesinin tamamı. Yalnızca bir alanı değiştirmek
/// için <see cref="PatchTemplateRequest"/> kullanılır (orada <c>null</c> "bu alana dokunma"
/// anlamına gelir — BURADA öyle değil, bkz. Exercises).
///
/// <see cref="CreateTemplateRequest"/> ile yapısal olarak birebir aynı, ama BİLEREK ayrı bir
/// sınıf: ortak bir üst sınıftan türetmek (veya paylaşımlı bir DTO) iki bağımsız sözleşmeyi
/// (POST'un gövdesi ile PUT'un gövdesi) gereksiz yere birbirine kenetler ve Swagger/OpenAPI
/// şema üretimini karmaşıklaştırır (iki endpoint farklı response/request şema adına, kalıtım
/// zincirine veya "allOf" gösterimine sahip olur). Bu ikisi bugün aynı görünüyor olsa da,
/// birinin (örn. PUT'a ileride bir "beklenen versiyon" alanı eklenmesi gibi) diğerini
/// etkilemeden değişebilmesi gerekir — o zaman kalıtım çözülür, kopyalama zaten baştan
/// gereksizdi.
/// </summary>
public class UpdateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// ZORUNLU alan: bu alan hem hiç gönderilmezse (JSON'da eksikse) hem de açıkça
    /// <c>null</c> gönderilirse 400 ile reddedilir — PUT toptan değiştirme olduğu için
    /// "gönderilmedi" ile "listeyi boşalt" arasında güvenli bir varsayım yapılamaz. Boş
    /// liste ([]) göndermek geçerlidir, o TOPTAN "listeyi boşalt" demektir. Property
    /// nullable ("List&lt;...&gt;?") yapılıp initializer'sız bırakıldı: initializer "= []"
    /// olsaydı JSON'dan tamamen atlanan alan [Required]'ı hiç tetiklemezdi (yalnızca açık
    /// "exercises": null durumunu yakalardı) — ayrıntı CreateTemplateRequest'te. null ile
    /// [] farklı anlamlara geldiği için "?? []" ile sessizce eşitlenmiyor.
    /// </summary>
    [Required(ErrorMessage = "Egzersiz listesi zorunlu.")]
    public List<TemplateExerciseRequest>? Exercises { get; set; }
}
