import { Modal as RNModal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import CamKatmanlari from './CamKatmanlari';
import IkonDugmesi from './IkonDugmesi';
import { useEtkinTema, useIkonRenk } from './renkler';

interface Props {
  acik: boolean;
  onKapat: () => void;
  baslik: string;
  /**
   * #586: pencere duz `surface-1` yerine Liquid Glass yuzeyle cizilir (gorsel tasarim spec'i Karar 9) ve
   * arka perde acilir -- tamamen kararmis bir ekranin bulanigi gorunmez, cam etkisi kaybolurdu.
   */
  cam?: boolean;
  children: React.ReactNode;
}

/**
 * Web'in native `<dialog>`ina karsilik RN'in yerlesik `Modal`i (Modal.tsx, issue #119). Odak
 * tuzagi ve geri tusuyla kapanma (Android) platform tarafindan saglanir -- web'deki showModal
 * feature-detect'ine burada gerek yok.
 */
export default function Modal({ acik, onKapat, baslik, cam = false, children }: Props) {
  const ikonRenk = useIkonRenk();
  const etkinTema = useEtkinTema();
  const { t } = useTranslation();
  // Cam pencerenin perdesi diger cam katmanlariyla ayni (`GecmisKatmani`): acik temada daha hafif.
  const perde = !cam ? 'bg-black/60' : etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40';
  return (
    <RNModal visible={acik} transparent animationType="fade" onRequestClose={onKapat}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable className={`flex-1 justify-center p-4 ${perde}`} onPress={onKapat}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`w-full self-center ${cam ? 'rounded-3xl' : 'rounded-xl bg-surface-1'}`}
            style={{ maxWidth: 384, maxHeight: '90%' }}
          >
            {cam && <CamKatmanlari />}
            <View className="flex-row items-center justify-between gap-2 p-4">
              <Text className="text-heading text-fg">{baslik}</Text>
              <IkonDugmesi etiket={t('ortak.kapat')} onPress={onKapat}>
                <X color={ikonRenk.muted} size={20} />
              </IkonDugmesi>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View testID="modal-govde" className="flex flex-col gap-4 p-4 pt-0">{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
