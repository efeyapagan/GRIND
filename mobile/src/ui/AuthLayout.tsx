import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

interface Props {
  baslik: string;
  aciklama?: string;
  children: React.ReactNode;
  altBaglanti: React.ReactNode;
}

/**
 * Giris ve Kayit'in TEK ortak duzeni (spec): ustte dumbbell ikonu + GRIND + slogan, ortada kart,
 * altta gecis baglantisi. Bu ekranlarda kabuk (baslik/sekme cubugu) yok.
 */
export default function AuthLayout({ baslik, aciklama, children, altBaglanti }: Props) {
  const ikonRenk = useIkonRenk();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-4 py-8" keyboardShouldPersistTaps="handled">
        <View className="mb-5 items-center">
          <Dumbbell color={ikonRenk.accent} size={32} style={{ marginBottom: 8 }} />
          <Text className="text-title text-fg uppercase">GRIND</Text>
          <Text className="mt-1 text-body text-muted">Güç antrenmanı günlüğü</Text>
        </View>
        <View className="flex flex-col gap-4 rounded-xl bg-surface-1 p-4">
          <View className="flex flex-col gap-1">
            <Text className="text-heading text-fg">{baslik}</Text>
            {aciklama && <Text className="text-body text-muted">{aciklama}</Text>}
          </View>
          {children}
        </View>
        <Text className="mt-4 text-center text-body text-muted">{altBaglanti}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
