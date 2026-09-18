import { useEffect, useState } from 'react';
import { View, Text, Pressable, Vibration } from 'react-native';
import { Timer } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  bittiMi,
  EK_SURE_SN,
  gecenOran,
  kalanMs,
  kalanSureMetni,
  sureEkle,
  type Dinlenme,
} from '@grind/shared/lib/dinlenme';
import { ikonRenk } from '../ui/renkler';

const BITTI_GORUNME_MS = 3000;
const KEEP_AWAKE_ETIKETI = 'dinlenme-sayaci';

interface Props {
  dinlenme: Dinlenme | null;
  onDegis: (dinlenme: Dinlenme | null) => void;
}

/**
 * web/src/components/DinlenmeSayaci.tsx ile ayni mantik (spec Karar 6). Web Audio yerine
 * expo-audio ile GERCEK bir bip sesi (880Hz, web'deki `bipCal()` ile ayni ton -- bkz.
 * assets/sounds/dinlenme-bitti.wav) ve Wake Lock yerine expo-keep-awake ile ekran acik tutma
 * eklendi (Faz 3 cilalama). Titresim RN'in yerlesik `Vibration` API'siyle.
 */
export default function DinlenmeSayaci({ dinlenme, onDegis }: Props) {
  const [simdi, setSimdi] = useState(() => Date.now());
  const etkinSimdi = dinlenme ? Math.max(simdi, dinlenme.bitisMs - dinlenme.toplamMs) : simdi;
  const bitti = dinlenme !== null && bittiMi(dinlenme, etkinSimdi);
  const calisiyor = dinlenme !== null && !bitti;
  const bipCalar = useAudioPlayer(require('../../assets/sounds/dinlenme-bitti.wav'));

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [calisiyor]);

  useEffect(() => {
    if (!bitti) {
      return;
    }
    Vibration.vibrate(400);
    void bipCalar.seekTo(0).then(() => bipCalar.play());
    const zamanlayici = setTimeout(() => onDegis(null), BITTI_GORUNME_MS);
    return () => clearTimeout(zamanlayici);
  }, [bitti, onDegis, bipCalar]);

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    void activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_ETIKETI);
    };
  }, [calisiyor]);

  if (!dinlenme) {
    return null;
  }

  return (
    <View className="flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Timer color={ikonRenk.muted} size={18} />
          {bitti ? (
            <Text className="text-body-lg font-semibold text-fg">Dinlenme bitti</Text>
          ) : (
            <>
              <Text className="text-label text-muted uppercase">Dinlenme</Text>
              <Text className="text-metric text-fg">{kalanSureMetni(kalanMs(dinlenme, etkinSimdi))}</Text>
            </>
          )}
        </View>
        {!bitti && (
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => onDegis(sureEkle(dinlenme, EK_SURE_SN))}
              className="h-11 items-center justify-center rounded-lg bg-surface-3 px-3"
            >
              <Text className="text-label text-fg">+15 sn</Text>
            </Pressable>
            <Pressable onPress={() => onDegis(null)} className="h-11 items-center justify-center rounded-lg bg-surface-3 px-3">
              <Text className="text-label text-fg">Atla</Text>
            </Pressable>
          </View>
        )}
      </View>
      {!bitti && (
        <View className="h-1 w-full overflow-hidden rounded-full bg-surface-4">
          <View style={{ width: `${gecenOran(dinlenme, etkinSimdi) * 100}%` }} className="h-full bg-fg" />
        </View>
      )}
    </View>
  );
}
