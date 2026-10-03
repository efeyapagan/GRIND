import { Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCevrimdisi } from './BaglantiSaglayici';

/** Seridin durum cubugunun altinda kalan yuksekligi. */
const SERIT_YUKSEKLIGI = 22;

/**
 * #174 (kullanici karari): ekranin ustunde kirmizi bir seritte yalnizca "Cevrimdisi".
 *
 * Serit ekranlarin ustune bindirilmez (basliklari orterdi): cevrimdisiyken cocuklara bildirilen ust
 * guvenli alan serit kadar buyutulur, guvenli alana gore yerlesen her ekran kendiliginden asagi kayar.
 */
export default function CevrimdisiSeridi({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const cevrimdisi = useCevrimdisi();

  return (
    <View className="flex-1">
      <SafeAreaInsetsContext.Provider
        value={cevrimdisi ? { ...insets, top: insets.top + SERIT_YUKSEKLIGI } : insets}
      >
        {children}
      </SafeAreaInsetsContext.Provider>
      {cevrimdisi && (
        <View
          testID="cevrimdisi-seridi"
          accessibilityRole="alert"
          pointerEvents="none"
          className="absolute inset-x-0 top-0 items-center justify-end bg-danger-bg"
          style={{ height: insets.top + SERIT_YUKSEKLIGI }}
        >
          <Text className="pb-0.5 text-label font-semibold text-on-danger-bg">{t('ortak.cevrimdisi')}</Text>
        </View>
      )}
    </View>
  );
}
