import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import { renkler } from '@grind/shared/designTokens';
import { saatDakika } from '@grind/shared/lib/format';

interface Props {
  setCount: number;
  durationSeconds: number;
}

/**
 * Paylasilan seffaf PNG'nin ta kendisi (#433). Yukaridan asagiya: set sayisi, sure, dumbbell,
 * GRIND (kullanici karari).
 *
 * TEMADAN BAGIMSIZ: renkler `useRenkPaleti()` ile DEGIL dogrudan token'dan okunur ve arkaplan
 * hicbir seviyede boyanmaz. Sebep: bu gorsel bizim uygulamamizda degil, kullanicinin story
 * fotografinin ustunde gorunecek -- acik temadayken acik renkli bir kart uretmek onu okunmaz
 * yapardi. Ayni sebeple `className` kullanilmaz: NativeWind sinifi temaya bagli.
 *
 * Arkaplanin SEFFAF kalmasi yakalamanin (captureRef + PNG) tek sartidir: buradaki hicbir `View`
 * `backgroundColor` almamalidir.
 */
const PaylasimKarti = forwardRef<View, Props>(function PaylasimKarti({ setCount, durationSeconds }, ref) {
  const { t } = useTranslation();
  const { saat, dakika } = saatDakika(durationSeconds);

  return (
    <View ref={ref} collapsable={false} style={stil.kart}>
      <View style={stil.satir}>
        <Text style={stil.sayi}>{setCount}</Text>
        <Text style={stil.birim}>{t('gecmis.setBirimi')}</Text>
      </View>

      <View style={stil.satir}>
        {saat > 0 && (
          <>
            <Text style={stil.sayi}>{saat}</Text>
            <Text style={stil.birim}>{t('gecmis.saatBirimi')}</Text>
          </>
        )}
        <Text style={stil.sayi}>{dakika}</Text>
        <Text style={stil.birim}>{t('gecmis.dakikaBirimi')}</Text>
      </View>

      <Dumbbell color={renkler.accent} size={64} strokeWidth={2} />

      <Text style={stil.marka}>GRIND</Text>
    </View>
  );
});

export default PaylasimKarti;

const stil = StyleSheet.create({
  // backgroundColor YOK: seffafligin kaynagi bu.
  kart: { alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 24 },
  satir: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sayi: { color: renkler.accent, fontSize: 72, fontWeight: '800', lineHeight: 78 },
  birim: { color: renkler.accent, fontSize: 24, fontWeight: '700', textTransform: 'uppercase' },
  marka: { color: renkler.accent, fontSize: 40, fontWeight: '900', letterSpacing: 4 },
});
