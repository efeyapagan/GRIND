import { render, screen } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { useCalendar, useOpenSession } from '@grind/shared/api/queries';
import AnaSayfaScreen from '../../../app/(tabs)/index';

// Takvim ve kart GERCEK cizilir (ikisinin de kendi testleri var): sinanan sey ikisinin Ana sayfadaki
// SIRASI, o yuzden yalnizca besledikleri sorgular mock'lanir.
jest.mock('@grind/shared/api/queries', () => ({
  useCalendar: jest.fn(),
  useOpenSession: jest.fn(),
  // #418: ana ekranda arkadas karsilastirmasi da var; bu testin konusu degil, bos liste yeter.
  useArkadasHaftasi: () => ({ data: [], isLoading: false, isError: false }),
  useProfilFotografi: () => ({ data: null }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }) }));

const useCalendarMock = useCalendar as jest.Mock;
const useOpenSessionMock = useOpenSession as jest.Mock;

beforeEach(() => {
  useCalendarMock.mockReturnValue({
    data: {
      from: '',
      to: '',
      days: [],
      trainedDayCount: 0,
      currentWeekStreak: 2,
      longestWeekStreak: 5,
      thisWeekTrainedDays: 1,
      weeklyTargetDays: 4,
      currentTargetStreak: 1,
    },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
  });
  useOpenSessionMock.mockReturnValue({
    data: {
      id: 7,
      startedAt: '2026-09-26T09:00:00Z',
      isOpen: true,
      templateId: 3,
      templateName: 'Push Day A',
      progress: [],
    },
    isLoading: false,
    isError: false,
  });
});

async function ciz() {
  await render(
    <PageTitleProvider>
      <AnaSayfaScreen />
    </PageTitleProvider>,
  );
}

/** Cizilen agactaki sira: sayfa tek bir dikey kolon oldugu icin agac sirasi = ekrandaki sira. */
function siraNo(metin: string): number {
  const sira = JSON.stringify(screen.toJSON()).indexOf(metin);
  expect(sira).toBeGreaterThanOrEqual(0);
  return sira;
}

/**
 * Issue #175: acik antrenman karti Ana sayfaya baglidir -- uygulama yeniden acildiginda kullanicinin
 * dustugu ekran burasi ve antrenman "kaybolmus" gorunmemeli.
 *
 * #412'de kart EN ALTA alinmisti: acik oturum sorgusu takvimden ayri bir anda cozuldugu icin kart
 * sonradan belirince altindaki her sey kayiyor, takvim izgarasiyla haftalik ozet birbirine
 * giriyordu. #502 (kullanici karari) karti geri USTE aldi -- ama sebebi kacinarak degil COZEREK:
 * bkz. bir sonraki test.
 */
test('devam eden antrenman karti haftalik ozet kartlarinin USTUNDE cizilir', async () => {
  await ciz();

  expect(siraNo('Antrenmana devam et')).toBeLessThan(siraNo('Haftalık seri'));
  expect(siraNo('Antrenmana devam et')).toBeLessThan(siraNo('Haftalık hedef'));
});

/**
 * #502'nin cekirdegi (kullanici bildirdi: "once takvim geliyor, sonra cakisiyor, sonra takvim
 * asagi iniyor"): kartin ALTINDAKI hicbir sey, kartin olup olmadigi BILINMEDEN cizilmez. Boylece
 * itilecek bir sey olmaz -- #412'nin kacindigi kayma bu sefer imkansiz.
 */
test('oturum sorgusu cozulmeden altindaki hicbir sey cizilmez', async () => {
  useOpenSessionMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });

  await ciz();

  expect(screen.queryByText('Haftalık seri')).toBeNull();
  expect(screen.queryByText('Arkadaşlar')).toBeNull();
});

/** Acik antrenman YOKKEN sayfa bugunku haliyle kalir: kart yok, geri kalan gecikmeden cizilir. */
test('acik antrenman yokken sayfa beklemeden cizilir', async () => {
  useOpenSessionMock.mockReturnValue({ data: { isOpen: false }, isLoading: false, isError: false });

  await ciz();

  expect(screen.getByText('Haftalık seri')).toBeTruthy();
  expect(screen.queryByText('Antrenmana devam et')).toBeNull();
});
