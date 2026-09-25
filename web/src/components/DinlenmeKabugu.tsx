import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRestTimerGorunumu } from '@grind/shared/restTimer';
import { useKalanSure } from '@grind/shared/useKalanSure';
import { EK_SURE_SN, sureEkle } from '../lib/dinlenme';
import { bipCal, ekraniAcikTut, titret } from '../lib/uyari';

/**
 * Sure dolduktan sonra bitis isaretinin (ziplayan saat) ekranda kaldigi sure -- yalnizca kullanici
 * ANTRENMAN ekranindayken isler. Baska bir ekrandaysa isaret beklemeye devam eder ve antrenmana
 * DONULDUGU anda kalkar (kullanici karari): dinlenmenin bittigini kacirmasin.
 */
const BITTI_GORUNME_MS = 7000;
const KUCUK_DUGME = 'h-10 rounded-lg bg-surface-3 px-3 text-label text-fg';
/** Yukari kaydirmanin paneli kucultmesi icin gereken en az mesafe (px). */
const KAYDIRMA_ESIGI = 30;
const ANTRENMAN_YOLU = '/antrenman';

/**
 * Dinlenme sayacinin TEK sahibi (issue #274 sonrasi yeniden tasarim): sayac artik antrenman
 * sayfasinin icinde degil, ortak kabugun ust barinda yasar -- boylece hangi ekranda olursan ol
 * gorunur ve sayfa kaydirmakla kaybolmaz.
 *
 * Uc hali vardir ve ASLA ayni anda cizilmezler (kullanici karari):
 * - genis panel: YALNIZCA antrenman ekraninda -- geri sayim, +15 sn, Atla ve en altta ince ilerleme
 *   cizgisi. Baska ekranlarda antrenmanin kontrolleri islevsiz kalacagi icin hic cizilmez.
 * - kucuk: panel yukari kaydirilinca (ya da antrenman disindaki her ekranda) ust barin ortasinda
 *   saat ikonu + kalan sure kalir (bkz. `DinlenmeGostergesi`).
 * - bitti: sure dolunca panel kalkar, yerini ziplayan saat ikonuna birakir; bitis isareti ust bari
 *   KAPLAMAZ.
 *
 * Ses/titresim/ekrani-acik-tutma ve "ne zaman temizlenecegi" burada durur (bilesen her zaman monte):
 * sayac kucultulmusken de suresi dolunca bip calar.
 */
