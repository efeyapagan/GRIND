import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTakipcidenCikar, useTakipEt, type KullaniciOzeti } from '@grind/shared/api/queries';
import type { ListeSatiriEylemi } from '@grind/shared/lib/takip';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import Rozet from '../ui/Rozet';
import CamKart from '../ui/CamKart';
import CamDolgu from '../ui/CamDolgu';
import { useOnayIste } from '../ui/onayIste';
import ProfilFotografi from './ProfilFotografi';
import TakipDugmesi from './TakipDugmesi';

const EYLEM_METNI = {
  arkadasliktanCikar: { etiket: 'takip.arkadasliktanCikar', onay: 'takip.arkadasliktanCikarOnay' },
  takibiBirak: { etiket: 'takip.takibiBirak', onay: 'takip.takibiBirakOnay' },
  takipcidenCikar: { etiket: 'takip.takipcidenCikar', onay: 'takip.takipcidenCikarOnay' },
} as const satisfies Record<ListeSatiriEylemi, { etiket: string; onay: string }>;

/**
 * web/src/components/KullaniciSatiri.tsx ile ayni (#284): fotograf, ad, gorunen isim ve iliskiye gore
 * dugme; arkadasa dugme yerine gosterge. Satira dokunmak profili acar.
 * #628: kendi listende (`eylem`) satirin saginda listeye gore bir eylem durur, onay ister.
 */
export default function KullaniciSatiri({
  kisi,
  eylem = null,
}: {
  kisi: KullaniciOzeti;
  eylem?: ListeSatiriEylemi | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const cevrimici = useCevrimiciEylem();
  const onayIste = useOnayIste();
  const takipci = useTakipcidenCikar();
  const takip = useTakipEt();
  const ad = kisi.displayName ?? kisi.username;
  // Arkadasliktan cikar = onu takipcilerimden cikarmak; ben takipte kalirim (#628, 2026-10-04).
  const calistir = (e: ListeSatiriEylemi) =>
    e === 'takibiBirak'
      ? takip.mutate({ kullaniciAdi: kisi.username, takipEt: false })
      : takipci.mutate({ kullaniciAdi: kisi.username });
  // Satirdaki eylemin kendi mutasyonu: bekleyince dugme kilitlenir, hata verince TakipDugmesi gibi uyarir.
  const aktif = eylem === 'takibiBirak' ? takip : takipci;

  return (
    // #592: cam kart (spec Karar 9) -- arkadas karsilastirmasindaki satirla ayni dil ve kose.
    <CamKart testID={`kullanici-satiri-${kisi.username}`} className="flex-row items-center gap-3 p-3">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/profile/u/${encodeURIComponent(kisi.username)}`)}
        className="min-w-0 flex-1 flex-row items-center gap-3"
      >
        <ProfilFotografi profil={kisi} boyut="kucuk" />
        <View className="min-w-0 flex-1 flex-col">
          <Text numberOfLines={1} className="text-label text-fg">
            {kisi.username}
          </Text>
          {kisi.displayName && (
            <Text numberOfLines={1} className="text-body text-muted">
              {kisi.displayName}
            </Text>
          )}
        </View>
      </Pressable>
      {eylem ? (
        <View className="items-end gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(EYLEM_METNI[eylem].etiket)}
            disabled={aktif.isPending}
            onPress={cevrimici(() =>
              onayIste({
                mesaj: t(EYLEM_METNI[eylem].onay, { ad }),
                eylemEtiketi: t(EYLEM_METNI[eylem].etiket),
                onEvet: () => calistir(eylem),
              }),
            )}
            className={`h-9 items-center justify-center rounded-xl px-3 ${aktif.isPending ? 'opacity-60' : ''}`}
          >
            <CamDolgu opaklik={0.1} yaricap={12} />
            <Text className="text-label text-fg">{t(EYLEM_METNI[eylem].etiket)}</Text>
          </Pressable>
          {aktif.isError && (
            <Text accessibilityRole="alert" className="text-label-xs text-danger">
              {t('takip.islemYapilamadi')}
            </Text>
          )}
        </View>
      ) : kisi.relation === 'Friends' ? (
        <Rozet ton="acik">{t('takip.arkadas')}</Rozet>
      ) : (
        <TakipDugmesi kullaniciAdi={kisi.username} iliski={kisi.relation} boyut="kucuk" />
      )}
    </CamKart>
  );
}
