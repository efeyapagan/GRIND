import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useOpenSession } from '@grind/shared/api/queries';
import { formatSaat } from '@grind/shared/lib/format';
import BirincilDugme from '../ui/BirincilDugme';
import CamKart from '../ui/CamKart';
import TurEtiketi from '../ui/TurEtiketi';

/**
 * web/src/components/DevamEdenAntrenman.tsx ile ayni (issue #175).
 *
 * Uygulama her acilista Ana sayfaya duser ve orasi devam eden antrenmandan habersizdi -- veri
 * sunucuda dururken kullanici icin antrenman "kaybolmus" goruntusu olusuyordu. Bu kart acik
 * oturumu gorunur kilar. Oturum yokken (ya da sorgu henuz yuklenmemisken) HIC cizilmez: antrenmansiz
 * bir gunde Ana sayfa bugunku haliyle kalir.
 *
 * #480: ayni kart Sablonlarim ekraninda da (ust barin hemen altinda, kaydirmayla kacmayacak
 * sekilde) cizilir -- `className` yalnizca kartin dis bosluklarini cagirana birakir, govdesi iki
 * ekranda da AYNIDIR ("ana sayfadaki gibi", kullanici karari).
 *
 * #494: ayni kart antrenman ekraninin "Antrenmana basla" gorunumunde de durur. Orada "Devam et"
 * GEZINMEZ (zaten o ekrandayiz) -- `onDevam` ile ekran kendi gorunumunu geri cevirir.
 */
export default function DevamEdenAntrenman({
  className = '',
  onDevam,
}: {
  className?: string;
  onDevam?: () => void;
}) {
  const { t } = useTranslation();
  const { data: oturum } = useOpenSession();
  const router = useRouter();

  if (!oturum?.isOpen) {
    return null;
  }

  return (
    // #589: cam yuzey (spec Karar 9) -- ana sayfanin ozet kartlariyla ayni dil. `className` yalnizca dis bosluk.
    <CamKart testID="devam-eden-antrenman" disClassName={className} className="flex-col gap-3 p-4">
      {/* #502 (kullanici karari): "Devam ediyor" rozeti kalkti, yerini SABLON ADI aldi -- kart bir
          satir kisaldi. Antrenmanin surdugu bilgisi dugmenin kendi metninde ("Antrenmana devam
          et") ve ust bardaki sayacta zaten var. Sablonsuz antrenmanda solda gosterilecek ad yok;
          satirda yalnizca baslangic saati kalir. */}
      <View className="flex-row items-center justify-between gap-2">
        {oturum.templateName ? <TurEtiketi>{oturum.templateName}</TurEtiketi> : <View />}
        <Text className="text-label text-muted">{t('antrenman.baslangic', { saat: formatSaat(oturum.startedAt) })}</Text>
      </View>
      <BirincilDugme yukseklik="normal" onPress={onDevam ?? (() => router.navigate('/antrenman'))}>
        {t('antrenman.antrenmanaDevamEt')}
      </BirincilDugme>
    </CamKart>
  );
}