export default function DinlenmeKabugu() {
  const { t } = useTranslation();
  const { dinlenme, setDinlenme, genis, setGenis } = useRestTimerGorunumu();
  const { metin, bitti, oran } = useKalanSure(dinlenme);
  const calisiyor = dinlenme !== null && !bitti;
  const kaydirmaBaslangici = useRef<number | null>(null);

  const antrenmandaMi = useLocation().pathname === ANTRENMAN_YOLU;
  // Sure dolduğu ANDA kullanici antrenman ekraninda miydi? Iki temizleme kurali bununla ayrilir.
  const antrenmandaMiRef = useRef(antrenmandaMi);
  antrenmandaMiRef.current = antrenmandaMi;
  const bitisteAntrenmandaydi = useRef(false);

  // Bitis uyarisi; panel `bitti` ile zaten kalkar, geriye ziplayan saat kalir.
  useEffect(() => {
    if (!bitti) {
      return;
    }
    bitisteAntrenmandaydi.current = antrenmandaMiRef.current;
    titret();
    bipCal();
  }, [bitti]);

  // (1) Sure antrenman ekranindayken dolduysa: isaret birkac saniye durur, sonra kalkar.
  useEffect(() => {
    if (!bitti || !bitisteAntrenmandaydi.current) {
      return;
    }
    const zamanlayici = setTimeout(() => setDinlenme(null), BITTI_GORUNME_MS);
    return () => clearTimeout(zamanlayici);
  }, [bitti, setDinlenme]);

  // (2) Baska bir ekrandayken dolduysa: isaret bekler, antrenmana donulunce kalkar.
  useEffect(() => {
    if (!bitti || bitisteAntrenmandaydi.current || !antrenmandaMi) {
      return;
    }
    setDinlenme(null);
  }, [bitti, antrenmandaMi, setDinlenme]);

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    let birak: (() => void) | null = null;
    let iptal = false;
    const iste = () => {
      void ekraniAcikTut().then((yeniBirak) => {
        if (iptal) {
          yeniBirak?.();
          return;
        }
        birak?.();
        birak = yeniBirak;
      });
    };
    // Tarayici sayfa gizlenince kilidi kendisi birakir; gorunur olunca yeniden istenir.
    const gorunurlukDegisti = () => {
      if (document.visibilityState === 'visible') {
        iste();
      }
    };
    iste();
    document.addEventListener('visibilitychange', gorunurlukDegisti);
    return () => {
      iptal = true;
      document.removeEventListener('visibilitychange', gorunurlukDegisti);
      birak?.();
    };
  }, [calisiyor]);

  return (
    <>
      {/* Canli bolge HER ZAMAN var; yalnizca bitiste dolar. Geri sayim saniyeleri duyurulmaz. */}
      <p role="status" className="sr-only">
        {bitti ? t('antrenman.dinlenmeBitti') : ''}
      </p>
      {dinlenme && genis && !bitti && antrenmandaMi && (
        <div
          data-dinlenme-paneli
          // Ust barin (z-40) USTUNDE ve onun uzerine oturur; bar yuksekliginden daha ince bir serit.
          className="fixed inset-x-0 top-0 z-50 bg-surface-2 pt-[env(safe-area-inset-top)]"
          onTouchStart={(e) => {
            kaydirmaBaslangici.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(e) => {
            const baslangic = kaydirmaBaslangici.current;
            const simdi = e.touches[0]?.clientY;
            if (baslangic === null || simdi === undefined) {
              return;
            }
            if (baslangic - simdi > KAYDIRMA_ESIGI) {
              kaydirmaBaslangici.current = null;
              setGenis(false);
            }
          }}
          onTouchEnd={() => {
            kaydirmaBaslangici.current = null;
          }}
        >
          <div className="relative mx-auto flex h-12 max-w-md items-center justify-between gap-2 px-4">
            <span className="flex min-w-0 items-center gap-2">
              <Timer aria-hidden size={18} className="shrink-0 text-muted" />
              <span className="text-metric tabular-nums">{metin}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => setDinlenme(sureEkle(dinlenme, EK_SURE_SN))} className={KUCUK_DUGME}>
                {t('antrenman.dinlenmeEkleSure')}
              </button>
              <button type="button" onClick={() => setDinlenme(null)} className={KUCUK_DUGME}>
                {t('ortak.atla')}
              </button>
            </span>
            {/* Ilerleme barin en alt kenarinda ince bir cizgi: satir yuksekligini buyutmez. */}
            <progress
              aria-hidden
              value={oran}
              max={1}
              // Yerel ilerleme cubugunun parcalari yalnizca tarayiciya ozgu sozde elemanlarla boyanir;
              // token karsiligi olan bir yardimci sinif yok.
              className="absolute inset-x-0 bottom-0 h-0.5 w-full appearance-none overflow-hidden bg-surface-4 [&::-moz-progress-bar]:bg-fg [&::-webkit-progress-bar]:bg-surface-4 [&::-webkit-progress-value]:bg-fg"
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Ust barin ortasindaki kucuk hal: saat ikonu + kalan sure; sure dolunca yalnizca ziplayan saat
 * ikonu (temizlenmesini `DinlenmeKabugu` yonetir).
 *
 * Yalnizca ANTRENMAN ekraninda dokunulabilir (geri buyutur). Diger ekranlarda paneli acmanin
 * anlami yok -- oradaki "+15 sn"/"Atla" antrenmani yonetir -- o yuzden salt gosterge kalir
 * (kullanici karari: "ustune basilsa da buyumeyecek").
 */
export function DinlenmeGostergesi() {
  const { t } = useTranslation();
  const { dinlenme, genis, setGenis } = useRestTimerGorunumu();
  const { metin, bitti } = useKalanSure(dinlenme);
  const antrenmandaMi = useLocation().pathname === ANTRENMAN_YOLU;

  // Panelin cizildigi tek durumda (antrenman ekrani + genis + surerken) burasi susar: iki gorunum
  // ayni anda gorunmez.
  if (!dinlenme || (antrenmandaMi && genis && !bitti)) {
    return null;
  }
  const icerik = (
    <>
      <Timer aria-hidden size={20} className={bitti ? 'motion-safe:animate-bounce' : undefined} />
      {!bitti && <span className="text-metric tabular-nums">{metin}</span>}
    </>
  );
  return (
    <span
      data-dinlenme-gostergesi
      className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center text-fg"
    >
      {antrenmandaMi && !bitti ? (
        <button
          type="button"
          aria-label={t('antrenman.dinlenmeGenislet')}
          onClick={() => setGenis(true)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-2"
        >
          {icerik}
        </button>
      ) : (
        <span className="flex items-center gap-1.5">{icerik}</span>
      )}
    </span>
  );
}
