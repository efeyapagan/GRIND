using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tam değiştirme (PUT): ad ve egzersiz listesinin tamamı. Yalnızca bir alanı değiştirmek
/// için <see cref="PatchTemplateRequest"/> kullanılır.
/// </summary>
public class UpdateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// [Required] BİLEREK var: "exercises": null gönderilirse System.Text.Json bu alandaki
    /// "= []" varsayılanının üzerine null yazar ve kontrolsüz bırakılırsa servis katmanında
    /// istemciden tetiklenebilen bir NullReferenceException'a (500) yol açar — ayrıntı
    /// CreateTemplateRequest'te. null ile [] farklı anlamlara geldiği için "?? []" ile
    /// sessizce eşitlenmiyor, 400 ile açıkça reddediliyor.
    /// </summary>
    [Required(ErrorMessage = "Egzersiz listesi zorunlu.")]
    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
