import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useHeaderTitle } from '@grind/shared/pageTitle';
import { altEkranMi, geriHedefi } from '@grind/shared/lib/geriKaydirma';
import { ikonRenk } from './renkler';

/**
 * App.tsx'teki `<header>`in RN karsiligi: solda o an aktif ekranin basligi, sagda "GRIND".
 * Baslik `usePageTitle` ile PageTitleProvider'a bildirilir (@grind/shared/pageTitle) -- her
 * ekran kendi govdesinde ayrica bir baslik yazmaz (web ile ayni tek dogruluk kaynagi).
 *
 * Issue #255: kaydirmaya (#232, `_layout.tsx`daki `GeriKaydirilabilirIcerik`) EK, tutarli bir
 * geri dugmesi -- kok sekmeler ve Profil'in kendi alt sekmeleri DISINDAKI her ekranda (`altEkranMi`).
 * Daha once her alt ekran kendi ad-hoc "ChevronLeft + metin" baglantisini tekrarliyordu.
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
