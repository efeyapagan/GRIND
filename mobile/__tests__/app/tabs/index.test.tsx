import { render, screen } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { useCalendar, useOpenSession } from '@grind/shared/api/queries';
import AnaSayfaScreen from '../../../app/(tabs)/index';

// Takvim ve kart GERCEK cizilir (ikisinin de kendi testleri var): sinanan sey ikisinin Ana sayfadaki
// SIRASI, o yuzden yalnizca besledikleri sorgular mock'lanir.
jest.mock('@grind/shared/api/queries', () => ({
  useCalendar: jest.fn(),
  useOpenSession: jest.fn(),
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
 * Issue #412: kart #175'ten beri sayfanin EN USTUNDEYDI; acik oturum sorgusu takvimden ayri bir anda
 * cozuldugu icin kart sonradan belirince altindaki her sey kayiyor ve takvim izgarasiyla haftalik ozet
 * birbirine giriyordu. Kart artik en altta: ustundeki hicbir sey onun gec gelmesinden etkilenmez.
 */
test('devam eden antrenman karti haftalik ozet kartlarinin ALTINDA cizilir', async () => {
  await render(
    <PageTitleProvider>
      <AnaSayfaScreen />
    </PageTitleProvider>,
  );

  expect(siraNo('Devam ediyor')).toBeGreaterThan(siraNo('Haftalık seri'));
  expect(siraNo('Devam ediyor')).toBeGreaterThan(siraNo('Haftalık hedef'));
});
