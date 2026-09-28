import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { useOpenSession } from '@grind/shared/api/queries';
import BarSagUcu from './BarSagUcu';

jest.mock('@grind/shared/api/queries', () => ({ useOpenSession: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));

const useOpenSessionMock = useOpenSession as jest.Mock;

/** Sabit "simdi": sayac gercek saate degil bu ana gore hesaplansin. */
const SIMDI = new Date('2026-09-20T12:34:56Z');

const ACIK_OTURUM = {
  id: 7,
  // 42 dakika 10 saniye once baslamis bir antrenman.
  startedAt: '2026-09-20T11:52:46Z',
  isOpen: true,
  durationSeconds: null,
  templateId: 3,
  templateName: 'Push Day A',
  progress: [],
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(SIMDI);
  mockNavigate.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Acik antrenman yokken bar bugunku haliyle kalir. */
test('acik antrenman yokken GRIND yazisi durur', async () => {
  useOpenSessionMock.mockReturnValue({ data: null });

  await render(<BarSagUcu />);

  expect(screen.getByText('GRIND')).toBeTruthy();
});

/** #480 cekirdegi: kullanici karari "GRIND yazisi kalksin ve orada sure yazsin". */
test('acik antrenman varken GRIND yerini gecen sure alir', async () => {
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM });

  await render(<BarSagUcu />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.getByText('42:10')).toBeTruthy();
});

test('sayac saniyede bir ilerler', async () => {
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM });
  await render(<BarSagUcu />);

  await act(async () => {
    jest.advanceTimersByTime(2000);
  });

  expect(screen.getByText('42:12')).toBeTruthy();
});

test('sureye dokununca antrenman ekranina doner', async () => {
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM });
  await render(<BarSagUcu />);

  await fireEvent.press(screen.getByLabelText('Antrenmanın devam ediyor, 42:10 — antrenmana dön'));

  expect(mockNavigate).toHaveBeenCalledWith('/antrenman');
});

/** Bitirilmis oturum (`isOpen: false`) sayac gostermez -- yanit gelmis olsa bile. */
test('kapali oturumda GRIND yazisi durur', async () => {
  useOpenSessionMock.mockReturnValue({ data: { ...ACIK_OTURUM, isOpen: false } });

  await render(<BarSagUcu />);

  expect(screen.getByText('GRIND')).toBeTruthy();
});
