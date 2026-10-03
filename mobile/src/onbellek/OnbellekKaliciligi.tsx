import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { kaliciOnbellegiBaslat } from './kaliciOnbellek';

/** #174: oturum acik kullanicinin onbellegini diskten geri yukler ve degisiklikleri diske yazar. */
export default function OnbellekKaliciligi() {
  const queryClient = useQueryClient();
  const { username } = useAuth();

  useEffect(() => {
    if (!username) {
      return;
    }
    return kaliciOnbellegiBaslat(queryClient, username).durdur;
  }, [queryClient, username]);

  return null;
}
