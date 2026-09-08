using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// Kısmi güncelleme: yalnızca GÖNDERDİĞİN alan değişir, gönderilmeyen alana dokunulmaz.
/// Örneğin sadece kategoriyi düzeltmek için <c>{ "category": "Pull" }</c> yeterlidir —
/// <see cref="UpdateExerciseRequest"/> (PUT) ile bunu yapmak için adı da göndermek
/// zorundasın ve yanlış gönderirsen adı ezersin.
///
/// İki alan da bilerek nullable ve <c>[Required]</c> TAŞIMIYOR: burada <c>null</c>
/// "bu alanı değiştirme" demek. JSON'da alanı hiç göndermemek ile açıkça <c>null</c>
/// göndermek aynı sonucu verir; ikisini ayırmaya gerek yok, çünkü bu alanların hiçbiri
/// domain'de null olamaz — yani "null yap" diye bir istek anlamlı değil.
///
/// Doğrulama nitelikleri null değerleri atlar (deneyle doğrulandı: yalnızca kategori
/// gönderildiğinde 0 hata, kısa bir ad gönderildiğinde 1 hata). Ama ikisi de boş bir
/// gövde de 0 hata üretir — o yüzden "en az bir alan" kontrolü servis katmanında yapılır.
/// </summary>
public class PatchExerciseRequest
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string? Name { get; set; }

    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory? Category { get; set; }
}
