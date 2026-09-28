import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { CalendarDays, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDil } from '@grind/shared/i18n';
import { formatAralik } from '@grind/shared/lib/format';
import { ayBasligi, gorunumAraligi, sonDonemler, type TakvimGorunumu } from '@grind/shared/lib/takvim';
import { UST_BAR_YUKSEKLIGI } from '../ui/olculer';
import { useArkadaslarDonemi } from '../ui/TakvimDonemiContext';
import { useIkonRenk } from '../ui/renkler';

/** Pencerede listelenen son donem sayisi (hafta ya da ay). */
const SECICI_DONEM_SAYISI = 8;

const GORUNUMLER: readonly TakvimGorunumu[] = ['hafta', 'ay'];

/**
 * Tum arkadaslar ekraninin sag ustundeki takvim tusu ve actigi kucuk donem penceresi (#420):
 * once Haftalik / Aylik, sonra hangi hafta ya da ay (kullanici karari). Secim EKRANIN donemine
 * yazilir (`useArkadaslarDonemi`), ana sayfa takvimini tasimaz.
 *
 * Pencere tusun HEMEN ALTINDA, sag kosede acilir (kullanici karari; GRINDY ekranindaki dil
 * secicisinin deseni). Ust kenari guvenli alan + bar yuksekligidir: sabit bir `mt-*` simulatorde
 * pencereyi tusun ustune bindiriyordu. Liste gelecege uzanmaz (`sonDonemler`, #81).
 *
 * Haftalik/Aylik'a basmak TEK BASINA donemi degistirmez: yalnizca listeyi cevirir. Donem, bir hafta
 * ya da ay secilince degisir -- yoksa "Aylik"a dokunan kullanici henuz ay secmeden liste degisirdi.
 */
export default function DonemSecici() {
  const { t } = useTranslation();
  const dil = useDil();
  const ikonRenk = useIkonRenk();
  const insets = useSafeAreaInsets();
  const { bugun, gorunum, gosterilen, sec } = useArkadaslarDonemi();
  const [acik, setAcik] = useState(false);
  const [taslak, setTaslak] = useState<TakvimGorunumu>(gorunum);
  const seciliBaslangic = gorunumAraligi(gorunum, gosterilen).from;

  function ac() {
    setTaslak(gorunum);
    setAcik(true);
  }

  function donemSec(gun: string) {
    sec(taslak, gun);
    setAcik(false);
  }

  function etiket(gun: string): string {
    if (taslak === 'ay') {
      return ayBasligi(gun, dil);
    }
    const { from, to } = gorunumAraligi('hafta', gun);
    return formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`, dil);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('arkadaslar.donemSec')}
        onPress={ac}
        className="size-10 shrink-0 items-center justify-center"
      >
        <CalendarDays color={ikonRenk.fg} size={22} />
      </Pressable>

      <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)}>
        {/* Disariya dokunmak kapatir: kucuk bir menude "Kapat" dugmesi fazladan gurultu. */}
        <Pressable className="flex-1" onPress={() => setAcik(false)} accessibilityLabel={t('ortak.kapat')}>
          <View
            style={{ marginTop: insets.top + UST_BAR_YUKSEKLIGI }}
            className="mr-3 w-64 self-end rounded-xl bg-surface-2 p-1 shadow-lg"
          >
            <View className="flex-row gap-1 p-1">
              {GORUNUMLER.map((secenek) => (
                <Pressable
                  key={secenek}
                  accessibilityRole="button"
                  accessibilityState={{ selected: taslak === secenek }}
                  onPress={() => setTaslak(secenek)}
                  className={`min-h-9 flex-1 items-center justify-center rounded-lg ${taslak === secenek ? 'bg-surface-4' : 'bg-transparent'}`}
                >
                  <Text className={`text-label ${taslak === secenek ? 'text-fg' : 'text-muted'}`}>
                    {t(secenek === 'ay' ? 'arkadaslar.aylik' : 'arkadaslar.haftalik')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {sonDonemler(taslak, bugun, SECICI_DONEM_SAYISI).map((gun) => {
              const secili = taslak === gorunum && gun === seciliBaslangic;
              return (
                <Pressable
                  key={gun}
                  testID={`donem-${gun}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: secili }}
                  onPress={() => donemSec(gun)}
                  className="min-h-11 flex-row items-center justify-between gap-3 rounded-lg px-3"
                >
                  <Text className="text-body text-fg">{etiket(gun)}</Text>
                  <View className="size-5 items-center justify-center">
                    {secili && <Check color={ikonRenk.accent} size={18} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
