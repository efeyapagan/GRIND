import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  bittiMi,
  EK_SURE_SN,
  gecenOran,
  kalanMs,
  kalanSureMetni,
  sureEkle,
  type Dinlenme,
} from '../lib/dinlenme';
import { bipCal, ekraniAcikTut, titret } from '../lib/uyari';

const BITTI_GORUNME_MS = 3000;
const KUCUK_DUGME = 'h-11 rounded-lg bg-surface-3 px-3 text-label text-fg';

interface Props {
  dinlenme: Dinlenme | null;
  // Kararli olmali (useState setter'i): bitis zamanlayicisinin bagimliligidir.
  onDegis: (dinlenme: Dinlenme | null) => void;
}

/**
 * Set ekle panelinin ustundeki dinlenme satiri (spec Karar 6). Mantik `lib/dinlenme.ts`'te; bu
 * bilesen goruntuler, saniyede bir yenilenir, bitiste titresim + bip + duyuru yapar ve birkac saniye
 * sonra satiri kaldirir. Calisirken ekran acik tutulur (Wake Lock; sayfa gorunur olunca yeniden).
 */
export default function DinlenmeSayaci({ dinlenme, onDegis }: Props) {
  const [simdi, setSimdi] = useState(() => Date.now());
  // Yeni bir sayac basladiginda `simdi` bir onceki tikten kalma olabilir; baslangic anindan once
  // olamaz (bkz. Dinlenme yorumu).
  const etkinSimdi = dinlenme ? Math.max(simdi, dinlenme.bitisMs - dinlenme.toplamMs) : simdi;
  const bitti = dinlenme !== null && bittiMi(dinlenme, etkinSimdi);
  const calisiyor = dinlenme !== null && !bitti;

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [calisiyor]);

  useEffect(() => {
    if (!bitti) {
      return;
    }
    titret();
    bipCal();
    const zamanlayici = setTimeout(() => onDegis(null), BITTI_GORUNME_MS);
    return () => clearTimeout(zamanlayici);
  }, [bitti, onDegis]);

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
        setSimdi(Date.now());
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
        {bitti ? 'Dinlenme bitti' : ''}
      </p>
      {dinlenme && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Timer aria-hidden size={18} className="text-muted" />
              {bitti ? (
                <span aria-hidden className="text-body-lg font-semibold">
                  Dinlenme bitti
                </span>
              ) : (
                <>
                  <span className="text-label text-muted uppercase">Dinlenme</span>
                  <span className="text-metric tabular-nums">{kalanSureMetni(kalanMs(dinlenme, etkinSimdi))}</span>
                </>
              )}
            </span>
            {!bitti && (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => onDegis(sureEkle(dinlenme, EK_SURE_SN))} className={KUCUK_DUGME}>
                  +15 sn
                </button>
                <button type="button" onClick={() => onDegis(null)} className={KUCUK_DUGME}>
                  Atla
                </button>
              </span>
            )}
          </div>
          {!bitti && (
            <progress
              aria-hidden
              value={gecenOran(dinlenme, etkinSimdi)}
              max={1}
              // Yerel ilerleme cubugunun parcalari yalnizca tarayiciya ozgu sozde elemanlarla boyanir;
              // token karsiligi olan bir yardimci sinif yok.
              className="h-1 w-full appearance-none overflow-hidden rounded-full bg-surface-4 [&::-moz-progress-bar]:bg-fg [&::-webkit-progress-bar]:bg-surface-4 [&::-webkit-progress-value]:bg-fg"
            />
          )}
        </div>
      )}
    </>
  );
}
