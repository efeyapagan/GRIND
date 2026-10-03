import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import type { GecmisOturum, SetKaydi } from '@grind/shared/api/queries';
import GecmisDetayPaneli from './GecmisDetayPaneli';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const requestMock = request as jest.Mock;

const KAYIT: SetKaydi = {
  id: 7,
  sessionId: 1,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  exercisePosition: 1,
  weight: 60,
  reps: 8,
  durationSeconds: null,
  recordType: 'None',
  rir: null,
  createdAt: new Date(Date.UTC(2026, 8, 18, 10, 0)).toISOString(),
  restSeconds: null,
  measurement: 'WeightReps',
};

const OTURUM: GecmisOturum = {
  sessionId: 1,
  startedAt: '2026-09-18T10:00:00Z',
  templateId: 1,
  templateName: 'Push Day',
  isVolumeRecord: false,
  setCount: 1,
  totalVolume: 480,
  durationSeconds: 3600,
  sets: [KAYIT],
};

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockImplementation(async (yol: string, secenekler?: { method?: string; body?: string }) => {
    if (yol === '/sessions/1/sets' && secenekler?.method === 'POST') {
      return { ...KAYIT, id: 9, ...JSON.parse(secenekler.body ?? '{}') };
    }
    if (yol === '/sets/7' && secenekler?.method === 'PATCH') {
      return { ...KAYIT, ...JSON.parse(secenekler.body ?? '{}') };
    }
    if (yol === '/sets/7' && secenekler?.method === 'DELETE') {
      return undefined;
    }
    // Hareket listesi (agirlik ibaresi) vb.: bos donmek testin konusu disinda.
    return [];
  });
});

/** Kendi gecmisinde panel `onSil` alir (#284 deseni): verilmezse salt-okunurdur. */
async function paneliCiz(salt?: 'salt-okunur') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={queryClient}>
      <GecmisDetayPaneli
        oturum={OTURUM}
        onKapat={jest.fn()}
        onSil={salt === 'salt-okunur' ? undefined : jest.fn()}
      />
    </QueryClientProvider>,
  );
}

async function setMenusunuAc() {
  await fireEvent(screen.getByTestId('gecmis-set-7'), 'longPress');
}

function setIstekleri(method: string) {
  return requestMock.mock.calls.filter(([yol, secenekler]) => yol === '/sets/7' && secenekler?.method === method);
}

// #564: sablon kartindaki gibi -- sete basili tutunca Duzenle / Sil menusu acilir.
test('kendi gecmisinde sete basili tutunca Duzenle ve Sil menusu acilir', async () => {
  await paneliCiz();

  await setMenusunuAc();

  const menu = within(screen.getByTestId('set-menusu'));
  expect(menu.getByText('Seti düzenle')).toBeTruthy();
  expect(menu.getByText('Seti sil')).toBeTruthy();
});

// #284: arkadasin gecmisi salt-okunur kalir -- setlerinde menu yoktur.
test('salt-okunur gecmiste sete basili tutmak menu acmaz', async () => {
  await paneliCiz('salt-okunur');

  await setMenusunuAc();

  expect(screen.queryByTestId('set-menusu')).toBeNull();
});

test('Duzenle setin degerleriyle duzenleyiciyi acar, Kaydet PATCH gonderir', async () => {
  await paneliCiz();
  await setMenusunuAc();

  await fireEvent.press(screen.getByText('Seti düzenle'));
  const duzenleyici = within(screen.getByTestId('set-duzenleyici'));
  await fireEvent.changeText(duzenleyici.getByDisplayValue('60'), '62.5');
  await fireEvent.press(duzenleyici.getByText('Kaydet'));

  const istekler = setIstekleri('PATCH');
  expect(istekler).toHaveLength(1);
  expect(JSON.parse(istekler[0][1].body)).toMatchObject({ weight: 62.5, reps: 8 });
});

test('Sil onay sorar, Vazgec ile hic istek gitmez', async () => {
  await paneliCiz();
  await setMenusunuAc();

  await fireEvent.press(screen.getByText('Seti sil'));
  expect(screen.getByText('Evet, sil')).toBeTruthy();
  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(setIstekleri('DELETE')).toHaveLength(0);
});

