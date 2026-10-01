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
  // kategori satiri (53) + 4 sonuc satiri (4*44=176) + mt-1 (4) = 233 (HareketSecici'deki LISTE_YUKSEKLIGI).
  expect(asagiKaydir).toHaveBeenCalledWith(233);
});

/**
 * #559 (kullanici bildirdi, ucuncu bulgu: "yine klavyenin altinda kalmis... hareket kartlarinin
 * uzamasini istemiyorum"): sanal bosluk HareketSecici'nin KENDI icine eklenirse dropdown'un
 * anchor'ini da asagi itiyordu (BIR USTTEKI test dosyasindaki not) VE kartin gorunurde
 * uzamasina yol aciyordu. Bosluk artik yalnizca FORMUN EN SONUNDA, ilk satirin DEGIL sadece
 * EN SON satirin listesi acikken belirir.
 */
test('sanal bosluk yalnizca en son satirin listesi acikken formun sonunda belirir', async () => {
  (useExercises as jest.Mock).mockReturnValue({
    data: [
      { id: 1, name: 'Bench Press', category: 'Push' },
      { id: 2, name: 'Squat', category: 'Legs' },
    ],
  });
  const ikiHareketliSablon = {
    ...sablon,
    exercises: [
      { exerciseId: 1, exerciseName: 'Bench Press', category: 'Push' as const, isArchived: false, plannedSets: 3, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', category: 'Legs' as const, isArchived: false, plannedSets: 3, restSeconds: 90 },
    ],
  };
  await render(<SablonFormu sablon={ikiHareketliSablon} donusYolu="/templates" />);

  expect(screen.queryByTestId('sanal-bosluk')).toBeNull();

  // Ilk (son OLMAYAN) satir acilinca bosluk BELIRMEZ.
  await fireEvent(screen.getByTestId('hareket-0-egzersiz'), 'focus');
  expect(screen.queryByTestId('sanal-bosluk')).toBeNull();

  // En son satir acilinca bosluk belirir...
  await fireEvent(screen.getByTestId('hareket-1-egzersiz'), 'focus');
  expect(screen.getByTestId('sanal-bosluk')).toBeTruthy();

  // ...kapaninca kaybolur.
  await fireEvent(screen.getByTestId('hareket-1-egzersiz'), 'blur');
  expect(screen.queryByTestId('sanal-bosluk')).toBeNull();
});

// ---- Yeni satir SECILMEMIS baslar (#559 ucuncu bulgu) ----

/**
 * #559 (kullanici bildirdi): "Hareket ekle"ye basinca ILK UYGUN hareket otomatik SECILIYORDU --
 * kullanici bunu "sanki ... yaziyormus gibi" gercek bir secim sandi. Yeni satir artik tamamen
 * SECILMEMIS baslar: silik "Hareket ara" yer tutucusu gorunur, gercek bir hareket adi DEGIL.
 */
test('Hareket ekle basilinca yeni satir secilmemis baslar, gercek bir ad otomatik gorunmez', async () => {
  (useExercises as jest.Mock).mockReturnValue({
    data: [
      { id: 1, name: 'Bench Press', category: 'Push' },
      { id: 2, name: 'Squat', category: 'Legs' },
    ],
  });
  await render(<SablonFormu sablon={{ ...sablon, exercises: [] }} donusYolu="/templates" />);

  await fireEvent.press(screen.getByText('Hareket ekle'));

  expect(screen.getByTestId('hareket-0-egzersiz').props.value).toBe('');
  expect(screen.getByTestId('hareket-0-egzersiz').props.placeholder).toBe('Hareket ara');
  expect(screen.queryByText('Bench Press')).toBeNull();
});

/** Secilmemis bir satirla Kaydet'e basinca hata gosterilir, kaydetme GONDERILMEZ. */
test('hareket secilmeden kaydedilmeye calisilirsa hata gosterilir, API cagrilmaz', async () => {
  (useExercises as jest.Mock).mockReturnValue({
    data: [{ id: 1, name: 'Bench Press', category: 'Push' }],
  });
  const olustur = jest.fn();
  (useCreateTemplate as jest.Mock).mockReturnValue({ mutateAsync: olustur, isPending: false });
  await render(<SablonFormu sablon={null} donusYolu="/templates" />);

  await fireEvent.changeText(screen.getByLabelText('Şablon adı'), 'Push Day');
  await fireEvent.press(screen.getByText('Hareket ekle'));
  await fireEvent.press(screen.getByText('Kaydet'));

  expect(screen.getByText('Bir hareket seç.')).toBeTruthy();
  expect(olustur).not.toHaveBeenCalled();
});
