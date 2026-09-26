import { View } from 'react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketKartiGovdesi from './HareketKartiGovdesi';

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  onSec: (exerciseId: number) => void;
  onSetDuzenle: (kayit: SetKaydi, sira: number) => void;
}

/**
 * web/src/components/HareketKartlari.tsx ile ayni (spec Karar 5; #60/#62). #354: kart artik listede
 * yerinde acilmaz -- dokununca hareketin ayrintilari (gecmis, siralama #229, kaldirma) set paneliyle
 * birlikte ekrani kaplayan odak kartinda (`OdakKarti`) gorunur; listede yalnizca baslik + setler kalir.
 */
export default function HareketKartlari({ ilerleme, setler, onSec, onSetDuzenle }: Props) {
  return (
    <View className="flex-col gap-4">
      {ilerleme.map((hareket, sira) => (
        <View
          key={hareket.exerciseId}
          testID={`hareket-karti-${hareket.exerciseId}`}
          className="flex-col gap-2 rounded-xl bg-surface-1 p-4"
        >
          <HareketKartiGovdesi
            hareket={hareket}
            sira={sira}
            setler={setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId)}
            onSetDuzenle={onSetDuzenle}
            onSec={() => onSec(hareket.exerciseId)}
          />
        </View>
      ))}
    </View>
  );
}
