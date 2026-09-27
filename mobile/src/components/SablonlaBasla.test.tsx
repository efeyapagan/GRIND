import { render, screen, fireEvent } from '@testing-library/react-native';
import { useTemplates, useDeleteTemplate } from '@grind/shared/api/queries';
import SablonlaBasla from './SablonlaBasla';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useDeleteTemplate: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: jest.fn(),
  };
});

const useTemplatesMock = useTemplates as jest.Mock;
const useDeleteTemplateMock = useDeleteTemplate as jest.Mock;
const sil = jest.fn();

function hareket(exerciseName: string, category: string, plannedSets: number) {
  return { exerciseId: 0, exerciseName, category, isArchived: false, plannedSets, restSeconds: 90 };
}

const SABLONLAR = [
  {
    id: 7,
    name: 'Push Day',
    exercises: [
      hareket('Bench Press', 'Push', 4),
      hareket('Incline Press', 'Push', 3),
      hareket('Dips', 'Push', 3),
      hareket('Lateral Raise', 'Push', 2),
    ],
  },
  { id: 8, name: 'Pull Day', exercises: [hareket('Pull Up', 'Pull', 3)] },
];

beforeEach(() => {
  sil.mockReset();
  mockPush.mockReset();
  useTemplatesMock.mockReturnValue({ data: SABLONLAR, isLoading: false, isError: false });
  useDeleteTemplateMock.mockReturnValue({ mutate: sil, isPending: false });
});

/** #439: kart ilk uc hareketin adini ve "N hareket | M set" ozetini gosterir. */
test('kart ilk uc hareketin adini, hareket ve toplam set sayisini gosterir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.getByText('Bench Press, Incline Press, Dips')).toBeTruthy();
  expect(screen.getByText('4 hareket')).toBeTruthy();
  expect(screen.getByText('12 set')).toBeTruthy();
});

/** Kartin "Basla" dugmesi O sablonla antrenmani baslatir. */
test('Basla dugmesi o sablonla antrenmani baslatir', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await fireEvent.press(screen.getAllByRole('button', { name: 'Başla' })[1]);

  expect(onBasla).toHaveBeenCalledWith(8);
});

/** #439: yana kaydirma liste gezintisine gittigi icin kisayollar basili tutunca acilan menude. */
test('basili tutunca acilan menudeki Duzenle sablon formuna gider, antrenmani baslatmaz', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await fireEvent(screen.getByText('Push Day'), 'longPress');
  await fireEvent.press(screen.getByRole('button', { name: 'Şablonu düzenle' }));

  expect(mockPush).toHaveBeenCalledWith('/templates/7');
  expect(onBasla).not.toHaveBeenCalled();
});

/** Silme geri alinamaz: menudeki Sil once onay sorar, onayla O sablon silinir. */
test('menudeki Sil once onay sorar, onaylaninca o sablon silinir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  await fireEvent(screen.getByText('Pull Day'), 'longPress');
  await fireEvent.press(screen.getByRole('button', { name: 'Şablonu sil' }));

  expect(screen.getByText(/Silmek istediğine emin misin/)).toBeTruthy();
  expect(sil).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(sil).toHaveBeenCalledWith(8);
});
