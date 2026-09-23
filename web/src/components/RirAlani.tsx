import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { enYakinRirDegeri, rirAciklamasi, rirDurakSirasi, rirEtiketi, RIR_DURAKLARI } from '../lib/rir';

interface Props {
  id: string;
  deger: number | null;
  onDegis: (rir: number | null) => void;
  /**
   * Set duzenleyicide `false`: sunucuda `PATCH` icin `null` "degistirme" demektir, RIR orada
   * bosaltilamaz -- Temizle sunmak yaniltirdi.
   */
  temizlenebilir?: boolean;
  hata?: string;
}

/** Ustte rakam yazan duraklar: tam sayilar ve "4+"; ara duraklar yalnizca nokta. */
const ETIKETLI = new Set([0, 1, 2, 3, 4, 5]);

/**
 * RIR alani (#266). Kapaliyken diger sayi alanlari gibi bir kutu; tiklayinca altinda on duraklik
 * kaydirici acilir (0, 0–1, 1 … 4, 4+). Ray soldan saga `accent`ten sonuge giden bir degrade (0 = en
 * zor = en canli; spec #266 genislemesi), secili durakta acik renkli tutamac, altinda duragin basligi
 * ve cumlesi. Secim uc yoldan yapilir -- rayi surukleyerek, bir duraga tiklayarak ya da klavyeyle
 * (`role="slider"`: oklar, Home/End); ucu de ayni `sec`e baglanir (ZorlukKadrani deseni).
 *
 * Kok bir fragment: kutu ve panel ayni izgarada kardes olur, panel `col-span-full` ile set formunun
 * uc sutunlu satirinin ALTINA tam genislikte duser.
 */
export default function RirAlani({ id, deger, onDegis, temizlenebilir = true, hata }: Props) {
  const { t } = useTranslation();
  const [acik, setAcik] = useState(false);
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const surukleniyor = useRef(false);
  const panelId = useId();
  const seciliSira = deger === null ? -1 : rirDurakSirasi(deger);
  const aciklama = deger === null ? null : rirAciklamasi(deger);
  const etiket = deger === null ? null : rirEtiketi(deger);

  function sec(rir: number) {
    if (rir !== deger) {
      onDegis(rir);
    }
  }

  function siraSec(sira: number) {
    if (sira >= 0 && sira < RIR_DURAKLARI.length) {
      sec(RIR_DURAKLARI[sira]);
    }
  }

  function isaretcidenSec(olay: PointerEvent<HTMLDivElement>) {
    const kutu = olay.currentTarget.getBoundingClientRect();
    if (kutu.width > 0) {
      sec(enYakinRirDegeri((olay.clientX - kutu.left) / kutu.width));
    }
  }

  function tusaBasildi(olay: KeyboardEvent<HTMLDivElement>) {
    const hedef: Record<string, number> = {
      ArrowRight: seciliSira + 1,
      ArrowUp: seciliSira + 1,
      ArrowLeft: seciliSira - 1,
      ArrowDown: seciliSira - 1,
      Home: 0,
      End: RIR_DURAKLARI.length - 1,
    };
    if (olay.key in hedef) {
      olay.preventDefault();
      siraSec(hedef[olay.key]);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          id={id}
          aria-label={t('rir.alanDegeri', { deger: etiket ?? t('rir.girilmedi') })}
          aria-expanded={acik}
          aria-controls={panelId}
          onClick={() => setAcik((onceki) => !onceki)}
          className={`relative h-15 w-full rounded-lg pt-5 pr-12 pl-2 text-left ${acik ? 'bg-surface-2' : 'bg-inset'}`}
        >
          <span className="absolute top-2 left-2 text-label-xs text-muted uppercase">{t('setGirdisi.rirEtiket')}</span>
          <span className={`text-heading tabular-nums ${etiket ? 'text-fg' : 'text-muted/40'}`}>{etiket ?? '—'}</span>
          <span className="absolute right-2 bottom-2.5 text-label-xs text-muted">{t('setGirdisi.kalanBirimi')}</span>
        </button>
        {hata && <p role="alert" className="text-label text-danger">{hata}</p>}
      </div>

      {acik && (
        <div id={panelId} className="col-span-full flex flex-col gap-3 rounded-lg bg-inset p-3">
          <div className="flex items-center justify-between">
            <span className="text-body-lg text-fg">{t('rir.kaydirici')}</span>
            <div className="flex items-center gap-1">
              {temizlenebilir && deger !== null && (
                <button
                  type="button"
                  onClick={() => onDegis(null)}
                  className="h-10 rounded-lg px-3 text-label text-muted"
                >
                  {t('rir.temizle')}
                </button>
              )}
              <button
                type="button"
                aria-label={t('rir.bilgiDugmesi')}
                aria-expanded={bilgiAcik}
                onClick={() => setBilgiAcik((onceki) => !onceki)}
                className="flex size-10 items-center justify-center rounded-full text-fg"
              >
                <Info aria-hidden size={22} />
              </button>
            </div>
          </div>
          {bilgiAcik && <p className="text-body text-muted">{t('rir.bilgi')}</p>}

          <div
            role="slider"
            tabIndex={0}
            aria-label={t('rir.kaydirici')}
            aria-valuemin={0}
            aria-valuemax={RIR_DURAKLARI[RIR_DURAKLARI.length - 1]}
            aria-valuenow={deger === null ? undefined : RIR_DURAKLARI[seciliSira]}
            aria-valuetext={aciklama ? `${aciklama.baslik} ${aciklama.cumle}` : t('rir.girilmedi')}
            onKeyDown={tusaBasildi}
            className="flex flex-col gap-2 rounded-lg px-3 py-1"
          >
            {/* Etiketler ve duraklar ayni `justify-between` duzeninde: genisligi sifir yuvalar rayin
                iki ucundan baslayip esit aralikla dizilir, icerik yuvanin ortasina tasar. */}
            <div aria-hidden className="flex justify-between">
              {RIR_DURAKLARI.map((rir) => (
                <span key={rir} className="flex w-0 justify-center text-body text-fg tabular-nums">
                  {ETIKETLI.has(rir) ? rirEtiketi(rir) : ''}
                </span>
              ))}
            </div>
            <div
              className="relative flex h-8 touch-none items-center justify-between select-none"
              onPointerDown={(olay) => {
                surukleniyor.current = true;
                olay.currentTarget.setPointerCapture?.(olay.pointerId);
                isaretcidenSec(olay);
              }}
              onPointerMove={(olay) => surukleniyor.current && isaretcidenSec(olay)}
              onPointerUp={() => (surukleniyor.current = false)}
              onPointerCancel={() => (surukleniyor.current = false)}
            >
              <span aria-hidden className="absolute -right-3 -left-3 h-3 rounded-full bg-linear-to-r from-accent to-surface-4" />
              {RIR_DURAKLARI.map((rir, sira) => (
                // Klavye kaydiricidan gelir; duraklar fare/dokunma icin (tab sirasina girmez).
                <span key={rir} className="relative flex w-0 justify-center">
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={rirEtiketi(rir)}
                    aria-pressed={sira === seciliSira}
                    onClick={() => sec(rir)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  >
                    {sira === seciliSira ? (
                      <span className="size-7 rounded-full bg-fg shadow-md" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-bg" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <p className="min-h-10 text-body text-muted">
            {aciklama && (
              <>
                <strong className="font-bold text-fg">{aciklama.baslik}</strong> <span>{aciklama.cumle}</span>
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}
