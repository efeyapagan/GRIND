import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { request, setBaglantiDinleyicisi } from './client';

// #174: cevrimdisi seridi "sunucuya ulasilamiyor"a bakar, cihazin ag durumuna degil. `request()` her
// istegin sonucunu bildirir: HERHANGI bir HTTP yaniti (4xx/5xx dahil) sunucuya ulasildi demektir,
// fetch'in reddedilmesi ulasilamadi.
describe('baglanti bildirimi', () => {
  const dinleyici = vi.fn();
  const gercekFetch = globalThis.fetch;

  beforeEach(() => {
    dinleyici.mockReset();
    setBaglantiDinleyicisi(dinleyici);
  });

  afterEach(() => {
    globalThis.fetch = gercekFetch;
    setBaglantiDinleyicisi(() => {});
  });

  test('basarili yanit "yanit" olarak bildirilir', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as never;

    await request('/health', { auth: false });

    expect(dinleyici).toHaveBeenCalledWith('yanit');
  });

  test('5xx yaniti da sunucuya ulasildi sayilir', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 503 })) as never;

    await expect(request('/x', { auth: false })).rejects.toBeTruthy();

    expect(dinleyici).toHaveBeenCalledWith('yanit');
    expect(dinleyici).not.toHaveBeenCalledWith('agHatasi');
  });

  test('fetch reddedilirse "agHatasi" bildirilir ve hata cagirana ulasir', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Network request failed');
    }) as never;

    await expect(request('/x', { auth: false })).rejects.toThrow('Network request failed');

    expect(dinleyici).toHaveBeenCalledWith('agHatasi');
  });

  /** Iptal edilen istek (sorgu iptali) sunucuya ulasilamadigi anlamina gelmez: sahte cevrimdisi olmasin. */
  test('iptal edilen istek hicbir sey bildirmez', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError');
    }) as never;

    await expect(request('/x', { auth: false })).rejects.toThrow('Aborted');

    expect(dinleyici).not.toHaveBeenCalled();
  });
});
