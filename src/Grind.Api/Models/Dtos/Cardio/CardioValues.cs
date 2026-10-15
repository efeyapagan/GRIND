using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Cardio;

/// <summary>
/// #647: kardiyo kaydının süre dışındaki kutuları. Hepsi isteğe bağlı; hareketin sormadığı bir kutu dolu gelirse
/// servis 400 döner (<c>CardioFieldCatalog</c>). Başlat, Durdur ve düzeltme aynı alanları taşır; Durdur ve
/// düzeltme TAM değiştirir (boş gelen kutu silinir) — form hep tüm kutuları gönderir.
/// </summary>
public class CardioValues
{
    [Range(0.1, 40, ErrorMessage = "Hız 0,1 ile 40 km/s arasında olmalı.")]
    public decimal? SpeedKmh { get; set; }

    [Range(0, 40, ErrorMessage = "Eğim 0 ile 40 arasında olmalı.")]
    public decimal? InclinePercent { get; set; }

    [Range(1, 30, ErrorMessage = "Seviye 1 ile 30 arasında olmalı.")]
    public int? Level { get; set; }

    [Range(1, 10, ErrorMessage = "Damper 1 ile 10 arasında olmalı.")]
    public int? Damper { get; set; }

    [Range(0.001, 200, ErrorMessage = "Mesafe 0,001 ile 200 km arasında olmalı.")]
    public decimal? DistanceKm { get; set; }

    [Range(1, 300, ErrorMessage = "Tempo 1 ile 300 arasında olmalı.")]
    public int? Cadence { get; set; }

    [Range(1, 1000, ErrorMessage = "Kat 1 ile 1000 arasında olmalı.")]
    public int? Floors { get; set; }

    [Range(1, 100000, ErrorMessage = "Adım 1 ile 100000 arasında olmalı.")]
    public int? Steps { get; set; }

    [Range(1, 100000, ErrorMessage = "Atlama 1 ile 100000 arasında olmalı.")]
    public int? Jumps { get; set; }

    [Range(1, 2000, ErrorMessage = "Watt 1 ile 2000 arasında olmalı.")]
    public int? Watts { get; set; }
}
