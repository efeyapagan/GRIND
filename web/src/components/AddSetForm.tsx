import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useRestTimer } from '@grind/shared/restTimer';
import { queryKeys, useAddSet, useExercises, useOpenSession, type Egzersiz } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { adaGoreSirala } from '../lib/egzersizler';
import { ApiError } from '../api/problem';
import { formatWeight } from '../lib/format';
import {
  DINLENME_DEPO_ANAHTARI,
  dinlenmeBaslat,
  dinlenmeKaydiAyristir,
  dinlenmeKaydiUret,
  dinlenmeSuresi,
} from '../lib/dinlenme';
import { SET_ALANLARI, setGirdisiniAyristir, setGirdisiniDogrula } from '../lib/setGirdisi';
import { sesiHazirla } from '../lib/uyari';
import BirincilDugme from '../ui/BirincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import SayiAlani from '../ui/SayiAlani';
import RirAlani from './RirAlani';
import SecimKutusu from '../ui/SecimKutusu';
import HareketEklePaneli from './HareketEklePaneli';

/**
 * Spec Karar 8 (cevrimdisi kuyruk YOK): fetch'in kendisi reddederse (ag yok) `request()`
 * ApiError DISINDA bir istisna firlatir -- bunu burada ayirt edip acik bir Turkce mesaj
 * gosteriyoruz. Gece yarisindan sonra gonderilen kuyruklu bir set yanlis gune duserdi, o yuzden
 * kuyruklama bilerek yapilmiyor; kullanici tekrar denemeli.
 *
 * DIKKAT (review bulgusu R15): `fetch` reddettiginde istemci istegin sunucuya ULASIP
 * ULASMADIGINI BILEMEZ -- zayif bir baglantida yanit kaybolmus ama set sunucuda kaydedilmis
 * olabilir. Bu yuzden mesaj "kaydedilmedi" diye KESIN bir iddiada BULUNMAZ (bu, kullaniciyi
 * tekrar denemeye ve sunucu tarafinda YINELENEN bir set olusturmaya -- ve o yinelenen setin
 * PR tespitini de etkilemeye -- iter); yerine kullaniciyi listeyi kontrol etmeye yonlendirir.
 */
const PANEL_ID = 'set-paneli';

interface Props {
  // Secim TodayPage'dedir (hareket kartlari ve panel ayni secimi paylasir, spec Karar 5). `null`:
  // egzersiz listesi henuz yuklenmedi.
  egzersizId: number | null;
  onEgzersizSec: (exerciseId: number) => void;
  // Panel acik mi -- TodayPage'de tutulur, cunku hareket karti dokunusu da acar (dilim 3 spec Karar 6).
  acik: boolean;
  onAcikDegis: (acik: boolean) => void;
  /**
   * Acik antrenmanda verilir (#62). Verildiginde paneldeki hareket secimi KALKAR: hareket karttan
   * gelir, panel basligi onu gosterir. Verilmezse (antrenman yokken) bugunku davranis (#61'e kadar)
   * korunur. Acilip kapanma durumu artik AntrenmanPage'de tutulur (issue #273) -- ust basliktaki
   * "Hareket ekle" kisayolu da AYNI durumu acabilsin diye.
   */
  hareketEkleme?: {
    egzersizler: readonly Egzersiz[];
    onEkle: (exerciseId: number) => void;
    acik: boolean;
    onAcikDegis: (acik: boolean) => void;
    /**
     * Set girilmis (dolu) bir oturumda alta yapisik kutuda "Antrenmani bitir" durur. Bos oturumda
     * (#47) yerine `iptalCagrisi` verilir -- ikisi ASLA ayni anda verilmez, kutu HER ZAMAN
     * ikisinden birini gosterir (yeni ust bas tasarim: "Hareket ekle" artik ust baslikta sabit,
     * bu kutu yalnizca bitirme/iptal icin).
     */
    bitirCagrisi?: { onBitir: () => void };
    /** Bos oturumda (#47) "Antrenmani bitir" yerine gosterilen iptal eylemi -- bkz. `bitirCagrisi`. */
    iptalCagrisi?: { onIptal: () => void; beklemede?: boolean };
  };
}

