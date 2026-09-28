import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useArkadasDonemi } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { TakvimDonemiProvider, useArkadaslarDonemi } from '../../../src/ui/TakvimDonemiContext';
import ArkadaslarScreen from '../../../app/(tabs)/arkadaslar';

jest.mock('@grind/shared/api/queries', () => ({
  useArkadasDonemi: jest.fn(),
  useProfilFotografi: () => ({ data: null }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const useArkadasDonemiMock = useArkadasDonemi as jest.Mock;

function arkadas(username: string, trainedDays: number) {
  return {
    username,
    displayName: null,
    hasAvatar: false,
    avatarVersion: null,
    trainedDays,
    weeklyTargetDays: 3,
    trainedToday: false,
    setCount: 0,
    volume: 0,
    isSelf: false,
  };
}

beforeEach(() => {
  useArkadasDonemiMock.mockReturnValue({ data: [], isLoading: false, isError: false });
});

/**
 * #420 (kullanici karari): ekran varsayilan olarak ANA SAYFADA secili donemle acilir. Donem tek
 * kaynaktan geldigi icin bu ayrica tasinmaz -- ekran ayni saglayiciyi okur.
 */
test('ekran ana sayfanin donemiyle acilir', async () => {
  await render(
    <TakvimDonemiProvider bugun="2026-09-30" baslangic={{ gorunum: 'ay', gosterilen: '2026-08-10' }}>
      <PageTitleProvider>
        <ArkadaslarScreen />
      </PageTitleProvider>
    </TakvimDonemiProvider>,
  );

  expect(useArkadasDonemiMock).toHaveBeenLastCalledWith('2026-08-01', '2026-08-31');
});

/** Ana sayfadaki 7 sinirinin tersine burada HERKES listelenir. */
test('ekranda tum arkadaslar listelenir', async () => {
  useArkadasDonemiMock.mockReturnValue({
    data: Array.from({ length: 10 }, (_, i) => arkadas(`k${i}`, i % 4)),
    isLoading: false,
    isError: false,
  });

  await render(
    <TakvimDonemiProvider bugun="2026-09-30">
      <PageTitleProvider>
        <ArkadaslarScreen />
      </PageTitleProvider>
    </TakvimDonemiProvider>,
  );

  expect(screen.getAllByLabelText(/profilini aç$/)).toHaveLength(10);
});

/** Ekrani acip kapatan bir kabuk + ekranin donemini secen bir dugme (sag ustteki pencerenin yerine). */
function Kabuk() {
  const [acik, setAcik] = useState(true);
  const { sec } = useArkadaslarDonemi();
  return (
    <>
      <Pressable onPress={() => setAcik(!acik)}><Text>ac-kapa</Text></Pressable>
      <Pressable onPress={() => sec('ay', '2026-07-01')}><Text>temmuzu-sec</Text></Pressable>
      {acik && <ArkadaslarScreen />}
    </>
  );
}

/**
 * Kullanici karari: ekranin donemi ANA SAYFAYI TASIMAZ ve ekran her acilista ana sayfanin o anki
 * donemiyle baslar -- gecen ziyaretten kalan secim yeni bir acilisa sizmaz.
 */
test('ekran yeniden acilinca ana sayfanin donemine doner', async () => {
  await render(
    <TakvimDonemiProvider bugun="2026-09-30">
      <PageTitleProvider>
        <Kabuk />
      </PageTitleProvider>
    </TakvimDonemiProvider>,
  );

  await act(async () => fireEvent.press(screen.getByText('temmuzu-sec')));
  expect(useArkadasDonemiMock).toHaveBeenLastCalledWith('2026-07-01', '2026-07-31');

  await act(async () => fireEvent.press(screen.getByText('ac-kapa')));
  await act(async () => fireEvent.press(screen.getByText('ac-kapa')));

  expect(useArkadasDonemiMock).toHaveBeenLastCalledWith('2026-09-28', '2026-10-04');
});
