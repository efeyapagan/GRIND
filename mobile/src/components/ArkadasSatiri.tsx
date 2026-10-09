import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Crown, Flame } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { formatWeight } from '@grind/shared/lib/format';
import { donemHedefi, hedefOrani, type ArkadasDonemi } from '@grind/shared/lib/arkadasSiralamasi';
import type { TakvimGorunumu } from '@grind/shared/lib/takvim';
import HedefCubugu from './HedefCubugu';
import ProfilFotografi from './ProfilFotografi';
import CamKart from '../ui/CamKart';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  arkadas: ArkadasDonemi;
  /** #420: takvimin donemi -- aylikta hedef x4 gosterilir. */
  gorunum: TakvimGorunumu;
  /** Listenin en ustundeki satir (#418): yalnizca bir kisi lider rozeti alir. */
  lider: boolean;
}

/**
 * Arkadas karsilastirmasinin bir satiri (#418): fotograf, ad, DONEMDEKI ilerleme (#420), bugun
 * isareti, donemdeki hacim. Dokununca o kisinin profiline gider.
 *
 * Hedefi olmayan arkadas (kullanici karari) cubuk yerine yalnizca gun sayisini gosterir --
 * "0/0" gibi anlamsiz bir oran cizmek yerine ne yaptigini soyler.
 */
export default function ArkadasSatiri({ arkadas, gorunum, lider }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  const ikonRenk = useIkonRenk();

  const kendisi = arkadas.isSelf === true;
  const ad = arkadas.displayName ?? arkadas.username ?? '';
  const gun = arkadas.trainedDays ?? 0;
  const oran = hedefOrani(arkadas, gorunum);

  return (
    <CamKart
      accessibilityLabel={t('arkadaslar.satirEtiketi', { ad })}
      onPress={() => router.push(`/profile/u/${arkadas.username}`)}
      disClassName="w-full"
      className="min-h-16 w-full flex-row items-center gap-3 p-3"
    >
      {/* #425: kendi satiri hemen bulunsun. Cam uzerinde hafif `fg` dolgusu, opaklik SVG ozelliginde
          (spec Karar 9): `bg-fg opacity-5` sinifi uygulanmayip satiri tam acik gri dolduruyordu. */}
      {/* #668: `CamKart` icerigini KIRPMAZ (#559; yalnizca cam katmanlari kirpilir). Dikdortgen dolgu bu yuzden
          kendi kirpma kabinda durur -- yoksa koseleri kartin yuvarlak kosesini asiyor, acik temada (`fg` koyu)
          koyu kare koseler olarak gorunuyordu. Kose sinifi `CamKart`in varsayilaniyla ayni. */}
      {kendisi && (
        <View
          testID="kendi-satir-vurgusu-kabi"
          pointerEvents="none"
          className="absolute inset-0 overflow-hidden rounded-3xl"
        >
          <Svg style={StyleSheet.absoluteFill}>
            <Rect testID="kendi-satir-vurgusu" width="100%" height="100%" fill={ikonRenk.fg} fillOpacity={0.06} />
          </Svg>
        </View>
      )}
      <ProfilFotografi
        profil={{
          username: arkadas.username ?? '',
          displayName: arkadas.displayName ?? null,
          hasAvatar: arkadas.hasAvatar ?? false,
          avatarVersion: arkadas.avatarVersion ?? null,
        }}
        boyut="kucuk"
      />
      <View className="min-w-0 flex-1 flex-col gap-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="min-w-0 flex-1 text-body font-semibold text-fg">
            {ad}
          </Text>
          {kendisi && <Text className="shrink-0 text-label-xs text-muted">{t('arkadaslar.sen')}</Text>}
          {lider && (
            <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5">
              <Crown color={ikonRenk.accentSoft} size={12} />
              <Text className="text-label-xs text-accent-soft">{t('arkadaslar.lider')}</Text>
            </View>
          )}
          {/* Etiket ikonda DEGIL saran View'da: lucide SVG'leri `accessibilityLabel`i
              erisilebilirlik agacina tasimiyor (ProfilFotografi'ndaki `Image` ile ayni desen). */}
          {arkadas.trainedToday && (
            <View accessible accessibilityLabel={t('arkadaslar.bugunAntrenman')}>
              <Flame color={ikonRenk.success} size={16} />
            </View>
          )}
        </View>
        {oran === null ? (
          <Text className="text-label text-muted">{t('arkadaslar.hedefsizGun', { count: gun })}</Text>
        ) : (
          <View className="flex-row items-center gap-2">
            {/* Cubuk bir ilerleme GOSTERGESI, dokunulabilir degil -- erisilebilirlik agacinda
                degeri satirin metninde zaten var. */}
            <HedefCubugu oran={oran} />
            <Text className="shrink-0 text-label text-muted">
              {t('arkadaslar.hedefliGun', { gun, hedef: donemHedefi(arkadas, gorunum) })}
            </Text>
          </View>
        )}
      </View>
      <Text className="shrink-0 text-label text-muted">
        {t('arkadaslar.haftalikHacim', { kg: formatWeight(arkadas.volume ?? 0, dil) })}
      </Text>
    </CamKart>
  );
}