/**
 * Set ekleme formu -- bos durumda da (henuz acik oturum yokken) kullanilabilir olmasi gerekir,
 * cunku ilk set eklendiginde oturum sunucu tarafinda kendiliginden acilir (spec). Bu yuzden
 * TodayPage'in acik oturum olup olmadigina bakmadan hep render edilir. Secilen egzersiz disaridan
 * gelir (kontrollu). Alt alanin tamami bu bilesendedir: dinlenme sayaci + kapaliyken 'Set ekle'
 * dugmesi, acikken form. Bilesen hic unmount olmaz; panel kapaliyken form `hidden` ile gizlenir,
 * boylece yazilanlar ve dinlenme sayaci korunur (dilim 3 spec Karar 6).
 */
export default function AddSetForm({ egzersizId, onEgzersizSec, acik, onAcikDegis, hareketEkleme }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const queryClient = useQueryClient();
  const { data: egzersizler } = useExercises();
  const { data: acikOturum, isLoading: oturumYukleniyor } = useOpenSession();
  const eklemeMutasyonu = useAddSet();

  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);
  const seciliEgzersizAdi = siraliEgzersizler.find((eg) => eg.id === egzersizId)?.name ?? '';

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  // Spec davranis 5: son eklenen set gorunur + role=status ile duyurulur; bir sonraki gonderimde
  // ya da hatada temizlenir. Dugmenin adi degismez.
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);

  // Spec Karar 6: her basarili set sonrasi yeniden baslar; hareket secimini degistirmek durdurmaz.
  // Durum artik burada DEGIL, paylasilan Context'te yasar (bkz. restTimer.tsx) -- ust kabuktaki
  // kompakt gosterge AYNI degeri okuyabilsin diye. Kalici depoya (localStorage) kaydetme mantigi
  // asagida DEGISMEDI, sadece durumun kendisi tasindi.
  const [dinlenme, setDinlenme] = useRestTimer();

  // Issue #190: sayfa degisip geri donulunce (bilesen unmount/remount olunca) sayac kaybolmasin --
  // `bitisMs` mutlak zaman damgasi oldugu icin kalici depodan (localStorage) okunan kayit dogru
  // kalan sureyi kendiliginden verir. Bu oturum icin GERI YUKLEME yalnizca BIR KEZ denenir
  // (`denenenOturum`) -- aksi halde her render'da depodan tekrar okunur ve kullanicinin "Atla"
  // ile temizledigi bir sayaci geri getirebilir.
  const denenenOturum = useRef<number | null>(null);
  useEffect(() => {
    if (oturumYukleniyor || !acikOturum || egzersizId === null) {
      return;
    }
    if (denenenOturum.current === acikOturum.id) {
      return;
    }
    denenenOturum.current = acikOturum.id;
    const ham = localStorage.getItem(DINLENME_DEPO_ANAHTARI);
    const geri = dinlenmeKaydiAyristir(ham, acikOturum.id, egzersizId, Date.now());
    if (geri) {
      setDinlenme(geri);
    }
  }, [oturumYukleniyor, acikOturum, egzersizId]);

  // Sayac degistikce (baslayinca, +15sn'de, Atla/bitince) kalici depo guncellenir. Acik oturum
  // yoksa (antrenman bitti/iptal edildi) kayit da silinir (issue #190 -- "kayit temizlensin").
  useEffect(() => {
    if (oturumYukleniyor) {
      return;
    }
    if (!acikOturum || egzersizId === null || !dinlenme) {
      localStorage.removeItem(DINLENME_DEPO_ANAHTARI);
      return;
    }
    localStorage.setItem(DINLENME_DEPO_ANAHTARI, dinlenmeKaydiUret(acikOturum.id, egzersizId, dinlenme));
  }, [oturumYukleniyor, acikOturum, egzersizId, dinlenme]);

  const agirlikRef = useRef<HTMLInputElement>(null);
  const acmaDugmesiRef = useRef<HTMLButtonElement>(null);

  // I2 (review bulgusu): panel "+ Set ekle" DUGMESIYLE acildiginda odak agirlik alanina tasinir,
  // ama bir hareket kartina dokunarak acildiginda TASINMAZ -- aksi halde telefon klavyesi acilir ve
  // kartin az once ortaya cikardigi grafigi ortar. Bu bayrak acma dugmesinin onClick'inde true'ya
  // set edilir; asagidaki efekt onu TUKETIR (okuyup sifirlar).
  const acButonuylaAcildiRef = useRef(false);

  // #226: paneli acan eleman (acik antrenmanda hareket karti) -- kapaninca odak ona doner. "Hareket
  // ekle" listenin sonunda oldugu icin odagi oraya dondurmek sayfayi en alta atlatirdi.
  const acanElemanRef = useRef<HTMLElement | null>(null);

  // Odak yalnizca durum GERCEKTEN degistiginde tasinir (ilk render'da ve StrictMode'un cift efektinde
  // calinmaz): acilinca (ve yalniz dugmeyle acildiysa) agirlik alanina, kapaninca paneli acan elemana
  // (yoksa "Set ekle" dugmesine).
  const oncekiAcik = useRef(acik);
  useEffect(() => {
    if (oncekiAcik.current === acik) {
      return;
    }
    oncekiAcik.current = acik;
    if (acik) {
      acanElemanRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (acButonuylaAcildiRef.current) {
        agirlikRef.current?.focus();
      }
      acButonuylaAcildiRef.current = false;
    } else {
      const acan = acanElemanRef.current;
      acanElemanRef.current = null;
      if (acan?.isConnected && acan !== document.body) {
        acan.focus();
      } else {
        acmaDugmesiRef.current?.focus();
      }
    }
  }, [acik]);

  async function gonder(e: FormEvent) {
    e.preventDefault();
    // Ses ancak kullanici etkilesimiyle acilabilir: "Set ekle" dokunusu bu etkilesimdir.
    sesiHazirla();
    setGenelHata(null);
    setAlanHatalari({});
    setSonEklenen(null);

    if (egzersizId === null) {
      return;
    }

    // Dogrulama ve ayristirma set duzenleyiciyle ORTAK (#57, `lib/setGirdisi`).
    const girdi = { agirlik, tekrar, rir };
    const dogrulamaHatalari = setGirdisiniDogrula(girdi);
    if (Object.keys(dogrulamaHatalari).length > 0) {
      setAlanHatalari(dogrulamaHatalari);
      return;
    }

    const {
      weight: ayristirilmisAgirlik,
      reps: ayristirilmisTekrar,
      rir: ayristirilmisRir,
    } = setGirdisiniAyristir(girdi);

    try {
      await eklemeMutasyonu.mutateAsync({
        exerciseId: egzersizId,
        weight: ayristirilmisAgirlik,
        reps: ayristirilmisTekrar,
        rir: ayristirilmisRir,
      });
      // Set eklenince panel KAPANIR (kullanici karari; spec Karar 6'nin "acik kalsin" davranisi
      // geri alindi): eklenen set kartta gorunur ve dinlenme sayaci ust barda baslar -- ikisi de
      // panelin arkasinda kalirdi. Yazilanlar korunur, panel yeniden acilinca yerindedir.
      setSonEklenen(
        t('setler.eklendi', { agirlik: formatWeight(ayristirilmisAgirlik, dil), tekrar: ayristirilmisTekrar }),
      );
      setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(acikOturum?.progress ?? [], egzersizId)));
      onAcikDegis(false);
    } catch (hata) {
      if (hata instanceof ApiError) {
        // Sunucu CreateSetRequest icin alan bazli DataAnnotations hatalari (orn. Weight/Reps
        // araligi) donebilir -- `apiHatasiniAyir` bunlari LoginPage/RegisterPage ile AYNI
        // desende ilgili alanin altina koyar; hicbir anahtar render edilen bir alanla
        // eslesmezse (orn. deserializasyon hatasi) genel bir hataya duser (I3), sessiz KALMAZ.
        const sonuc = apiHatasiniAyir(hata, SET_ALANLARI);
        setGenelHata(sonuc.genelHata);
        setAlanHatalari(sonuc.alanHatalari);
      } else {
        setGenelHata(t('setler.baglantiHatasi'));
        // Istek sunucuya ulasip ulasmadigini BILEMEDIGIMIZ icin (R15), baglanti geri gelince
        // ekranin GERCEGI gostermesi icin acik oturumu ve o oturumun setlerini invalidate
        // ediyoruz -- set gercekte kaydedilmis olabilir, kullanici listeyi kontrol edebilsin.
        void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
        if (acikOturum) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(acikOturum.id) });
        }
        // M7 (review bulgusu): ayni sebeple secili hareketin grafigi de bayat kalabilir -- set
        // gercekte kaydedilmisse grafikte gorunmeli. `egzersizId` burada `null` OLAMAZ, fonksiyonun
        // basinda erken donus var.
        void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(egzersizId) });
      }
      // Form icerigi BILEREK temizlenmiyor -- kullanici hatayi duzeltip tekrar denemeli.
    }
  }

  // Alta yapisik kutu yalnizca bir sey gosterirken cizilir (hareket ekle paneli acik ya da set
  // paneli acik). Sarmalayici yine de kalir -- canli bolgeler hep bagli olmali.
  const altPanelGorunur = !hareketEkleme || acik;

  return (
    <>
      {/* Eklenen seti duyuran canli bolge panelin DISINDA ve HER ZAMAN monte: set eklenince panel
          kapandigi icin form icindeki bir bolge okunmadan yok olurdu. Gorsel karsiligi yok --
          geri bildirim kartta beliren set satiri ve ust bardaki dinlenme sayacidir. */}
      <p role="status" className="sr-only">
        {sonEklenen}
      </p>
      {hareketEkleme && (
        // #62: acik antrenmanda set ekleme karta dokununca acilir. #226: bu kutu alta yapisik DEGIL,
        // kartlarin hemen ardinda akisin icindedir -- uzun listede ekrani ortuyordu. Bitir/iptal
        // yer degisimi (#273 devami): "Hareket ekle" artik ust baslikta HER ZAMAN sabit durur; bu
        // kutu artik yalnizca "Antrenmani bitir" (dolu oturum) ya da "Antrenmani iptal et" (bos
        // oturum) gosterir -- ikisi AYNI konumda, oturum durumuna gore biri.
        <div className="flex flex-col gap-2">
          {hareketEkleme.acik ? (
            <HareketEklePaneli
              egzersizler={hareketEkleme.egzersizler}
              onSec={(exerciseId) => {
                hareketEkleme.onAcikDegis(false);
                hareketEkleme.onEkle(exerciseId);
              }}
              onKapat={() => hareketEkleme.onAcikDegis(false)}
            />
          ) : hareketEkleme.bitirCagrisi ? (
            <BirincilDugme yukseklik="normal" onClick={hareketEkleme.bitirCagrisi.onBitir}>
              <CircleCheck aria-hidden size={20} />
              {t('antrenman.bitir')}
            </BirincilDugme>
          ) : hareketEkleme.iptalCagrisi ? (
            <button
              type="button"
              onClick={hareketEkleme.iptalCagrisi.onIptal}
              disabled={hareketEkleme.iptalCagrisi.beklemede}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 text-body-lg font-bold text-danger disabled:opacity-60"
            >
              <X aria-hidden size={20} />
              {t('antrenman.iptalEt')}
            </button>
          ) : null}
        </div>
      )}
      {/* I1 (review bulgusu): `fixed` yerine `sticky` -- TodayPage'in koku bu bilesenin son cocugu
          ve `mt-auto` tasir; boylece bu alan kendi akis icinde gercek yukseklik kaplar (dinlenme
          sayaci acikken buyuyen satir dahil) ve altindaki listenin son satirini bir daha ORTMEZ.
          5.5rem = sekme cubugu yuksekligi (App.tsx h-14 = 3.5rem) + ortadaki "+" dugmesinin
          halkasinin tastigi 2rem (issue #159) -- yalnizca 3.5rem kullanilirsa bu panel o dugmeyle
          CAKISIYORDU (kullanici bulgusu). `px-4` YOK -- `main` zaten `px-4 max-w-md`. */}
      <div data-alt-panel className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mt-auto pb-2">
        <div
          className={
            altPanelGorunur ? 'mx-auto flex max-w-md flex-col gap-2 rounded-xl bg-surface-3 p-3 shadow-2xl' : undefined
          }
        >
          {!acik && !hareketEkleme && (
            <BirincilDugme
              ref={acmaDugmesiRef}
              yukseklik="normal"
              aria-expanded={false}
              aria-controls={PANEL_ID}
              onClick={() => {
                // I2: yalniz bu dugmeyle acilinca odak agirlik alanina tasinsin (bkz. yukaridaki ref).
                acButonuylaAcildiRef.current = true;
                onAcikDegis(true);
              }}
            >
              <Plus aria-hidden size={20} />
              {t('setler.setEkle')}
            </BirincilDugme>
          )}
          <form id={PANEL_ID} hidden={!acik} onSubmit={gonder} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {hareketEkleme ? (
                <h2 className="pl-1 text-label text-muted uppercase">
                  {t('setler.yeniSetIcin', { ad: seciliEgzersizAdi })}
                </h2>
              ) : (
                <span className="pl-1 text-label text-muted uppercase">{t('setler.yeniSet')}</span>
              )}
              <IkonDugmesi etiket={t('setler.paneliKapat')} onClick={() => onAcikDegis(false)}>
                <X aria-hidden size={20} />
              </IkonDugmesi>
            </div>
            {genelHata && <p role="alert" className="text-label text-danger">{genelHata}</p>}
            {!hareketEkleme && (
              <div>
                <label htmlFor="set-egzersiz" className="sr-only">
                  {t('setler.egzersizEtiket')}
                </label>
                <SecimKutusu
                  id="set-egzersiz"
                  value={egzersizId ?? ''}
                  onChange={(e) => onEgzersizSec(Number(e.target.value))}
                >
                  {siraliEgzersizler.map((eg) => (
                    <option key={eg.id} value={eg.id}>
                      {eg.name}
                    </option>
                  ))}
                </SecimKutusu>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <SayiAlani
                id="set-agirlik"
                etiket={t('setGirdisi.agirlikEtiket')}
                ekranOkuyucuEki={t('setGirdisi.agirlikBirimEki')}
                birim="kg"
                inputMode="decimal"
                placeholder="0"
                value={agirlik}
                onChange={setAgirlik}
                hata={alanHatalari.weight}
                girdiRef={agirlikRef}
              />
              <SayiAlani
                id="set-tekrar"
                etiket={t('setGirdisi.tekrarEtiket')}
                birim={t('setGirdisi.tekrarBirimi')}
                inputMode="numeric"
                placeholder="0"
                value={tekrar}
                onChange={setTekrar}
                hata={alanHatalari.reps}
              />
              <RirAlani
                id="set-rir"
                deger={rir === '' ? null : Number(rir)}
                onDegis={(yeni) => setRir(yeni === null ? '' : String(yeni))}
                hata={alanHatalari.rir}
              />
            </div>
            <BirincilDugme type="submit" yukseklik="buyuk" disabled={eklemeMutasyonu.isPending}>
              <Plus aria-hidden size={24} />
              {t('setler.setEkle')}
            </BirincilDugme>
          </form>
        </div>
      </div>
    </>
  );
}
