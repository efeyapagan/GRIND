import { View, Text, Pressable } from 'react-native';
import { CircleCheck, X } from 'lucide-react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import BirincilDugme from '../ui/BirincilDugme';
import HareketEklePaneli from './HareketEklePaneli';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  egzersizler: readonly Egzersiz[];
  onHareketEkle: (exerciseId: number) => void;
  /**
   * Panel acik mi -- `antrenman.tsx`de tutulur, ust baslikta AYNI paneli acan kisayolla
   * paylasilsin diye.
   */
  acik: boolean;
  onAcikDegis: (acik: boolean) => void;
  /**
   * Dolu oturumda "Antrenmani bitir" gosterilir. `iptalCagrisi` ile ASLA ayni anda verilmez --
   * kutu HER ZAMAN ikisinden birini gosterir: "Hareket ekle" artik ust baslikta HER ZAMAN sabit
   * durdugu icin (issue #273 sonrasi yeni tasarim), bu kutu yalnizca bitirme/iptal icindir.
   */
  bitirCagrisi?: { onBitir: () => void };
  /** Bos oturumda (#47) "Antrenmani bitir" yerine gosterilen iptal eylemi -- bkz. `bitirCagrisi`. */
  iptalCagrisi?: { onIptal: () => void; beklemede?: boolean };
}

/**
 * Acik antrenmanin listenin sonundaki alani: HER ZAMAN "Antrenmani bitir" ya da "Antrenmani iptal
 * et" -- ikisi AYNI konumda, oturum durumuna gore biri (#62, düzeni #273'te değişti, iptal/bitir
 * birlestirmesiyle tekrar degisti). Dinlenme sayaci artik burada DEGIL, antrenman.tsx'in en ustunde
 * durur. Set paneli de burada DEGIL, alt sekme cubugunun hemen ustunde yuzer bir panel olarak acilir
 * (`SetPaneli`, bkz. antrenman.tsx).
 */
export default function AntrenmanAltAlani({
  egzersizler,
  onHareketEkle,
  acik,
  onAcikDegis,
  bitirCagrisi,
  iptalCagrisi,
}: Props) {
  const ikonRenk = useIkonRenk();
  return (
    // `mt-auto` YOK (#274): kisa listede ekranin dibine itilmez, son kartin hemen ardinda durur (web #226).
    <View className="pb-2">
      <View className="flex-col gap-2 rounded-xl bg-surface-3 p-3">
        {acik ? (
          <HareketEklePaneli
            egzersizler={egzersizler}
            onSec={(exerciseId) => {
              onAcikDegis(false);
              onHareketEkle(exerciseId);
            }}
            onKapat={() => onAcikDegis(false)}
          />
        ) : bitirCagrisi ? (
          <BirincilDugme yukseklik="normal" onPress={bitirCagrisi.onBitir}>
            <CircleCheck color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">Antrenmanı bitir</Text>
          </BirincilDugme>
        ) : iptalCagrisi ? (
          <Pressable
            accessibilityRole="button"
            onPress={iptalCagrisi.onIptal}
            disabled={iptalCagrisi.beklemede}
            className={`h-13 w-full flex-row items-center justify-center gap-2 rounded-xl bg-surface-4 ${iptalCagrisi.beklemede ? 'opacity-60' : ''}`}
          >
            <X color={ikonRenk.danger} size={20} />
            <Text className="text-body-lg font-bold text-danger">Antrenmanı iptal et</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
