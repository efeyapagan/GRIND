import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { galeriyeKaydet, panoyaKopyala } from './paylasimGorseli';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  Asset: { create: jest.fn() },
}));
jest.mock('expo-clipboard', () => ({ setImageAsync: jest.fn() }));

const yakala = captureRef as jest.Mock;
const izinIste = MediaLibrary.requestPermissionsAsync as jest.Mock;
const varlikOlustur = MediaLibrary.Asset.create as jest.Mock;
const panoyaYaz = Clipboard.setImageAsync as jest.Mock;

const ref = { current: {} } as never;

beforeEach(() => {
  yakala.mockReset().mockResolvedValue('file:///kart.png');
  izinIste.mockReset().mockResolvedValue({ granted: true });
  varlikOlustur.mockReset().mockResolvedValue({ id: '1' });
  panoyaYaz.mockReset().mockResolvedValue(undefined);
});

// ---- Galeriye kaydet ----

test('izin verilince gorsel galeriye kaydedilir', async () => {
  expect(await galeriyeKaydet(ref)).toBe('tamam');

  expect(varlikOlustur).toHaveBeenCalledWith('file:///kart.png');
});

/** Seffaflik isin can damari: PNG disinda bir bicim arkaplani beyaz basar. */
test('gorsel PNG olarak ve seffaf arkaplanla yakalanir', async () => {
  await galeriyeKaydet(ref);

  expect(yakala).toHaveBeenCalledWith(ref, expect.objectContaining({ format: 'png' }));
});

/** Izin reddedilince SESSIZCE basarisiz olunmaz: cagiran anlasilir bir sonuc alir. */
test('izin reddedilirse kaydedilmez ve izin-yok doner', async () => {
  izinIste.mockResolvedValue({ granted: false });

  expect(await galeriyeKaydet(ref)).toBe('izin-yok');
  expect(varlikOlustur).not.toHaveBeenCalled();
});

/** Izin PENCERESINDEN once yakalama yapilmaz: reddedilecekse bosuna is yapilmasin. */
test('izin sorulmadan yakalama yapilmaz', async () => {
  izinIste.mockResolvedValue({ granted: false });

  await galeriyeKaydet(ref);

  expect(yakala).not.toHaveBeenCalled();
});

test('yakalama patlarsa hata doner, istisna disari sizmaz', async () => {
  yakala.mockRejectedValue(new Error('yakalanamadi'));

  expect(await galeriyeKaydet(ref)).toBe('hata');
});

// ---- Panoya kopyala ----

/**
 * `Clipboard.setImageAsync` MIME onekSIZ base64 ister (Expo SDK 57). Bir `data:` URI ya da dosya
 * yolu gondermek sessizce bos bir pano birakir.
 */
test('panoya MIME oneksiz base64 gonderilir', async () => {
  yakala.mockResolvedValue('iVBORw0KGgo=');

  expect(await panoyaKopyala(ref)).toBe('tamam');

  expect(yakala).toHaveBeenCalledWith(ref, expect.objectContaining({ result: 'base64', format: 'png' }));
  expect(panoyaYaz).toHaveBeenCalledWith('iVBORw0KGgo=');
});

/** Pano izin istemez: galeri izni burada SORULMAMALI (gereksiz bir izin penceresi). */
test('panoya kopyalarken galeri izni istenmez', async () => {
  await panoyaKopyala(ref);

  expect(izinIste).not.toHaveBeenCalled();
});

test('pano yazilamazsa hata doner', async () => {
  panoyaYaz.mockRejectedValue(new Error('pano yok'));

  expect(await panoyaKopyala(ref)).toBe('hata');
});
