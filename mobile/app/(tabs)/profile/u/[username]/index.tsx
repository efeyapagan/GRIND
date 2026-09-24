import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../../../src/auth/AuthContext';

/**
 * web/src/routes.tsx: `/u/:username` -> Gecmis sekmesi; kendi adinsa kendi profiline (#284). Kendi adina
 * yonlendirme yalnizca bu giris noktasinda -- ust duzende yapilinca `push` ile sonsuz dongu kuruyordu.
 */
export default function KullaniciProfiliIndex() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const { username: ben } = useAuth();
  if (ben !== null && username.toLowerCase() === ben.toLowerCase()) {
    return <Redirect href="/profile" />;
  }
  return <Redirect href={`/profile/u/${encodeURIComponent(username)}/history`} />;
}
