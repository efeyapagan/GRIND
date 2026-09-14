import { useRef, useState } from 'react';

/**
 * Yon karari icin gereken en kucuk hareket. Bu esigin altinda parmagin nereye gittigi
 * belli degildir; erken karar vermek dikey kaydirmayi calar.
 */
const KARAR_ESIGI = 8;

/** Karti acmaya yetecek sola gidis. Yarim ekran degil: tek basparmakla rahatca asilmali. */
const ACMA_ESIGI = 48;

/**
 * Parmak yatay mi gidiyor dikey mi. Dikeyse bu bir SAYFA KAYDIRMASIDIR ve karisilmaz --
 * aksi halde listede asagi inmeye calisan her hareket kartlari acar (issue #46, dikey
 * kaydirmayla cakismama sarti).
 */
export function yatayMi(dx: number, dy: number): boolean {
  return Math.abs(dx) > Math.abs(dy);
}

/** Karar verilebilecek kadar hareket edildi mi? */
export function kararVerilebilir(dx: number, dy: number): boolean {
  return Math.abs(dx) >= KARAR_ESIGI || Math.abs(dy) >= KARAR_ESIGI;
}

/** Sola yeterince gidildi mi? */
export function acilirMi(dx: number): boolean {
  return dx <= -ACMA_ESIGI;
}

/** Saga yeterince gidildi mi? Acik karti geri kapatir. */
export function kapanirMi(dx: number): boolean {
  return dx >= ACMA_ESIGI;
}

export interface Kaydirma {
  acik: boolean;
  kapat: () => void;
  /**
   * Kaydirma HAREKETI oldu mu -- `<summary>` gibi tiklamayi kendisi isleyen elemanlarda
   * `onClick` icinde sorulur: kaydirarak acan parmak, kaldirinca karti da ACMAMALIDIR.
   */
  kaydirildiMi: () => boolean;
  isaretciler: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

/**
 * Sola kaydirinca acilan kart (issue #46). Kutuphane YOK (gorsel tasarim spec'i): yalnizca
 * pointer olaylari.
 *
 * Kart parmagi ANLIK olarak takip ETMEZ, birakinca iki durumdan birine oturur. Sebep: anlik
 * takip her karede degisen bir `transform` ister, bu da satir ici `style=` demektir -- spec
 * bunu yasakliyor ve kod tabaninda hicbir ornegi yok. Iki durumlu oturma hem sinifla (Tailwind)
 * ifade edilebiliyor hem de testte dogrulanabiliyor.
 *
 * Kaydirma TEK erisim yolu DEGILDIR: karti acinca icindeki gorunur "Antrenmani sil" dugmesi de
 * ayni isi yapar (klavye ve ekran okuyucu icin sart -- issue #46 erisilebilirlik maddesi).
 */
export function useKaydirma(): Kaydirma {
  const [acik, setAcik] = useState(false);
  const baslangic = useRef<{ x: number; y: number } | null>(null);
  // null = yon henuz belli degil; false = dikey (sayfa kaydirmasi, karisma).
  const yatay = useRef<boolean | null>(null);
  const hareketEtti = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    baslangic.current = { x: e.clientX, y: e.clientY };
    yatay.current = null;
    hareketEtti.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const bas = baslangic.current;
    if (!bas) {
      return;
    }
    const dx = e.clientX - bas.x;
    const dy = e.clientY - bas.y;

    if (yatay.current === null) {
      if (!kararVerilebilir(dx, dy)) {
        return;
      }
      yatay.current = yatayMi(dx, dy);
    }
    if (yatay.current) {
      hareketEtti.current = true;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const bas = baslangic.current;
    baslangic.current = null;
    if (!bas || !yatay.current) {
      return;
    }
    // Esigi asmayan kararsiz bir hareket mevcut durumu DEGISTIRMEZ -- ne acar ne kapatir.
    const dx = e.clientX - bas.x;
    if (acilirMi(dx)) {
      setAcik(true);
    } else if (kapanirMi(dx)) {
      setAcik(false);
    }
  }

  function onPointerCancel() {
    baslangic.current = null;
    yatay.current = null;
  }

  return {
    acik,
    kapat: () => setAcik(false),
    kaydirildiMi: () => hareketEtti.current,
    isaretciler: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
