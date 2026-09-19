import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronsUpDown, Check } from 'lucide-react-native';
import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '@grind/shared/api/queries';
import Modal from '../ui/Modal';
import { ikonRenk } from '../ui/renkler';

const HEDEF_GUNLERI = [1, 2, 3, 4, 5, 6, 7];

function hedefMetni(hedef: number | null): string {
  return hedef === null ? 'Hedef yok' : `Haftada ${hedef} gün`;
}

/**
 * Haftalik antrenman hedefi (#97; #117). Web'in yerel `<select>`inin RN karsiligi yok -- burada
 * ayni "kapali kutu + secince kapanan liste" hissini veren bir Modal secici kullanildi.
 */
export default function HaftalikHedefSecici() {
  const { data: ozet, isError } = useGuncelTakvimOzeti();
  const hedefAyarla = useSetWeeklyTarget();
  const hedef = ozet?.weeklyTargetDays ?? null;
  const [acik, setAcik] = useState(false);
  const kapali = !ozet || hedefAyarla.isPending;

  function sec(yeniHedef: number | null) {
    hedefAyarla.mutate(yeniHedef);
    setAcik(false);
  }

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">Haftalık hedef</Text>
      <Pressable
        disabled={kapali}
        onPress={() => setAcik(true)}
        className={`h-12 w-full flex-row items-center justify-between rounded-lg bg-inset px-4 ${kapali ? 'opacity-60' : ''}`}
      >
        <Text className="text-body-lg text-fg">{hedefMetni(hedef)}</Text>
        <ChevronsUpDown color={ikonRenk.muted} size={20} />
      </Pressable>

      <Modal acik={acik} onKapat={() => setAcik(false)} baslik="Haftalık hedef">
        <View className="flex-col gap-1">
          <SecenekSatiri etiket="Hedef yok" secili={hedef === null} onPress={() => sec(null)} />
          {HEDEF_GUNLERI.map((gun) => (
            <SecenekSatiri
              key={gun}
              etiket={`Haftada ${gun} gün`}
              secili={hedef === gun}
              onPress={() => sec(gun)}
            />
          ))}
        </View>
      </Modal>

      {isError && <Text accessibilityRole="alert" className="text-label text-danger">Hedef alınamadı.</Text>}
      {hedefAyarla.isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          Hedef kaydedilemedi.
        </Text>
      )}
    </View>
  );
}

function SecenekSatiri({ etiket, secili, onPress }: { etiket: string; secili: boolean; onPress: () => void }) {
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
