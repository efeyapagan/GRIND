import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import { useUpdateSet, type SetKaydi } from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import {
  SET_ALANLARI,
  setGirdisiMetni,
  setGirdisiniAyristir,
  setGirdisiniDogrula,
} from '@grind/shared/lib/setGirdisi';
import BirincilDugme from '../ui/BirincilDugme';
import CamYuzey from '../ui/CamYuzey';
import IkincilDugme from '../ui/IkincilDugme';
import SayiAlani from '../ui/SayiAlani';
import RirAlani from './RirAlani';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onKapat: () => void;
  onSil: () => void;
}

/**
 * web/src/components/SetDuzenleyici.tsx ile ayni akis (issue #57). #396: satirin yerinde degil
 * ekranin ortasinda acilir; set paneliyle ayni "liquid glass" yuzey (`CamYuzey`, #350). Konumu ve
 * perdesi cagiranin (antrenman.tsx).
 */
export default function SetDuzenleyici({ kayit, sira, onKapat, onSil }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const duzeltme = useUpdateSet();
  const [girdi, setGirdi] = useState(() => setGirdisiMetni(kayit));
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  async function kaydet() {
    setGenelHata(null);
    const dogrulamaHatalari = setGirdisiniDogrula(girdi);
    setAlanHatalari(dogrulamaHatalari);
    if (Object.keys(dogrulamaHatalari).length > 0) {
      return;
    }
    try {
      await duzeltme.mutateAsync({ id: kayit.id, ...setGirdisiniAyristir(girdi) });
      onKapat();
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, SET_ALANLARI);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    }
  }

  return (
    <View
      testID="set-duzenleyici"
      accessibilityLabel={t('setler.duzenleFormEtiketi', { sira })}
      className="flex-col gap-3 overflow-hidden rounded-xl border border-surface-4 p-4"
    >
      <CamYuzey />
      <Text numberOfLines={1} className="pl-1 text-label text-muted uppercase">
        {kayit.exerciseName} · {t('setler.setSirasi', { sira })}
      </Text>
      {genelHata && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {genelHata}
        </Text>
      )}
      {/* flex-wrap: RIR paneli (#266) acilinca uc alanin altina tam genislikte duser. */}
      <View className="flex-row flex-wrap gap-2">
        <View className="flex-1">
          <SayiAlani
            id={`set-${kayit.id}-agirlik`}
            etiket={t('setGirdisi.agirlikEtiket')}
            birim="kg"
            inputMode="decimal"
            placeholder="0"
            value={girdi.agirlik}
            onChange={(agirlik) => setGirdi((onceki) => ({ ...onceki, agirlik }))}
            hata={alanHatalari.weight}
          />
        </View>
        <View className="flex-1">
          <SayiAlani
            id={`set-${kayit.id}-tekrar`}
            etiket={t('setGirdisi.tekrarEtiket')}
            birim={t('setGirdisi.tekrarBirimi')}
            inputMode="numeric"
            placeholder="0"
            value={girdi.tekrar}
            onChange={(tekrar) => setGirdi((onceki) => ({ ...onceki, tekrar }))}
            hata={alanHatalari.reps}
          />
        </View>
        <RirAlani
          id={`set-${kayit.id}-rir`}
          deger={girdi.rir === '' ? null : Number(girdi.rir)}
          onDegis={(rir) => setGirdi((onceki) => ({ ...onceki, rir: rir === null ? '' : String(rir) }))}
          temizlenebilir={false}
          hata={alanHatalari.rir}
        />
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <IkincilDugme onPress={onKapat}>{t('ortak.vazgec')}</IkincilDugme>
        </View>
        <View className="flex-1">
          <BirincilDugme yukseklik="normal" disabled={duzeltme.isPending} onPress={kaydet}>
            {t('ortak.kaydet')}
          </BirincilDugme>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onSil}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
      >
        <Trash2 color={ikonRenk.danger} size={18} />
        <Text className="text-label text-danger">{t('setler.setiSil')}</Text>
      </Pressable>
    </View>
  );
}
