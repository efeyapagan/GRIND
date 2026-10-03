/**
 * #565: profil fotografini kullanicinin sectigi kare alandan kirpma hesabi. Gorsel kare cerceveyi
 * "cover" ile doldurur (kisa kenari cerceveye esit), kullanici 1x-4x yakinlastirir ve cerceve
 * noktasi cinsinden kaydirir; gorselin merkezi cercevenin merkezine gore (x, y) kadar kayiktir.
 *
 * iOS'un yerlesik kirpma ekrani (`allowsEditing`) eski `UIImagePickerController`'i actirip buyuk /
 * iCloud'daki fotograflarda tutarsizlasiyordu; kirpma artik bu saf hesapla uygulamada yapilir.
 */

export const KIRPMA_EN_FAZLA_YAKINLASTIRMA = 4;

export interface GorselBoyutu {
  genislik: number;
  yukseklik: number;
}

export interface KirpmaKonumu {
  yakinlastirma: number;
  x: number;
  y: number;
}

/** `expo-image-manipulator`un `crop` girdisiyle ayni sekil (gorsel pikseli). */
export interface KirpmaDikdortgeni {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Gorselin 1 pikseli, 1x'te cercevede kac nokta tutar (cover: kisa kenar cerceveyi doldurur). */
function tabanOlcek(gorsel: GorselBoyutu, cerceve: number): number {
  return cerceve / Math.min(gorsel.genislik, gorsel.yukseklik);
}

function sinirla(deger: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, deger));
}

export function yakinlastirmaSinirla(yakinlastirma: number): number {
  return sinirla(yakinlastirma, 1, KIRPMA_EN_FAZLA_YAKINLASTIRMA);
}

/** Cercevenin icinde bos alan kalmasin: gorselin kenari cercevenin kenarini gecemez. */
export function kaydirmaSinirla(
  gorsel: GorselBoyutu,
  cerceve: number,
  { yakinlastirma, x, y }: KirpmaKonumu,
): { x: number; y: number } {
  const olcek = tabanOlcek(gorsel, cerceve) * yakinlastirma;
  const payX = (gorsel.genislik * olcek - cerceve) / 2;
  const payY = (gorsel.yukseklik * olcek - cerceve) / 2;
  // `+ 0`: -0'i 0'a cevirir (toEqual ve gosterim icin).
  return { x: sinirla(x, -payX, payX) + 0, y: sinirla(y, -payY, payY) + 0 };
}

/** Cercevede gorunen kare alanin gorsel pikseli cinsinden dikdortgeni; her zaman gorselin icinde. */
export function kirpmaDikdortgeni(
  gorsel: GorselBoyutu,
  cerceve: number,
  konum: KirpmaKonumu,
): KirpmaDikdortgeni {
  const olcek = tabanOlcek(gorsel, cerceve) * konum.yakinlastirma;
  const kenar = Math.min(gorsel.genislik, gorsel.yukseklik) / konum.yakinlastirma;
  const merkezX = gorsel.genislik / 2 - konum.x / olcek;
  const merkezY = gorsel.yukseklik / 2 - konum.y / olcek;
  const originX = sinirla(merkezX - kenar / 2, 0, gorsel.genislik - kenar);
  const originY = sinirla(merkezY - kenar / 2, 0, gorsel.yukseklik - kenar);
  const tamKenar = Math.floor(kenar);
  return {
    originX: Math.min(Math.round(originX), gorsel.genislik - tamKenar),
    originY: Math.min(Math.round(originY), gorsel.yukseklik - tamKenar),
    width: tamKenar,
    height: tamKenar,
  };
}
