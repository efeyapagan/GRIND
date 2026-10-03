import { fireEvent, render, screen } from '@testing-library/react-native';
import { useDeleteTemplate, useSablonuSabitle, useTemplates } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import KaydedilenSablonlarScreen from '../../../app/(tabs)/templates/saved';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useDeleteTemplate: jest.fn(),
  useSablonuSabitle: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const sil = jest.fn();
const sabitle = jest.fn();

beforeEach(() => {
  sil.mockReset();
  sabitle.mockReset();
  mockPush.mockReset();
  (useTemplates as jest.Mock).mockReturnValue({
    data: [
      { id: 1, name: 'Kendi Sablonum', exercises: [], savedFromUsername: null, lastUsedAt: null, isPinned: false },
      { id: 2, name: 'Push Day (efe)', exercises: [], savedFromUsername: 'efe', lastUsedAt: null, isPinned: false },
    ],
    isLoading: false,
    isError: false,
  });
  (useDeleteTemplate as jest.Mock).mockReturnValue({ mutate: sil, isPending: false });
  (useSablonuSabitle as jest.Mock).mockReturnValue({ mutate: sabitle, isPending: false });
});

async function ciz() {
  await render(
    <PageTitleProvider>
      <KaydedilenSablonlarScreen />
    </PageTitleProvider>,
  );
}

/** #538: bu ekran yalnizca baskasindan kaydedilen sablonlari gosterir; kendi sablonlarin Sablonlarim'da. */
test('yalnizca kaydedilen sablonlar listelenir', async () => {
  await ciz();

  expect(screen.getByText('Push Day (efe)')).toBeTruthy();
  expect(screen.queryByText('Kendi Sablonum')).toBeNull();
});

/** #538: surukleme tutamaginin yerinde sabitleme dugmesi -- sabitlenen sablon her iki listede basa gecer. */
test('sabitle dugmesi o sablonu sunucuda sabitler', async () => {
  await ciz();

  await fireEvent.press(screen.getByRole('button', { name: 'Başa sabitle' }));

  expect(sabitle).toHaveBeenCalledWith({ id: 2, isPinned: true });
});

/** #538 (kullanici karari): silme gorunur bir cop kutusundan degil, basili tutunca acilan menuden; onay sorar. */
test('basili tutunca acilan menuden onaylaninca o sablon silinir', async () => {
  await ciz();

  await fireEvent(screen.getByRole('button', { name: 'Push Day (efe)' }), 'longPress');
  await fireEvent.press(screen.getByRole('button', { name: 'Şablonu sil' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(sil).toHaveBeenCalledWith(2);
});

/** Sablonlarim ekranindaki gibi: yonetim ekraninda karta dokunmak sablonun duzenleme formunu acar. */
test('karta dokununca o sablonun duzenleme ekranina gider', async () => {
  await ciz();

  await fireEvent.press(screen.getByRole('button', { name: 'Push Day (efe)' }));

  expect(mockPush).toHaveBeenCalledWith('/templates/2');
});
