import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useFinishSession, useOpenSession } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import AntrenmanBitirScreen from '../../../app/(tabs)/antrenman-bitir';

jest.mock('@grind/shared/api/queries', () => ({
  useFinishSession: jest.fn(),
  useOpenSession: jest.fn(),
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  Redirect: ({ href }: { href: string }) =>
    require('react').createElement(require('react-native').Text, null, `yonlendirme:${href}`),
}));

const useOpenSessionMock = useOpenSession as jest.Mock;
const useFinishSessionMock = useFinishSession as jest.Mock;

const ACIK_OTURUM = {
  id: 7,
  startedAt: '2026-09-20T09:00:00Z',
  endedAt: null,
  isOpen: true,
  templateId: null,
  templateName: null,
  progress: [],
};

function ekraniOlustur() {
  return render(
    <PageTitleProvider>
      <AntrenmanBitirScreen />
    </PageTitleProvider>,
  );
}

beforeEach(() => {
  mockReplace.mockReset();
  mockBack.mockReset();
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM, isLoading: false, isError: false });
  useFinishSessionMock.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
});

/**
 * #153: "Antrenmanı bitir" artık antrenman ekranında değil, bu ayrı ekranda kapanıyor. Kadran
 * açılışta Orta'da durur; kullanıcı hiç dokunmadan bitirirse gönderilen zorluk budur.
 */
test('varsayilan kademe Orta ile bitirilir', async () => {
  const mutate = jest.fn();
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

  expect(mutate).toHaveBeenCalledWith({ sessionId: 7, zorluk: 'Medium' }, expect.anything());
});

test('kadranda secilen kademe gonderilir', async () => {
  const mutate = jest.fn();
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByLabelText('Maksimal'));
  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

  expect(mutate).toHaveBeenCalledWith({ sessionId: 7, zorluk: 'Maximal' }, expect.anything());
});

/** Zorluk seçmek ZORUNLU değil (backend alanı nullable): "Atla" antrenmanı zorluksuz kapatır. */
test('atla zorluksuz bitirir', async () => {
  const mutate = jest.fn();
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Atla' }));

  expect(mutate).toHaveBeenCalledWith({ sessionId: 7, zorluk: null }, expect.anything());
});

test('bitince ana sayfaya donulur', async () => {
  const mutate = jest.fn((_govde, { onSuccess }) => onSuccess());
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

/**
 * Ekran doğrudan (ör. derin bağlantıyla) açılırsa ya da antrenman başka bir yerde kapandıysa
 * kapatılacak bir şey yoktur — boş bir kadran göstermek yerine antrenman ekranına dönülür.
 */
test('acik antrenman yoksa antrenman ekranina yonlendirilir', async () => {
  useOpenSessionMock.mockReturnValue({ data: null, isLoading: false, isError: false });
  await ekraniOlustur();

  expect(screen.getByText('yonlendirme:/antrenman')).toBeTruthy();
});

test('bitirme hatasi ekranda gosterilir', async () => {
  useFinishSessionMock.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: true });
  await ekraniOlustur();

  expect(screen.getByText('Antrenman bitirilemedi. Lütfen tekrar deneyin.')).toBeTruthy();
});

/**
 * #182: "Devam et" vazgeçmedir, iptal değil — istek gitmez, oturum açık kalır, antrenman ekranına
 * geri dönülür (cihazın geri tuşuyla aynı iş, ama artık ekranda görünür bir eylem).
 */
test('devam et antrenmani bitirmeden geri doner', async () => {
  const mutate = jest.fn();
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Devam et' }));

  expect(mockBack).toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});
