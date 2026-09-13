import type { ReactNode } from 'react';
import { useExerciseHistory } from '../api/queries';
import { formatKisaTarih, formatWeight } from '../lib/format';
import HacimGrafigi from '../ui/HacimGrafigi';

interface Props {
  exerciseId: number;
  exerciseName: string;
  bugunkuOturumId: number | null;
}

/**
 * Secili hareketin hacim gecmisi (spec Karar 9): veriyi ceker, sunucunun yeniden-eskiye sirasini
 * eskiden yeniye cevirir, bugunku oturumu vurgular. "Gecen sefer" bugunden onceki en yeni oturumun
 * sunucudan gelen `setCount`/`totalVolume`'udur ("en agir set" gibi istemci turetimi YOK).
 */
export default function HareketGecmisi({ exerciseId, exerciseName, bugunkuOturumId }: Props) {
  const { data: oturumlar, isLoading, isError } = useExerciseHistory(exerciseId);
  const baslikId = `hareket-gecmisi-${exerciseId}`;

  let icerik: ReactNode;
  if (isLoading) {
    icerik = <p className="text-body text-muted">Yükleniyor...</p>;
  } else if (isError || !oturumlar) {
    icerik = (
      <p role="alert" className="text-body text-danger">
        Geçmiş alınamadı.
      </p>
    );
  } else {
    const oncekiler = oturumlar.filter((oturum) => oturum.sessionId !== bugunkuOturumId);
    if (oncekiler.length === 0) {
      icerik = <p className="text-body text-muted">Bu hareketin ilk antrenmanı</p>;
    } else {
      const noktalar = [...oturumlar].reverse().map((oturum) => {
        const bugun = oturum.sessionId === bugunkuOturumId;
        return {
          etiket: bugun ? 'Bugün' : formatKisaTarih(oturum.startedAt),
          deger: oturum.totalVolume,
          vurgulu: bugun,
        };
      });
      const gecenSefer = oncekiler[0];
      icerik = (
        <>
          <HacimGrafigi noktalar={noktalar} baslik={`${exerciseName} hacmi, son ${noktalar.length} antrenman`} />
          <p className="text-label text-muted tabular-nums">
            {`Geçen sefer: ${gecenSefer.setCount} set · ${formatWeight(gecenSefer.totalVolume)} kg`}
          </p>
        </>
      );
    }
  }

  return (
    <section aria-labelledby={baslikId} className="flex flex-col gap-2 pt-2">
      <h3 id={baslikId} className="text-label text-muted uppercase">
        Geçmiş
      </h3>
      {icerik}
    </section>
  );
}
