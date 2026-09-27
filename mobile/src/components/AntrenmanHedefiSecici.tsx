import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronsUpDown, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useProfilim, useSetTrainingGoal, type AntrenmanHedefi } from '@grind/shared/api/queries';
import Modal from '../ui/Modal';
import { useIkonRenk } from '../ui/renkler';

/** `null` = seçilmemiş; listede ilk sırada durur ve hedefi kaldırır. */
const HEDEFLER: readonly (AntrenmanHedefi | null)[] = [null, 'Hipertrofi', 'Guc', 'KiloVerme', 'GenelForm'];

const ETIKET_ANAHTARI = {
  Hipertrofi: 'profil.hedefHipertrofi',
  Guc: 'profil.hedefGuc',
  KiloVerme: 'profil.hedefKiloVerme',
  GenelForm: 'profil.hedefGenelForm',
} as const satisfies Record<AntrenmanHedefi, string>;

/**
 * Antrenman hedefi (#444). Yapay zekâ yorumunun bağlamına girer — başka bir yerde hesabı
 * değiştirmez. `GizlilikSeviyesiSecici` ile aynı desen: kapalı kutu + seçince kapanan Modal liste.
 */
export default function AntrenmanHedefiSecici() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const { data: profil } = useProfilim();
  const hedefAyarla = useSetTrainingGoal();
  const hedef = profil?.trainingGoal ?? null;
  const [acik, setAcik] = useState(false);
  const kapali = !profil || hedefAyarla.isPending;

  function etiket(deger: AntrenmanHedefi | null) {
    return deger === null ? t('profil.hedefSecilmedi') : t(ETIKET_ANAHTARI[deger]);
  }

  function sec(yeniHedef: AntrenmanHedefi | null) {
    hedefAyarla.mutate(yeniHedef);
    setAcik(false);
  }

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('profil.antrenmanAmaci')}</Text>
      <Pressable
        disabled={kapali}
        onPress={() => setAcik(true)}
        className={`h-12 w-full flex-row items-center justify-between rounded-lg bg-inset px-4 ${kapali ? 'opacity-60' : ''}`}
      >
        <Text className="text-body-lg text-fg">{profil ? etiket(hedef) : ''}</Text>
        <ChevronsUpDown color={ikonRenk.muted} size={20} />
      </Pressable>
      <Text className="text-label text-muted">{t('profil.hedefAciklama')}</Text>

      <Modal acik={acik} onKapat={() => setAcik(false)} baslik={t('profil.antrenmanAmaci')}>
        <View className="flex-col gap-1">
          {HEDEFLER.map((h) => (
            <SecenekSatiri
              key={h ?? 'yok'}
              etiket={etiket(h)}
              secili={hedef === h}
              onPress={() => sec(h)}
            />
          ))}
        </View>
      </Modal>

      {hedefAyarla.isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.amacKaydedilemedi')}
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
