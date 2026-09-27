import type { EgzersizOlcumu } from '../api/queries';
import { i18n } from '../i18n/i18n';
import { RIR_DURAKLARI } from './rir';

/**
 * Set formlarinin (panel ve duzenleyici, #57) metin halindeki alanlari. #346: hangisinin cizildigi ve
 * dogrulandigi hareketin olcum tipine bagli -- kilo + tekrar (+ RIR), yalnizca tekrar (kilo = istege bagli
 * "ek agirlik", RIR yok) ya da yalnizca sure (saniye).
 */
export interface SetGirdisiMetni {
  agirlik: string;
  tekrar: string;
  rir: string;
  sure: string;
}

/** `null` = bu olcum tipinde gonderilmez (sunucuda "dokunma" / "yok" demektir). */
export interface AyristirilmisSet {
  weight: number | null;
  reps: number | null;
  rir: number | null;
  durationSeconds: number | null;
}

// `apiHatasiniAyir`e set formlarinin render ettigi alan adlari (I3) -- yardimci bunu kendi basina
// bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
export const SET_ALANLARI = ['weight', 'reps', 'rir', 'durationSeconds'];

/** Sunucudaki `[Range(1, 3600)]` ile ayni: bir saatten uzun tek set yok. */
export const EN_UZUN_SURE_SN = 3600;

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
export function setGirdisiniDogrula(
  { agirlik, tekrar, sure }: SetGirdisiMetni,
  olcum: EgzersizOlcumu = 'WeightReps',
): Record<string, string> {
  const hatalar: Record<string, string> = {};

  if (olcum === 'Duration') {
    const sureMetni = sure.trim();
    const saniye = Number(sureMetni);
    if (sureMetni === '') {
      hatalar.durationSeconds = i18n.t('setGirdisi.sureGerekli');
    } else if (!Number.isInteger(saniye) || saniye < 1 || saniye > EN_UZUN_SURE_SN) {
      hatalar.durationSeconds = i18n.t('setGirdisi.sureAraligi', { enFazla: EN_UZUN_SURE_SN });
    }
    return hatalar;
  }

  // #346: agirliksiz harekette kilo "ek agirlik"tir -- bos birakmak gecerli (0 sayilir), yazildiysa sayi olmali.
  const agirlikMetni = agirlik.trim();
  if (agirlikMetni === '') {
    if (olcum === 'WeightReps') {
      hatalar.weight = i18n.t('setGirdisi.agirlikGerekli');
    }
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

/**
 * Dogrulanmis metni sayilara cevirir. Agirlik hem "," hem "." kabul eder, sunucuya nokta ile gider. #346:
 * olcum tipine ait olmayan alanlar `null` gider -- agirliksiz harekette RIR ve sure, sureli harekette sure
 * disindaki her sey. Agirliksiz harekette bos "ek agirlik" 0 gider, `null` DEGIL: duzeltmede (PATCH) `null`
 * "dokunma" demektir ve kutuyu bosaltmak eski ek agirligi silmezdi.
 */
export function setGirdisiniAyristir(
  { agirlik, tekrar, rir, sure }: SetGirdisiMetni,
  olcum: EgzersizOlcumu = 'WeightReps',
): AyristirilmisSet {
  if (olcum === 'Duration') {
    return { weight: null, reps: null, rir: null, durationSeconds: Number(sure.trim()) };
  }

  const agirlikMetni = agirlik.trim();
  return {
    weight: agirlikMetni === '' ? 0 : Number(agirlikMetni.replace(',', '.')),
    reps: Number(tekrar.trim()),
    rir: olcum === 'Reps' || rir.trim() === '' ? null : Number(rir.trim()),
    durationSeconds: null,
  };
}

/**
 * Kayitli bir seti forma yazilacak metne cevirir (72.5 -> "72,5"; RIR yoksa bos). #266 oncesi
 * kayitlarda 5'ten buyuk RIR olabilir: "4+" duragina (5) cekilir -- sunucu artik 5'ten buyugunu
 * reddettigi icin oldugu gibi geri gondermek yalnizca agirligi duzelten bir kaydi bile 400'e dusururdu.
 */
export function setGirdisiMetni(set: {
  weight: number;
  reps: number | null;
  rir: number | null;
  durationSeconds?: number | null;
}): SetGirdisiMetni {
  return {
    agirlik: String(set.weight).replace('.', ','),
    tekrar: set.reps === null ? '' : String(set.reps),
    rir: set.rir === null ? '' : String(Math.min(set.rir, RIR_DURAKLARI[RIR_DURAKLARI.length - 1])),
    sure: set.durationSeconds == null ? '' : String(set.durationSeconds),
  };
}
