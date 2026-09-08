using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

public class CreateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// ZORUNLU alan: bu alan hem hiç gönderilmezse (JSON'da eksikse) hem de açıkça
    /// <c>null</c> gönderilirse 400 ile reddedilir. Boş liste ([]) göndermek geçerlidir —
    /// önce şablonu açıp sonra doldurmak doğal bir akış. Property nullable ("List&lt;...&gt;?")
    /// yapılıp initializer'sız bırakıldı: initializer "= []" olsaydı bu, [Required]'ın "eksik"
    /// saydığı boş dizgeden (string.Empty) farklı olarak GEÇERLİ bir non-null değer olurdu ve
    /// alan JSON'dan tamamen atlandığında [Required] hiç tetiklenmezdi (yalnızca açık
    /// "exercises": null durumunu yakalardı) — istemcinin en olası hatası tam da bu atlama.
    /// null ile [] farklı anlamlara geldiği için "?? []" ile sessizce eşitlenmiyor.
    /// </summary>
    [Required(ErrorMessage = "Egzersiz listesi zorunlu.")]
    public List<TemplateExerciseRequest>? Exercises { get; set; }
}
