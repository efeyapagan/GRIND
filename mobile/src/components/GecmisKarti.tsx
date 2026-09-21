import { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CalendarDays, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { GecmisOturum } from '@grind/shared/api/queries';
import { formatTarih, formatWeight } from '@grind/shared/lib/format';
import { kalanSureMetni } from '@grind/shared/lib/dinlenme';
import SetList from './SetList';
import IkincilDugme from '../ui/IkincilDugme';
import TurEtiketi from '../ui/TurEtiketi';
import KaydirilabilirSatir, { type KaydirilabilirSatirRef } from '../ui/KaydirilabilirSatir';
import { ikonRenk } from '../ui/renkler';

interface Props {
  oturum: GecmisOturum;
  onSil: () => void;
}

/**
 * Gecmis listesindeki tek antrenman karti (issue #46). Sola kaydirinca arkasindaki "Sil" cikar
 * (Faz 3 cilalama, KaydirilabilirSatir); acilinca icinde gorunen "Antrenmanı sil" dugmesi web'deki
 * gibi HALA durur -- kaydirma ikincil bir kisayoldur, birincil yol degil.
 */
export default function GecmisKarti({ oturum, onSil }: Props) {
  const dil = useDil();
  const [acik, setAcik] = useState(false);
  const [onayAcik, setOnayAcik] = useState(false);
  const kaydirmaRef = useRef<KaydirilabilirSatirRef>(null);
  const bos = oturum.setCount === 0;

  function onayiAc() {
    kaydirmaRef.current?.kapat();
    setOnayAcik(true);
  }

  if (onayAcik) {
    return (
      <View className="overflow-hidden rounded-xl bg-surface-2 p-4">
        <View className="flex-col gap-3">
          <Text className="text-body text-fg">
            {formatTarih(oturum.startedAt, dil)} tarihli antrenman ve {oturum.setCount} seti silinecek.
            Bu hareketlerin rekorları yeniden hesaplanır.
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={onSil} className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg">
              <Text className="text-label text-on-danger-bg">Evet, sil</Text>
            </Pressable>
            <View className="flex-1">
              <IkincilDugme onPress={() => setOnayAcik(false)}>Vazgeç</IkincilDugme>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KaydirilabilirSatir ref={kaydirmaRef} onSil={onayiAc} silEtiketi="Antrenmanı sil">
      <View className="bg-surface-2">
        <Pressable
          onPress={() => setAcik((a) => !a)}
          className={`flex-row items-center justify-between gap-4 p-4 ${acik ? 'bg-surface-3' : ''}`}
        >
          <View className="min-w-0 flex-1 flex-col gap-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="flex-row items-center gap-1">
                <CalendarDays color={ikonRenk.muted} size={18} />
                <Text className="text-label text-fg">{formatTarih(oturum.startedAt, dil)}</Text>
              </View>
              <TurEtiketi>{oturum.templateName ?? 'Serbest'}</TurEtiketi>
            </View>
            <View className="flex-row flex-wrap items-baseline gap-4">
              <View className="flex-row items-baseline gap-1">
                <Text className={`text-metric ${bos ? 'text-muted' : 'text-fg'}`}>{oturum.setCount}</Text>
                <Text className="text-label-xs text-muted uppercase">set</Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className={`text-metric ${bos ? 'text-muted' : 'text-fg'}`}>
                  {formatWeight(oturum.totalVolume, dil)}
                </Text>
                <Text className="text-label-xs text-muted uppercase">kg</Text>
              </View>
              {oturum.medianRestSeconds !== null && (
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-metric text-fg">{kalanSureMetni(oturum.medianRestSeconds * 1000)}</Text>
                  <Text className="text-label-xs text-muted uppercase">dinlenme</Text>
                </View>
              )}
            </View>
          </View>
          <View className="size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3">
            {acik ? <ChevronUp color={ikonRenk.fg} size={20} /> : <ChevronDown color={ikonRenk.muted} size={20} />}
          </View>
        </Pressable>
        {acik && (
          <View className="flex-col gap-3 p-4">
            <SetList varyant="gecmis" sets={oturum.sets} bosDurumMetni="Bu antrenmanda set yok." />
            <Pressable onPress={onayiAc} className="h-12 flex-row items-center justify-center gap-2 rounded-xl">
              <Trash2 color={ikonRenk.danger} size={18} />
              <Text className="text-label text-danger">Antrenmanı sil</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KaydirilabilirSatir>
  );
}
