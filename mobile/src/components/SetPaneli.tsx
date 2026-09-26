import { useState } from 'react';
import { Keyboard, View, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { queryKeys, useAddSet, useOpenSession } from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { ApiError } from '@grind/shared/api/problem';
import { SET_ALANLARI, setGirdisiniAyristir, setGirdisiniDogrula } from '@grind/shared/lib/setGirdisi';
import BirincilDugme from '../ui/BirincilDugme';
import CamYuzey from '../ui/CamYuzey';
import SayiAlani from '../ui/SayiAlani';
import RirAlani from './RirAlani';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  egzersizId: number;
  egzersizAdi: string;
  /**
   * Basarili set sonrasi cagrilir: dinlenme sayaci baslar ve panel ilk acildigi hale doner (#385 --
   * cagiran `key`i degistirip paneli yeniden kurar; hedef dolunca kapatmak da cagiranin isi).
   * Kapatma dugmesi #357'den beri odak kartinda.
   */
  onSetEklendi: (exerciseId: number) => void;
}

/**
 * #274: set paneli secili hareket kartinin hemen altinda acilir -- ekranin altina sabit
 * degil; boylece kart ve panel her zaman alt alta durur. Akis web/src/components/AddSetForm.tsx'in
 * formuyla ayni (spec Karar 6); sesi hazirlama (Web Audio) web'e ozgu oldugu icin yok.
 *
 * Form durumu bu bilesende: panel kapaninca, baska bir karta gecilince ya da set eklenince (#385)
 * yazilanlar sifirlanir.
 */
export default function SetPaneli({ egzersizId, egzersizAdi, onSetEklendi }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: acikOturum } = useOpenSession();
  const eklemeMutasyonu = useAddSet();

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  async function gonder() {
    setGenelHata(null);
    setAlanHatalari({});

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
      // #385: panel acik kalir ama ilk acildigi hale doner -- klavye kapanir, eklenen set odak
      // kartinda gorunur.
      Keyboard.dismiss();
      onSetEklendi(egzersizId);
    } catch (hata) {
      if (hata instanceof ApiError) {
        const sonuc = apiHatasiniAyir(hata, SET_ALANLARI);
        setGenelHata(sonuc.genelHata);
        setAlanHatalari(sonuc.alanHatalari);
      } else {
        // R15: istek sunucuya ulasmis olabilir -- ekran gercegi gostersin diye veriler tazelenir.
        setGenelHata(t('setler.baglantiHatasi'));
        void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
        if (acikOturum) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(acikOturum.id) });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(egzersizId) });
      }
    }
  }

  return (
    // #350: alt menuyle ayni "liquid glass" yuzey (`CamYuzey`), biraz daha ferah ic bosluk.
    <View className="flex-col gap-3 overflow-hidden rounded-xl border border-surface-4 p-4">
      <CamYuzey />
      {/* #357: "Yeni set: " oneki ve kapatma dugmesi kalkti -- uzun adda dugme ekrandan tasiyordu;
          kapatma artik odak kartinin sol ust kosesinde (`HareketKartiGovdesi` `onKapat`). */}
      <Text className="pl-1 text-label text-muted uppercase">{egzersizAdi}</Text>
      {genelHata && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {genelHata}
        </Text>
      )}
      {/* flex-wrap: RIR paneli (#266) acilinca uc alanin altina tam genislikte duser. */}
      <View className="flex-row flex-wrap gap-2">
        <View className="flex-1">
          <SayiAlani
            id="set-agirlik"
            etiket={t('setGirdisi.agirlikEtiket')}
            birim="kg"
            inputMode="decimal"
            placeholder="0"
            value={agirlik}
            onChange={setAgirlik}
            hata={alanHatalari.weight}
          />
        </View>
        <View className="flex-1">
          <SayiAlani
            id="set-tekrar"
            etiket={t('setGirdisi.tekrarEtiket')}
            birim={t('setGirdisi.tekrarBirimi')}
            inputMode="numeric"
            placeholder="0"
            value={tekrar}
            onChange={setTekrar}
            hata={alanHatalari.reps}
          />
        </View>
        <RirAlani
          id="set-rir"
          deger={rir === '' ? null : Number(rir)}
          onDegis={(yeni) => setRir(yeni === null ? '' : String(yeni))}
          hata={alanHatalari.rir}
        />
      </View>
      <BirincilDugme yukseklik="buyuk" disabled={eklemeMutasyonu.isPending} onPress={gonder}>
        <Plus color={ikonRenk.onAccent} size={24} />
        <Text className="text-body-lg font-bold text-on-accent">{t('setler.setEkle')}</Text>
      </BirincilDugme>
    </View>
  );
}
