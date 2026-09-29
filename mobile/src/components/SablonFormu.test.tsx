import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  useExercises,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useUpdateTemplateSharing,
} from '@grind/shared/api/queries';
import SablonFormu from './SablonFormu';

jest.mock('@grind/shared/api/queries', () => ({
  useExercises: jest.fn(),
  useCreateTemplate: jest.fn(),
  useUpdateTemplate: jest.fn(),
  useDeleteTemplate: jest.fn(),
  useUpdateTemplateSharing: jest.fn(),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const useUpdateTemplateSharingMock = useUpdateTemplateSharing as jest.Mock;
const paylasimMutasyonu = jest.fn();

const sablon = {
  id: 1,
  name: 'Push Day',
  exercises: [],
  visibility: 'Friends' as const,
  savedFromUsername: null,
  lastUsedAt: null,
};

beforeEach(() => {
  paylasimMutasyonu.mockReset();
  (useExercises as jest.Mock).mockReturnValue({ data: [] });
  (useCreateTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useUpdateTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useDeleteTemplate as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  useUpdateTemplateSharingMock.mockReturnValue({ mutate: paylasimMutasyonu, isPending: false, isError: false });
});

/**
 * #540: uc secenek -- Herkese acik (uygulamadaki herkes), Arkadaslar (karsilikli takip), Gizli.
 * Etkin gorunurluk isaretlidir; sunucu onu hesap seviyesinden turetip gonderir, istemci eslemeyi
 * ikinci kez yapmaz. "Hesap ayarina gore" secenegi yok.
 */
test('uc gorunurluk secenegi var ve etkin olan isaretli', async () => {
  await render(<SablonFormu sablon={sablon} donusYolu="/templates" />);

  expect(screen.getByRole('button', { name: 'Herkese açık' })).not.toBeSelected();
  expect(screen.getByRole('button', { name: 'Arkadaşlar' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Gizli' })).not.toBeSelected();
  expect(screen.queryByText('Hesap ayarına göre')).toBeNull();
});

test('Herkese acik secilince gorunurluk Public olarak gonderilir', async () => {
  await render(<SablonFormu sablon={sablon} donusYolu="/templates" />);

  await fireEvent.press(screen.getByRole('button', { name: 'Herkese açık' }));

  expect(paylasimMutasyonu).toHaveBeenCalledWith({ id: 1, visibility: 'Public' });
});

/** Issue: "Arkadaslarin ... gorebilir" aciklamasi uc secenekle celisiyordu (Public herkese acik). */
test('yalnizca arkadaslardan soz eden aciklama yok', async () => {
  await render(<SablonFormu sablon={sablon} donusYolu="/templates" />);

  expect(screen.queryByText(/karşılıklı takip/)).toBeNull();
});

test('yeni sablon olustururken (sablon null) paylasim kontrolu gorunmez', async () => {
  await render(<SablonFormu sablon={null} donusYolu="/templates" />);

  expect(screen.queryByText('Bu şablonu paylaş')).toBeNull();
});
