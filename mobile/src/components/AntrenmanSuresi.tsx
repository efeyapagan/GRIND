import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { saatDakika } from '@grind/shared/lib/format';

/**
 * Gecmis kartindaki antrenman suresi (#246), web'dekinin aynisi: buyuk rakam + kucuk birim.
 * Bir saatin altinda yalnizca dakika ("58 dk"), ustunde "1 sa 12 dk". Sure sunucudan gelir.
 */
export default function AntrenmanSuresi({ saniye }: { saniye: number }) {
  const { t } = useTranslation();
  const { saat, dakika } = saatDakika(saniye);

  return (
    <View className="flex-row items-baseline gap-1">
      {saat > 0 && (
        <>
          <Text className="text-metric text-fg">{saat}</Text>
          <Text className="text-label-xs text-muted uppercase">{t('gecmis.saatBirimi')}</Text>
        </>
      )}
      <Text className="text-metric text-fg">{dakika}</Text>
      <Text className="text-label-xs text-muted uppercase">{t('gecmis.dakikaBirimi')}</Text>
    </View>
  );
}
