import { Redirect, useLocalSearchParams } from 'expo-router';
import { useKullaniciProfili } from '@grind/shared/api/queries';
import { useAuth } from '../../../../../src/auth/AuthContext';

/**
 * web/src/routes.tsx: `/u/:username` -> Gecmis sekmesi; kendi adinsa kendi profiline (#284). Kendi adina
 * yonlendirme yalnizca bu giris noktasinda -- ust duzende yapilinca `push` ile sonsuz dongu kuruyordu.
 * Gizli hesapta Gecmis sekmesi yok (#294): bu ekran ancak ebeveyn _layout'un profili yuklemesinden
 * SONRA monte olur (`slotBekliyor`), bu yuzden `useKullaniciProfili` ayni sorgu anahtarindan onbellekten
 * okur -- ikinci bir istek atmaz -- ve dogru sekmeye dogrudan yonlendirir.
 */
export default function KullaniciProfiliIndex() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const { username: ben } = useAuth();
  const kendisi = ben !== null && username.toLowerCase() === ben.toLowerCase();
  const profil = useKullaniciProfili(kendisi ? null : username);

  if (kendisi) {
    return <Redirect href="/profile" />;
  }
  const sekme = profil.data?.privacyLevel === 'Gizli' ? 'records' : 'history';
  return <Redirect href={`/profile/u/${encodeURIComponent(username)}/${sekme}`} />;
}
