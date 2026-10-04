import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, UserMinus, UserPlus, UserX } from 'lucide-react-native';
import {
  useArkadaslikIstegi, useTakipcidenCikar, useSessizeAl, useTakipEt, type KullaniciProfili,
} from '@grind/shared/api/queries';
import { arkadaslikDurumu } from '@grind/shared/lib/takip';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import CamAyirici from '../ui/CamAyirici';
import Modal from '../ui/Modal';
import { useOnayIste } from '../ui/onayIste';
import { useIkonRenk } from '../ui/renkler';
import ProfilFotografi from './ProfilFotografi';

interface Satir {
  etiket: string;
  ikon: typeof Bell;
  tehlikeli?: boolean;
  onPress: () => void;
}

/**
 * "Takiptesin ⌄" menüsü (#628): Instagram'daki kişi menüsünün sadeleşmiş hali — cam pencere, üstte fotoğraf
 * ve ad, altında arkadaşlık · sessize al · takibi bırak. Yıkıcı satırlar onay ister. Kısıtla ayrı dilimde.
 */
export default function KisiMenusu({ profil, acik, onKapat }: { profil: KullaniciProfili; acik: boolean; onKapat: () => void }) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const cevrimici = useCevrimiciEylem();
  const onayIste = useOnayIste();
  const istek = useArkadaslikIstegi();
  const cikar = useTakipcidenCikar();
  const sessiz = useSessizeAl();
  const takip = useTakipEt();
  const kullaniciAdi = profil.username;
  const ad = profil.displayName ?? profil.username;
  const kapatinca = { onSuccess: onKapat };

  const arkadaslik = arkadaslikDurumu(profil);
  const arkadaslikSatiri: Satir | null =
    arkadaslik === 'arkadas'
      ? { etiket: t('takip.arkadasliktanCikar'), ikon: UserMinus, tehlikeli: true,
          onPress: () => onayIste({ mesaj: t('takip.arkadasliktanCikarOnay', { ad }), eylemEtiketi: t('takip.arkadasliktanCikar'),
            onEvet: () => cikar.mutate({ kullaniciAdi }, kapatinca) }) }
      : arkadaslik === 'gonderildi'
        ? { etiket: t('takip.istekGonderildi'), ikon: UserPlus,
            onPress: () => onayIste({ mesaj: t('takip.istegiGeriCekOnay', { ad }), eylemEtiketi: t('takip.istekGonderildi'),
              onEvet: () => istek.mutate({ kullaniciAdi, gonder: false }, kapatinca) }) }
        : arkadaslik === 'ekle'
          ? { etiket: t('takip.arkadasEkle'), ikon: UserPlus, onPress: () => istek.mutate({ kullaniciAdi, gonder: true }, kapatinca) }
          : null; // 'gelen' sağ düğmeden yanıtlanır; 'sinirDoldu' satır göstermez.

  const satirlar: Satir[] = [
    ...(arkadaslikSatiri ? [arkadaslikSatiri] : []),
    profil.notificationsMuted
      ? { etiket: t('takip.sessizdenCikar'), ikon: Bell, onPress: () => sessiz.mutate({ kullaniciAdi, sessiz: false }, kapatinca) }
      : { etiket: t('takip.sessizeAl'), ikon: BellOff, onPress: () => sessiz.mutate({ kullaniciAdi, sessiz: true }, kapatinca) },
    { etiket: t('takip.takibiBirak'), ikon: UserX, tehlikeli: true,
      onPress: () => onayIste({ mesaj: t('takip.takibiBirakOnay', { ad }), eylemEtiketi: t('takip.takibiBirak'),
        onEvet: () => takip.mutate({ kullaniciAdi, takipEt: false }, kapatinca) }) },
  ];
  const hata = istek.isError || cikar.isError || sessiz.isError || takip.isError;

  return (
    <Modal acik={acik} onKapat={onKapat} baslik={t('takip.menuEtiketi', { ad })} cam>
      <View className="items-center gap-2 pb-2">
        <ProfilFotografi profil={profil} boyut="orta" />
        {/* Başlık zaten `ad`ı söylüyor; kullanıcı adı yalnızca görünen addan farklıysa yazılır. */}
        {profil.displayName && <Text className="text-label text-muted">{profil.username}</Text>}
      </View>
      <View className="flex-col">
        {satirlar.map((s, i) => (
          <View key={s.etiket}>
            {i > 0 && (
              <View className="mx-3">
                <CamAyirici />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s.etiket}
              onPress={cevrimici(s.onPress)}
              className="h-13 flex-row items-center justify-between rounded-xl px-3"
            >
              <Text className={`text-body-lg ${s.tehlikeli ? 'text-danger' : 'text-fg'}`}>{s.etiket}</Text>
              <s.ikon color={s.tehlikeli ? ikonRenk.danger : ikonRenk.fg} size={20} />
            </Pressable>
          </View>
        ))}
      </View>
      {hata && (
        <Text accessibilityRole="alert" className="px-3 pt-2 text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </Text>
      )}
    </Modal>
  );
}
