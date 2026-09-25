import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Search, UserRoundSearch } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useKullaniciAra } from '@grind/shared/api/queries';
import { ARAMA_GECIKMESI_MS } from '@grind/shared/lib/takip';
import { usePageTitle } from '@grind/shared/pageTitle';
import Alan from '../../../src/ui/Alan';
import BosDurum from '../../../src/ui/BosDurum';
import KullaniciSatiri from '../../../src/components/KullaniciSatiri';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/** web/src/pages/KullaniciAraPage.tsx ile ayni (#284): yazma durunca sunucuda aranir, satir profile goturur. */
export default function KullaniciAraScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  usePageTitle(t('takip.kullaniciAra'));
  const [yazilan, setYazilan] = useState('');
  const [sorgu, setSorgu] = useState('');
  useEffect(() => {
    const zamanlayici = setTimeout(() => setSorgu(yazilan.trim()), ARAMA_GECIKMESI_MS);
    return () => clearTimeout(zamanlayici);
  }, [yazilan]);
  const { data, isError } = useKullaniciAra(sorgu);

  return (
    <FlatList
      data={sorgu ? (data ?? []) : []}
      keyExtractor={(kisi) => kisi.username}
      renderItem={({ item }) => <KullaniciSatiri kisi={item} />}
      ItemSeparatorComponent={() => <View className="h-2" />}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="px-4 pt-2"
      contentContainerStyle={{ paddingBottom: altMenuPayi }}
      ListHeaderComponent={
        <View className="mb-4 flex-col gap-4">
          <Alan
            id="kullanici-ara"
            etiket={t('takip.kullaniciAra')}
            ikon={Search}
            placeholder={t('takip.aramaIpucu')}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            value={yazilan}
            onChangeText={setYazilan}
          />
          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              {t('takip.aramaYapilamadi')}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        sorgu && data ? <BosDurum ikon={UserRoundSearch} baslik={t('takip.kullaniciBulunamadi')} /> : null
      }
    />
  );
}
