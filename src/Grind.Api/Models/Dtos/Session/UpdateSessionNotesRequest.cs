using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Notu güncellemek (ya da <c>null</c> göndererek temizlemek) için. Burada <c>null</c>
/// "dokunma" DEĞİL "temizle" demektir: güncellenecek tek bir alan olduğu için ikisini
/// ayırmanın bir faydası yok.
/// </summary>
public class UpdateSessionNotesRequest
{
    [StringLength(2000, ErrorMessage = "Not en fazla 2000 karakter olabilir.")]
    public string? Notes { get; set; }
}
