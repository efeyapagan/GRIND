using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class AddMediaRequest
{
    [EnumDataType(typeof(MediaType), ErrorMessage = "Geçersiz medya tipi.")]
    public MediaType MediaType { get; set; }

    [Required(ErrorMessage = "Medya adresi zorunlu.")]
    [StringLength(500, ErrorMessage = "Medya adresi en fazla 500 karakter olabilir.")]
    [HttpUrl(ErrorMessage = "Medya adresi mutlak bir http veya https adresi olmalı.")]
    public string Url { get; set; } = string.Empty;
}
