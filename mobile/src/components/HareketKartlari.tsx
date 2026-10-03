import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketKartiGovdesi from './HareketKartiGovdesi';
import SurukleSiraliListe from '../ui/SurukleSiraliListe';
import CamKart from '../ui/CamKart';

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
        // #590: cam kart (spec Karar 9); kose buyuyerek acildigi odak kartiyla ayni. Surukleme vurgusu
        // camin kendi accent kenari (#559) -- sac teli katmani yer degistirir, kabin sinifi degismez (#261).
        return (
          <CamKart
            testID={`hareket-karti-${hareket.exerciseId}`}
            koseSinifi="rounded-xl"
            vurguluKenar={suruklenen}
            className="flex-col gap-2 p-4"
          >
            <HareketKartiGovdesi
              hareket={hareket}
              sira={sira}
              setler={setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId)}
              onSetDuzenle={onSetDuzenle}
              onSec={() => onSec(hareket.exerciseId)}
            />
          </CamKart>
        );
      }}
    />
  );
}
