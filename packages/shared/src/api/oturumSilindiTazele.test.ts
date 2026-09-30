import { QueryClient } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { oturumSilindiTazele, queryKeys } from './queries';

/**
 * #184 inceleme bulgusu: oturum silinince Ilerleme sekmesinin haftalik satirlari ve 1RM kartinin hareket
 * hacimleri de tazelenir -- yoksa silinen antrenmanin hacmi ve setleri ekranda kalir.
 */
test('oturum silinince haftalik istatistik ve hareket hacimleri tazelenir', () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  oturumSilindiTazele(client, 7);

  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.weeklyStats });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.volumeByExerciseAll });
});
