import { i18n } from '../i18n/i18n';
import { RIR_DURAKLARI } from './rir';

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
 * sessizce gonderilir ve sunucu deserializasyonda formun hicbir alaniyla eslesmeyen bir 400 doner.
 * Bu yuzden ust sinir/ondalik hane sayisi sunucuya birakilsa da sayisal bicim istemcide kontrol edilir
 * ve GECERSIZSE istek hic GONDERILMEZ. RIR (#266) yazilmaz, kaydiricinin duraklarindan secilir --
 * gecersiz bir RIR metni olusamaz, dogrulanacak bir sey yok.
 */
export function setGirdisiniDogrula({ agirlik, tekrar }: SetGirdisiMetni): Record<string, string> {
  const hatalar: Record<string, string> = {};

  const agirlikMetni = agirlik.trim();
  if (agirlikMetni === '') {
    hatalar.weight = i18n.t('setGirdisi.agirlikGerekli');
  } else if (!Number.isFinite(Number(agirlikMetni.replace(',', '.')))) {
    hatalar.weight = i18n.t('setGirdisi.agirlikSayiOlmali');
  }

  const tekrarMetni = tekrar.trim();
  if (tekrarMetni === '') {
    hatalar.reps = i18n.t('setGirdisi.tekrarGerekli');
  } else if (!Number.isInteger(Number(tekrarMetni))) {
    hatalar.reps = i18n.t('setGirdisi.tekrarTamSayiOlmali');
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

/**
 * Kayitli bir seti forma yazilacak metne cevirir (72.5 -> "72,5"; RIR yoksa bos). #266 oncesi
 * kayitlarda 5'ten buyuk RIR olabilir: "4+" duragina (5) cekilir -- sunucu artik 5'ten buyugunu
 * reddettigi icin oldugu gibi geri gondermek yalnizca agirligi duzelten bir kaydi bile 400'e dusururdu.
 */
export function setGirdisiMetni(set: AyristirilmisSet): SetGirdisiMetni {
  return {
    agirlik: String(set.weight).replace('.', ','),
    tekrar: String(set.reps),
    rir: set.rir === null ? '' : String(Math.min(set.rir, RIR_DURAKLARI[RIR_DURAKLARI.length - 1])),
  };
}
