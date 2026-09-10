namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Sayfalama zarfı. Projedeki ilk sayfalama deseni — sonraki fazlar (export) da bunu kullanır.
/// <c>TotalPages</c> türetilmiştir: istemcinin bölme + yukarı yuvarlama yazmasına gerek kalmasın
/// (kolay yanlış yapılan bir hesap). HTTP üzerinden <c>PageSize</c> her zaman ≥ 1'dir (sorgu
/// DTO'su 1-100 aralığını zorunlu kılıyor), ama bu zarf HTTP'ye bağlı değil — Faz 11'in export
/// özelliği bunu doğrudan (query DTO'sunun doğrulamasından geçmeden) kurabilir. Bu yüzden
/// <c>PageSize &lt;= 0</c> burada da AYRICA korunuyor: aksi halde sıfıra bölme
/// <c>Infinity</c>/<c>NaN</c> üretir, bunun <c>int</c>'e cast'i tanımsız/şaşırtıcı bir değer
/// verir.
/// </summary>
public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
