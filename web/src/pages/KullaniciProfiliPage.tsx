import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { History, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useKullaniciProfili } from '../api/queries';
import { usePageTitle } from '../ui/PageTitleContext';
import HataKutusu from '../ui/HataKutusu';
import Rozet from '../ui/Rozet';
import ProfilBasligi from '../components/ProfilBasligi';
import ProfilSekmeleri, { type ProfilSekmesi } from '../components/ProfilSekmeleri';
import TakipDugmesi from '../components/TakipDugmesi';

const SEKMELER: readonly ProfilSekmesi[] = [
  { to: 'history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
  { to: 'records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
];

/**
 * Başkasının profili (#284): kendi profilindeki başlığın aynısı, "Profili düzenle" yerine takip düğmesi.
 * Kapı artık arkadaşlık değil hedefin gizlilik seviyesi (#294): Gizli'de yalnızca Rekorlar sekmesi
 * çizilir, Geçmiş linki hiç görünmez (gerçek kısıtlama sunucuda; burada yalnızca arayüz önceden
 * doğru çizilir). Ölçüler başkasında yoktur. Kendi kullanıcı adına gelinirse kendi profiline
 * yönlendirilir.
 */
export default function KullaniciProfiliPage() {
  const { t } = useTranslation();
  const { username: ad = '' } = useParams();
  const { username: ben } = useAuth();
  const konum = useLocation();
  const kendisi = ben !== null && ad.toLowerCase() === ben.toLowerCase();
  const profil = useKullaniciProfili(kendisi ? null : ad);
  usePageTitle(ad);

  if (kendisi) {
    return <Navigate to="/profile" replace />;
  }
  if (profil.isError) {
    return <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />;
  }
  if (!profil.data) {
    return <div className="min-h-40" />;
  }

  const arkadas = profil.data.relation === 'Friends';
  const gizli = profil.data.privacyLevel === 'Gizli';
  const sekmeler = gizli ? SEKMELER.filter((s) => s.to === 'records') : SEKMELER;

  return (
    <div className="flex flex-col gap-4">
      <ProfilBasligi
        kisi={profil.data}
        sayaclar={profil.data}
        adYani={arkadas && <Rozet ton="acik">{t('takip.arkadas')}</Rozet>}
      >
        <TakipDugmesi kullaniciAdi={profil.data.username} iliski={profil.data.relation} />
      </ProfilBasligi>
      <ProfilSekmeleri sekmeler={sekmeler} />
      {gizli && <p className="text-label text-muted">{t('takip.gizliHesapGecmisi')}</p>}
      {gizli && konum.pathname.endsWith('/history') ? (
        <Navigate to={`/u/${ad}/records`} replace />
      ) : (
        <Outlet />
      )}
    </div>
  );
}
