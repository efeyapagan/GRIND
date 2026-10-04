import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Bildirim } from '@grind/shared/api/queries';
import BildirimSatiri from './BildirimSatiri';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
// Fotograf kimlikli bir fetch'le gelir; bu testlerin konusu degil.
jest.mock('./ProfilFotografi', () => () => null);
const mockYanit = jest.fn();
jest.mock('@grind/shared/api/queries', () => ({
  useArkadaslikYaniti: () => ({ mutate: mockYanit, isPending: false, isError: false }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));

const ali = { username: 'ali', displayName: 'Ali Kaya', hasAvatar: false, avatarVersion: null };

function takip(relation: Bildirim['actor']['relation'], displayName: string | null = 'Ali Kaya'): Bildirim {
  return {
    kind: 'Follow', occurredAt: new Date().toISOString(), isUnread: true,
    actor: { ...ali, displayName, relation }, records: [],
  };
}

beforeEach(() => {
  mockPush.mockReset();
  mockYanit.mockReset();
});

test('takip bildirimi metni; dokununca profile gider', async () => {
  await render(<BildirimSatiri bildirim={takip('FollowedBy')} />);

  expect(screen.getByText('Ali Kaya seni takip etmeye başladı')).toBeTruthy();
  expect(screen.queryByText('Artık arkadaşsınız')).toBeNull();

  await fireEvent.press(screen.getByTestId('bildirim-Follow-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali');
});

test('karsilikli takipte "Artik arkadassiniz" satiri eklenir', async () => {
  await render(<BildirimSatiri bildirim={takip('Friends')} />);

  expect(screen.getByText('Artık arkadaşsınız')).toBeTruthy();
});

test('gorunen isim yoksa kullanici adi yazilir', async () => {
  await render(<BildirimSatiri bildirim={takip('FollowedBy', null)} />);

  expect(screen.getByText('ali seni takip etmeye başladı')).toBeTruthy();
});

test('rekor bildirimi hareket sayisini ve her hareketi yazar; dokununca rekorlara gider', async () => {
  const bildirim: Bildirim = {
    kind: 'Records', occurredAt: new Date().toISOString(), isUnread: false,
    actor: { ...ali, relation: 'Following' },
    records: [
      { exerciseId: 1, exerciseName: 'Bench Press', weight: 82.5, reps: 6, recordType: 'Weight', durationSeconds: null, measurement: 'WeightReps' },
      { exerciseId: 2, exerciseName: 'Squat', weight: 140, reps: 3, recordType: 'Reps', durationSeconds: null, measurement: 'WeightReps' },
    ],
  };
  await render(<BildirimSatiri bildirim={bildirim} />);

  expect(screen.getByText('Ali Kaya 2 harekette rekor kırdı')).toBeTruthy();
  expect(screen.getByText('Bench Press · 82,5 kg × 6')).toBeTruthy();
  expect(screen.getByText('Squat · 140 kg × 3')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('bildirim-Records-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali/records');
});

/** #346: agirliksiz rekor "20 tekrar", sureli rekor "1:15" diye yazilir -- "0 kg × 20" degil. */
test('agirliksiz ve sureli rekor satirlari olcum tipine gore yazilir', async () => {
  const bildirim: Bildirim = {
    kind: 'Records', occurredAt: new Date().toISOString(), isUnread: false,
    actor: { ...ali, relation: 'Following' },
    records: [
      { exerciseId: 160, exerciseName: 'Crunch', weight: 0, reps: 20, recordType: 'Reps', durationSeconds: null, measurement: 'Reps' },
      { exerciseId: 168, exerciseName: 'Plank', weight: 0, reps: null, recordType: 'Duration', durationSeconds: 75, measurement: 'Duration' },
    ],
  };
  await render(<BildirimSatiri bildirim={bildirim} />);

  expect(screen.getByText('Crunch · 20 tekrar')).toBeTruthy();
  expect(screen.getByText('Plank · 1:15')).toBeTruthy();
});

/** #419: arkadasin haftalik hedefini tamamlamasi -- rekor satiri yok, profile gider. */
test('haftalik hedef bildirimi metni; dokununca profile gider', async () => {
  const bildirim: Bildirim = {
    kind: 'WeeklyGoal',
    occurredAt: new Date().toISOString(),
    isUnread: true,
    actor: { ...ali, relation: 'Friends' },
    records: [],
  };

  await render(<BildirimSatiri bildirim={bildirim} />);

  expect(screen.getByText('Ali Kaya haftalık hedefini tamamladı')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('bildirim-WeeklyGoal-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali');
});

/** #628: arkadaslik istegi satir icinde Kabul et / Reddet ile yanitlanir. */
test('arkadaslik isteginde kabul ve reddet dugmeleri yaniti gonderir', async () => {
  const bildirim: Bildirim = {
    kind: 'FriendRequest',
    occurredAt: new Date().toISOString(),
    isUnread: true,
    actor: { ...ali, relation: 'None' },
    records: [],
  };
  await render(<BildirimSatiri bildirim={bildirim} />);
  expect(screen.getByText(/sana arkadaşlık isteği gönderdi/)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));
  expect(mockYanit).toHaveBeenCalledWith({ kullaniciAdi: 'ali', kabul: true });

  await fireEvent.press(screen.getByRole('button', { name: 'Reddet' }));
  expect(mockYanit).toHaveBeenCalledWith({ kullaniciAdi: 'ali', kabul: false });
});
