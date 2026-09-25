import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useGunGecmisi } from '../api/queries';
import { gunBasligi } from '../lib/takvim';
import GecmisKarti from '../components/GecmisKarti';
import { usePageTitle } from '../ui/PageTitleContext';

/**
 * Takvimde bir gune dokununca acilan gun detayi (#261, #315). Takvimin altindaki tek satirlik ozet
 * ("14 Eylül · Push Day · 18 set") yerini bu ekrana birakti: o gunun her antrenmani, gecmisteki
 * KARTIN AYNISIYLA (`GecmisKarti`) gosterilir -- ozet ustte, sag kosedeki ok ile acilinca hangi
 * harekette kac set ve her setin agirlik/tekrar/RIR'i.
 *
 * Kart SALT-OKUNURDUR (`onSil` verilmez): takvimden gelen bir bakis ekraninda silme yolu acmak,
 * yanlislikla veri kaybettirmenin kisa yoludur -- silme Gecmis sekmesinde kalir.
 */
export default function GunDetayPage() {
  const { t } = useTranslation();
  const dil = useDil();
  const { gun = '' } = useParams();
  usePageTitle(gunBasligi(gun, dil));
  const { data: oturumlar, isLoading, isError } = useGunGecmisi(gun);

  if (isLoading) {
    return <p className="pt-2 text-body text-muted">{t('ortak.yukleniyor')}</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="pt-2 text-body text-danger">
        {t('takvim.gunAlinamadi')}
      </p>
    );
  }
  if (!oturumlar || oturumlar.length === 0) {
    return <p className="pt-2 text-body text-muted">{t('takvim.gunBosDurum')}</p>;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {oturumlar.map((oturum) => (
        <GecmisKarti key={oturum.sessionId} oturum={oturum} />
      ))}
    </div>
  );
}
