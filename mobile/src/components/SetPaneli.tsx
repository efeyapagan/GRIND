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
import CamKatmanlari from '../ui/CamKatmanlari';
import SayiAlani from '../ui/SayiAlani';
import RirAlani from './RirAlani';
import Kronometre from './Kronometre';
import { useAgirlikIbaresi } from './useAgirlikIbaresi';
import { useHareketOlcumu } from './useHareketOlcumu';
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
  /** #564: verilirse set acik antrenmana degil bu (gecmis) antrenmana eklenir. */
  oturumId?: number;
}

/**
 * #274: set paneli secili hareket kartinin hemen altinda acilir -- ekranin altina sabit
 * degil; boylece kart ve panel her zaman alt alta durur. Akis web/src/components/AddSetForm.tsx'in
 * formuyla ayni (spec Karar 6); sesi hazirlama (Web Audio) web'e ozgu oldugu icin yok.
 *
 * Form durumu bu bilesende: panel kapaninca, baska bir karta gecilince ya da set eklenince (#385)
 * yazilanlar sifirlanir.
 *
 * #346: alanlar hareketin olcum tipine gore -- kilo + tekrar + RIR, agirliksiz harekette tekrar + istege
 * bagli "ek agirlik" (RIR yok), sureli harekette kronometre + saniye kutusu.
 */
export default function SetPaneli({ egzersizId, egzersizAdi, onSetEklendi, oturumId }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: acikOturum } = useOpenSession();
  const eklemeMutasyonu = useAddSet();
  const agirlikIbaresi = useAgirlikIbaresi(egzersizId);
  const olcum = useHareketOlcumu(egzersizId);

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [sure, setSure] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  async function gonder() {
    setGenelHata(null);
    setAlanHatalari({});

    const girdi = { agirlik, tekrar, rir, sure };
    const dogrulamaHatalari = setGirdisiniDogrula(girdi, olcum);
    if (Object.keys(dogrulamaHatalari).length > 0) {
      setAlanHatalari(dogrulamaHatalari);
      return;
    }

    try {
      await eklemeMutasyonu.mutateAsync({
        exerciseId: egzersizId,
        ...setGirdisiniAyristir(girdi, olcum),
        sessionId: oturumId,
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
        const hedefOturumId = oturumId ?? acikOturum?.id;
        if (hedefOturumId !== undefined) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(hedefOturumId) });
        }
        if (oturumId !== undefined) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(egzersizId) });
      }
    }
  }

  return (
    // #350: alt menuyle ayni "liquid glass" yuzey (#590 ile uc katmanli `CamKatmanlari`), biraz daha ferah ic bosluk.
    <View className="flex-col gap-3 overflow-hidden rounded-xl p-4">
      <CamKatmanlari koseSinifi="rounded-xl" />
      {/* #357: "Yeni set: " oneki ve kapatma dugmesi kalkti -- uzun adda dugme ekrandan tasiyordu;
          kapatma artik odak kartinin sol ust kosesinde (`HareketKartiGovdesi` `onKapat`). */}
      <Text className="pl-1 text-label text-muted uppercase">{egzersizAdi}</Text>
      {genelHata && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {genelHata}
        </Text>
      )}
      {olcum === 'Duration' ? (
        <View className="flex-col gap-2">
          <Kronometre onDurdur={(saniye) => setSure(String(saniye))} />
          <SayiAlani
            id="set-sure"
            etiket={t('setGirdisi.sureEtiket')}
            birim={t('setGirdisi.saniyeBirimi')}
            inputMode="numeric"
            placeholder="0"
            value={sure}
            onChange={setSure}
            hata={alanHatalari.durationSeconds}
          />
        </View>
      ) : (
        // flex-wrap: RIR paneli (#266) acilinca uc alanin altina tam genislikte duser.
        <View className="flex-row flex-wrap gap-2">
          <View className="flex-1">
            <SayiAlani
              id="set-agirlik"
              etiket={t(olcum === 'Reps' ? 'setGirdisi.ekAgirlikEtiket' : 'setGirdisi.agirlikEtiket')}
              birim="kg"
              ipucu={agirlikIbaresi}
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
          {olcum === 'WeightReps' && (
            <RirAlani
              id="set-rir"
              deger={rir === '' ? null : Number(rir)}
              onDegis={(yeni) => setRir(yeni === null ? '' : String(yeni))}
              hata={alanHatalari.rir}
            />
          )}
        </View>
      )}
      <BirincilDugme yukseklik="buyuk" disabled={eklemeMutasyonu.isPending} onPress={gonder}>
        <Plus color={ikonRenk.onAccent} size={24} />
        <Text className="text-body-lg font-bold text-on-accent">{t('setler.setEkle')}</Text>
      </BirincilDugme>
    </View>
  );
}
