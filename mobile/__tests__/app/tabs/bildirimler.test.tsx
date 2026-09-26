import { render, screen } from '@testing-library/react-native';
import { useBildirimler, useBildirimleriGorulduYap } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import BildirimlerScreen from '../../../app/(tabs)/bildirimler';

jest.mock('@grind/shared/api/queries', () => ({
  useBildirimler: jest.fn(),
  useBildirimleriGorulduYap: jest.fn(),
}));
// jest.mock fabrikasi dosyanin basina tasinir; JSX yardimcisina erisemeyebilir -- createElement ile.
jest.mock('../../../src/components/BildirimSatiri', () => (props: { bildirim: { actor: { username: string } } }) =>
  require('react').createElement(require('react-native').Text, null, `satir-${props.bildirim.actor.username}`));
jest.mock('../../../src/ui/KabukTabBar', () => ({ useAltMenuPayi: () => 0 }));

const mockGoruldu = jest.fn();
const refetch = jest.fn();

function sorgu(durum: Partial<{ data: unknown[]; isLoading: boolean; isError: boolean }>) {
  (useBildirimler as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch, ...durum });
}

function ekran() {
  return render(
    <PageTitleProvider>
      <BildirimlerScreen />
    </PageTitleProvider>,
  );
}

const bildirim = { kind: 'Follow', occurredAt: '2026-09-26T09:00:00Z', isUnread: true, actor: { username: 'ali' }, records: [] };

beforeEach(() => {
  mockGoruldu.mockReset();
  (useBildirimleriGorulduYap as jest.Mock).mockReturnValue({ mutate: mockGoruldu });
});

test('liste gelince satirlar cizilir ve goruldu bir kez gider', async () => {
  sorgu({ data: [bildirim] });
  await ekran();

  expect(screen.getByText('satir-ali')).toBeTruthy();
  expect(mockGoruldu).toHaveBeenCalledTimes(1);
});

test('liste yeniden gelse de goruldu bir kez gider', async () => {
  sorgu({ data: [bildirim] });
  const { rerender } = await ekran();
  sorgu({ data: [bildirim, { ...bildirim, actor: { username: 'veli' } }] });
  await rerender(
    <PageTitleProvider>
      <BildirimlerScreen />
    </PageTitleProvider>,
  );

  expect(mockGoruldu).toHaveBeenCalledTimes(1);
});

test('liste bossa bos durum gorunur', async () => {
  sorgu({ data: [] });
  await ekran();

  expect(screen.getByText('Henüz bildirim yok')).toBeTruthy();
});

test('hata durumunda mesaj ve tekrar dene gorunur, goruldu gitmez', async () => {
  sorgu({ isError: true });
  await ekran();

  expect(screen.getByText('Bildirimler alınamadı.')).toBeTruthy();
  expect(screen.getByText('Tekrar dene')).toBeTruthy();
  expect(mockGoruldu).not.toHaveBeenCalled();
});
