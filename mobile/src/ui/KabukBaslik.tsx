import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { ChevronLeft, Menu, Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useHeaderTitle } from '@grind/shared/pageTitle';
import { altEkranMi, geriHedefi, profilAnaEkraniMi } from '@grind/shared/lib/geriKaydirma';
import { ikonRenk } from './renkler';

/**
 * App.tsx'teki `<header>`in RN karsiligi: solda o an aktif ekranin basligi, sagda "GRIND".
 * Baslik `usePageTitle` ile PageTitleProvider'a bildirilir (@grind/shared/pageTitle) -- her
 * ekran kendi govdesinde ayrica bir baslik yazmaz (web ile ayni tek dogruluk kaynagi).
 *
 * Issue #255: kaydirmaya (#232, `_layout.tsx`daki `GeriKaydirilabilirIcerik`) EK, tutarli bir
 * geri dugmesi -- kok sekmeler ve Profil'in kendi alt sekmeleri DISINDAKI her ekranda (`altEkranMi`).
 * Daha once her alt ekran kendi ad-hoc "ChevronLeft + metin" baglantisini tekrarliyordu.
 *
 * #293 (devami): Profil'in kok ekranlarinda (Gecmis/Rekorlar/Olculer) bu bar TAMAMEN kalkar --
 * `profilAnaEkraniMi` -- yerine yalnizca arama + hesap ayarlari kisayollarini tasiyan ince, kisa bir
 * satir gelir; fotograf ve isim (ProfilBasligi) boylece guvenli alanin hemen altindan baslar.
 */
export default function KabukBaslik() {
  const baslik = useHeaderTitle();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  function geriGit() {
    const hedef = geriHedefi(pathname, router.canGoBack());
    if (hedef === 'geri') {
      router.back();
    } else if (hedef === 'anaSayfa') {
      router.replace('/');
    }
  }

  if (profilAnaEkraniMi(pathname)) {
    return (
      <View style={{ paddingTop: insets.top }} className="bg-bg">
        <View className="h-10 flex-row items-center justify-end gap-3 px-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('takip.kullaniciAra')}
            onPress={() => router.push('/profile/search')}
            className="size-8 shrink-0 items-center justify-center"
          >
            <Search color={ikonRenk.fg} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ortak.hesapAyarlari')}
            onPress={() => router.push('/profile/account')}
            className="size-8 shrink-0 items-center justify-center"
          >
            <Menu color={ikonRenk.fg} size={22} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="bg-bg">
      <View className="h-16 flex-row items-center gap-2 px-4">
        {altEkranMi(pathname) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('kabuk.geri')}
            onPress={geriGit}
            className="-ml-2 size-11 shrink-0 items-center justify-center"
          >
            <ChevronLeft color={ikonRenk.fg} size={22} />
          </Pressable>
        )}
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {baslik}
        </Text>
        <Text className="shrink-0 text-label text-muted uppercase">GRIND</Text>
      </View>
    </View>
  );
}
