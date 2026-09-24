import { View } from 'react-native';
import { Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { History, Lock, Trophy } from 'lucide-react-native';
import { useKullaniciProfili, type KullaniciProfili } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../../../../../src/auth/AuthContext';
import BosDurum from '../../../../../src/ui/BosDurum';
import HataKutusu from '../../../../../src/ui/HataKutusu';
import Rozet from '../../../../../src/ui/Rozet';
import ProfilBasligi from '../../../../../src/components/ProfilBasligi';
import ProfilSekmeleri from '../../../../../src/components/ProfilSekmeleri';
import TakipDugmesi from '../../../../../src/components/TakipDugmesi';

const LISTE_EKRANLARI = ['friends', 'followers', 'following'];

/**
 * Başlık + (arkadaşsa) sekmeler ya da boş durum. Sayfa başlığını da BU bildirir: üst düzende bildirilse
 * efekt sırası gereği (önce çocuk, sonra ebeveyn) takip listesinin kendi başlığını ezerdi.
 */
function BaskasininBasligi({ ad, profil }: { ad: string; profil: UseQueryResult<KullaniciProfili> }) {
  const { t } = useTranslation();
  usePageTitle(ad);

  if (profil.isError) {
    return (
      <View className="px-4 pt-2">
        <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />
      </View>
    );
  }
  if (!profil.data) {
    return <View className="min-h-40" />;
  }

  const arkadas = profil.data.relation === 'Friends';
  const kok = `/profile/u/${ad}`;
  return (
    <>
      <ProfilBasligi
        kisi={profil.data}
        sayaclar={profil.data}
        adYani={arkadas && <Rozet ton="acik">{t('takip.arkadas')}</Rozet>}
      >
        <TakipDugmesi kullaniciAdi={profil.data.username} iliski={profil.data.relation} />
      </ProfilBasligi>
      {arkadas ? (
        <ProfilSekmeleri
          sekmeler={[
            { to: `${kok}/history`, etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
            { to: `${kok}/records`, etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
          ]}
        />
      ) : (
        <BosDurum ikon={Lock} baslik={t('takip.arkadasDegil')} />
      )}
    </>
  );
}

/**
 * web/src/pages/KullaniciProfiliPage.tsx ile ayni (#284): baskasinin profili. Arkadassa Gecmis + Rekorlar
 * salt-okunur sekmeler, degilse bos durum -- alt ekran (Slot) cizilmez, antrenman ucuna istek gitmez.
 * Takip listeleri bu klasorde durur ama baslik/sekme cizilmez. Kendi adina gelinirse `index.tsx` `/profile`'a
 * yonlendirir -- BURADA degil: `push` sirasinda ilk render'da `usePathname` henuz eski yolu verir, kendi
 * listene giderken burada yonlendirmek navigasyonla sonsuz dongu kuruyordu. `Slot` ust duzendeki gibi hep
 * ayni konumda cizilir (bkz. `profile/_layout.tsx`).
 */
export default function KullaniciProfiliLayout() {
  const pathname = usePathname();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  const { username: ben } = useAuth();
  const kendisi = ben !== null && ad.toLowerCase() === ben.toLowerCase();
  const listeEkrani = LISTE_EKRANLARI.some((liste) => pathname.endsWith(`/${liste}`));
  const profilEkrani = !listeEkrani && !kendisi;
  const profil = useKullaniciProfili(profilEkrani ? ad : null);
  const slotGorunur = !profilEkrani || profil.data?.relation === 'Friends';

  return (
    <View className="flex-1">
      {profilEkrani && <BaskasininBasligi ad={ad} profil={profil} />}
      <View className="flex-1">{slotGorunur && <Slot />}</View>
    </View>
  );
}
