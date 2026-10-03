import { QueryClient } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { oturumBittiTazele, oturumSilindiTazele, queryKeys, setDegistiTazele } from './queries';

/**
 * #176: sinyal setlerden, oturum silmeden ve oturum bitirmeden (zorluk bitirirken isaretlenir) etkilenir; uc
 * akis da `overreaching` sorgusunu tazeler.
 */
test('set degisimi, oturum silme ve bitirme asiri yuklenme sinyalini tazeler', () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  setDegistiTazele(client, { sessionId: 1, exerciseId: 2 });
  oturumSilindiTazele(client, 1);
  oturumBittiTazele(client);

  const sinyalTazelemeleri = invalidate.mock.calls.filter(
    ([filtre]) => JSON.stringify(filtre?.queryKey) === JSON.stringify(queryKeys.overreaching),
  );
  expect(sinyalTazelemeleri).toHaveLength(3);
});
