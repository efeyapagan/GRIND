import { act, render, screen, fireEvent, within } from '@testing-library/react-native';
import type { GecmisOturum } from '@grind/shared/api/queries';
import GecmisKarti from './GecmisKarti';

function ornekOturum(gecersizler: Partial<GecmisOturum> = {}): GecmisOturum {
  return {
    sessionId: 1,
    startedAt: '2026-09-18T10:00:00Z',
    templateName: 'Push Day',
    setCount: 12,
    totalVolume: 3400,
    durationSeconds: null,
    sets: [],
    ...gecersizler,
  };
}

test('kapaliyken sadece ozet gorunur, detay paneli yok', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  expect(screen.getByText('Push Day')).toBeTruthy();
  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
  expect(screen.queryByText('Antrenmanı sil')).toBeNull();
});

/** #471: ozetteki her sayinin altinda ne oldugu yazar -- "12", "3.400", "1 sa 10 dk" tek basina anlasilmiyordu. */
test('ozetteki set sayisi, hacim ve surenin altinda ne olduklari yazar', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 4200 })} onSil={jest.fn()} />);

  expect(screen.getByText('Set sayısı')).toBeTruthy();
  expect(screen.getByText('Hacim')).toBeTruthy();
  expect(screen.getByText('Süre')).toBeTruthy();
});

/** #471: suresi olmayan (acik) antrenmanda sure cizilmez, etiketi de cizilmez. */
test('suresi olmayan antrenmanda sure etiketi yoktur', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: null })} onSil={jest.fn()} />);

  expect(screen.getByText('Set sayısı')).toBeTruthy();
  expect(screen.queryByText('Süre')).toBeNull();
});

// #382: kart yerinde asagi acilmaz; ayrintilar (setler + silme) ekrandaki cam panelde gorunur.
test('dokununca detay paneli acilir; set listesi ve "Antrenmanı sil" paneldedir', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  await fireEvent.press(screen.getByText('Push Day'));

  const panel = within(screen.getByTestId('gecmis-detay-paneli'));
  expect(panel.getByText('Bu antrenmanda set yok.')).toBeTruthy();
  expect(panel.getByText('Antrenmanı sil')).toBeTruthy();
});

test('paneldeki Kapat dugmesi paneli kapatir', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByLabelText('Kapat'));

  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
});

test('salt-okunur kartin panelinde silme yolu yoktur', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} />);

  await fireEvent.press(screen.getByText('Push Day'));

  expect(screen.getByTestId('gecmis-detay-paneli')).toBeTruthy();
  expect(screen.queryByText('Antrenmanı sil')).toBeNull();
});

test('paneldeki Antrenmani sil paneli kapatip onay ister, Vazgec ile onSil cagrilmaz', async () => {
  const onSil = jest.fn();
  await render(<GecmisKarti oturum={ornekOturum()} onSil={onSil} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByText('Antrenmanı sil'));
  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
  expect(screen.getByText(/seti silinecek/)).toBeTruthy();

  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(screen.queryByText(/seti silinecek/)).toBeNull();
  expect(onSil).not.toHaveBeenCalled();
});

test('Evet sil onSil i cagirir', async () => {
  const onSil = jest.fn();
  await render(<GecmisKarti oturum={ornekOturum()} onSil={onSil} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByText('Antrenmanı sil'));
  await fireEvent.press(screen.getByText('Evet, sil'));

  expect(onSil).toHaveBeenCalledTimes(1);
});

test('sablonsuz antrenman "Serbest" gosterir', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ templateName: null })} onSil={jest.fn()} />);

  expect(screen.getByText('Serbest')).toBeTruthy();
});

test('son 24 saat icindeki antrenman mutlak tarih yerine goreli zaman gosterir (#218)', async () => {
  const ucSaatOnce = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  await render(<GecmisKarti oturum={ornekOturum({ startedAt: ucSaatOnce })} onSil={jest.fn()} />);

  expect(screen.getByText('3 saat önce')).toBeTruthy();
});

test('ozet medyan dinlenme yerine antrenman suresini saat ve dakikayla gosterir (#246)', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 3900 })} onSil={jest.fn()} />);

  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByText('sa')).toBeTruthy();
  expect(screen.getByText('5')).toBeTruthy();
  expect(screen.getByText('dk')).toBeTruthy();
  expect(screen.queryByText('dinlenme')).toBeNull();
});

// ---- Paylasim karti (#433) ----

/** Kullanici karari: paylas ikonu ozet satirinda, okun solunda. */
test('bitmis antrenmanin karti paylas ikonu tasir', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 4320 })} onSil={jest.fn()} />);

  expect(screen.getByLabelText('Antrenmanı paylaş')).toBeTruthy();
});

/**
 * KRITIK: paylas ikonu ayrinti panelini ACMAZ. Ikisi ic ice Pressable oldugu icin disaridaki
 * satirin da tetiklenmesi kolay bir hatadir.
 */
test('paylas ikonu ayrinti panelini acmaz, paylasim penceresini acar', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 4320 })} onSil={jest.fn()} />);

  await act(async () => fireEvent.press(screen.getByLabelText('Antrenmanı paylaş')));

  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
  expect(screen.getByText('Galeriye kaydet')).toBeTruthy();
});

/** Ozet satirina dokunmak eskisi gibi paneli acmaya devam eder. */
test('ozete dokunmak hala paneli acar', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 4320 })} onSil={jest.fn()} />);

  await act(async () => fireEvent.press(screen.getByText('Push Day')));

  expect(screen.getByTestId('gecmis-detay-paneli')).toBeTruthy();
});

/** Acik (bitmemis) antrenmanda sure yoktur; paylasilacak bir kart da yoktur (#433). */
test('acik antrenmanda paylas ikonu cizilmez', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: null })} onSil={jest.fn()} />);

  expect(screen.queryByLabelText('Antrenmanı paylaş')).toBeNull();
});
