import { kareKirpma, PROFIL_FOTOGRAFI_KENARI } from './profilFotografi';

/**
 * Seçilen fotoğrafı ortadan kare kırpıp küçültür, JPEG olarak döner (#283). Canvas'a bağlı olduğu
 * için ayrı modülde durur -- jsdom'da canvas yok, testler bu modülü sahteler.
 * `createImageBitmap` EXIF yönünü varsayılan olarak uygular: telefondan gelen dikey fotoğraf yan
 * yatmaz.
 */
export async function fotografiKucult(dosya: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(dosya);
  const { x, y, kenar } = kareKirpma(bitmap.width, bitmap.height);

  const tuval = document.createElement('canvas');
  tuval.width = PROFIL_FOTOGRAFI_KENARI;
  tuval.height = PROFIL_FOTOGRAFI_KENARI;
  const baglam = tuval.getContext('2d');
  if (!baglam) {
    bitmap.close();
    throw new Error('Canvas 2d baglami alinamadi.');
  }
  baglam.drawImage(bitmap, x, y, kenar, kenar, 0, 0, PROFIL_FOTOGRAFI_KENARI, PROFIL_FOTOGRAFI_KENARI);
  bitmap.close();

  return new Promise((coz, reddet) => {
    tuval.toBlob(
      (blob) => (blob ? coz(blob) : reddet(new Error('Fotograf JPEG olarak kodlanamadi.'))),
      'image/jpeg',
      0.85,
    );
  });
}
