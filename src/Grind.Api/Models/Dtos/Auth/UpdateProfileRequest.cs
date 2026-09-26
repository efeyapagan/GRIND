using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Profilde kullanıcı adı ve/veya şifre değiştirme (issue #65). <see cref="NewUsername"/> ve
/// <see cref="NewPassword"/> kuralları <see cref="RegisterRequest"/> ile AYNI (tekrar edilmez diye
/// tek yerde tutulmaz, çünkü ikisi ayrı DTO'lardır — ama kural metni birebir kopyalanmıştır;
/// biri değişirse diğeri BİLEREK kontrol edilmeli).
///
/// İkisi de opsiyonel ama EN AZ BİRİ dolu olmalı — bu kontrol DTO'da değil serviste yapılır
/// (<c>SetEntryService.PatchAsync</c>'teki "en az bir alan" deseninin aynısı): DataAnnotations
/// birden fazla alanı birlikte değerlendiren bir kural için doğal bir yer değil.
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>
    /// YALNIZCA şifre değiştirirken zorunlu (#378 — kullanıcı kararı; #65 Karar 3'ün "kullanıcı adı
    /// da teyit ister" kısmı geri alındı). Kullanıcı adını değiştirmek için gönderilmesi gerekmez;
    /// gönderilirse yine de DOĞRULANIR — yanlış bir şifreyi sessizce yok saymak, istemcide fark
    /// edilmeyen bir hataya dönüşür.
    ///
    /// Kabul edilen risk: çalınmış bir token'la kullanıcı adı değiştirilebilir. Şifre değiştirmek ve
    /// hesabı kapatmak hâlâ teyit ister; kullanıcı adı geri alınabilir bir alandır.
    ///
    /// Zorunluluk kontrolü DTO'da değil serviste: "şifre değişiyorsa zorunlu" iki alana birlikte
    /// bakar, DataAnnotations bunu ifade edemez (Exercises'taki aynı desen).
    /// </summary>
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string? CurrentPassword { get; set; }

    [RegularExpression("^[a-zA-Z0-9_-]{3,50}$",
        ErrorMessage = "Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.")]
    public string? NewUsername { get; set; }

    [MinLength(8, ErrorMessage = "Şifre en az 8 karakter olmalı.")]
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string? NewPassword { get; set; }
}
