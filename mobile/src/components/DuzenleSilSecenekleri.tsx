import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  duzenleEtiketi: string;
  silEtiketi: string;
  /** Sil'e basinca panel YERINDE bu mesajla onay sorar; `onSil` yalnizca "Evet, sil"de cagrilir. */
  silOnayMesaji: string;
  onDuzenle: () => void;
  onSil: () => void;
}

/**
 * Basili tutma menusunun Duzenle / Sil satirlari ve silmenin yerinde onayi (#439). Sablon menusu
 * (`SablonMenusu`) ile gecmisteki set menusu (`GecmisSetMenusu`, #564) ayni secenekleri kullanir;
 * cam yuzey ve konum cagiranin isidir.
 */
export default function DuzenleSilSecenekleri({ duzenleEtiketi, silEtiketi, silOnayMesaji, onDuzenle, onSil }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [silOnayi, setSilOnayi] = useState(false);

  if (silOnayi) {
    return (
      <View className="flex-col gap-3 p-4">
        <Text className="text-body text-fg">{silOnayMesaji}</Text>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={onSil}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg"
          >
            <Text className="text-label text-on-danger-bg">{t('ortak.evetSil')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSilOnayi(false)}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-surface-3"
          >
            <Text className="text-label text-fg">{t('ortak.vazgec')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-col p-2">
      <Pressable
        accessibilityRole="button"
        onPress={onDuzenle}
        className="h-13 flex-row items-center justify-between rounded-xl px-3"
      >
        <Text className="text-body-lg text-fg">{duzenleEtiketi}</Text>
        <Pencil color={ikonRenk.fg} size={20} />
      </Pressable>
      <View className="mx-3 h-px bg-surface-4" />
      <Pressable
        accessibilityRole="button"
        onPress={() => setSilOnayi(true)}
        className="h-13 flex-row items-center justify-between rounded-xl px-3"
      >
        <Text className="text-body-lg text-danger">{silEtiketi}</Text>
        <Trash2 color={ikonRenk.danger} size={20} />
      </Pressable>
    </View>
  );
}
