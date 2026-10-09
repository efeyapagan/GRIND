import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { queryKeys } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { BaglantiBaglami } from '../../../../src/baglanti/BaglantiSaglayici';
import BildirimAyarlariScreen from '../../../../app/(tabs)/profile/notifications';

// #410: Hesap ayarlari -> Bildirim ayarlari. Her kategori bir anahtar; kapatilan kategori listeden ve zildeki
// sayidan duser (suzgec sunucuda). Burada sabitlenen: hangi anahtarlar cizilir ve dokununca ne olur.

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
const requestMock = request as jest.Mock;

let queryClient: QueryClient;

beforeEach(() => {
  requestMock.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});

async function ekran(cevrimdisi = false) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BaglantiBaglami.Provider value={cevrimdisi}>
        <PageTitleProvider>
          <BildirimAyarlariScreen />
        </PageTitleProvider>
      </BaglantiBaglami.Provider>
    </QueryClientProvider>,
  );
}

/**
 * Uc kategori cizilir; kapali olanin anahtari kapalidir. Etkilesimler, Hatirlaticilar ve Sistem sunucuda
 * tanimli ama cizilmez (kullanici karari: karsiliklari olan bildirim turu yok).
 */
test('yalnizca karsiligi olan kategorilerin anahtari cizilir, kapali olan kapali gorunur', async () => {
  requestMock.mockResolvedValue({ mutedCategories: ['Records'] });

  await ekran();

  expect(await screen.findByRole('switch', { name: 'Takip ve arkadaşlık' })).toHaveProp('value', true);
  expect(screen.getByRole('switch', { name: 'Rekorlar' })).toHaveProp('value', false);
  expect(screen.getByRole('switch', { name: 'Haftalık hedefler' })).toHaveProp('value', true);
  expect(screen.getAllByRole('switch')).toHaveLength(3);
});

/** Anahtar hemen doner (iyimser), tercih sunucuya gider; bildirim listesi ve rozet tazelenir. */
test('anahtar kapatilinca tercih sunucuya gider, liste ve rozet eskir', async () => {
  // Sunucu gibi: PUT'tan sonraki GET yeni durumu doner (ayar kaydedildi).
  let kapalilar: string[] = [];
  requestMock.mockImplementation(async (_yol: string, secenek?: RequestInit) => {
    if (secenek?.method === 'PUT') {
      kapalilar = ['Records'];
      return undefined;
    }
    return { mutedCategories: kapalilar };
  });
  queryClient.setQueryData(queryKeys.bildirimler, []);
  queryClient.setQueryData(queryKeys.okunmamisBildirim, 3);
  await ekran();
  const anahtar = await screen.findByRole('switch', { name: 'Rekorlar' });

  await act(async () => fireEvent(anahtar, 'valueChange', false));

  await waitFor(() => expect(screen.getByRole('switch', { name: 'Rekorlar' })).toHaveProp('value', false));
  const put = requestMock.mock.calls.find(([, secenek]) => secenek?.method === 'PUT')!;
  expect(put[0]).toBe('/settings/notification-categories');
  expect(JSON.parse(put[1].body)).toEqual({ category: 'Records', enabled: false });
  await waitFor(() => {
    expect(queryClient.getQueryState(queryKeys.bildirimler)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.okunmamisBildirim)?.isInvalidated).toBe(true);
  });
});

/** Sunucu reddederse anahtar eski haline doner ve satirin altinda hata yazar. */
test('kaydedilemezse anahtar eski haline doner ve hata gosterilir', async () => {
  requestMock.mockImplementation(async (_yol: string, secenek?: RequestInit) => {
    if (secenek?.method === 'PUT') throw new Error('ag');
    return { mutedCategories: [] };
  });
  await ekran();
  const anahtar = await screen.findByRole('switch', { name: 'Rekorlar' });

  await act(async () => fireEvent(anahtar, 'valueChange', false));

  expect(await screen.findByRole('alert')).toHaveTextContent('Ayar kaydedilemedi. Tekrar dene.');
  expect(screen.getByRole('switch', { name: 'Rekorlar' })).toHaveProp('value', true);
});

/** #174: tercih hesaba bagli ve sunucuda; cevrimdisi degistirilemez, uyari cikar. */
test('cevrimdisiyken anahtar degismez, internete baglan uyarisi cikar', async () => {
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  queryClient.setQueryData(queryKeys.bildirimKategorileri, []);
  await ekran(true);
  const anahtar = await screen.findByRole('switch', { name: 'Rekorlar' });

  await act(async () => fireEvent(anahtar, 'valueChange', false));

  expect(uyari).toHaveBeenCalledWith('İnternete bağlan', 'Bu bölüm internet bağlantısı gerektiriyor.');
  expect(requestMock.mock.calls.some(([, secenek]) => secenek?.method === 'PUT')).toBe(false);
  expect(screen.getByRole('switch', { name: 'Rekorlar' })).toHaveProp('value', true);
  uyari.mockRestore();
});
