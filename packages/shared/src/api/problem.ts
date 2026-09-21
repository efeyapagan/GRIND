import { i18n } from '../i18n/i18n';

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

/** Istemcinin kendi urettigi genel hata metni; cagrildigi andaki arayuz dilinde. */
export function varsayilanMesaj(): string {
  return i18n.t('hatalar.beklenmeyen');
}

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
          : varsayilanMesaj();

    return new ApiError(status, detail, fieldErrors);
  }

  return new ApiError(status, varsayilanMesaj());
}
