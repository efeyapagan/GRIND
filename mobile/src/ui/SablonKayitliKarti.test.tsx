import { render, screen, fireEvent } from '@testing-library/react-native';
import SablonKayitliKarti from './SablonKayitliKarti';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';

const sablon = {
  id: 1,
  name: 'Push Day (efe)',
  savedFromUsername: 'efe',
  exercises: [{ exerciseId: 1, exerciseName: 'Bench Press', category: 'Push' as const, isArchived: false, plannedSets: 4, restSeconds: 90 }],
};

test('karta dokununca onBasla cagrilir', async () => {
  const onBasla = jest.fn();
  await render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi={sablon.savedFromUsername}
      ozet={sablonOzeti(sablon)}
      onBasla={onBasla}
      onMenu={jest.fn()}
      disabled={false}
    />,
  );

  await fireEvent.press(screen.getByRole('button', { name: sablon.name }));

  expect(onBasla).toHaveBeenCalledTimes(1);
});

test('kimden kaydedildigi metni gorunur', async () => {
  await render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi="efe"
      ozet={sablonOzeti(sablon)}
      onBasla={jest.fn()}
      onMenu={jest.fn()}
      disabled={false}
    />,
  );

  expect(screen.getByText('efe tarafından paylaşıldı')).toBeTruthy();
});

/** #467 final review: basili tutma (touch/sighted kullanici) menuyu acar, screen reader eylemiyle sinirli degil. */
test('basili tutunca onMenu cagrilir', async () => {
  const onMenu = jest.fn();
  await render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi={sablon.savedFromUsername}
      ozet={sablonOzeti(sablon)}
      onBasla={jest.fn()}
      onMenu={onMenu}
      disabled={false}
    />,
  );

  fireEvent(screen.getByRole('button', { name: sablon.name }), 'longPress');

  expect(onMenu).toHaveBeenCalledTimes(1);
});
