import { describe, it, expect } from '@jest/globals';
import { gorunurSekmeler } from './_layout';

describe('gorunurSekmeler', () => {
  it('arkadas degilse sablonlar sekmesi listede yok', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', false, false);

    expect(sekmeler.some((s) => s.to.endsWith('/templates'))).toBe(false);
  });

  it('arkadassa sablonlar sekmesi listede var', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', true, false);

    expect(sekmeler.some((s) => s.to.endsWith('/templates'))).toBe(true);
  });

  it('arkadas ve gizli hesap: sadece rekorlar ve sablonlar (gecmis dusuyor)', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', true, true);

    expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['records', 'templates']);
  });

  it('arkadas olmayan gizli hesap: sadece rekorlar', () => {
    const sekmeler = gorunurSekmeler('/profile/u/efe', false, true);

    expect(sekmeler.map((s) => s.to.split('/').pop())).toEqual(['records']);
  });
});
