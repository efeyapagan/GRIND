import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useExercises, useVolumeByExercise } from '@grind/shared/api/queries';
import { kiloluHareketler, varsayilanBirTekrarHareketi } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import HareketSecimKutusu from '../ui/HareketSecimKutusu';
import { HareketGrafigi } from './HareketGecmisi';

/** Varsayilan hareketin bakildigi pencere (spec Karar 5). */
const VARSAYILAN_PENCERE_GUN = 90;

/** "YYYY-MM-DD", TR gunu; bugun - n gun. */
function gunlerOnce(gun: number): string {
  const tarih = new Date(Date.now() - gun * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(tarih);
}

/**
 * #184: secilen hareketin tahmini 1RM trendi (spec Karar 5). Acilista son 90 gunde en cok set atilan kilolu
 * hareket; basliga dokununca yalnizca kilolu hareketleri listeleyen secim penceresi acilir (#586). Grafik
 * hareket kartindaki 1RM grafiginin kendisidir (`HareketGrafigi`, antrenman basina nokta).
 */
export default function BirTekrarKarti() {
  const { t } = useTranslation();
  const [pencereBasi] = useState(() => gunlerOnce(VARSAYILAN_PENCERE_GUN));
  const { data: egzersizler } = useExercises();
  const { data: hacimler } = useVolumeByExercise(pencereBasi);
  const [secilenId, setSecilenId] = useState<number | null>(null);

  const kilolular = kiloluHareketler(egzersizler ?? []);
  const sonDonemVarsayilani = egzersizler && hacimler ? varsayilanBirTekrarHareketi(hacimler, egzersizler) : null;
  // Son 90 gunde kilolu set yoksa (uzun aradan donen kullanici) tum zamanlara bakilir; aciklama yalnizca hic
  // kilolu set yoksa gorunur (spec Karar 5).
  const tumZamanGerekli = egzersizler !== undefined && hacimler !== undefined && sonDonemVarsayilani === null;
  const { data: tumHacimler } = useVolumeByExercise(null, tumZamanGerekli);
  const varsayilan =
    sonDonemVarsayilani ?? (egzersizler && tumHacimler ? varsayilanBirTekrarHareketi(tumHacimler, egzersizler) : null);
  const hareketId = secilenId ?? varsayilan;
  const hareket = kilolular.find((e) => e.id === hareketId);
  const yuklendi =
    egzersizler !== undefined && hacimler !== undefined && (!tumZamanGerekli || tumHacimler !== undefined);

  return (
    // #631: yana kayan alanda kisa kart uzun kartin boyuna gerilir (`KaydirmaliKartlar`).
    <CamKart className="flex-col gap-3 p-4" disClassName="flex-1">
      <Text className="text-label text-muted uppercase">{t('ilerleme.birTekrarBaslik')}</Text>
      {!yuklendi ? (
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      ) : !hareket ? (
        <Text className="text-body text-muted">{t('ilerleme.kiloluHareketYok')}</Text>
      ) : (
        <>
          <HareketSecimKutusu
            egzersizler={kilolular}
            secilenId={hareket.id}
            secilenAd={hareket.name}
            onSec={setSecilenId}
          />
          <View>
            <HareketGrafigi exerciseId={hareket.id} exerciseName={hareket.name} sabitSekme="birTekrar" />
          </View>
        </>
      )}
    </CamKart>
  );
}
