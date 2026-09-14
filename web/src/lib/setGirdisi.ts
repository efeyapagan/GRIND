/** Set formlarinin (panel ve duzenleyici, #57) metin halindeki alanlari. */
export interface SetGirdisiMetni {
  agirlik: string;
  tekrar: string;
  rir: string;
}

export interface AyristirilmisSet {
  weight: number;
  reps: number;
  rir: number | null;
}

// `apiHatasiniAyir`e set formlarinin render ettigi alan adlari (I3) -- yardimci bunu kendi basina
// bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
export const SET_ALANLARI = ['weight', 'reps', 'rir'];

/**
 * Bos (ya da sadece bosluk) birakilmis bir agirlik/tekrar alani "girilmedi" demektir, "0" degil --
 * `Number('')` sessizce 0'a donustugu icin bunu erkenden yakalamazsak, yanlislikla gonderilen bos bir
 * form gercek bir set olarak kaydedilir ve sunucu onun uzerinde PR tespiti calistirir (review bulgusu).
 * Agirlik icin "0" (barfiks/dips) GECERLI bir deger oldugundan burada deger degil, SADECE bosluk
 * kontrolu yapilir.
 *
 * DIKKAT (review bulgusu I3): "Tekrar" sunucuda `int` -- "8.5" JSON'da sayi olarak GECERLI oldugu icin
 * sessizce gonderilir ve sunucu deserializasyonda formun hicbir alaniyla eslesmeyen bir 400 doner. RIR
 * "abc" yazilirsa `Number('abc')` NaN'a, NaN da JSON'da `null`'a donusur ve yazilan SESSIZCE kaybolur.
 * Bu yuzden ust sinir/ondalik hane sayisi sunucuya birakilsa da sayisal bicim istemcide kontrol edilir
 * ve GECERSIZSE istek hic GONDERILMEZ.
 */
export function setGirdisiniDogrula({ agirlik, tekrar, rir }: SetGirdisiMetni): Record<string, string> {
  const hatalar: Record<string, string> = {};

  const agirlikMetni = agirlik.trim();
  if (agirlikMetni === '') {
    hatalar.weight = 'Ağırlık girilmeli.';
  } else if (!Number.isFinite(Number(agirlikMetni.replace(',', '.')))) {
    hatalar.weight = 'Ağırlık geçerli bir sayı olmalı.';
  }

  const tekrarMetni = tekrar.trim();
  if (tekrarMetni === '') {
    hatalar.reps = 'Tekrar sayısı girilmeli.';
  } else if (!Number.isInteger(Number(tekrarMetni))) {
    hatalar.reps = 'Tekrar sayısı tam sayı olmalı.';
  }

  const rirMetni = rir.trim();
  if (rirMetni !== '' && !Number.isInteger(Number(rirMetni))) {
    hatalar.rir = 'RIR tam sayı olmalı.';
  }

  return hatalar;
}

/** Dogrulanmis metni sayilara cevirir. Agirlik hem "," hem "." kabul eder, sunucuya nokta ile gider. */
export function setGirdisiniAyristir({ agirlik, tekrar, rir }: SetGirdisiMetni): AyristirilmisSet {
  return {
    weight: Number(agirlik.trim().replace(',', '.')),
    reps: Number(tekrar.trim()),
    rir: rir.trim() === '' ? null : Number(rir.trim()),
  };
}

/** Kayitli bir seti forma yazilacak metne cevirir (72.5 -> "72,5"; RIR yoksa bos). */
export function setGirdisiMetni(set: AyristirilmisSet): SetGirdisiMetni {
  return {
    agirlik: String(set.weight).replace('.', ','),
    tekrar: String(set.reps),
    rir: set.rir === null ? '' : String(set.rir),
  };
}
