using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class AddMediaRequest
{
    /// <summary>
    /// [EnumDataType], tanımsız bir SAYI değerini yakalar ama alan hiç GÖNDERİLMEZSE
    /// devreye girmez — model binder non-nullable bir enum'u sessizce 0'da
    /// (<see cref="MediaType.Video"/>) bırakır. Bunu yakalayan [Required], sadece nullable
    /// bir enum üzerinde anlamlıdır.
    /// </summary>
    [Required(ErrorMessage = "Medya tipi zorunlu.")]
    [EnumDataType(typeof(MediaType), ErrorMessage = "Geçersiz medya tipi.")]
    public MediaType? MediaType { get; set; }

    [Required(ErrorMessage = "Medya adresi zorunlu.")]
    [StringLength(500, ErrorMessage = "Medya adresi en fazla 500 karakter olabilir.")]
    [HttpUrl(ErrorMessage = "Medya adresi mutlak bir http veya https adresi olmalı.")]
    public string Url { get; set; } = string.Empty;
}
