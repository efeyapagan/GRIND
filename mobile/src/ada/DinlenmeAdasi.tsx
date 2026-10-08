import { HStack, Image, ProgressView, Text, ZStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export interface DinlenmeAdasiProps {
  baslangicMs: number;
  bitisMs: number;
  /** Kilit ekrani ve genis gorunumdeki baslik; katalogdan gelir (widget calisma zamani `t` bilmez). */
  etiket: string;
  /** Sure dolunca gosterilen metin. */
  bittiEtiketi: string;
  /** Ikon ve halka rengi. Ada her temada siyahtir: koyu paletin vurgu rengi (`renklerKoyu.accent`). */
  vurgu: string;
}

/**
 * #414: dinlenme sayacinin Dynamic Island / kilit ekrani gorunumu. Uygulama arka planda uyurken guncelleme
 * yapamaz; kalan sureyi ve halkayi SISTEM akitir (`timerInterval`, bicim `d:ss` -- saf saniye sistemde yok),
 * bitisi `staleDate` haber verir (`isStale`): sure dolunca yalnizca saat ikonu kalir (kullanici karari).
 * Muzik calarken ada ikiye bolunur ve sayac `minimal`e duser: dolan halka + ortasinda sure.
 *
 * `'widget'` ayri bir calisma zamaninda kosar: modul kapsamindaki hicbir deger okunamaz, hepsi icerde.
 */
const DinlenmeAdasi = (props: DinlenmeAdasiProps, ortam: LiveActivityEnvironment) => {
  'widget';
  const aralik = { lower: new Date(props.baslangicMs), upper: new Date(props.bitisMs) };
  const bitti = ortam.isStale === true;
  const saat = <Image systemName="timer" color={props.vurgu} />;
  // Geri sayan metin kendisine verilen TUM genisligi kaplar (ada ekrani boydan boya kaplardi): genislik sabitlenir.
  const sure = (boyut: number, genislik: number) => (
    <Text
      timerInterval={aralik}
      countsDown
      modifiers={[
        monospacedDigit(),
        font({ size: boyut, weight: 'semibold' }),
        multilineTextAlignment('trailing'),
        frame({ width: genislik }),
      ]}
    />
  );

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        {saat}
        <Text modifiers={[font({ weight: 'semibold' })]}>{bitti ? props.bittiEtiketi : props.etiket}</Text>
        {!bitti && sure(22, 64)}
      </HStack>
    ),
    compactLeading: saat,
    compactTrailing: bitti ? undefined : sure(14, 40),
    minimal: bitti ? (
      saat
    ) : (
      <ZStack>
        <ProgressView timerInterval={aralik} countsDown={false} modifiers={[progressViewStyle('circular'), tint(props.vurgu)]} />
        <Text
          timerInterval={aralik}
          countsDown
          modifiers={[
            monospacedDigit(),
            font({ size: 9, weight: 'semibold' }),
            multilineTextAlignment('center'),
            frame({ width: 24 }),
          ]}
        />
      </ZStack>
    ),
    expandedLeading: saat,
    expandedCenter: (
      <Text modifiers={[font({ weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
        {bitti ? props.bittiEtiketi : props.etiket}
      </Text>
    ),
    expandedTrailing: bitti ? undefined : sure(22, 64),
  };
};

export default createLiveActivity('DinlenmeAdasi', DinlenmeAdasi);
