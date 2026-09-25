import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useCalendar } from '../api/queries';
import { formatAralik, trBugundenOnce } from '../lib/format';
import {
  ayBasligi,
  ayinGunu,
  ayIzgarasi,
  gezilebilirMi,
  gorunumAraligi,
  gunBasligi,
  haftaGunleri,
  kaydir,
  type TakvimGorunumu,
} from '../lib/takvim';
import IkonDugmesi from '../ui/IkonDugmesi';

const GUN_ANAHTARLARI = ['pt', 'sa', 'ca', 'pe', 'cu', 'ct', 'pz'] as const;

/** Kaydirmanin donem degistirmesi icin gereken yatay mesafe (px). */
const KAYDIRMA_ESIGI = 40;

/**
 * #315: antrenman yapilan gun YESIL, yapilmayan notr. Once set sayisina gore kademeli `accent`
 * tonlari vardi; kullanici karari tek ton yesil. Ara opakliklarda ne acik ne koyu yazi 4.5:1'i
 * tutturdugu icin (olculdu: /60 uzerinde fg 3.15, on-success 3.2) kademe YOK -- dolu ton uzerinde
 * `on-success` iki temada da esigi gecer (bkz. paletKontrast.test.ts).
 */
const ANTRENMANLI_SINIFI = 'bg-success text-on-success';
const BOS_SINIFI = 'bg-surface-2 text-muted';

interface Props {
  // "YYYY-MM-DD", TR gunu. Testte sabitlenir; uygulamada cihaz saatinden TR bugunu.
  bugun?: string;
}

/**
 * Bugun ekranindaki Takvim (#81): Aylik/Haftalik izgara, her hucrede ayin gunu, rengi o gunun set
 * sayisina gore kademeli. Gunler, set sayilari ve seriler `GET /api/stats/calendar`'dan gelir; istemci
 * yalnizca izgarayi kurar ve set sayisini renk kademesine cevirir. Gelecege gezinilmez. Gorunum
 * degisince bugune donulur; secim hatirlanmaz.
 */
