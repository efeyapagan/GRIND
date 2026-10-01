import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  useExercises,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useUpdateTemplateSharing,
} from '@grind/shared/api/queries';
import { EkranKaydiriciBaglami } from '../ui/EkranKaydirici';
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

/**
 * #559 (kullanici bildirdi, ikinci bulgu): en sondaki hareketin adini girerken asagi acilan oneri
 * listesinin son 1-2 secenegi klavyenin altinda kaliyordu -- asagida yeterli yer yoktu. Yalnizca
 * EN SON satir yukari acmali (HareketEklePaneli'ndeki ayni cozum, #62); digerleri eskisi gibi asagi.
 */
/**
 * #559 (kullanici karari, ikinci duzeltme): liste TUM satirlarda asagi acar (tutarli gorunum) --
 * yalnizca EN SON satir acilinca, onun oneri listesinin klavyenin altinda kalmamasi icin
 * ScrollView'e `asagiKaydir` ile gecici yer acilmasi ISTENIR (ihtiyac aninda, yani liste acikken).
 */
test('her iki satirin hareket secicisi de asagi acar, yalnizca en son satir acilinca scroll istenir', async () => {
  (useExercises as jest.Mock).mockReturnValue({
    data: [
      { id: 1, name: 'Bench Press', category: 'Push' },
      { id: 2, name: 'Squat', category: 'Legs' },
      { id: 3, name: 'Pull Up', category: 'Pull' },
    ],
  });
  const ikiHareketliSablon = {
    ...sablon,
    exercises: [
      { exerciseId: 1, exerciseName: 'Bench Press', category: 'Push' as const, isArchived: false, plannedSets: 3, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', category: 'Legs' as const, isArchived: false, plannedSets: 3, restSeconds: 90 },
    ],
  };
  const asagiKaydir = jest.fn();
  await render(
    <EkranKaydiriciBaglami.Provider value={{ asagiKaydir }}>
      <SablonFormu sablon={ikiHareketliSablon} donusYolu="/templates" />
    </EkranKaydiriciBaglami.Provider>,
  );

  await fireEvent(screen.getByTestId('hareket-0-egzersiz'), 'focus');
  expect(screen.getByTestId('hareket-0-egzersiz-liste').props.className).toContain('top-full');
  expect(asagiKaydir).not.toHaveBeenCalled();

  await fireEvent(screen.getByTestId('hareket-1-egzersiz'), 'focus');
  expect(screen.getByTestId('hareket-1-egzersiz-liste').props.className).toContain('top-full');
  // max-h-64 (256) + mt-1 (4) = 260 (HareketSecici'deki LISTE_YUKSEKLIGI).
  expect(asagiKaydir).toHaveBeenCalledWith(260);
});
