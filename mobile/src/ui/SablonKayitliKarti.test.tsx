import { render, screen, fireEvent } from '@testing-library/react-native';
import SablonKayitliKarti from './SablonKayitliKarti';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';

jest.mock('./SablonFiguru', () => jest.fn(() => null));

const sablon = {
  id: 1,
  name: 'Push Day (efe)',
  savedFromUsername: 'efe',
  exercises: [{ exerciseId: 1, exerciseName: 'Bench Press', category: 'Push' as const, isArchived: false, plannedSets: 4, restSeconds: 90 }],
};

function ciz(ek: Partial<React.ComponentProps<typeof SablonKayitliKarti>> = {}) {
  return render(
    <SablonKayitliKarti
      ad={sablon.name}
      kaynakKullaniciAdi={sablon.savedFromUsername}
      ozet={sablonOzeti(sablon)}
      onBasla={jest.fn()}
      onMenu={jest.fn()}
      disabled={false}
      {...ek}
    />,
  );
}

test('karta dokununca onBasla cagrilir', async () => {
  const onBasla = jest.fn();
  await ciz({ onBasla });

  await fireEvent.press(screen.getByRole('button', { name: sablon.name }));

  expect(onBasla).toHaveBeenCalledTimes(1);
});

test('kimden kaydedildigi metni gorunur', async () => {
  await ciz({ kaynakKullaniciAdi: 'efe' });

  expect(screen.getByText('efe tarafından paylaşıldı')).toBeTruthy();
});

/** #467 final review: basili tutma (touch/sighted kullanici) menuyu acar, screen reader eylemiyle sinirli degil. */
test('basili tutunca onMenu cagrilir', async () => {
  const onMenu = jest.fn();
  await ciz({ onMenu });

  fireEvent(screen.getByRole('button', { name: sablon.name }), 'longPress');

  expect(onMenu).toHaveBeenCalledTimes(1);
});

/** #538: sabitleme dugmesi karti baslatmadan yalnizca o sablonu sabitler. */
test('sabitle dugmesi onSabitle cagirir, antrenmani baslatmaz', async () => {
  const onBasla = jest.fn();
  const onSabitle = jest.fn();
  await ciz({ onBasla, onSabitle, sabitli: false });

  await fireEvent.press(screen.getByRole('button', { name: 'Başa sabitle' }));

  expect(onSabitle).toHaveBeenCalledTimes(1);
  expect(onBasla).not.toHaveBeenCalled();
});

test('sabitli kartta dugme sabitlemeyi kaldirmayi soyler', async () => {
  await ciz({ onSabitle: jest.fn(), sabitli: true });

  expect(screen.getByRole('button', { name: 'Sabitlemeyi kaldır' })).toBeTruthy();
});

/** #538 (kullanici karari): silme kartta gorunur bir ikonla degil, basili tutunca acilan menuden yapilir. */
test('kartta gorunur bir silme dugmesi yoktur', async () => {
  await ciz({ onSabitle: jest.fn(), sabitli: false });

  expect(screen.queryByRole('button', { name: 'Şablonu sil' })).toBeNull();
});
