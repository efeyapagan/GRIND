/**
 * Backend iki farkli RFC 7807 govdesi donuyor (Faz 5'te bilerek kabul edilmis bir durum):
 * DataAnnotations hatasi alan bazli `errors` tasir, servisin firlattigi is kurali hatasi ise
 * yalnizca `detail`. Ikisini burada TEK bir ic tipe indirgiyoruz ki her cagri yerinde ayri ayri
 * ele alinmasin — ikinci sekli unutmak, kullaniciya bos bir hata gostermenin en kisa yolu.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, detail: string, fieldErrors: Record<string, string[]> = {}) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

export const VARSAYILAN_MESAJ = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

export function parseProblem(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const govde = body as { detail?: unknown; title?: unknown; errors?: unknown };
    const fieldErrors =
      govde.errors && typeof govde.errors === 'object'
        ? (govde.errors as Record<string, string[]>)
        : {};
    const detail =
      typeof govde.detail === 'string' && govde.detail.length > 0
        ? govde.detail
        : typeof govde.title === 'string' && govde.title.length > 0
          ? govde.title
          : VARSAYILAN_MESAJ;

    return new ApiError(status, detail, fieldErrors);
  }

  return new ApiError(status, VARSAYILAN_MESAJ);
}
