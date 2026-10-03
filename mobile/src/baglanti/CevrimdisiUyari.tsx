import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import CamKart from '../ui/CamKart';
import { useIkonRenk } from '../ui/renkler';

/**
 * #174: onbellekten gosterilmeyen bolumler (arkadaslar, rekorlar, olculer, ilerleme, arama, baskasinin
 * profili, GRINDY) cevrimdisiyken icerik yerine bunu cizer ve sunucuya istek atmaz.
 */
export default function CevrimdisiUyari() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  return (
    <CamKart testID="cevrimdisi-uyari" className="flex-row items-center gap-3 p-4">
      <WifiOff color={ikonRenk.muted} size={22} />
      <View className="min-w-0 flex-1 flex-col">
        <Text className="text-label font-bold text-fg">{t('ortak.internetBaglan')}</Text>
        <Text className="text-body text-muted">{t('ortak.internetGerekiyor')}</Text>
      </View>
    </CamKart>
  );
}
