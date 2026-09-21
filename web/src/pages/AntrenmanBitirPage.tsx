import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinishSession, useOpenSession, type Zorluk } from '../api/queries';
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
 */
export default function AntrenmanBitirPage() {
  const { t } = useTranslation();
  usePageTitle(t('antrenman.nasilGecti'));
  const navigate = useNavigate();
  const { data: oturum, isLoading, isError } = useOpenSession();
  const bitirMutasyonu = useFinishSession();
  const [zorluk, setZorluk] = useState<Zorluk>(VARSAYILAN_ZORLUK);

  if (isLoading) {
    return <p className="pt-2 text-body text-muted">{t('ortak.yukleniyor')}</p>;
  }

  // Kapatilacak antrenman yok (dogrudan acildi ya da baska yerde kapandi): bos bir kadran
  // gostermek yerine antrenman sayfasina donulur.
  if (isError || !oturum) {
    return <Navigate to="/antrenman" replace />;
  }

  function bitir(secilen: Zorluk | null) {
    bitirMutasyonu.mutate(
      { sessionId: oturum!.id, zorluk: secilen },
      { onSuccess: () => navigate('/', { replace: true }) },
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
