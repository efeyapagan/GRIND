import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DILLER, DIL_ADLARI, DIL_BAYRAKLARI, type Dil } from '@grind/shared/i18n/dil';
import { useYorumDili } from '../ui/YorumDiliContext';
import { useIkonRenk } from '../ui/renkler';

/**
 * GRINDY ekraninin sag ustundeki bayrak ve actigi kucuk dil penceresi (#199).
 *
 * Liste `DILLER`'den turer, elle yazilmaz: "uygulamaya yeni dil eklendikce AI da o dilde yorum
 * vermeli" sartinin karsiligi budur.
 *
 * Pencere ekrani KAPLAMAZ (uygulamanin `Modal`'i gibi ortada degil): bayragin hemen altinda,
 * sag ust kosede acilir -- kullanici nereye bastigini kaybetmesin.
 */
export default function YorumDiliSecici() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const { yorumDili, yorumDiliniSec } = useYorumDili();
  const [acik, setAcik] = useState(false);

  function sec(dil: Dil) {
    yorumDiliniSec(dil);
    setAcik(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('yorumlar.yorumDili')}
        onPress={() => setAcik(true)}
        className="size-10 shrink-0 items-center justify-center"
      >
        <Text className="text-body-lg">{DIL_BAYRAKLARI[yorumDili]}</Text>
      </Pressable>

      <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)}>
        {/* Disariya dokunmak kapatir: kucuk bir menude "Kapat" dugmesi fazladan gurultu. */}
        <Pressable className="flex-1" onPress={() => setAcik(false)} accessibilityLabel={t('ortak.kapat')}>
          <View className="mr-3 mt-24 self-end rounded-xl bg-surface-2 p-1 shadow-lg">
            {DILLER.map((dil) => (
              <Pressable
                key={dil}
                testID={`yorum-dili-${dil}`}
                accessibilityRole="button"
                accessibilityState={{ selected: yorumDili === dil }}
                onPress={() => sec(dil)}
                className="min-h-11 flex-row items-center gap-3 rounded-lg px-3"
              >
                <Text className="text-body-lg">{DIL_BAYRAKLARI[dil]}</Text>
                <Text className="text-body-lg text-fg">{DIL_ADLARI[dil]}</Text>
                <View className="size-5 items-center justify-center">
                  {yorumDili === dil && <Check color={ikonRenk.accent} size={18} />}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