test('onayda Evet, sil DELETE gonderir', async () => {
  await paneliCiz();
  await setMenusunuAc();

  await fireEvent.press(screen.getByText('Seti sil'));
  await fireEvent.press(screen.getByText('Evet, sil'));

  expect(setIstekleri('DELETE')).toHaveLength(1);
});

// ---- #564 / #598: gecmis antrenmana set ekleme, kalemle acilan duzenleme modunda ----

async function duzenlemeyiAc() {
  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı düzenle' }));
}

/**
 * #598 (kullanici karari): "Set ekle" her zaman gorunurken yanlislikla set ekleniyordu. Kalem dugmesi
 * kapatma (carpi) dugmesinin SOLUNDA durur; ikisi de kutusuzdur.
 */
test('kendi gecmisinde kalem carpinin solunda durur, ikisi de kutusuzdur', async () => {
  await paneliCiz();

  const etiketler = screen.getAllByRole('button').map((dugme) => dugme.props.accessibilityLabel);
  expect(etiketler.indexOf('Antrenmanı düzenle')).toBeGreaterThan(-1);
  expect(etiketler.indexOf('Antrenmanı düzenle')).toBeLessThan(etiketler.indexOf('Kapat'));
  expect(screen.getByRole('button', { name: 'Antrenmanı düzenle' }).props.className).not.toMatch(/bg-surface/);
  expect(screen.getByRole('button', { name: 'Kapat' }).props.className).not.toMatch(/bg-surface/);
});

test('salt-okunur gecmiste kalem yoktur', async () => {
  await paneliCiz('salt-okunur');

  expect(screen.queryByRole('button', { name: 'Antrenmanı düzenle' })).toBeNull();
});

test('Set ekle varsayilan gizlidir, kalemle gorunur, tekrar basinca gizlenir', async () => {
  await paneliCiz();
  expect(screen.queryByLabelText('Bench Press için set ekle')).toBeNull();

  await duzenlemeyiAc();
  expect(screen.getByLabelText('Bench Press için set ekle')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Düzenlemeyi bitir' }));
  expect(screen.queryByLabelText('Bench Press için set ekle')).toBeNull();
});

test('Set ekle formu doldurulunca set o antrenmana gonderilir', async () => {
  await paneliCiz();
  await duzenlemeyiAc();

  await fireEvent.press(screen.getByLabelText('Bench Press için set ekle'));
  const form = within(screen.getByTestId('gecmis-set-ekleme'));
  await fireEvent.changeText(form.getByLabelText('Ağırlık'), '65');
  await fireEvent.changeText(form.getByLabelText('Tekrar'), '6');
  await fireEvent.press(form.getByText('Set ekle'));

  const istekler = requestMock.mock.calls.filter(
    ([yol, secenekler]) => yol === '/sessions/1/sets' && secenekler?.method === 'POST',
  );
  expect(istekler).toHaveLength(1);
  expect(JSON.parse(istekler[0][1].body)).toMatchObject({ exerciseId: 1, weight: 65, reps: 6 });
});

/** #598: duzenleme modunda sete dokunmak menuyu degil dogrudan duzenleyiciyi (kg / tekrar / RIR) acar. */
test('duzenleme modunda sete dokununca duzenleyici dogrudan acilir, Kaydet PATCH gonderir', async () => {
  await paneliCiz();
  await duzenlemeyiAc();

  await fireEvent.press(screen.getByTestId('gecmis-set-7'));
  const duzenleyici = within(screen.getByTestId('set-duzenleyici'));
  await fireEvent.changeText(duzenleyici.getByDisplayValue('60'), '62.5');
  await fireEvent.press(duzenleyici.getByText('Kaydet'));

  const istekler = setIstekleri('PATCH');
  expect(istekler).toHaveLength(1);
  expect(JSON.parse(istekler[0][1].body)).toMatchObject({ weight: 62.5, reps: 8 });
});

test('duzenleme modu kapaliyken sete dokunmak duzenleyici acmaz', async () => {
  await paneliCiz();

  await fireEvent.press(screen.getByTestId('gecmis-set-7'));

  expect(screen.queryByTestId('set-duzenleyici')).toBeNull();
});
