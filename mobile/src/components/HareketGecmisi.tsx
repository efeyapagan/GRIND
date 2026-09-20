import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useExerciseProgress, type IlerlemeAraligi, type IlerlemeNoktasi } from '@grind/shared/api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '@grind/shared/lib/format';
import CizgiGrafik from '../ui/CizgiGrafik';
import SekmeDugmesi from '../ui/SekmeDugmesi';
import { ikonRenk } from '../ui/renkler';

type SekmeAnahtari = 'agirlik' | 'antrenman' | 'birTekrar';

interface Sekme {
  anahtar: SekmeAnahtari;
  etiket: string;
  ozetAdi: string;
  deger: (nokta: IlerlemeNoktasi) => number | null;
}

const SEKMELER: Sekme[] = [
  { anahtar: 'agirlik', etiket: 'Ağırlık', ozetAdi: 'ağırlık', deger: (nokta) => nokta.topWeight },
  { anahtar: 'antrenman', etiket: 'Antrenman', ozetAdi: 'antrenman hacmi', deger: (nokta) => nokta.volume },
  {
    anahtar: 'birTekrar',
    etiket: 'Tahmini 1RM',
    ozetAdi: 'tahmini 1RM',
    deger: (nokta) => nokta.estimatedOneRepMax,
  },
];

const ARALIKLAR: { anahtar: IlerlemeAraligi; etiket: string }[] = [
  { anahtar: '1a', etiket: '1 Ay' },
  { anahtar: '3a', etiket: '3 Ay' },
  { anahtar: 'tum', etiket: 'Tüm' },
];

interface Props {
  exerciseId: number;
  exerciseName: string;
}

/** web/src/components/HareketGecmisi.tsx ile ayni (#50): varsayilan KAPALI acilir bolum. */
export default function HareketGecmisi({ exerciseId, exerciseName }: Props) {
  const [acik, setAcik] = useState(false);

  return (
    <View className="pt-2">
      <Pressable
        onPress={() => setAcik((a) => !a)}
        className="min-h-11 flex-row items-center justify-between gap-2"
      >
        <Text className="text-label text-muted uppercase">Geçmiş</Text>
        {acik ? (
          <ChevronUp color={ikonRenk.muted} size={18} />
        ) : (
          <ChevronDown color={ikonRenk.muted} size={18} />
        )}
      </Pressable>
      {acik && <HareketGrafigi exerciseId={exerciseId} exerciseName={exerciseName} />}
    </View>
  );
}

function HareketGrafigi({ exerciseId, exerciseName }: Props) {
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>('agirlik');
  const [aralik, setAralik] = useState<IlerlemeAraligi>('1a');
  const { data: noktalar, isLoading, isError } = useExerciseProgress(exerciseId, aralik);
  const sekme = SEKMELER.find((aday) => aday.anahtar === sekmeAnahtari) ?? SEKMELER[0];

  let icerik: React.ReactNode;
  if (isLoading) {
    icerik = <Text className="text-body text-muted">Yükleniyor...</Text>;
  } else if (isError || !noktalar) {
    icerik = (
      <Text accessibilityRole="alert" className="text-body text-danger">
        Geçmiş alınamadı.
      </Text>
    );
  } else if (noktalar.length === 0) {
    icerik = (
      <Text className="text-body text-muted">
        {aralik === 'tum' ? 'Bu hareketin ilk antrenmanı' : 'Bu aralıkta kayıt yok'}
      </Text>
    );
  } else {
    const cizilecekler = noktalar.flatMap((nokta) => {
      const deger = sekme.deger(nokta);
      return deger === null ? [] : [{ nokta, deger }];
    });

    if (cizilecekler.length === 0) {
      icerik = (
        <Text className="text-body text-muted">
          Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set gerekir.
        </Text>
      );
    } else {
      const ilk = cizilecekler[0];
      const son = cizilecekler[cizilecekler.length - 1];
      icerik = (
        <>
          <View className="flex-row gap-8">
            <View className="flex-col gap-1">
              <Text className="text-label text-muted">Şu anki</Text>
              <Text className="text-metric text-fg">{formatWeight(son.deger)}</Text>
            </View>
            {cizilecekler.length > 1 && (
              <View className="flex-col gap-1">
                <Text className="text-label text-muted">Fark</Text>
                <Text className="text-metric text-fg">{formatFark(son.deger - ilk.deger)}</Text>
              </View>
            )}
          </View>
          <Text className="text-label text-muted">{formatAralik(ilk.nokta.startedAt, son.nokta.startedAt)}</Text>
          <CizgiGrafik
            noktalar={cizilecekler.map(({ nokta, deger }) => ({ etiket: formatKisaTarih(nokta.startedAt), deger }))}
            birim="kg"
            baslik={`${exerciseName} ${sekme.ozetAdi}, ${cizilecekler.length} antrenman`}
          />
        </>
      );
    }
  }

  return (
    <View className="flex-col gap-3 pt-1">
      <View className="flex-row border-b border-surface-3">
        {SEKMELER.map((aday) => (
          <SekmeDugmesi
            key={aday.anahtar}
            secili={aday.anahtar === sekmeAnahtari}
            onPress={() => setSekmeAnahtari(aday.anahtar)}
          >
            {aday.etiket}
          </SekmeDugmesi>
        ))}
      </View>
      <View className="flex-col gap-2">{icerik}</View>
      <View className="flex-row gap-1 rounded-lg bg-surface-2 p-1">
        {ARALIKLAR.map((aday) => {
          const secili = aday.anahtar === aralik;
          return (
            <Pressable
              key={aday.anahtar}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              onPress={() => setAralik(aday.anahtar)}
              className={`min-h-11 flex-1 items-center justify-center rounded-md ${secili ? 'bg-surface-4' : ''}`}
            >
              <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{aday.etiket}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
