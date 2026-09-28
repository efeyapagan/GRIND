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
  isSharedOverride: null,
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

test('Herkese acik secilince paylasim mutasyonu override true ile cagrilir', async () => {
  await render(<SablonFormu sablon={sablon} donusYolu="/templates" />);

  await fireEvent.press(screen.getByText('Herkese açık'));

  expect(paylasimMutasyonu).toHaveBeenCalledWith({ id: 1, override: true });
});

test('yeni sablon olustururken (sablon null) paylasim kontrolu gorunmez', async () => {
  await render(<SablonFormu sablon={null} donusYolu="/templates" />);

  expect(screen.queryByText('Bu şablonu paylaş')).toBeNull();
});
