import { QueryClient } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { queryKeys, takipSorgulariniTazele } from './queries';

/**
 * #628: takip/arkadaşlık değişince profil, listeler, arama, arkadaş verisi ve bildirimler eskir. Kabul/ret
 * bu yardımcıyı `onSettled`'da çağırır (Review Focus 5): istek bu arada geri çekildiyse (404) bildirim
 * satırı yine listeden düşer.
 */
test('takip sorgulari tazelenince bildirimler ve profil de eskir', () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  takipSorgulariniTazele(client);

  for (const queryKey of [
    queryKeys.kullaniciProfiliAll, queryKeys.takipListesiAll, queryKeys.kullaniciAramaAll,
    queryKeys.arkadasAll, queryKeys.bildirimlerAll,
  ]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
  }
});
