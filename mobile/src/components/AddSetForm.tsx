import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { queryKeys, useAddSet, useExercises, useOpenSession, type Egzersiz } from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { adaGoreSirala } from '@grind/shared/lib/egzersizler';
import { ApiError } from '@grind/shared/api/problem';
import { formatWeight } from '@grind/shared/lib/format';
import { dinlenmeBaslat, dinlenmeSuresi, type Dinlenme } from '@grind/shared/lib/dinlenme';
import { SET_ALANLARI, setGirdisiniAyristir, setGirdisiniDogrula } from '@grind/shared/lib/setGirdisi';
import BirincilDugme from '../ui/BirincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import SayiAlani from '../ui/SayiAlani';
import HareketSecici from '../ui/HareketSecici';
import DinlenmeSayaci from './DinlenmeSayaci';
import HareketEklePaneli from './HareketEklePaneli';
import { ikonRenk } from '../ui/renkler';
import { TABBAR_HALKA_TASMASI } from '../ui/KabukTabBar';

const BAGLANTI_HATASI_MESAJI =
  'Sunucuya ulaşılamadı. Set kaydedilmemiş olabilir; tekrar denemeden önce listeyi kontrol edin.';

interface Props {
  egzersizId: number | null;
  onEgzersizSec: (exerciseId: number) => void;
  acik: boolean;
  onAcikDegis: (acik: boolean) => void;
  hareketEkleme?: {
    egzersizler: readonly Egzersiz[];
    onEkle: (exerciseId: number) => void;
  };
}

/**
 * web/src/components/AddSetForm.tsx ile ayni akis (spec Karar 6, #62). Sesi hazirlama (Web Audio,
 * web'e ozgu) atlandi -- `sesiHazirla()` cagrisi yok, geri kalan mantik birebir ayni.
 */
export default function AddSetForm({ egzersizId, onEgzersizSec, acik, onAcikDegis, hareketEkleme }: Props) {
  const queryClient = useQueryClient();
  const { data: egzersizler } = useExercises();
  const { data: acikOturum } = useOpenSession();
  const eklemeMutasyonu = useAddSet();

  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);
  const seciliEgzersizAdi = siraliEgzersizler.find((eg) => eg.id === egzersizId)?.name ?? '';
  const [hareketEkleAcik, setHareketEkleAcik] = useState(false);

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(null);

  const agirlikRef = useRef<React.ComponentRef<typeof SayiAlani>>(null);

  async function gonder() {
    setGenelHata(null);
    setAlanHatalari({});
    setSonEklenen(null);

    if (egzersizId === null) {
      return;
    }

    const girdi = { agirlik, tekrar, rir };
    const dogrulamaHatalari = setGirdisiniDogrula(girdi);
    if (Object.keys(dogrulamaHatalari).length > 0) {
      setAlanHatalari(dogrulamaHatalari);
      return;
    }

    const {
      weight: ayristirilmisAgirlik,
      reps: ayristirilmisTekrar,
      rir: ayristirilmisRir,
    } = setGirdisiniAyristir(girdi);

    try {
      await eklemeMutasyonu.mutateAsync({
        exerciseId: egzersizId,
        weight: ayristirilmisAgirlik,
        reps: ayristirilmisTekrar,
        rir: ayristirilmisRir,
      });
      setSonEklenen(`Eklendi: ${formatWeight(ayristirilmisAgirlik)} kg × ${ayristirilmisTekrar}`);
      setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(acikOturum?.progress ?? [], egzersizId)));
    } catch (hata) {
      if (hata instanceof ApiError) {
        const sonuc = apiHatasiniAyir(hata, SET_ALANLARI);
        setGenelHata(sonuc.genelHata);
        setAlanHatalari(sonuc.alanHatalari);
      } else {
        setGenelHata(BAGLANTI_HATASI_MESAJI);
        void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
        if (acikOturum) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(acikOturum.id) });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(egzersizId) });
      }
    }
  }

  return (
    <View className="mt-auto pb-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
      <View className="flex-col gap-2 rounded-xl bg-surface-3 p-3">
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />
        {!acik &&
          (hareketEkleme ? (
            hareketEkleAcik ? (
              <HareketEklePaneli
                egzersizler={hareketEkleme.egzersizler}
                onSec={(exerciseId) => {
                  setHareketEkleAcik(false);
                  hareketEkleme.onEkle(exerciseId);
                }}
                onKapat={() => setHareketEkleAcik(false)}
              />
            ) : (
              <BirincilDugme yukseklik="normal" onPress={() => setHareketEkleAcik(true)}>
                <Plus color={ikonRenk.onAccent} size={20} />
                <Text className="text-body-lg font-bold text-on-accent">Hareket ekle</Text>
              </BirincilDugme>
            )
          ) : (
            <BirincilDugme yukseklik="normal" onPress={() => onAcikDegis(true)}>
              <Plus color={ikonRenk.onAccent} size={20} />
              <Text className="text-body-lg font-bold text-on-accent">Set ekle</Text>
            </BirincilDugme>
          ))}
        {acik && (
          <View className="flex-col gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="pl-1 text-label text-muted uppercase">
                {hareketEkleme ? `Yeni set: ${seciliEgzersizAdi}` : 'Yeni set'}
              </Text>
              <IkonDugmesi etiket="Paneli kapat" onPress={() => onAcikDegis(false)}>
                <X color={ikonRenk.muted} size={20} />
              </IkonDugmesi>
            </View>
            {genelHata && (
              <Text accessibilityRole="alert" className="text-label text-danger">
                {genelHata}
              </Text>
            )}
            {!hareketEkleme && (
              <HareketSecici
                id="set-egzersiz"
                egzersizler={siraliEgzersizler}
                secilenId={egzersizId ?? 0}
                secilenAd={seciliEgzersizAdi}
                onSec={onEgzersizSec}
              />
            )}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <SayiAlani
                  id="set-agirlik"
                  etiket="Ağırlık"
                  birim="kg"
                  inputMode="decimal"
                  placeholder="0"
                  value={agirlik}
                  onChange={setAgirlik}
                  hata={alanHatalari.weight}
                  ref={agirlikRef}
                />
              </View>
              <View className="flex-1">
                <SayiAlani
                  id="set-tekrar"
                  etiket="Tekrar"
                  birim="tekrar"
                  inputMode="numeric"
                  placeholder="0"
                  value={tekrar}
                  onChange={setTekrar}
                  hata={alanHatalari.reps}
                />
              </View>
              <View className="flex-1">
                <SayiAlani
                  id="set-rir"
                  etiket="RIR"
                  birim="kalan"
                  inputMode="numeric"
                  placeholder="—"
                  value={rir}
                  onChange={setRir}
                  hata={alanHatalari.rir}
                />
              </View>
            </View>
            <Text className="min-h-4 text-label text-muted">{sonEklenen}</Text>
            <BirincilDugme yukseklik="buyuk" disabled={eklemeMutasyonu.isPending} onPress={gonder}>
              <Plus color={ikonRenk.onAccent} size={24} />
              <Text className="text-body-lg font-bold text-on-accent">Set ekle</Text>
            </BirincilDugme>
          </View>
        )}
      </View>
    </View>
  );
}
