import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOpenSession } from '@grind/shared/api/queries';
import { useGecenSure } from '@grind/shared/useGecenSure';

/**
 * Ust barin sag ucu (#480). Acik antrenman YOKKEN bugunku hali: "GRIND" yazisi. Acik antrenman
 * VARKEN yerini antrenmanin gecen suresi alir (yesil nokta + sayac) ve dokununca antrenman
 * ekranina doner -- kullanici karari: "GRIND yazisi kalksin ve orada sure yazsin". Boylece hangi
 * ekranda olursa olsun kullanici antrenmaninin surdugunu gorur ve tek dokunusla geri doner.
 *
 * Sure barin ORTASINA konmadi: orasi dinlenme sayacinin yeri (`DinlenmeGostergesi`) ve ikisi ayni
 * anda gorunebilir -- ayri uclarda durduklarinda birbirlerinin uzerine binmezler.
 *
 * Yukseklik bari BUYUTMEZ (`py-1`, bar yuksekligi GRIND yazisiyla ayni kalir); dokunma alani
 * `hitSlop` ile buyutulur.
 */
export default function BarSagUcu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: oturum } = useOpenSession();
  const acikOturum = oturum?.isOpen ? oturum : null;
  const sure = useGecenSure(acikOturum?.startedAt ?? null);

  if (!acikOturum || sure === null) {
    return <Text className="shrink-0 text-label text-muted uppercase">GRIND</Text>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('antrenman.sureyeDon', { sure })}
      onPress={() => router.navigate('/antrenman')}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1"
    >
      <View className="size-2 rounded-full bg-success" />
      <Text className="text-body text-fg">{sure}</Text>
    </Pressable>
  );
}
