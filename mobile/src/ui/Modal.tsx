import { Modal as RNModal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import IkonDugmesi from './IkonDugmesi';
import { ikonRenk } from './renkler';

interface Props {
  acik: boolean;
  onKapat: () => void;
  baslik: string;
  children: React.ReactNode;
}

/**
 * Web'in native `<dialog>`ina karsilik RN'in yerlesik `Modal`i (Modal.tsx, issue #119). Odak
 * tuzagi ve geri tusuyla kapanma (Android) platform tarafindan saglanir -- web'deki showModal
 * feature-detect'ine burada gerek yok.
 */
export default function Modal({ acik, onKapat, baslik, children }: Props) {
  const { t } = useTranslation();
  return (
    <RNModal visible={acik} transparent animationType="fade" onRequestClose={onKapat}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable className="flex-1 justify-center bg-black/60 p-4" onPress={onKapat}>
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full self-center rounded-xl bg-surface-1" style={{ maxWidth: 384, maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between gap-2 p-4">
              <Text className="text-heading text-fg">{baslik}</Text>
              <IkonDugmesi etiket={t('ortak.kapat')} onPress={onKapat}>
                <X color={ikonRenk.muted} size={20} />
              </IkonDugmesi>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="flex flex-col gap-4 p-4 pt-0">{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
