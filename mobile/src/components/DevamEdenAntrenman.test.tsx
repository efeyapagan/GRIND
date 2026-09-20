import { render, screen, fireEvent } from '@testing-library/react-native';
import { useOpenSession } from '@grind/shared/api/queries';
import DevamEdenAntrenman from './DevamEdenAntrenman';

jest.mock('@grind/shared/api/queries', () => ({ useOpenSession: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));

const useOpenSessionMock = useOpenSession as jest.Mock;

const ACIK_OTURUM = {
  id: 7,
  startedAt: '2026-09-20T09:00:00Z',
  isOpen: true,
  templateId: 3,
  templateName: 'Push Day A',
  progress: [],
};

beforeEach(() => {
  mockNavigate.mockReset();
});

/**
 * Issue #175'in cekirdegi: uygulama kapatilip acilinca Ana sayfaya dusuluyor ve orada devam eden
 * antrenmana dair HICBIR iz yoktu -- kullanici icin antrenman "kaybolmus" goruntusu. Kart, acik
 * oturumu gorunur kilar ve tek dokunusla antrenman ekranina goturur.
 */
test('acik antrenman varken kart sablon adi ve TR baslangic saatiyle gorunur', async () => {
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM, isLoading: false, isError: false });

  await render(<DevamEdenAntrenman />);

  expect(screen.getByText('Push Day A')).toBeTruthy();
  expect(screen.getByText('Başlangıç 12:00')).toBeTruthy();
});

test('Devam et antrenman ekranina goturur', async () => {
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM, isLoading: false, isError: false });
  await render(<DevamEdenAntrenman />);

  await fireEvent.press(screen.getByRole('button', { name: 'Devam et' }));

  expect(mockNavigate).toHaveBeenCalledWith('/antrenman');
});

/**
 * Acik oturum yokken (ve sorgu henuz yuklenmemisken -- ikisinde de `data` bos) kart HIC cizilmez:
 * antrenmansiz bir gunde Ana sayfa bugunku haliyle kalir, bos bir kutu ya da anlik parlama olmaz.
 */
test('acik antrenman yokken kart cizilmez', async () => {
  useOpenSessionMock.mockReturnValue({ data: null, isLoading: false, isError: false });

  await render(<DevamEdenAntrenman />);

  expect(screen.queryByText('Devam et')).toBeNull();
});
