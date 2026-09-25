import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinishSession, useOpenSession, useTemplate, type Zorluk } from '../api/queries';
import {
  oturumdanSablonHareketleri,
  sablondaOlmayanHareketVarMi,
  type SablonTaslakHareketi,
} from '../lib/sablonTaslagi';
import { usePageTitle } from '../ui/PageTitleContext';
import BirincilDugme from '../ui/BirincilDugme';
import ZorlukKadrani from '../components/ZorlukKadrani';

/** Kadran burada acilir: ortadaki kademe, hic dokunmadan bitirenin gonderecegi degerdir. */
const VARSAYILAN_ZORLUK: Zorluk = 'Medium';

/** "Atla" ve "Devam et" ayni sessiz metin eylemi -- dugme degil (#182). */
const METIN_EYLEMI = 'flex min-h-11 items-center rounded-lg px-2 text-label text-muted disabled:opacity-60';

/**
 * Antrenmani kapatan sayfa (#182, #153'un web yarisi; mobilde `antrenman-bitir.tsx`). "Antrenmani
 * bitir" antrenman sayfasinda oturumu kapatmaz, buraya getirir: kullanici zorlugu kadranla secer,
 * sonra bitirir. Zorluk YALNIZCA bitirirken alinir (sunucuda sonradan degistiren bir uc yok).
 *
 * "Atla" zorluksuz kapatir (alan nullable); "Devam et" hicbir sey kapatmadan bir onceki sayfaya
 * doner -- oturum acik kalir.
 *
 * #186: SABLONSUZ ve hareketi olan bir antrenman kapaninca sayfa ikinci adima gecer: "sablon olarak
 * kaydedilsin mi?". Hareket listesi bitirmeden ONCE alinir -- kapaninca acik oturum sorgusu bosalir.
 * Bu adimdayken "acik antrenman yok" yonlendirmesi calismaz (antrenman az once kapandi, beklenen bu).
 *
 * Ayni soru SABLONLA baslamis antrenmanda da sorulur, ama yalnizca liste o sablondan SAPMISSA:
 * sablonda olmayan bir hareket eklendiyse (`sablondaOlmayanHareketVarMi`) artik yeni bir sablon
 * adayidir. Sapma yoksa sorulmaz -- liste zaten var olan sablonun aynisidir.
 */
export default function AntrenmanBitirPage() {
  const { t } = useTranslation();
  usePageTitle(t('antrenman.nasilGecti'));
  const navigate = useNavigate();
  const { data: oturum, isLoading, isError } = useOpenSession();
  const bitirMutasyonu = useFinishSession();
  const [zorluk, setZorluk] = useState<Zorluk>(VARSAYILAN_ZORLUK);
  // `sapma`: soru sablonla baslamis ama degismis bir antrenmandan mi geliyor (aciklama metni degisir).
  const [kaydetSorusu, setKaydetSorusu] = useState<{ hareketler: SablonTaslakHareketi[]; sapma: boolean } | null>(
    null,
  );
  // Sapma karsilastirmasi icin oturumun sablonu; `templateId` null iken sorgu calismaz.
  const { data: sablon } = useTemplate(oturum?.templateId ?? null);

  if (kaydetSorusu) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col gap-6 pt-6 pb-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-heading">{t('antrenman.sablonSorusu')}</p>
          <p className="text-body text-muted">
            {t(kaydetSorusu.sapma ? 'antrenman.sablonSorusuSapmaAciklama' : 'antrenman.sablonSorusuAciklama')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          {/* replace: geri tusu kapanmis antrenmanin bitirme sayfasina donmesin. */}
          <BirincilDugme
            yukseklik="buyuk"
            onClick={() =>
              navigate('/templates/new', {
                replace: true,
                state: { donus: '/', hareketler: kaydetSorusu.hareketler },
              })
            }
          >
            {t('antrenman.sablonOlarakKaydet')}
          </BirincilDugme>
          {/* "Simdi degil" kart/dugme DEGIL: "Atla"/"Devam et" ile ayni sessiz metin eylemi. */}
          <div className="flex justify-center">
            <button type="button" onClick={() => navigate('/', { replace: true })} className={METIN_EYLEMI}>
              {t('antrenman.simdiDegil')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <p className="pt-2 text-body text-muted">{t('ortak.yukleniyor')}</p>;
  }

  // Kapatilacak antrenman yok (dogrudan acildi ya da baska yerde kapandi): bos bir kadran
  // gostermek yerine antrenman sayfasina donulur.
  if (isError || !oturum) {
    return <Navigate to="/antrenman" replace />;
  }

  /**
   * Bitirdikten sonra "sablon olarak kaydedilsin mi?" sorulacak mi? Liste bitirmeden ONCE okunur:
   * oturum kapaninca acik oturum sorgusu bosalir. Sablon henuz yuklenmediyse (ya da alinamadiysa)
   * SORULMAZ -- bitirmeyi bir sorgu icin bekletmek, kacirilan bir sorudan daha kotudur.
   */
  function kaydetTaslagi(): { hareketler: SablonTaslakHareketi[]; sapma: boolean } | null {
    if (oturum!.progress.length === 0) {
      return null;
    }
    if (oturum!.templateId === null) {
      return { hareketler: oturumdanSablonHareketleri(oturum!.progress), sapma: false };
    }
    if (!sablon || !sablondaOlmayanHareketVarMi(oturum!.progress, sablon.exercises)) {
      return null;
    }
    return { hareketler: oturumdanSablonHareketleri(oturum!.progress), sapma: true };
  }

  function bitir(secilen: Zorluk | null) {
    const taslak = kaydetTaslagi();
    bitirMutasyonu.mutate(
      { sessionId: oturum!.id, zorluk: secilen },
      {
        onSuccess: () => {
          if (taslak) {
            setKaydetSorusu(taslak);
          } else {
            navigate('/', { replace: true });
          }
        },
      },
    );
  }

  return (
    // 8rem = ust baslik + alt sekme cubugu (AntrenmanPage ile ayni hesap): sayfa ekrani doldurur, kadran
    // soru ile dugmeler arasindaki boslugun ortasinda, dugmeler en altta durur -- mobil ekranla ayni.
    <div className="flex min-h-[calc(100dvh-8rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col items-center gap-6 pt-6 pb-4">
      <p className="text-center text-body text-muted">{t('antrenman.bitirmeSorusu')}</p>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
        <ZorlukKadrani deger={zorluk} onDegis={setZorluk} />

        {bitirMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            {t('antrenman.bitirilemedi')}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <BirincilDugme yukseklik="buyuk" disabled={bitirMutasyonu.isPending} onClick={() => bitir(zorluk)}>
          {t('antrenman.bitir')}
        </BirincilDugme>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} disabled={bitirMutasyonu.isPending} className={METIN_EYLEMI}>
            {t('ortak.devamEt')}
          </button>
          <button type="button" onClick={() => bitir(null)} disabled={bitirMutasyonu.isPending} className={METIN_EYLEMI}>
            {t('ortak.atla')}
          </button>
        </div>
      </div>
    </div>
  );
}
