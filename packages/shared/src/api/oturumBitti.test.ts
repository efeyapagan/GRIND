import { QueryClient } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { oturumBittiTazele, queryKeys } from './queries';

/**
 * #363: bitirmeden hemen sonra açılan ana sayfa açık oturumu önbellekten okur. Önbellek yalnızca
 * bayat işaretlenirse yeniden sorgu dönene kadar biten antrenman hâlâ açık görünür ("Devam ediyor"
 * kartı bir an çizilip kalkar, sayfa zıplar). Bitti yanıtı geldiği anda önbellek "açık oturum yok"
 * demelidir.
 */
test('biten oturumdan sonra onbellekte acik oturum kalmaz', () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.openSession, { id: 7, isOpen: true });

  oturumBittiTazele(queryClient);

  expect(queryClient.getQueryData(queryKeys.openSession)).toBeNull();
});
