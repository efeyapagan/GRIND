import { useState } from 'react';
import { Keyboard, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Play, Square } from 'lucide-react-native';
import type { KardiyoAlani, KardiyoKaydi } from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import {
  ayarAlanlari,
  kardiyoGirdisi,
  kardiyoGirdisiniAyristir,
  kardiyoSureMetni,
  kardiyoSuresiniAyristir,
  metreMi,
  sonucAlanlari,
  type KardiyoGirdisi,
} from '@grind/shared/lib/kardiyo';
import BirincilDugme from '../ui/BirincilDugme';
import CamKatmanlari from '../ui/CamKatmanlari';
import KardiyoAlanlari from './KardiyoAlanlari';
import KardiyoSureAlani from './KardiyoSureAlani';
import { useKardiyoAlanlari } from './useKardiyoAlanlari';
import { useSaniyelikSaat } from './useSaniyelikSaat';
import {
  useKuyrukluKardiyoBaslat,
  useKuyrukluKardiyoDurdur,
  useKuyrukluKardiyoDuzelt,
} from '../kuyruk/kuyrukluMutasyonlar';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  egzersizId: number;
  egzersizAdi: string;
  oturumId: number;
  /** Antrenmanin kardiyo kayitlari -- bu hareketin akan kaydi buradan bulunur. */
  kardiyolar: readonly KardiyoKaydi[];
  /** Sonuclar kaydedilince (panel ilk haline donsun ya da kapansin -- cagiranin isi). */
  onKaydedildi: () => void;
}

/**
 * #647: kardiyo hareketinin paneli (set panelinin yerine). Uc adim:
 * 1. makinenin ayarlari (hiz, egim, seviye, damper) + Baslat -- sure akmaya baslar;
 * 2. akarken buyuk sayac + Durdur (ayarlar duzeltilebilir) -- sure sunucuya yazilir;
 * 3. sonuclar (mesafe, kat, tempo...) + duzeltilebilir sure + Kaydet.
 * Akan kayit sunucuda (ya da kuyrukta) durur: panel kapanip acilsa, uygulama yeniden baslasa da sayac
 * baslangictan hesaplanir. Antrenman dogrudan bitirilirse sunucu akan kaydi bitis aninda kapatir.
 */
