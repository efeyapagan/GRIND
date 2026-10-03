import { render, screen } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { BaglantiBaglami } from '../../src/baglanti/BaglantiSaglayici';
import RecordsScreen from '../../app/(tabs)/profile/records';
import MeasurementsScreen from '../../app/(tabs)/profile/measurements';
import ProgressScreen from '../../app/(tabs)/profile/progress';
import KullaniciAraScreen from '../../app/(tabs)/profile/search';
import InsightsScreen from '../../app/(tabs)/insights';
import KullaniciProfiliLayout from '../../app/(tabs)/profile/u/[username]/_layout';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ username: 'efe' }),
  useSegments: () => [],
  Slot: () => null,
}));

/**
 * #174 (kullanici karari): bu bolumler onbellekten gosterilmez -- cevrimdisiyken icerik baglanmaz
 * (sorgusu calismaz, istek gitmez), yerine "Internete baglan" uyarisi cizilir.
 */
test.each([
  ['Rekorlar', RecordsScreen],
  ['Olculer', MeasurementsScreen],
  ['Ilerleme', ProgressScreen],
  ['Arkadas arama', KullaniciAraScreen],
  ['GRINDY', InsightsScreen],
  ['Baskasinin profili', KullaniciProfiliLayout],
])('%s cevrimdisiyken internete baglan uyarisi gosterir', async (_ad, Ekran) => {
  await render(
    <PageTitleProvider>
      <BaglantiBaglami.Provider value>
        <Ekran />
      </BaglantiBaglami.Provider>
    </PageTitleProvider>,
  );

  expect(screen.getByText('İnternete bağlan')).toBeTruthy();
});
