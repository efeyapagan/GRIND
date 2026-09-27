import { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Download } from 'lucide-react-native';
import { galeriyeKaydet, panoyaKopyala, type PaylasimSonucu } from '../lib/paylasimGorseli';
import PaylasimKarti from './PaylasimKarti';
import Modal from '../ui/Modal';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  setCount: number;
  durationSeconds: number;
  acik: boolean;
  onKapat: () => void;
}

/**
 * "Galeriye mi kaydedilsin, kopyalansin mi" secimi (#433, kullanici karari) ve uretilecek kartin
 * onizlemesi.
 *
 * Kart GIZLI degil GORUNUR cizilir: kullanici ne paylasacagini gorur ve yakalama gercekten
 * ekranda olan bir gorunumu alir (ekran disina tasinan gorunumler bazi cihazlarda bos yakalanir).
 */
export default function PaylasimPenceresi({ setCount, durationSeconds, acik, onKapat }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const kartRef = useRef<View>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function calistir(eylem: (ref: React.RefObject<View | null>) => Promise<PaylasimSonucu>) {
    setCalisiyor(true);
    setHata(null);
    const sonuc = await eylem(kartRef);
    setCalisiyor(false);

    if (sonuc === 'tamam') {
      onKapat();
      return;
    }
    // Sessizce basarisiz olunmaz: kullanici neden bir sey olmadigini bilmeli.
    setHata(sonuc === 'izin-yok' ? t('paylasim.izinYok') : t('paylasim.hata'));
  }

  return (
    <Modal acik={acik} onKapat={onKapat} baslik={t('paylasim.baslik')}>
      <View className="items-center rounded-xl bg-inset py-2">
        <PaylasimKarti ref={kartRef} setCount={setCount} durationSeconds={durationSeconds} />
      </View>

      <BirincilDugme yukseklik="normal" onPress={() => void calistir(galeriyeKaydet)} disabled={calisiyor}>
        <Download color={ikonRenk.onAccent} size={20} />
        <Text className="text-body-lg font-bold text-on-accent">{t('paylasim.galeriyeKaydet')}</Text>
      </BirincilDugme>

      <IkincilDugme onPress={() => void calistir(panoyaKopyala)} disabled={calisiyor}>
        {t('paylasim.panoyaKopyala')}
      </IkincilDugme>

      {hata !== null && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {hata}
        </Text>
      )}
    </Modal>
  );
}
