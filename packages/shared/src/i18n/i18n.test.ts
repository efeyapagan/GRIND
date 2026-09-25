import { expect, test } from 'vitest';
import { i18n, i18nBaslat } from './i18n';

/**
 * #324: mobilde hot reload `tr.ts`/`en.ts`'i yeniden calistirir ama i18next ornegi (node_modules)
 * ilk acilistaki kaynaklarla kalir -- yeni anahtarlar ekranda ham (`takvim.haftalikSeri`) gorunuyordu.
 * Ikinci cagri guncel katalogu da yuklemeli.
 */
test('ikinci cagri eskimis kaynaklari guncel katalogla tazeler', () => {
  i18nBaslat('tr');
  i18n.removeResourceBundle('tr', 'translation');
  i18n.addResourceBundle('tr', 'translation', { ortak: { kaydet: 'Kaydet' } });

  i18nBaslat('tr');

  expect(i18n.t('takvim.haftalikSeri')).toBe('Haftalık seri');
});
