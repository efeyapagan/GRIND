import { expect, test } from 'vitest';
import { sablonlariAyir } from './kaydedilenSablonlar';
import type { Sablon } from '../api/queries';

function sablon(id: number, alanlar: Partial<Sablon> = {}): Sablon {
  return {
    id,
    name: `Sablon ${id}`,
    exercises: [],
    visibility: 'Friends',
    savedFromUsername: null,
    lastUsedAt: null,
    isPinned: false,
    ...alanlar,
  };
}

/** #467: kendi sablonlari sunucunun sirasini (OrderIndex) korur, kaydedilenler ayri listededir. */
test('kendi sablonlari sunucunun sirasiyla, kaydedilenler ayri doner', () => {
  const { kendi, kaydedilen } = sablonlariAyir([
    sablon(1),
    sablon(2, { savedFromUsername: 'efe' }),
    sablon(3),
  ]);

  expect(kendi.map((s) => s.id)).toEqual([1, 3]);
  expect(kaydedilen.map((s) => s.id)).toEqual([2]);
});

/** #467: kaydedilenler en son kullanilan basta dizilir; hic kullanilmamis olan sona duser. */
test('kaydedilenler en son kullanilana gore dizilir', () => {
  const { kaydedilen } = sablonlariAyir([
    sablon(1, { savedFromUsername: 'efe', lastUsedAt: '2026-09-01T00:00:00Z' }),
    sablon(2, { savedFromUsername: 'efe', lastUsedAt: null }),
    sablon(3, { savedFromUsername: 'efe', lastUsedAt: '2026-09-20T00:00:00Z' }),
  ]);

  expect(kaydedilen.map((s) => s.id)).toEqual([3, 1, 2]);
});

/** #538: sabitlenen sablon en son kullanilan olmasa bile basta durur; kalanlar yine son kullanima gore. */
test('sabitlenen kaydedilen sablon son kullanilan olmasa da basta durur', () => {
  const { kaydedilen } = sablonlariAyir([
    sablon(1, { savedFromUsername: 'efe', lastUsedAt: '2026-09-20T00:00:00Z' }),
    sablon(2, { savedFromUsername: 'efe', lastUsedAt: null, isPinned: true }),
    sablon(3, { savedFromUsername: 'efe', lastUsedAt: '2026-09-25T00:00:00Z' }),
  ]);

  expect(kaydedilen.map((s) => s.id)).toEqual([2, 3, 1]);
});
