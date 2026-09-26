import { Pressable, View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { History, Pencil, Ruler, Trophy } from 'lucide-react-native';
import { useKullaniciProfili, useProfilim } from '@grind/shared/api/queries';
import { useAuth } from '../../../src/auth/AuthContext';
import HataKutusu from '../../../src/ui/HataKutusu';
import { useIkonRenk } from '../../../src/ui/renkler';
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
 * Arama ikonu da (#293 devami) `adYani`'dan kalkip ust kabuga tasindi -- burada artik verilmiyor.
 */
function KendiProfilBasligi() {
  const ikonRenk = useIkonRenk();
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
          className="size-6 items-center justify-center"
        >
          <Pencil color={ikonRenk.muted} size={16} />
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
 *
 * #293 (devami): web/src/pages/ProfileLayout.tsx ile ayni gerekce -- ust bar kalkinca boslugu
 * `gap-6` devraldi, baslik ile sekmeler ve sekmelerle icerik arasina esit dagitir.
 */
export default function ProfileLayout() {
  const pathname = usePathname();
  const sekmeEkrani = SEKMELER.some(({ to }) => to === pathname);

  return (
    <View className="flex-1 flex-col gap-6">
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
