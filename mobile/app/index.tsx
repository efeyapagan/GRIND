import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { request } from '@grind/shared/api/client';
import type { components } from '@grind/shared/api/schema';
import { session } from '../src/session';
import { API_BASE_URL } from '../src/apiConfig';

type AuthResponse = components['schemas']['AuthResponse'];

/**
 * Faz 0 kanitlama ekrani: Expo <-> ASP.NET Core API <-> PostgreSQL zincirinin GERCEKTEN
 * calistigini gosterir. Tam ozellikli AuthContext portu (oturum yenileme, 401 yakalama, vb.)
 * Faz 3 kapsaminda -- burada sadece giris isteginin gercek backend'e ulastigini dogruluyoruz.
 */
export default function LoginScreen() {
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [durum, setDurum] = useState<'bos' | 'yukleniyor' | 'basarili' | 'hata'>('bos');
  const [mesaj, setMesaj] = useState('');

  async function girisYap() {
    setDurum('yukleniyor');
    setMesaj('');
    try {
      const yanit = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: kullaniciAdi, password: sifre }),
        auth: false,
      });
      if (!yanit.token || !yanit.expiresAtUtc || !yanit.username) {
        throw new Error('Sunucudan eksik kimlik yanıtı alındı.');
      }
      await session.write(yanit.token, yanit.expiresAtUtc, yanit.username);
      setDurum('basarili');
      setMesaj(`Hoş geldin, ${yanit.username}. Backend'e bağlantı doğrulandı.`);
    } catch (err) {
      setDurum('hata');
      setMesaj(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="text-title font-bold text-fg">GRIND</Text>
        <Text className="text-label text-muted">{API_BASE_URL}</Text>

        <TextInput
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          placeholder="Kullanıcı adı"
          placeholderTextColor="#c5c6c8"
          autoCapitalize="none"
          className="rounded-xl bg-surface-2 px-4 py-3 text-body text-fg"
        />
        <TextInput
          value={sifre}
          onChangeText={setSifre}
          placeholder="Şifre"
          placeholderTextColor="#c5c6c8"
          secureTextEntry
          className="rounded-xl bg-surface-2 px-4 py-3 text-body text-fg"
        />

        <Pressable
          onPress={girisYap}
          disabled={durum === 'yukleniyor'}
          className="items-center rounded-xl bg-accent py-3 disabled:opacity-60"
        >
          {durum === 'yukleniyor' ? (
            <ActivityIndicator color="#541200" />
          ) : (
            <Text className="text-body-lg font-semibold text-on-accent">Giriş yap</Text>
          )}
        </Pressable>

        {mesaj !== '' && (
          <Text className={durum === 'basarili' ? 'text-body text-fg' : 'text-body text-danger'}>
            {mesaj}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
