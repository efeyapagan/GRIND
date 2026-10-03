import { forwardRef } from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import { renkler } from '@grind/shared/designTokens';
import { saatDakika } from '@grind/shared/lib/format';

/**
 * #598 (kullanici karari): uzun sablon adi bu genislikten sonra alt satira gecer -- 32 punto kalin
 * yazida yaklasik 14-16 karakter. Satir sayisi kisitlanmaz, ad hic kesilmez.
 */
export const PAYLASIM_BASLIK_AZAMI_GENISLIK = 280;

interface Props {
  /** #598 (kullanici karari): sablonsuz antrenmanda (null) ustte hicbir baslik yazmaz. */
  templateName: string | null;
  setCount: number;
  durationSeconds: number;
  /** #598: ayni sablonun onceki antrenmanlarini gecen hacim -- GRIND'in altinda "Volume PR" yazar. */
  volumePr?: boolean;
}

const BEYAZ = '#FFFFFF';
const SIYAH = '#000000';

/** #598: RN `Text` dis cizgi (stroke) desteklemez; beyaz yazinin etrafina siyah bir kenarlik, 8 kayma ile. */
const KENAR_KAYMALARI: [number, number][] = [
  [-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5],
  [-1.06, -1.06], [1.06, -1.06], [-1.06, 1.06], [1.06, 1.06],
];

/**
 * #598 (kullanici karari): beyaz, harfleri siyah cerceveli yazi -- story fotografinin ustunde her zeminde
 * okunsun. Siyah kopyalar ust yaziyla ayni genislikte durur (left/right), boylece uzun ad alt satira
 * gectiginde kenar da ayni satirlardan gecer.
 */
function CerceveliYazi({ testID, style, children }: { testID: string; style: TextStyle; children: React.ReactNode }) {
  return (
    <View>
      {KENAR_KAYMALARI.map(([x, y]) => (
        <Text
          key={`${x}:${y}`}
          testID={`${testID}-kenar`}
          style={[style, { color: SIYAH, position: 'absolute', left: x, right: -x, top: y, bottom: -y }]}
        >
          {children}
        </Text>
      ))}
      <Text testID={testID} style={[style, { color: BEYAZ }]}>
        {children}
      </Text>
    </View>
  );
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
  { templateName, setCount, durationSeconds, volumePr = false },
  ref,
) {
  const { t } = useTranslation();
  const { saat, dakika } = saatDakika(durationSeconds);

  return (
    <View ref={ref} collapsable={false} style={stil.kart}>
      {templateName !== null && (
        <CerceveliYazi testID="paylasim-baslik" style={stil.isim}>
          {templateName}
        </CerceveliYazi>
      )}

      {/* #598: rakam beyaz-cerceveli, birim turuncu -- ayni satirda, ayni taban cizgisinde. */}
      <View style={stil.detaySatiri}>
        <CerceveliYazi testID="paylasim-set-sayisi" style={stil.detay}>
          {setCount}
        </CerceveliYazi>
        <Text style={stil.birim}>{t('gecmis.setBirimi')}</Text>
      </View>
      <View style={stil.detaySatiri}>
        {saat > 0 && (
          <>
            <CerceveliYazi testID="paylasim-saat" style={stil.detay}>
              {saat}
            </CerceveliYazi>
            <Text style={[stil.birim, stil.saatBirimi]}>{t('gecmis.saatBirimi')}</Text>
          </>
        )}
        <CerceveliYazi testID="paylasim-dakika" style={stil.detay}>
          {dakika}
        </CerceveliYazi>
        <Text style={stil.birim}>{t('gecmis.dakikaBirimi')}</Text>
      </View>

      <View style={stil.markaSatiri}>
        <Dumbbell color={renkler.accent} size={18} strokeWidth={2} />
        <CerceveliYazi testID="paylasim-marka" style={stil.marka}>
          GRIND
        </CerceveliYazi>
      </View>

      {volumePr && (
        <CerceveliYazi testID="paylasim-hacim-rekoru" style={stil.hacimRekoru}>
          {t('paylasim.hacimRekoru')}
        </CerceveliYazi>
      )}
    </View>
  );
});

export default PaylasimKarti;

/** #598 (kullanici karari): Volume PR GRIND'den 5 punto, birimler rakamdan 4 punto kucuk. */
const MARKA_PUNTOSU = 16;
const DETAY_PUNTOSU = 20;

const stil = StyleSheet.create({
  // backgroundColor YOK: seffafligin kaynagi bu.
  kart: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 24 },
  isim: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: PAYLASIM_BASLIK_AZAMI_GENISLIK,
  },
  detaySatiri: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  detay: { fontSize: DETAY_PUNTOSU, fontWeight: '700' },
  // #598: birimler rakamin yaninda bir ton geride kalsin diye soluk turuncu.
  birim: { color: renkler['accent-soft'], fontSize: DETAY_PUNTOSU - 4, fontWeight: '700', textTransform: 'uppercase' },
  saatBirimi: { marginRight: 4 },
  markaSatiri: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  marka: { fontSize: MARKA_PUNTOSU, fontWeight: '900', letterSpacing: 2 },
  hacimRekoru: { fontSize: MARKA_PUNTOSU - 5, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
});
