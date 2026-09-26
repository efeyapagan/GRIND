import { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { GecmisOturum } from '@grind/shared/api/queries';
import { formatTarih } from '@grind/shared/lib/format';
import GecmisOzeti from './GecmisOzeti';
import GecmisDetayPaneli from './GecmisDetayPaneli';
import IkincilDugme from '../ui/IkincilDugme';
import KaydirilabilirSatir, { type KaydirilabilirSatirRef } from '../ui/KaydirilabilirSatir';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  oturum: GecmisOturum;
  /** Verilmezse kart salt-okunurdur (#284, arkadasin gecmisi): kaydirma ve silme yolu cizilmez. */
  onSil?: () => void;
}

/**
 * Gecmis listesindeki tek antrenman karti (issue #46). #382: dokununca yerinde asagi acilmaz,
 * ayrintilar alt menuden genisleyen cam panelde (`GecmisDetayPaneli`) gorunur. Paneldeki "Antrenmanı
 * sil" paneli kapatip onayi burada, kartin yerinde sorar. Sola kaydirinca arkasindaki "Sil" cikar
 * (Faz 3 cilalama, KaydirilabilirSatir) -- ikincil bir kisayoldur, birincil yol panel.
 */
export default function GecmisKarti({ oturum, onSil }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const dil = useDil();
  const [acik, setAcik] = useState(false);
  const [onayAcik, setOnayAcik] = useState(false);
  const kaydirmaRef = useRef<KaydirilabilirSatirRef>(null);
  const silinebilir = onSil !== undefined;

  function onayiAc() {
    kaydirmaRef.current?.kapat();
    setAcik(false);
    setOnayAcik(true);
  }

  if (onayAcik) {
    return (
      <View className="overflow-hidden rounded-xl bg-surface-2 p-4">
        <View className="flex-col gap-3">
          <Text className="text-body text-fg">
            {t('gecmis.silmeOnayi', { tarih: formatTarih(oturum.startedAt, dil), count: oturum.setCount })}
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={onSil} className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg">
              <Text className="text-label text-on-danger-bg">{t('ortak.evetSil')}</Text>
            </Pressable>
            <View className="flex-1">
              <IkincilDugme onPress={() => setOnayAcik(false)}>{t('ortak.vazgec')}</IkincilDugme>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const kart = (
    <View className="bg-surface-2">
      <Pressable onPress={() => setAcik(true)} className="flex-row items-center justify-between gap-4 p-4">
        <GecmisOzeti oturum={oturum} />
        <View className="size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3">
          <ChevronRight color={ikonRenk.muted} size={20} />
        </View>
      </Pressable>
      {acik && (
        <GecmisDetayPaneli
          oturum={oturum}
          onKapat={() => setAcik(false)}
          onSil={silinebilir ? onayiAc : undefined}
        />
      )}
    </View>
  );

  if (!silinebilir) {
    return <View className="overflow-hidden rounded-xl">{kart}</View>;
  }
  return (
    <KaydirilabilirSatir ref={kaydirmaRef} onSil={onayiAc} silEtiketi={t('gecmis.antrenmaniSil')}>
      {kart}
    </KaydirilabilirSatir>
  );
}
