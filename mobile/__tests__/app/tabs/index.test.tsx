import { render, screen } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import AnaSayfaScreen from '../../../app/(tabs)/index';

// Takvim'in kendi testleri var; burada sinanan tek sey DevamEdenAntrenman'in Ana sayfaya BAGLI
// oldugu, o yuzden takvim disarida birakiliyor (kendi sorgularini kurmasin).
jest.mock('../../../src/components/Takvim', () => () => null);

const mockKart = jest.fn();
jest.mock('../../../src/components/DevamEdenAntrenman', () => () => {
  mockKart();
  return require('react').createElement(require('react-native').Text, null, 'devam-eden-antrenman');
});

/**
 * Issue #175: acik antrenman karti Ana sayfada, takvimin USTUNDE durur -- uygulama yeniden
 * acildiginda kullanicinin ilk gordugu ekran budur.
 */
test('Ana sayfa devam eden antrenman kartini gosterir', async () => {
  await render(
    <PageTitleProvider>
      <AnaSayfaScreen />
    </PageTitleProvider>,
  );

  expect(screen.getByText('devam-eden-antrenman')).toBeTruthy();
});
