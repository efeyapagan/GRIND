import { describe, it, expect } from '@jest/globals';
import { gorunurSekmeler } from '../../../../../../app/(tabs)/profile/u/[username]/_layout';

/**
 * #540: Sablonlar sekmesi artik arkadasliga bagli DEGIL -- "Herkese acik" (Public) bir sablonu
 * arkadas olmayan da gorur (kullanici karari). Sekme herkese cizilir; icerigi sunucu kademeye gore
 * suzer, gorecek sablon yoksa bos durum gorunur. Gizli hesapta bile acik secilmis sablon olabilir.
 */
describe('gorunurSekmeler', () => {
  it('arkadas olmayana da sablonlar sekmesi cizilir', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', false);

    expect(sekmeler.some((s) => s.to.endsWith('/templates'))).toBe(true);
  });

  it('gizli hesap: gecmis duser, rekorlar ve sablonlar kalir', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', true);

    expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['records', 'templates']);
  });

  it('gizli olmayan hesap: uc sekme', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', false);

    expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['history', 'records', 'templates']);
  });
});
