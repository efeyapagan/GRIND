import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronsUpDown, Check } from 'lucide-react-native';
import Modal from './Modal';
import { ikonRenk } from './renkler';

interface Secenek<T> {
  deger: T;
  etiket: string;
}

interface Props<T> {
  baslik: string;
  secenekler: Secenek<T>[];
  deger: T;
  onDegistir: (deger: T) => void;
  disabled?: boolean;
}

/**
 * Web'in yerel `<select>`inin RN karsiligi (RN'de native select yok). Kapali kutu secili degeri
 * gosterir, dokununca Modal icinde secenek listesi acilir -- HaftalikHedefSecici ve
 * SablonFormu'nun dinlenme seciminde ortak (DRY).
 */
export default function SecimKutusu<T extends string | number>({
  baslik,
  secenekler,
  deger,
  onDegistir,
  disabled,
}: Props<T>) {
  const [acik, setAcik] = useState(false);
  const seciliEtiket = secenekler.find((s) => s.deger === deger)?.etiket ?? '';

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setAcik(true)}
        className={`h-12 w-full flex-row items-center justify-between rounded-lg bg-inset px-4 ${disabled ? 'opacity-60' : ''}`}
      >
        <Text className="text-body-lg text-fg">{seciliEtiket}</Text>
        <ChevronsUpDown color={ikonRenk.muted} size={20} />
      </Pressable>

      <Modal acik={acik} onKapat={() => setAcik(false)} baslik={baslik}>
        <View className="flex-col gap-1">
          {secenekler.map((secenek) => (
            <Pressable
              key={String(secenek.deger)}
              onPress={() => {
                onDegistir(secenek.deger);
                setAcik(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: secenek.deger === deger }}
              className="h-12 flex-row items-center justify-between rounded-lg px-2"
            >
              <Text className="text-body-lg text-fg">{secenek.etiket}</Text>
              {secenek.deger === deger && <Check color={ikonRenk.accent} size={20} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}
