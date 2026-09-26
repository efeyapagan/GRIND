import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronsUpDown, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useProfilim, useSetPrivacyLevel, type GizlilikSeviyesi } from '@grind/shared/api/queries';
import Modal from '../ui/Modal';
import { useIkonRenk } from '../ui/renkler';

const SEVIYELER: readonly GizlilikSeviyesi[] = ['Acik', 'Kisitli', 'Gizli'];

const ETIKET_ANAHTARI = {
  Acik: 'profil.gizlilikAcik',
  Kisitli: 'profil.gizlilikKisitli',
  Gizli: 'profil.gizlilikGizli',
} as const satisfies Record<GizlilikSeviyesi, string>;

/**
 * Antrenman geçmişi ve rekorların başkalarına görünürlüğü (#294). Web'in yerel `<select>`inin RN
 * karşılığı yok -- "kapalı kutu + seçince kapanan liste" Modal seçici.
 */
export default function GizlilikSeviyesiSecici() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const { data: profil, isError } = useProfilim();
  const seviyeAyarla = useSetPrivacyLevel();
  const seviye = profil?.privacyLevel ?? null;
  const [acik, setAcik] = useState(false);
  const kapali = !profil || seviyeAyarla.isPending;

  function sec(yeniSeviye: GizlilikSeviyesi) {
    seviyeAyarla.mutate(yeniSeviye);
    setAcik(false);
  }

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('profil.gizlilikSeviyesi')}</Text>
      <Pressable
        disabled={kapali}
        onPress={() => setAcik(true)}
        className={`h-12 w-full flex-row items-center justify-between rounded-lg bg-inset px-4 ${kapali ? 'opacity-60' : ''}`}
      >
        <Text className="text-body-lg text-fg">{seviye ? t(ETIKET_ANAHTARI[seviye]) : ''}</Text>
        <ChevronsUpDown color={ikonRenk.muted} size={20} />
      </Pressable>

      <Modal acik={acik} onKapat={() => setAcik(false)} baslik={t('profil.gizlilikSeviyesi')}>
        <View className="flex-col gap-1">
          {SEVIYELER.map((s) => (
            <SecenekSatiri key={s} etiket={t(ETIKET_ANAHTARI[s])} secili={seviye === s} onPress={() => sec(s)} />
          ))}
        </View>
      </Modal>

      {isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.gizlilikAlinamadi')}
        </Text>
      )}
      {seviyeAyarla.isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.gizlilikKaydedilemedi')}
        </Text>
      )}
    </View>
  );
}

function SecenekSatiri({ etiket, secili, onPress }: { etiket: string; secili: boolean; onPress: () => void }) {
  const ikonRenk = useIkonRenk();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
      className="h-12 flex-row items-center justify-between rounded-lg px-2"
    >
      <Text className="text-body-lg text-fg">{etiket}</Text>
      {secili && <Check color={ikonRenk.accent} size={20} />}
    </Pressable>
  );
}
