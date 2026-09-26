import { View } from 'react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketKartiGovdesi from './HareketKartiGovdesi';
import SurukleSiraliListe from '../ui/SurukleSiraliListe';

/** Kartlar arasi bosluk (Tailwind gap-4); surukleme hesabi da bunu bilmeli. */
const KART_ARALIGI = 16;

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  onSec: (exerciseId: number) => void;
  onSetDuzenle: (kayit: SetKaydi, sira: number) => void;
  /** #407: antrenmandaki TUM hareketlerin yeni sirasi; kaydi ekran yurutur. */
  onSiraDegis: (exerciseIds: number[]) => void;
}

/**
 * web/src/components/HareketKartlari.tsx ile ayni (spec Karar 5; #60/#62). #354: kart artik listede
 * yerinde acilmaz -- dokununca hareketin ayrintilari (gecmis, kaldirma) set paneliyle birlikte ekrani
 * kaplayan odak kartinda (`OdakKarti`) gorunur; listede yalnizca baslik + setler kalir. #407: sira,
 * karti basili tutup surukleyerek degisir (odak kartindaki #229 ok dugmelerinin yerine).
 */
export default function HareketKartlari({ ilerleme, setler, onSec, onSetDuzenle, onSiraDegis }: Props) {
  return (
    <SurukleSiraliListe
      ogeler={ilerleme}
      anahtar={(hareket) => hareket.exerciseId}
      aralik={KART_ARALIGI}
      onSirala={(yeniSira) => onSiraDegis(yeniSira.map((hareket) => hareket.exerciseId))}
      satirCiz={(hareket, suruklenen) => {
        const sira = ilerleme.indexOf(hareket);
        // Kenarlik hep cizilir, yalnizca rengi degisir (SablonKarti'ndaki #261 tuzagi).
        const kenarlik = suruklenen ? 'border-accent' : 'border-transparent';
        return (
          <View
            testID={`hareket-karti-${hareket.exerciseId}`}
            className={`flex-col gap-2 rounded-xl border bg-surface-1 p-4 ${kenarlik}`}
          >
            <HareketKartiGovdesi
              hareket={hareket}
              sira={sira}
              setler={setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId)}
              onSetDuzenle={onSetDuzenle}
              onSec={() => onSec(hareket.exerciseId)}
            />
          </View>
        );
      }}
    />
  );
}
