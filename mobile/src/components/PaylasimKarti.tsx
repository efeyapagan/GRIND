import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import { renkler } from '@grind/shared/designTokens';
import { saatDakika } from '@grind/shared/lib/format';

interface Props {
  /** #470 (kullanici karari): isim yoksa (sablonsuz antrenman) "Serbest" gosterilir. */
  templateName: string | null;
  setCount: number;
  durationSeconds: number;
}

/**
 * Paylasilan seffaf PNG'nin ta kendisi (#433, duzen #470). Yukaridan asagiya, kucule kucule:
 * sablon/antrenman ismi (en buyuk), set sayisi, ayni puntoyla sure, en altta dumbbell + GRIND
 * (en kucuk, kullanici karari -- once dumbbell, yaninda GRIND).
 *
 * TEMADAN BAGIMSIZ: renkler `useRenkPaleti()` ile DEGIL dogrudan token'dan okunur ve arkaplan
 * hicbir seviyede boyanmaz. Sebep: bu gorsel bizim uygulamamizda degil, kullanicinin story
 * fotografinin ustunde gorunecek -- acik temadayken acik renkli bir kart uretmek onu okunmaz
 * yapardi. Ayni sebeple `className` kullanilmaz: NativeWind sinifi temaya bagli.
 *
 * Arkaplanin SEFFAF kalmasi yakalamanin (captureRef + PNG) tek sartidir: buradaki hicbir `View`
 * `backgroundColor` almamalidir.
 */
const PaylasimKarti = forwardRef<View, Props>(function PaylasimKarti(
  { templateName, setCount, durationSeconds },
  ref,
) {
  const { t } = useTranslation();
  const { saat, dakika } = saatDakika(durationSeconds);

  return (
    <View ref={ref} collapsable={false} style={stil.kart}>
      <Text style={stil.isim}>{templateName ?? t('gecmis.serbest')}</Text>

      <Text style={stil.detay}>
        {setCount} {t('gecmis.setBirimi')}
      </Text>
      <Text style={stil.detay}>
        {saat > 0 ? `${saat} ${t('gecmis.saatBirimi')} ` : ''}
        {dakika} {t('gecmis.dakikaBirimi')}
      </Text>

      <View style={stil.markaSatiri}>
        <Dumbbell color={renkler.accent} size={18} strokeWidth={2} />
        <Text style={stil.marka}>GRIND</Text>
      </View>
    </View>
  );
});

export default PaylasimKarti;

const stil = StyleSheet.create({
  // backgroundColor YOK: seffafligin kaynagi bu.
  kart: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 24 },
  isim: { color: renkler.accent, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  detay: { color: renkler.accent, fontSize: 20, fontWeight: '700', textTransform: 'uppercase' },
  markaSatiri: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  marka: { color: renkler.accent, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
});
