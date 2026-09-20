import { useEffect, useRef } from 'react';
import { View, Text, Pressable, PanResponder, type GestureResponderEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Zorluk } from '@grind/shared/api/queries';
import { renkler } from '@grind/shared/designTokens';

interface Props {
  deger: Zorluk;
  onDegis: (zorluk: Zorluk) => void;
}

interface Kademe {
  deger: Zorluk;
  etiket: string;
  cumle: string;
}

/**
 * Kolaydan zora sıralı — kadranın durak sırası ve artır/azalt yönü bu diziden gelir. Sunucunun enum
 * değerleri İngilizce, kullanıcıya gösterilen her şey Türkçe. Cümleler RPE mantığıyla yazıldı:
 * kullanıcı "kaç üzerinden kaç" diye düşünmek yerine antrenmanda ne hissettiğini seçer.
 */
const KADEMELER: Kademe[] = [
  { deger: 'VeryEasy', etiket: 'Çok kolay', cumle: 'Sohbet edebilirdim' },
  { deger: 'Easy', etiket: 'Kolay', cumle: 'Birkaç tekrarım daha vardı' },
  { deger: 'Medium', etiket: 'Orta', cumle: 'Zorlandım ama kontrollüydü' },
  { deger: 'Hard', etiket: 'Zor', cumle: 'Nefesimi zor tutuyordum' },
  { deger: 'Maximal', etiket: 'Maksimal', cumle: 'Son tekrarda tükendim' },
];

const BOYUT = 280;
const MERKEZ = BOYUT / 2;
const HALKA_YARICAP = 112;
const HALKA_KALINLIK = 22;
const DURAK_BOYUT = 44;
/** İlk durak sol üstte; kalanlar saat yönünde eşit aralıklarla (kullanıcının çizimindeki yerleşim). */
const BASLANGIC_ACI = -144;
const ARALIK_ACI = 360 / KADEMELER.length;

function aci(sira: number): number {
  return BASLANGIC_ACI + sira * ARALIK_ACI;
}

function radyan(derece: number): number {
  return (derece * Math.PI) / 180;
}

/** İki açı arasındaki en kısa mesafe (derece, 0–180) — kadran tam tur olduğu için sarma hesaplanır. */
function aciFarki(a: number, b: number): number {
  const fark = Math.abs(((a - b) % 360) + 360) % 360;
  return fark > 180 ? 360 - fark : fark;
}

/** Dokunulan noktanın açısına EN YAKIN durağın sırası — parmağın halkaya tam oturması gerekmez. */
function enYakinDurak(x: number, y: number): number {
  const dokunusAcisi = (Math.atan2(y - MERKEZ, x - MERKEZ) * 180) / Math.PI;
  let enYakin = 0;
  for (let sira = 1; sira < KADEMELER.length; sira += 1) {
    if (aciFarki(dokunusAcisi, aci(sira)) < aciFarki(dokunusAcisi, aci(enYakin))) {
      enYakin = sira;
    }
  }
  return enYakin;
}

/**
 * Antrenman zorluğunun beş duraklı döner kadranı (#153). Seçim üç yoldan yapılabilir: halkayı
 * parmakla çevirmek, bir durağa dokunmak, ya da ekran okuyucunun artır/azalt eylemi
 * (`accessibilityRole="adjustable"`). Üçü de aynı `sec` fonksiyonuna bağlanır (DRY).
 *
 * Kontrollü bileşen: seçili kademeyi kendisi TUTMAZ, `deger` ile alır — antrenmanı bitiren ekran
 * hangi değeri göndereceğini tek yerden bilir.
 *
 * Renkler yalnızca tasarım token'larından gelir; seçili durak `accent` alır (gerçek bir "seçili"
 * hâl olduğu için `accent` kuralı sağlanır), diğerleri `surface-4`'te durur.
 */
export default function ZorlukKadrani({ deger, onDegis }: Props) {
  const seciliSira = Math.max(
    0,
    KADEMELER.findIndex((kademe) => kademe.deger === deger),
  );
  const secili = KADEMELER[seciliSira];

  // PanResponder bir kez kurulur (her render'da yeniden kurmak süren jesti koparırdı), bu yüzden
  // güncel `onDegis`e ref üzerinden ulaşır.
  const onDegisRef = useRef(onDegis);
  useEffect(() => {
    onDegisRef.current = onDegis;
  }, [onDegis]);

  const cevirmeRef = useRef(
    PanResponder.create({
      // Yalnızca non-capture: dokunuş önce en içteki bileşene sorulur, böylece durakların kendi
      // onPress'i çalışmaya devam eder; halkanın boş yerinden başlayan sürükleme buraya düşer.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (olay: GestureResponderEvent) => cevir(olay),
      onPanResponderMove: (olay: GestureResponderEvent) => cevir(olay),
    }),
  );

  function cevir(olay: GestureResponderEvent) {
    const { locationX, locationY } = olay.nativeEvent;
    onDegisRef.current(KADEMELER[enYakinDurak(locationX, locationY)].deger);
  }

  function sirayiSec(sira: number) {
    if (sira >= 0 && sira < KADEMELER.length && sira !== seciliSira) {
      onDegis(KADEMELER[sira].deger);
    }
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Antrenman zorluğu"
      accessibilityValue={{ min: 1, max: KADEMELER.length, now: seciliSira + 1, text: secili.etiket }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(olay) => {
        if (olay.nativeEvent.actionName === 'increment') {
          sirayiSec(seciliSira + 1);
        } else if (olay.nativeEvent.actionName === 'decrement') {
          sirayiSec(seciliSira - 1);
        }
      }}
      style={{ width: BOYUT, height: BOYUT }}
      className="items-center justify-center"
      {...cevirmeRef.current.panHandlers}
    >
      <Svg width={BOYUT} height={BOYUT} style={{ position: 'absolute' }}>
        <Circle
          cx={MERKEZ}
          cy={MERKEZ}
          r={HALKA_YARICAP}
          fill="none"
          stroke={renkler['surface-2']}
          strokeWidth={HALKA_KALINLIK}
        />
      </Svg>

      <View className="items-center gap-1 px-14">
        <Text className="text-heading font-bold text-fg">{secili.etiket}</Text>
        <Text className="text-center text-body text-muted">{secili.cumle}</Text>
      </View>

      {KADEMELER.map((kademe, sira) => {
        const seciliMi = sira === seciliSira;
        return (
          <Pressable
            key={kademe.deger}
            accessibilityRole="button"
            accessibilityLabel={kademe.etiket}
            accessibilityState={{ selected: seciliMi }}
            onPress={() => sirayiSec(sira)}
            style={{
              position: 'absolute',
              width: DURAK_BOYUT,
              height: DURAK_BOYUT,
              left: MERKEZ + HALKA_YARICAP * Math.cos(radyan(aci(sira))) - DURAK_BOYUT / 2,
              top: MERKEZ + HALKA_YARICAP * Math.sin(radyan(aci(sira))) - DURAK_BOYUT / 2,
            }}
            className={`items-center justify-center rounded-full ${seciliMi ? 'bg-accent' : 'bg-surface-4'}`}
          >
            <Text className={`text-body font-bold ${seciliMi ? 'text-on-accent' : 'text-muted'}`}>
              {sira + 1}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
