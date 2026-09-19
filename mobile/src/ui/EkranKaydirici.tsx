import { forwardRef } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, type ScrollViewProps } from 'react-native';

/**
 * Metin alani + en altta gonder dugmesi olan HER ekranin ortak sarmalayicisi (Faz 3 sonrasi
 * simulator dokunma testinde bulundu): KeyboardAvoidingView olmadan klavye acilinca `mt-auto`
 * ile en alta yaslanan bir form (AddSetForm, SablonFormu'ndaki Kaydet, vb.) klavyenin ARKASINA
 * kayiyor -- gercek bir dokunusla ulasilamaz hale geliyordu. `keyboardShouldPersistTaps="handled"`
 * olmadan da klavye acikken disaridaki ilk dokunus (orn. "Kaydet") sadece klavyeyi kapatiyordu,
 * dugmeye ULASMIYORDU.
 *
 * KeyboardAvoidingView icerigi kucultur ama otomatik kaydirmaz: icerik klavyeden sonra ekrandan
 * uzunsa (orn. AddSetForm'un altindaki "Set ekle" dugmesi), gorunmesi icin ScrollView'in elle
 * `scrollToEnd`e kaydirilmasi gerekir -- ref bu yuzden disariya aciliyor (simulator testinde
 * dogrulandi: ref olmadan dugme klavyenin arkasinda kalip dokunus klavyeye gidiyordu).
 */
const EkranKaydirici = forwardRef<ScrollView, ScrollViewProps>(function EkranKaydirici(
  { contentContainerClassName, children, ...props },
  ref,
) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView
        ref={ref}
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default EkranKaydirici;
