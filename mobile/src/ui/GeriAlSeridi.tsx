import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { ikonRenk } from './renkler';

interface Props {
  mesaj: string;
  sureMs: number;
  onGeriAl: () => void;
  onSureDoldu: () => void;
}

/**
 * Silmeden sonra kisa sureligine cikan "Geri al" seridi (issue #46). Web'de sekme cubugunun
 * ustune SABIT (fixed) tasar; RN'de sadelik icin sayfa icerigine gomulu render edilir (kaydirinca
 * onunla birlikte hareket eder) -- islevsel olarak birebir ayni (sure dolunca kendini kaldirir).
 */
export default function GeriAlSeridi({ mesaj, sureMs, onGeriAl, onSureDoldu }: Props) {
  const [bitisMs] = useState(() => Date.now() + sureMs);
  const [simdi, setSimdi] = useState(() => Date.now());
  const kalanMs = Math.max(0, bitisMs - simdi);

  useEffect(() => {
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 100);
    return () => clearInterval(zamanlayici);
  }, [bitisMs]);

  useEffect(() => {
    if (kalanMs === 0) {
      onSureDoldu();
    }
  }, [kalanMs, onSureDoldu]);

  const oran = Math.min(1, Math.max(0, kalanMs / sureMs));

  return (
    <View accessibilityRole="alert" className="flex-col gap-2 rounded-xl bg-surface-4 p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-label text-fg">{mesaj}</Text>
        <Pressable
          onPress={onGeriAl}
          className="min-h-11 shrink-0 flex-row items-center gap-1.5 rounded-lg px-3"
        >
          <Undo2 color={ikonRenk.accent} size={18} />
          <Text className="text-label text-accent">Geri al</Text>
        </Pressable>
      </View>
      <View className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <View style={{ width: `${oran * 100}%` }} className="h-full bg-accent" />
      </View>
    </View>
  );
}
