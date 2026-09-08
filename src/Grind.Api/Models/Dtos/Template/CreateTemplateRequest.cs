using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

public class CreateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Boş liste ([]) olabilir: önce şablonu açıp sonra doldurmak doğal bir akış.
    /// [Required] BİLEREK var: System.Text.Json, istemci "exercises": null gönderirse bu
    /// alandaki "= []" varsayılanının üzerine null yazar (C#'ın nullable olmayan anotasyonu
    /// deserialization sırasında uygulanmaz) — kontrolsüz bırakılırsa servis katmanında
    /// Exercises.Select(...) çağrısı istemciden tetiklenebilen bir NullReferenceException'a
    /// (500) döner. null ile [] farklı anlamlara geldiği için "?? []" ile sessizce
    /// eşitlenmiyor; bunun yerine 400 ile açıkça reddediliyor.
    /// </summary>
    [Required(ErrorMessage = "Egzersiz listesi zorunlu.")]
    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
