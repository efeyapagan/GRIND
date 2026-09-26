import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { oturumBittiTazele, useFinishSession, useOpenSession, useTemplate } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import AntrenmanBitirScreen from '../../../app/(tabs)/antrenman-bitir';

jest.mock('@grind/shared/api/queries', () => ({
  oturumBittiTazele: jest.fn(),
  useFinishSession: jest.fn(),
  useOpenSession: jest.fn(),
  useTemplate: jest.fn(),
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
const useTemplateMock = useTemplate as jest.Mock;
const oturumBittiTazeleMock = oturumBittiTazele as jest.Mock;

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
    <QueryClientProvider client={new QueryClient()}>
      <PageTitleProvider>
        <AntrenmanBitirScreen />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockReplace.mockReset();
  mockBack.mockReset();
  oturumBittiTazeleMock.mockReset();
  useOpenSessionMock.mockReturnValue({ data: ACIK_OTURUM, isLoading: false, isError: false });
  useFinishSessionMock.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
  // Varsayilan: sablonsuz oturum -- sapma karsilastirmasi icin sablon yok.
  useTemplateMock.mockReturnValue({ data: undefined });
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
 * #363: ana sayfa bitirmenin hemen ardından açılır; açık oturum önbelleği o anda temizlenmezse biten
 * antrenmanın "Devam ediyor" kartı bir an çizilip kalkar ve takvim yerinden zıplar.
 */
test('bitince acik oturum onbellegi temizlenir', async () => {
  const mutate = jest.fn((_govde, { onSuccess }) => onSuccess());
  useFinishSessionMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Atla' }));

  expect(oturumBittiTazeleMock).toHaveBeenCalled();
});

/**
 * #363: önbellek temizlenince bu ekran, ana sayfaya geçmeden bir kez daha "açık oturum yok" ile
 * çizilebilir. Bu, "kapatılacak antrenman yok" durumu DEĞİL — antrenmanı az önce kendisi kapattı;
 * antrenman ekranına yönlendirmek ana sayfaya geçişi ezerdi.
 */
test('bitirdikten sonra acik oturum bosalinca antrenman ekranina yonlendirilmez', async () => {
  useOpenSessionMock.mockReturnValue({ data: null, isLoading: false, isError: false });
  useFinishSessionMock.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false, isSuccess: true });
  await ekraniOlustur();

  expect(screen.queryByText('yonlendirme:/antrenman')).toBeNull();
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

describe('bitirince sablon olarak kaydetme sorusu (#186)', () => {
  const SABLONSUZ_HAREKETLI = {
    ...ACIK_OTURUM,
    progress: [
      { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: null, completedSets: 3, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', plannedSets: null, completedSets: 2, restSeconds: 120 },
    ],
  };

  beforeEach(() => {
    useOpenSessionMock.mockReturnValue({ data: SABLONSUZ_HAREKETLI, isLoading: false, isError: false });
    useFinishSessionMock.mockReturnValue({
      mutate: jest.fn((_govde, { onSuccess }) => onSuccess()),
      isPending: false,
      isError: false,
    });
  });

  test('sablonsuz ve hareketli antrenman bitince sablon sorusu cikar', async () => {
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

    expect(await screen.findByText('Şablon olarak kaydedilsin mi?')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('sorudaki Sablon olarak kaydet antrenmanin hareketleriyle sablon formuna gider', async () => {
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Atla' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/templates/new',
      params: {
        donus: '/',
        hareketler: JSON.stringify([
          { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 90 },
          { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, restSeconds: 120 },
        ]),
      },
    });
  });

  test('sorudaki Simdi degil ana sayfaya doner', async () => {
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Şimdi değil' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  /** Sablonla baslamis oturum; sapma karsilastirmasi `useTemplate`ten gelen listeye bakar. */
  function sablonluOturumuKur(sablonHareketIdleri: number[] | null) {
    useOpenSessionMock.mockReturnValue({
      data: { ...SABLONSUZ_HAREKETLI, templateId: 10, templateName: 'Push Day' },
      isLoading: false,
      isError: false,
    });
    useTemplateMock.mockReturnValue({
      data:
        sablonHareketIdleri === null
          ? undefined
          : { id: 10, name: 'Push Day', exercises: sablonHareketIdleri.map((exerciseId) => ({ exerciseId })) },
    });
  }

  /** Liste sablonun aynisi: yeni bir sablon adayi yok, soru sorulmaz. */
  test('sablonundan sapmamis antrenman bitince soru sorulmaz, ana sayfaya donulur', async () => {
    sablonluOturumuKur([1, 2]);
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Şablon olarak kaydedilsin mi?')).toBeNull();
  });

  /** Sablonda olmayan bir hareket eklendiyse liste artik yeni bir sablon adayidir. */
  test('sablonunda olmayan hareket eklenmis antrenman bitince soru cikar', async () => {
    sablonluOturumuKur([1]);
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

    expect(screen.getByText('Şablon olarak kaydedilsin mi?')).toBeTruthy();
    // Aciklama sablonsuz halinkinden farkli: neden soruldugunu anlatir.
    expect(
      screen.getByText('Şablonunda olmayan hareketler eklemişsin. Bu listeyi yeni bir şablon olarak kaydedebilirsin.'),
    ).toBeTruthy();
  });

  test('sapan antrenmanda Sablon olarak kaydet TUM hareketlerle yeni sablon formuna gider', async () => {
    sablonluOturumuKur([1]);
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Şablon olarak kaydet' }));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/templates/new',
      params: {
        donus: '/',
        hareketler: JSON.stringify([
          { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 90 },
          { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, restSeconds: 120 },
        ]),
      },
    });
  });

  /** Sablon alinamazsa bitirme BEKLETILMEZ: soru sorulmadan ana sayfaya donulur. */
  test('sablon sorgusu sonuclanmadiysa soru sorulmaz', async () => {
    sablonluOturumuKur(null);
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Şablon olarak kaydedilsin mi?')).toBeNull();
  });
});
