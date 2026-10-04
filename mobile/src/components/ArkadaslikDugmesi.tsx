import { Alert, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useArkadaslikIstegi, useArkadaslikYaniti, useTakipcidenCikar, type KullaniciProfili,
} from '@grind/shared/api/queries';
import { arkadaslikDurumu, type ArkadaslikDurumu } from '@grind/shared/lib/takip';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import { useOnayIste } from '../ui/onayIste';
import CamDolgu from '../ui/CamDolgu';

const ETIKET = {
  ekle: 'takip.arkadasEkle',
  gonderildi: 'takip.istekGonderildi',
  gelen: 'takip.istegiYanitla',
  arkadas: 'takip.arkadassiniz',
  sinirDoldu: 'takip.istekGonderilemez',
} as const satisfies Record<ArkadaslikDurumu, string>;

/**
 * Profilde sağdaki düğme (#628) — Instagram'daki "Mesaj Gönder"in yeri. Arkadaş ekle birincil (accent),
 * diğer haller hafif dolgu (TakipDugmesi'nin ikincil dili).
 */
export default function ArkadaslikDugmesi({ profil }: { profil: KullaniciProfili }) {
  const { t } = useTranslation();
  const cevrimici = useCevrimiciEylem();
  const onayIste = useOnayIste();
  const istek = useArkadaslikIstegi();
  const yanit = useArkadaslikYaniti();
  const cikar = useTakipcidenCikar();
  const durum = arkadaslikDurumu(profil);
  if (!durum) return null;

  const kullaniciAdi = profil.username;
  const ad = profil.displayName ?? profil.username;
  const bekliyor = istek.isPending || yanit.isPending || cikar.isPending;
  const hata = istek.isError || yanit.isError || cikar.isError;

  const bas = cevrimici(() => {
    switch (durum) {
      case 'ekle':
        istek.mutate({ kullaniciAdi, gonder: true });
        return;
      case 'gonderildi':
        onayIste({ mesaj: t('takip.istegiGeriCekOnay', { ad }), eylemEtiketi: t('takip.istekGonderildi'),
          onEvet: () => istek.mutate({ kullaniciAdi, gonder: false }) });
        return;
      case 'gelen':
        Alert.alert(t('takip.istegiYanitla'), undefined, [
          { text: t('ortak.vazgec'), style: 'cancel' },
          { text: t('takip.reddet'), style: 'destructive', onPress: () => yanit.mutate({ kullaniciAdi, kabul: false }) },
          { text: t('takip.kabulEt'), onPress: () => yanit.mutate({ kullaniciAdi, kabul: true }) },
        ]);
        return;
      case 'arkadas':
        onayIste({ mesaj: t('takip.arkadasliktanCikarOnay', { ad }), eylemEtiketi: t('takip.arkadasliktanCikar'),
          onEvet: () => cikar.mutate({ kullaniciAdi }) });
        return;
      case 'sinirDoldu':
        return;
    }
  });

  const birincil = durum === 'ekle';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(ETIKET[durum])}
        disabled={bekliyor || durum === 'sinirDoldu'}
        onPress={bas}
        className={`h-10 flex-1 items-center justify-center rounded-xl px-3 ${birincil ? 'bg-accent' : 'bg-transparent'} ${
          bekliyor || durum === 'sinirDoldu' ? 'opacity-60' : ''
        }`}
      >
        {!birincil && <CamDolgu opaklik={0.1} yaricap={12} />}
        <Text className={`text-label ${birincil ? 'font-bold text-on-accent' : 'text-fg'}`}>{t(ETIKET[durum])}</Text>
      </Pressable>
      {hata && (
        <Text accessibilityRole="alert" className="text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </Text>
      )}
    </>
  );
}
