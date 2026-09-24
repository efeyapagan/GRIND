import { Pressable, View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { History, Pencil, Ruler, Search, Trophy } from 'lucide-react-native';
import { useKullaniciProfili, useProfilim } from '@grind/shared/api/queries';
import { useAuth } from '../../../src/auth/AuthContext';
import HataKutusu from '../../../src/ui/HataKutusu';
import { ikonRenk } from '../../../src/ui/renkler';
import ProfilBasligi from '../../../src/components/ProfilBasligi';
import ProfilSekmeleri, { type ProfilSekmesi } from '../../../src/components/ProfilSekmeleri';

const SEKMELER: readonly ProfilSekmesi[] = [
  { to: '/profile/history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
  { to: '/profile/records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
  { to: '/profile/measurements', etiketAnahtari: 'kabuk.sekmeOlcumler', ikon: Ruler },
];

/**
 * Kendi profil başlığın (#283, düzeni #293'te değişti): ad, yaş ve fotoğraf `useProfilim`'den, sayaçlar
 * sunucudan (#281). "Hesap ayarları" ve "Profili düzenle" düğmeleri kalktı (#293): duzenle artik isim
 * satirinin sonundaki kalem, hesap ayarlarina erisim ust kabuktaki kisayoldan (bkz. `KabukBaslik.tsx`).
 */
function KendiProfilBasligi() {
  const { t } = useTranslation();
  const router = useRouter();
  const { username } = useAuth();
  const profil = useProfilim();
  const sayaclar = useKullaniciProfili(username);

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

  return (
    <ProfilBasligi
      kisi={profil.data}
      sayaclar={sayaclar.data}
      duzenle={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ortak.profiliDuzenle')}
          onPress={() => router.push('/profile/edit')}
          className="ml-auto size-9 items-center justify-center rounded-lg bg-surface-3"
        >
          <Pencil color={ikonRenk.muted} size={16} />
        </Pressable>
      }
      adYani={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('takip.kullaniciAra')}
          onPress={() => router.push('/profile/search')}
          className="size-9 items-center justify-center rounded-lg bg-surface-3"
        >
          <Search color={ikonRenk.muted} size={18} />
        </Pressable>
      }
    />
  );
}

/**
 * web/src/pages/ProfileLayout.tsx ile ayni (#283): Instagram tarzi baslik ve yalnizca ikonlu sekmeler
 * (Gecmis · Rekorlar · Olculer). Hesap ayarlari (`account`), Profili duzenle (`edit`), kullanici arama
 * (`search`) ve baskasinin profili (`u/[username]`, #284) bu klasorde durur ama sekme degildir -- onlarda
 * baslik ve sekme cubugu cizilmez. Dosyalar tasinmadi: adresler (`/profile/account`) degismesin.
 *
 * `Slot` HER ZAMAN ayni konumda cizilir: sekme disi ekranda agacin baska bir yerine konunca ic navigator
 * yeniden kuruluyor, `u/[username]`'e gecerken eski yolun parcasi parametre saniliyordu
 * (`/users/history/history`, #284).
 */
export default function ProfileLayout() {
  const pathname = usePathname();
  const sekmeEkrani = SEKMELER.some(({ to }) => to === pathname);

  return (
    <View className="flex-1">
      {sekmeEkrani && (
        <>
          <KendiProfilBasligi />
          <ProfilSekmeleri sekmeler={SEKMELER} />
        </>
      )}
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}