export default function Takvim({ bugun = trBugundenOnce(0) }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const navigate = useNavigate();
  // #315: uygulama HAFTALIK acilir -- kullanici en cok icinde bulundugu haftayla ilgilenir.
  const [gorunum, setGorunum] = useState<TakvimGorunumu>('hafta');
  const [gosterilen, setGosterilen] = useState(bugun);
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data: ozet, isLoading, isError, isPlaceholderData } = useCalendar(from, to);

  const gunler = new Map((ozet?.days ?? []).map((kayit) => [kayit.date, kayit]));
  const satirlar = gorunum === 'ay' ? ayIzgarasi(gosterilen) : [haftaGunleri(gosterilen)];
  const donemBasligi =
    gorunum === 'ay' ? ayBasligi(gosterilen, dil) : formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`, dil);
  const bosMetin = gorunum === 'ay' ? 'takvim.buAyYok' : 'takvim.buHaftaYok';
  const kaydirmaBaslangici = useRef<number | null>(null);
  // Son gezinme yonu: giris animasyonu hangi taraftan gelecegini buradan okur.
  const [yon, setYon] = useState<-1 | 1>(1);

  function gorunumDegistir() {
    setGorunum(gorunum === 'ay' ? 'hafta' : 'ay');
    setGosterilen(bugun);
  }

  /** Gelecege gezinilmez (#81): kapali yonde hareket sessizce yok sayilir. */
  function gezin(gidilenYon: -1 | 1) {
    if (!gezilebilirMi(gorunum, gosterilen, gidilenYon, bugun)) {
      return;
    }
    setYon(gidilenYon);
    setGosterilen(kaydir(gorunum, gosterilen, gidilenYon));
  }

  return (
    // #117: gorunur baslik kaldirildi; bolge adi aria-label ile.
    <section aria-label={t('takvim.bolgeAdi')} className="flex flex-col gap-3">

      <div className="flex flex-col gap-3">
        {/* #315: donem basligi ve SAG kosesinde gorunum ikonu -- ikon gun kartlarinin DISINDA. */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-lg tabular-nums">{donemBasligi}</p>
          <IkonDugmesi
            etiket={t(gorunum === 'ay' ? 'takvim.haftalikGorunumeGec' : 'takvim.aylikGorunumeGec')}
            onClick={gorunumDegistir}
          >
            <CalendarDays aria-hidden size={20} />
          </IkonDugmesi>
        </div>

        {/* #84: izgara tam genislik degil, en fazla 256 px -- telefonda hucre ~33 px, ekrani kaplamasin.
            #315: donem degistirmenin yolu YATAY KAYDIRMA; ok dugmeleri kalkti. Kaydirma dokunmatige
            ozgu oldugu icin fare/klavye kullanicisina ok TUSLARI birakildi (gorunur dugme degil). */}
        <div
          // `key`: donem degisince izgara yeniden monte olur ve giris animasyonu bastan oynar.
          key={gosterilen}
          data-testid="takvim-izgara"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              gezin(e.key === 'ArrowRight' ? 1 : -1);
            }
          }}
          onTouchStart={(e) => {
            kaydirmaBaslangici.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const baslangic = kaydirmaBaslangici.current;
            kaydirmaBaslangici.current = null;
            const bitis = e.changedTouches[0]?.clientX;
            if (baslangic === null || bitis === undefined || Math.abs(bitis - baslangic) < KAYDIRMA_ESIGI) {
              return;
            }
            // Sola kaydirma (parmak sola) ileri, saga kaydirma geri.
            gezin(bitis < baslangic ? 1 : -1);
          }}
          // #315: izgara iki gorunumde de TAM GENISLIGE yayilir (#84'un 256 px siniri kalkti).
          // Aylikta hucre kare DEGIL basik (h-9): 5-6 satir kare olsaydi izgara ekrani yutardi --
          // genisleme boya degil ENE gider. Haftalikta tek satir oldugu icin kare kalabilir.
          className={`grid w-full touch-pan-y grid-cols-7 ${gorunum === 'ay' ? 'gap-1' : 'gap-2'} ${
            yon === 1 ? 'motion-safe:animate-takvim-sagdan' : 'motion-safe:animate-takvim-soldan'
          }`}
        >
          {GUN_ANAHTARLARI.map((anahtar) => (
            <span key={anahtar} aria-hidden className="text-center text-label-xs text-muted uppercase">
              {t(`takvim.gunKisaltmalari.${anahtar}`)}
            </span>
          ))}
          {satirlar.flat().map((gun, sira) => {
            if (gun === null) {
              return <span key={`bos-${sira}`} aria-hidden />;
            }
            const kayit = gunler.get(gun);
            // Her hucre `ring-1`i BASTAN tasir, yalnizca rengi degisir (#261 ile ayni tuzak:
            // NativeWind'de `ring-*` sonradan eklenince bilesen "yukseltilip" prop'lari JSON'a
            // cevriliyor ve navigasyon context'i getter'ina carpip cokuyordu).
            const vurgu = gun === bugun ? 'ring-1 ring-muted' : 'ring-1 ring-transparent';
            return (
              <button
                key={gun}
                type="button"
                aria-label={`${gunBasligi(gun, dil)}: ${
                  kayit ? t('setler.setSayisi', { count: kayit.setCount }) : t('takvim.antrenmanYok')
                }`}
                aria-current={gun === bugun ? 'date' : undefined}
                onClick={() => navigate(`/gun/${gun}`)}
                // min-h-0: base katmanindaki 44 px dugme alt siniri kare hucreyi uzatmasin (#84; kullanici
                // kucuk izgarayi dokunma hedefinden one aldi).
                // #315: gun kutulari DAIRE. Haftalikta daire sutunu doldurur; aylikta sabit 36 px
                // daire sutunda ortalanir -- 5-6 satir sutun genisliginde daire olsaydi izgara uzardi.
                className={`flex min-h-0 items-center justify-center rounded-full text-label tabular-nums ${
                  gorunum === 'ay' ? 'size-9 justify-self-center' : 'aspect-square w-full'
                } ${kayit ? ANTRENMANLI_SINIFI : BOS_SINIFI} ${vurgu}`}
              >
                {ayinGunu(gun)}
              </button>
            );
          })}
        </div>

        {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
        {isError && (
          <p role="alert" className="text-body text-danger">
            {t('takvim.hata')}
          </p>
        )}
        {ozet && !isPlaceholderData && ozet.days.length === 0 && (
          <p className="text-body text-muted">{t(bosMetin)}</p>
        )}

        {ozet && (
          // #315: ozet yalnizca IKI seri -- "Antrenman gunu" ve "Bu hafta" kaldirildi. Ikisi yan yana
          // kart; hedef yoksa (#97) hedef serisi anlamsiz oldugu icin cizilmez, aktif seri tam genisler.
          <dl className="grid grid-cols-2 gap-2">
            <OzetDegeri
              etiket={t('takvim.aktifSeri')}
              deger={t('takvim.haftaSayisi', { count: ozet.currentWeekStreak })}
              tekBasina={ozet.weeklyTargetDays === null}
            />
            {ozet.weeklyTargetDays !== null && (
              <OzetDegeri
                etiket={t('takvim.hedefSerisi')}
                deger={t('takvim.haftaSayisi', { count: ozet.currentTargetStreak ?? 0 })}
              />
            )}
          </dl>
        )}
      </div>
    </section>
  );
}

function OzetDegeri({ etiket, deger, tekBasina }: { etiket: string; deger: string; tekBasina?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl bg-surface-1 p-4 ${tekBasina ? 'col-span-2' : ''}`}>
      <dt className="text-label text-muted">{etiket}</dt>
      <dd className="text-metric tabular-nums">{deger}</dd>
    </div>
  );
}

