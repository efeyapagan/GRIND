import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import { useExercises, useVolumeByExercise } from '@grind/shared/api/queries';
import { varsayilanBirTekrarHareketi } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import HareketSecici from '../ui/HareketSecici';
import { useIkonRenk } from '../ui/renkler';
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
 * hareket; basliga dokununca yalnizca kilolu hareketleri listeleyen secici acilir. Grafik hareket kartindaki
 * 1RM grafiginin kendisidir (`HareketGrafigi`, antrenman basina nokta).
 */
export default function BirTekrarKarti() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [pencereBasi] = useState(() => gunlerOnce(VARSAYILAN_PENCERE_GUN));
  const { data: egzersizler } = useExercises();
  const { data: hacimler } = useVolumeByExercise(pencereBasi);
  const [secilenId, setSecilenId] = useState<number | null>(null);
  const [seciyor, setSeciyor] = useState(false);

  const kilolular = (egzersizler ?? []).filter((e) => (e.measurement ?? 'WeightReps') === 'WeightReps');
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
    <CamKart className="flex-col gap-3 p-4">
      <Text className="text-label text-muted uppercase">{t('ilerleme.birTekrarBaslik')}</Text>
      {!yuklendi ? (
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      ) : !hareket ? (
        <Text className="text-body text-muted">{t('ilerleme.kiloluHareketYok')}</Text>
      ) : (
        <>
          {seciyor ? (
            <HareketSecici
              id="bir-tekrar-hareketi"
              egzersizler={kilolular}
              secilenId={hareket.id}
              secilenAd={hareket.name}
              otomatikOdak
              onSec={(id) => {
                setSecilenId(id);
                setSeciyor(false);
              }}
              onKapat={() => setSeciyor(false)}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('ilerleme.hareketDegistir')}: ${hareket.name}`}
              onPress={() => setSeciyor(true)}
              className="min-h-11 flex-row items-center justify-between gap-2"
            >
              <Text numberOfLines={1} className="flex-1 text-heading text-fg">
                {hareket.name}
              </Text>
              <ChevronDown color={ikonRenk.muted} size={18} />
            </Pressable>
          )}
          <View>
            <HareketGrafigi exerciseId={hareket.id} exerciseName={hareket.name} sabitSekme="birTekrar" />
          </View>
        </>
      )}
    </CamKart>
  );
}