export default function KardiyoPaneli({ egzersizId, egzersizAdi, oturumId, kardiyolar, onKaydedildi }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const alanlar = useKardiyoAlanlari(egzersizId);
  const metre = metreMi(alanlar);
  const ayarlar = ayarAlanlari(alanlar);
  const sonuclar = sonucAlanlari(alanlar);
  const akan = kardiyolar.find((kayit) => kayit.exerciseId === egzersizId && kayit.durationSeconds === null);
  const baskaAkan = kardiyolar.some((kayit) => kayit.exerciseId !== egzersizId && kayit.durationSeconds === null);
  const simdi = useSaniyelikSaat(akan !== undefined);

  const baslatma = useKuyrukluKardiyoBaslat();
  const durdurma = useKuyrukluKardiyoDurdur();
  const duzeltme = useKuyrukluKardiyoDuzelt();

  // Durdurulmus ve sonuclari beklenen kayit (3. adim).
  const [duran, setDuran] = useState<KardiyoKaydi | null>(null);
  const [girdi, setGirdi] = useState<KardiyoGirdisi>(() => (akan ? kardiyoGirdisi(akan, ayarlar, metre) : {}));
  const [sure, setSure] = useState({ dakika: '', saniye: '' });
  const [hatalar, setHatalar] = useState<KardiyoAlani[]>([]);
  const [sureHatali, setSureHatali] = useState(false);
  const [genelHata, setGenelHata] = useState<string | null>(null);

  function alanDegis(alan: KardiyoAlani, deger: string) {
    setGirdi((onceki) => ({ ...onceki, [alan]: deger }));
  }

  function ayristir(gecerliAlanlar: readonly KardiyoAlani[]) {
    const sonuc = kardiyoGirdisiniAyristir(girdi, gecerliAlanlar, metre);
    setHatalar(sonuc.hatalar);
    return sonuc.hatalar.length === 0 ? sonuc.degerler : null;
  }

  function hataGoster(hata: unknown) {
    setGenelHata(t(hata instanceof ApiError && hata.status === 409 ? 'kardiyo.akanVar' : 'kardiyo.kaydedilemedi'));
  }

  async function baslat() {
    setGenelHata(null);
    const degerler = ayristir(ayarlar);
    if (!degerler) return;
    try {
      await baslatma.mutateAsync({ sessionId: oturumId, exerciseId: egzersizId, ...degerler });
      Keyboard.dismiss();
    } catch (hata) {
      hataGoster(hata);
    }
  }

  async function durdur() {
    if (!akan) return;
    setGenelHata(null);
    const degerler = ayristir(ayarlar);
    if (!degerler) return;
    try {
      const kayit = await durdurma.mutateAsync({ id: akan.id, sessionId: oturumId, ...degerler });
      const saniye = kayit.durationSeconds ?? 0;
      setSure({ dakika: String(Math.floor(saniye / 60)), saniye: String(saniye % 60) });
      setGirdi(kardiyoGirdisi(kayit, alanlar, metre));
      setDuran(kayit);
      Keyboard.dismiss();
    } catch (hata) {
      hataGoster(hata);
    }
  }

  async function kaydet() {
    if (!duran) return;
    setGenelHata(null);
    const degerler = ayristir(alanlar);
    const durationSeconds = kardiyoSuresiniAyristir(sure.dakika, sure.saniye);
    setSureHatali(durationSeconds === null);
    if (!degerler || durationSeconds === null) return;
    try {
      await duzeltme.mutateAsync({ id: duran.id, sessionId: oturumId, durationSeconds, ...degerler });
      Keyboard.dismiss();
      onKaydedildi();
    } catch (hata) {
      hataGoster(hata);
    }
  }

  return (
    <View testID="kardiyo-paneli" className="flex-col gap-3 overflow-hidden rounded-xl p-4">
      <CamKatmanlari koseSinifi="rounded-xl" />
      <Text className="pl-1 text-label text-muted uppercase">{egzersizAdi}</Text>
      {(genelHata || (baskaAkan && !akan && !duran)) && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {genelHata ?? t('kardiyo.akanVar')}
        </Text>
      )}
      {duran ? (
        <>
          <Text className="pl-1 text-label text-muted uppercase">{t('kardiyo.sonuclar')}</Text>
          <KardiyoSureAlani
            onek="kardiyo-sure"
            dakika={sure.dakika}
            saniye={sure.saniye}
            onDegis={(dakika, saniye) => setSure({ dakika, saniye })}
            hata={sureHatali ? t('kardiyo.gecersizDeger') : undefined}
          />
          <KardiyoAlanlari onek="kardiyo" alanlar={[...sonuclar, ...ayarlar]} metre={metre} girdi={girdi} onDegis={alanDegis} hatalar={hatalar} />
          <BirincilDugme yukseklik="buyuk" disabled={duzeltme.isPending} onPress={kaydet}>
            <Check color={ikonRenk.onAccent} size={24} />
            <Text className="text-body-lg font-bold text-on-accent">{t('kardiyo.kaydet')}</Text>
          </BirincilDugme>
        </>
      ) : (
        <>
          {akan && (
            <Text testID="kardiyo-sayaci" accessibilityLiveRegion="polite" className="text-center text-metric font-bold text-fg">
              {kardiyoSureMetni(akan, simdi)}
            </Text>
          )}
          <KardiyoAlanlari onek="kardiyo" alanlar={ayarlar} metre={metre} girdi={girdi} onDegis={alanDegis} hatalar={hatalar} />
          {akan ? (
            <BirincilDugme yukseklik="buyuk" disabled={durdurma.isPending} onPress={durdur}>
              <Square color={ikonRenk.onAccent} size={22} />
              <Text className="text-body-lg font-bold text-on-accent">{t('kardiyo.durdur')}</Text>
            </BirincilDugme>
          ) : (
            <BirincilDugme yukseklik="buyuk" disabled={baslatma.isPending || baskaAkan} onPress={baslat}>
              <Play color={ikonRenk.onAccent} size={22} />
              <Text className="text-body-lg font-bold text-on-accent">{t('kardiyo.baslat')}</Text>
            </BirincilDugme>
          )}
        </>
      )}
    </View>
  );
}
