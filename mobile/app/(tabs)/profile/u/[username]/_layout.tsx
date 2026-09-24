import { View, Text } from 'react-native';
import { Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { History, Trophy } from 'lucide-react-native';
import { useKullaniciProfili, type KullaniciProfili } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../../../../../src/auth/AuthContext';
import HataKutusu from '../../../../../src/ui/HataKutusu';
import Rozet from '../../../../../src/ui/Rozet';
import ProfilBasligi from '../../../../../src/components/ProfilBasligi';
import ProfilSekmeleri from '../../../../../src/components/ProfilSekmeleri';
import TakipDugmesi from '../../../../../src/components/TakipDugmesi';

const LISTE_EKRANLARI = ['friends', 'followers', 'following'];

/**
 * Başlık + sekmeler. Sayfa başlığını da BU bildirir: üst düzende bildirilse efekt sırası gereği (önce
 * çocuk, sonra ebeveyn) takip listesinin kendi başlığını ezerdi.
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
  const gizli = profil.data.privacyLevel === 'Gizli';
  const kok = `/profile/u/${ad}`;
  const sekmeler = (
    [
      { to: `${kok}/history`, etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
      { to: `${kok}/records`, etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
    ] as const
  ).filter((s) => !gizli || s.to.endsWith('/records'));

  return (
    <>
      <ProfilBasligi
        kisi={profil.data}
        sayaclar={profil.data}
        adYani={arkadas && <Rozet ton="acik">{t('takip.arkadas')}</Rozet>}
      >
        <TakipDugmesi kullaniciAdi={profil.data.username} iliski={profil.data.relation} />
      </ProfilBasligi>
      <ProfilSekmeleri sekmeler={sekmeler} />
      {gizli && (
        <Text className="px-4 text-label text-muted">{t('takip.gizliHesapGecmisi')}</Text>
      )}
    </>
  );
}

/**
 * web/src/pages/KullaniciProfiliPage.tsx ile ayni (#284, #294): baskasinin profili. Kapi artik
 * arkadaslik degil hedefin gizlilik seviyesi -- Gizli'de yalniz Rekorlar sekmesi cizilir; hangi
 * sekmeye yonlendirilecegine `index.tsx` karar verir (bkz. orada). Takip listeleri bu klasorde
 * durur ama baslik/sekme cizilmez. Kendi adina gelinirse `index.tsx` `/profile`'a yonlendirir --
 * BURADA degil: `push` sirasinda ilk render'da `usePathname` henuz eski yolu verir, kendi listene
 * giderken burada yonlendirmek navigasyonla sonsuz dongu kuruyordu. `Slot` ust duzendeki gibi hep
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
  // Veri gelmeden Slot cizilmez: aksi halde `index.tsx` -- gizlilik seviyesini henuz bilmeden --
  // varsayilan olarak Gecmis'e yonlendirip gereksiz bir istek atardi (#294). `index.tsx` ayni
  // sorgu anahtarini kullandigi icin veri onbellekten gelir, ikinci bir istek atmaz.
  const slotBekliyor = profilEkrani && !profil.isError && !profil.data;

  return (
    <View className="flex-1">
      {profilEkrani && <BaskasininBasligi ad={ad} profil={profil} />}
      <View className="flex-1">{slotBekliyor ? null : <Slot />}</View>
    </View>
  );
}
