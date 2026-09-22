import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await session.write('tok', ileriTarih(60_000), 'efe');
});

/**
 * Issue #255: kaydirmaya (#232) EK, tutarli bir ust baslik geri dugmesi -- kok sekmelerde
 * (Ana Sayfa/Antrenman/Profil) gorunmez, baska her ekranda ("alt ekran") gorunur ve basilinca
 * geri gotur. Gercek rotalarla (renderRouterAsync): `_layout.tsx`teki `KabukBaslik` sinanir.
 */
test('kok sekmede geri dugmesi gorunmez', async () => {
  const { sahteRequest } = sahteBackendOlustur();
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/' });

  await screen.findByText('Ana sayfa');
  expect(screen.queryByLabelText('Geri')).toBeNull();
});

test('alt ekranda geri dugmesi gorunur ve basilinca Ana Sayfaya doner', async () => {
  const { sahteRequest } = sahteBackendOlustur();
  requestMock.mockImplementation(sahteRequest);

  // Dogrudan bir alt ekranda acilir -- gecmis yok, bu yuzden geri gecmise degil Ana Sayfaya gider
  // (`geriHedefi`nin `router.canGoBack() === false` dali).
  await renderRouterAsync('./app', { initialUrl: '/templates' });

  const geriDugmesi = await screen.findByLabelText('Geri');
  await fireEvent.press(geriDugmesi);

  await waitFor(() => expect(screen.getByText('Ana sayfa')).toBeTruthy());
});
