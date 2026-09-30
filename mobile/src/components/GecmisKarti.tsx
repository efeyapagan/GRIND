import { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Share2 } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { GecmisOturum } from '@grind/shared/api/queries';
import { formatTarih } from '@grind/shared/lib/format';
import GecmisOzeti from './GecmisOzeti';
import GecmisDetayPaneli from './GecmisDetayPaneli';
import PaylasimPenceresi from './PaylasimPenceresi';
import CamKart from '../ui/CamKart';
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
  const [paylasimAcik, setPaylasimAcik] = useState(false);
  const [onayAcik, setOnayAcik] = useState(false);
  const kaydirmaRef = useRef<KaydirilabilirSatirRef>(null);
  const silinebilir = onSil !== undefined;
  const paylasilabilir = oturum.durationSeconds !== null && oturum.durationSeconds !== undefined;

  function onayiAc() {
    kaydirmaRef.current?.kapat();
    setAcik(false);
    setOnayAcik(true);
  }

  if (onayAcik) {
    return (
      <CamKart testID="gecmis-silme-karti" className="p-4">
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
      </CamKart>
    );
  }

  const kart = (
    <CamKart testID="gecmis-karti">
      <Pressable onPress={() => setAcik(true)} className="flex-row items-center justify-between gap-2 p-4">
        <GecmisOzeti oturum={oturum} />
        {/* #433 (kullanici karari): ikonlar KUTUSUZ -- paylas ikonu ve ok yalnizca ikon olarak durur.
            Paylas kendi Pressable'i: ic icedeki cocuk dokunusu yakalar, satirin paneli ACILMAZ.
            Acik antrenmanda sure yoktur, paylasilacak kart da yoktur. */}
        {paylasilabilir && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('paylasim.paylas')}
            onPress={() => setPaylasimAcik(true)}
            className="size-11 shrink-0 items-center justify-center"
          >
            <Share2 color={ikonRenk.muted} size={20} />
          </Pressable>
        )}
        <ChevronRight color={ikonRenk.muted} size={20} />
      </Pressable>
      {paylasimAcik && (
        <PaylasimPenceresi
          setCount={oturum.setCount}
          durationSeconds={oturum.durationSeconds ?? 0}
          acik
          onKapat={() => setPaylasimAcik(false)}
        />
      )}
      {acik && (
        <GecmisDetayPaneli
          oturum={oturum}
          onKapat={() => setAcik(false)}
          onSil={silinebilir ? onayiAc : undefined}
        />
      )}
    </CamKart>
  );

  if (!silinebilir) {
    return kart;
  }
  return (
    <KaydirilabilirSatir
      ref={kaydirmaRef}
      onSil={onayiAc}
      kaydirmaEtiketi={t('gecmis.antrenmaniSil')}
      koseSinifi="rounded-3xl"
    >
      {kart}
    </KaydirilabilirSatir>
  );
}
