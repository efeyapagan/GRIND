namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Sayfalama zarfı. Projedeki ilk sayfalama deseni — sonraki fazlar (export) da bunu kullanır.
/// <c>TotalPages</c> türetilmiştir: istemcinin bölme + yukarı yuvarlama yazmasına gerek kalmasın
/// (kolay yanlış yapılan bir hesap). <c>PageSize</c> her zaman ≥ 1'dir; sorgu DTO'su 1-100
/// aralığını zorunlu kılıyor, bu yüzden burada sıfıra bölme olamaz.
/// </summary>
public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
