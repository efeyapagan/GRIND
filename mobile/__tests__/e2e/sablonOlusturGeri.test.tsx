import { screen, fireEvent } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

async function uygulamayiAc(baslangicYolu: string) {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.sablonlar.push({ id: 1, name: 'Push Day', createdAt: new Date().toISOString(), exercises: [] });
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: baslangicYolu });
}

/**
 * #499 (kullanici karari): "Sablon olustur" ekranindan geri cikilinca NEREDEN girildigine
 * bakilmaksizin "Antrenmana basla" ekranina donulur. Once gecmise bakiliyordu ve giris yoluna
 * gore farkli yerlere dusuyordu.
 */
test('sablon olustur ekranindan geri cikinca antrenmana basla ekranina donulur', async () => {
  await uygulamayiAc('/antrenman');

  await fireEvent.press(await screen.findByText('Şablon oluştur'));
  expect(await screen.findByText('Şablon adı')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Geri'));

  // "Bos antrenman baslat" yalnizca antrenman ekraninda var -- hangi ekranda oldugumuzu o ayirir.
  expect(await screen.findByText('Boş antrenman başlat')).toBeTruthy();
  expect(screen.queryByText('Şablon adı')).toBeNull();
}, 20_000);

/** AYIRT EDICI: Sablonlarim'dan girilse de hedef aynidir -- kural yola degil EKRANA baglidir. */
test('Sablonlarim uzerinden girilse de geri antrenmana basla ekranina doner', async () => {
  await uygulamayiAc('/templates');

  await fireEvent.press(await screen.findByText('Yeni şablon'));
  expect(await screen.findByText('Şablon adı')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Geri'));

  expect(await screen.findByText('Boş antrenman başlat')).toBeTruthy();
}, 20_000);
