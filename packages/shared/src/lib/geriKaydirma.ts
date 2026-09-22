/**
 * Sol kenardan saga kaydirarak geri donme karari (#232) -- web ve mobil kabuk ayni kurallarla karar
 * verir. iOS'taki gibi bir KENAR hareketi (kullanici karari): sayfanin ortasindan baslayan kaydirma
 * geri gotmez, boylece sayfa icindeki yatay hareketlerle (surukleme, kadran, gecmis karti) cakismaz.
 */

/** Hareketin baslayabilecegi sol serit (px) -- bir basparmak genisligi. */
export const KENAR_GENISLIGI = 32;

/** Yon karari icin gereken en kucuk hareket (px); altinda parmagin nereye gittigi belli degildir. */
export const YON_KARAR_ESIGI = 10;

/** Bu kadar ekran genisligi kaydirilinca birakildiginda geri gidilir. */
export const GERI_MESAFE_ORANI = 0.3;

/** Kisa ama bundan hizli (px/sn) bir firlatma da yeter. */
export const GERI_HIZ_ESIGI = 500;

export function kenardanMi(x: number): boolean {
  return x <= KENAR_GENISLIGI;
}

/**
 * `geri`: saga agir basan hareket. `yok`: dikey ya da sola -- o dokunus boyunca geri hareketi bir
 * daha devreye girmez (dikey kaydirma bozulmasin). Esitlik sayfa kaydirmasi lehine yorumlanir.
 */
export function yonKarari(dx: number, dy: number): 'bekle' | 'geri' | 'yok' {
  if (Math.abs(dx) < YON_KARAR_ESIGI && Math.abs(dy) < YON_KARAR_ESIGI) {
    return 'bekle';
  }
  return dx > Math.abs(dy) ? 'geri' : 'yok';
}

/** Birakildiginda geri gidilsin mi, yoksa sayfa yerine mi otursun. `vx` px/sn. */
export function geriGidilsinMi(dx: number, vx: number, genislik: number): boolean {
  return dx > 0 && (dx >= genislik * GERI_MESAFE_ORANI || vx >= GERI_HIZ_ESIGI);
}

/**
 * Ana Sayfa'da hareket kapali; onceki sayfa yoksa (uygulama dogrudan bir alt sayfada acildi) Ana
 * Sayfa'ya donulur.
 */
export function geriHedefi(konum: string, gecmisVar: boolean): 'yok' | 'geri' | 'anaSayfa' {
  if (konum === '/') {
    return 'yok';
  }
  return gecmisVar ? 'geri' : 'anaSayfa';
}
