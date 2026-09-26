import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Bildirim } from '@grind/shared/api/queries';
import BildirimSatiri from './BildirimSatiri';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
// Fotograf kimlikli bir fetch'le gelir; bu testlerin konusu degil.
jest.mock('./ProfilFotografi', () => () => null);

const ali = { username: 'ali', displayName: 'Ali Kaya', hasAvatar: false, avatarVersion: null };

function takip(relation: Bildirim['actor']['relation'], displayName: string | null = 'Ali Kaya'): Bildirim {
  return {
    kind: 'Follow', occurredAt: new Date().toISOString(), isUnread: true,
    actor: { ...ali, displayName, relation }, records: [],
  };
}

beforeEach(() => mockPush.mockReset());

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
      { exerciseId: 1, exerciseName: 'Bench Press', weight: 82.5, reps: 6, recordType: 'Weight' },
      { exerciseId: 2, exerciseName: 'Squat', weight: 140, reps: 3, recordType: 'Reps' },
    ],
  };
  await render(<BildirimSatiri bildirim={bildirim} />);

  expect(screen.getByText('Ali Kaya 2 harekette rekor kırdı')).toBeTruthy();
  expect(screen.getByText('Bench Press · 82,5 kg × 6')).toBeTruthy();
  expect(screen.getByText('Squat · 140 kg × 3')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('bildirim-Records-ali'));
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali/records');
});
