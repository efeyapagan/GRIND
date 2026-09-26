import { useState } from 'react';
import { View, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import { queryKeys, useAddSet, useOpenSession } from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { ApiError } from '@grind/shared/api/problem';
import { formatWeight } from '@grind/shared/lib/format';
import { SET_ALANLARI, setGirdisiniAyristir, setGirdisiniDogrula } from '@grind/shared/lib/setGirdisi';
import BirincilDugme from '../ui/BirincilDugme';
import CamYuzey from '../ui/CamYuzey';
import SayiAlani from '../ui/SayiAlani';
import RirAlani from './RirAlani';
import { ikonRenk } from '../ui/renkler';

interface Props {
  egzersizId: number;
  egzersizAdi: string;
  /** Set eklenince cagrilir: panel tek bir setten sonra kapanir (#357'den beri kapatma dugmesi odak kartinda). */
  onKapat: () => void;
  // Basarili set sonrasi dinlenme sayaci baslar -- sayac listenin sonunda, ekranda yasar.
  onSetEklendi: (exerciseId: number) => void;
}

/**
 * #274: set paneli secili hareket kartinin hemen altinda acilir -- ekranin altina sabit
 * degil; boylece kart ve panel her zaman alt alta durur. Akis web/src/components/AddSetForm.tsx'in
 * formuyla ayni (spec Karar 6); sesi hazirlama (Web Audio) web'e ozgu oldugu icin yok.
 *
 * Form durumu bu bilesende: panel kapaninca ya da baska bir karta gecilince yazilanlar sifirlanir.
 */
export default function SetPaneli({ egzersizId, egzersizAdi, onKapat, onSetEklendi }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const queryClient = useQueryClient();
  const { data: acikOturum } = useOpenSession();
  const eklemeMutasyonu = useAddSet();

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);

  async function gonder() {
    setGenelHata(null);
    setAlanHatalari({});
    setSonEklenen(null);

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
      setSonEklenen(
        t('setler.eklendi', { agirlik: formatWeight(ayristirilmisAgirlik, dil), tekrar: ayristirilmisTekrar }),
      );
      onSetEklendi(egzersizId);
      // Set eklenince panel KAPANIR (kullanici karari): eklenen set kartta gorunur ve dinlenme
      // sayaci ust barda baslar -- ikisi de yuzer panelin arkasinda kalirdi.
      onKapat();
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
      <Text className="min-h-4 text-label text-muted">{sonEklenen}</Text>
      <BirincilDugme yukseklik="buyuk" disabled={eklemeMutasyonu.isPending} onPress={gonder}>
        <Plus color={ikonRenk.onAccent} size={24} />
        <Text className="text-body-lg font-bold text-on-accent">{t('setler.setEkle')}</Text>
      </BirincilDugme>
    </View>
  );
}
