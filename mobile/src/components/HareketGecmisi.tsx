import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import { useExerciseProgress, type IlerlemeAraligi, type IlerlemeNoktasi } from '@grind/shared/api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '@grind/shared/lib/format';
import CizgiGrafik, { type CizgiNoktasi } from '../ui/CizgiGrafik';
import SekmeDugmesi from '../ui/SekmeDugmesi';
import { useIkonRenk } from '../ui/renkler';

type SekmeAnahtari = 'agirlik' | 'antrenman' | 'birTekrar';

// Etiketler KATALOG ANAHTARIDIR, metin degil -- web/src/components/HareketGecmisi.tsx ile ayni.
const SEKMELER = [
  { anahtar: 'agirlik' as SekmeAnahtari, etiket: 'setGirdisi.agirlikEtiket', ozetAdi: 'hareketGecmisi.ozetAgirlik', deger: (nokta: IlerlemeNoktasi) => nokta.topWeight },
  { anahtar: 'antrenman' as SekmeAnahtari, etiket: 'antrenman.baslik', ozetAdi: 'hareketGecmisi.ozetAntrenman', deger: (nokta: IlerlemeNoktasi) => nokta.volume },
  {
    anahtar: 'birTekrar' as SekmeAnahtari,
    etiket: 'hareketGecmisi.tahminiBirTekrar',
    ozetAdi: 'hareketGecmisi.ozetBirTekrar',
    deger: (nokta: IlerlemeNoktasi) => nokta.estimatedOneRepMax,
  },
] as const;

const ARALIKLAR = [
  { anahtar: '1a' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikBirAy' },
  { anahtar: '3a' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikUcAy' },
  { anahtar: 'tum' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikTum' },
] as const;

interface Props {
  exerciseId: number;
  exerciseName: string;
}

/** web/src/components/HareketGecmisi.tsx ile ayni (#50): varsayilan KAPALI acilir bolum. */
export default function HareketGecmisi({ exerciseId, exerciseName }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [acik, setAcik] = useState(false);

  return (
    <View className="pt-2">
      <Pressable
        onPress={() => setAcik((a) => !a)}
        className="min-h-11 flex-row items-center justify-between gap-2"
      >
        <Text className="text-label text-muted uppercase">{t('kabuk.sekmeGecmis')}</Text>
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
  const { t } = useTranslation();
  const dil = useDil();
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>('agirlik');
  const [aralik, setAralik] = useState<IlerlemeAraligi>('1a');
  const { data: noktalar, isLoading, isError } = useExerciseProgress(exerciseId, aralik);
  const sekme = SEKMELER.find((aday) => aday.anahtar === sekmeAnahtari) ?? SEKMELER[0];

  let icerik: React.ReactNode;
  if (isLoading) {
    icerik = <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>;
  } else if (isError || !noktalar) {
    icerik = (
      <Text accessibilityRole="alert" className="text-body text-danger">
        {t('hareketGecmisi.hata')}
      </Text>
    );
  } else if (noktalar.length === 0) {
    icerik = (
      <Text className="text-body text-muted">
        {t(aralik === 'tum' ? 'hareketGecmisi.ilkAntrenman' : 'hareketGecmisi.aralikBos')}
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
          {t('hareketGecmisi.birTekrarAciklama')}
        </Text>
      );
    } else {
      const ilk = cizilecekler[0];
      const son = cizilecekler[cizilecekler.length - 1];
      icerik = (
        <>
          <View className="flex-row gap-8">
            <View className="flex-col gap-1">
              <Text className="text-label text-muted">{t('hareketGecmisi.suAnki')}</Text>
              <Text className="text-metric text-fg">{formatWeight(son.deger, dil)}</Text>
            </View>
            {cizilecekler.length > 1 && (
              <View className="flex-col gap-1">
                <Text className="text-label text-muted">{t('hareketGecmisi.fark')}</Text>
                <Text className="text-metric text-fg">{formatFark(son.deger - ilk.deger, dil)}</Text>
              </View>
            )}
          </View>
          <Text className="text-label text-muted">{formatAralik(ilk.nokta.startedAt, son.nokta.startedAt, dil)}</Text>
          <CizgiGrafik
            noktalar={cizilecekler.map(
              ({ nokta, deger }): CizgiNoktasi => ({
                etiket: formatKisaTarih(nokta.startedAt, dil),
                deger,
                // #230: farkli pozisyonlu nokta ince bir isaretle ayirt edilir.
                vurgula: nokta.positionChanged,
              }),
            )}
            birim="kg"
            baslik={t('hareketGecmisi.grafikBasligi', { ad: exerciseName, ozet: t(sekme.ozetAdi), count: cizilecekler.length })}
          />
          {cizilecekler.some(({ nokta }) => nokta.positionChanged) && (
            <Text className="text-label text-muted">
              {t('hareketGecmisi.pozisyonDegistiIpucu')}
            </Text>
          )}
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
            {t(aday.etiket)}
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
              <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{t(aday.etiket)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
