import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { RestTimerProvider, useRestTimer } from '@grind/shared/restTimer';
import DinlenmeKabugu, { DinlenmeGostergesi } from './DinlenmeKabugu';
import { dinlenmeBaslat } from '../lib/dinlenme';

/** Ortak kabugun taklidi: panel (ust barin uzerine oturan) + bara kucultulmus gosterge bir arada. */
function Kabuk({ saniye }: { saniye: number | null }) {
  return (
    <RestTimerProvider>
      <MemoryRouter initialEntries={['/antrenman']}>
        <DinlenmeKabugu />
        <div>
          <DinlenmeGostergesi />
        </div>
        <Baslatici saniye={saniye} />
        <Routes>
          <Route path="/antrenman" element={<p>antrenman</p>} />
          <Route path="/profile" element={<p>profil</p>} />
        </Routes>
      </MemoryRouter>
    </RestTimerProvider>
  );
}

/** Sayaci gercek akistaki gibi (set eklenince) baslatan + ekran degistiren yardimci dugmeler. */
function Baslatici({ saniye }: { saniye: number | null }) {
  const [, setDinlenme] = useRestTimer();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => setDinlenme(saniye === null ? null : dinlenmeBaslat(Date.now(), saniye))}>
        baslat
      </button>
      <button type="button" onClick={() => navigate('/profile')}>
        profile git
      </button>
      <button type="button" onClick={() => navigate('/antrenman')}>
        antrenmana don
      </button>
    </>
  );
}

function tikla(ad: string) {
  fireEvent.click(screen.getByRole('button', { name: ad }));
}

/** Ust barin ortasindaki kucuk hal; antrenman disindaki ekranlarda dugme DEGILDIR. */
function gosterge() {
  return document.querySelector('[data-dinlenme-gostergesi]');
}

function panel() {
  return document.querySelector('[data-dinlenme-paneli]');
}

/** Paneli kucultmenin TEK yolu: yukari kaydirma (ok dugmesi kullanici istegiyle kaldirildi). */
function kaydirYukari() {
  const hedef = panel();
  if (!hedef) {
    throw new Error('Panel yok: kaydirilacak bir sey bulunamadi.');
  }
  fireEvent.touchStart(hedef, { touches: [{ clientY: 100 }] });
  fireEvent.touchMove(hedef, { touches: [{ clientY: 40 }] });
}

// Sahte zamanlayicilar Date'i de sahteler; userEvent yerine fireEvent (userEvent kendi gecikmelerini
// sahte saatle bekler).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('sayac genis panelle baslar, kalan sure saniyede bir azalir', () => {
  render(<Kabuk saniye={90} />);
  tikla('baslat');

  expect(screen.getByText('1:30')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Atla' })).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.getByText('1:00')).toBeInTheDocument();
});

test('+15 sn sureyi uzatir, Atla sayaci kaldirir', () => {
  render(<Kabuk saniye={60} />);
  tikla('baslat');

  tikla('+15 sn');
  expect(screen.getByText('1:15')).toBeInTheDocument();

  tikla('Atla');
  expect(screen.queryByText('1:15')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
});

test('yukari kaydirinca panel kalkar, yerine yalnizca kalan sure kalir', () => {
  render(<Kabuk saniye={90} />);
  tikla('baslat');

  // Genisken: panel var, kucuk gosterge YOK (sure tek yerde).
  expect(screen.getByRole('button', { name: '+15 sn' })).toBeInTheDocument();
  expect(gosterge()).toBeNull();
  expect(screen.getAllByText('1:30')).toHaveLength(1);

  kaydirYukari();

  // Kuculunce: panel (ve dugmeleri) gider, geriye tek bir kalan sure kalir.
  expect(panel()).toBeNull();
  expect(screen.getAllByText('1:30')).toHaveLength(1);
  expect(gosterge()).toHaveTextContent('1:30');
});

test('kucultulmus gostergeye dokununca panel geri acilir (antrenman ekraninda)', () => {
  render(<Kabuk saniye={90} />);
  tikla('baslat');
  kaydirYukari();

  tikla('Dinlenme sayacını aç');

  expect(screen.getByRole('button', { name: '+15 sn' })).toBeInTheDocument();
});

test('sure dolunca panel kalkar: bitis isareti ust bari KAPLAMAZ', () => {
  const titresim = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: titresim, configurable: true });
  try {
    render(<Kabuk saniye={5} />);
    tikla('baslat');
    expect(panel()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Dinlenme bitti');
    expect(titresim).toHaveBeenCalled();
    expect(panel()).toBeNull();
    expect(gosterge()).not.toBeNull();
  } finally {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
});

test('antrenman ekranindayken dolan sayacin isareti 7 saniye sonra kalkar', () => {
  render(<Kabuk saniye={5} />);
  tikla('baslat');

  act(() => {
    vi.advanceTimersByTime(5_000);
  });
  expect(gosterge()).not.toBeNull();

  act(() => {
    vi.advanceTimersByTime(6_000);
  });
  expect(gosterge()).not.toBeNull();

  act(() => {
    vi.advanceTimersByTime(1_000);
  });
  expect(gosterge()).toBeNull();
});

test('baska ekranda dolan sayacin isareti bekler, antrenmana donulunce kalkar', () => {
  render(<Kabuk saniye={5} />);
  tikla('baslat');
  tikla('profile git');

  act(() => {
    vi.advanceTimersByTime(5_000);
  });
  // Isaret duruyor: kullanici dinlenmenin bittigini kacirmasin.
  expect(gosterge()).not.toBeNull();

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(gosterge()).not.toBeNull();

  tikla('antrenmana don');

  expect(gosterge()).toBeNull();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('genis panel yalnizca antrenman ekraninda cizilir; disarida dokununca buyumez', () => {
  render(<Kabuk saniye={90} />);
  tikla('baslat');
  expect(panel()).not.toBeNull();

  tikla('profile git');

  expect(panel()).toBeNull();
  expect(gosterge()).toHaveTextContent('1:30');
  // Buyutme dugmesi YOK: +15 sn / Atla antrenmani yonetir, baska ekranda anlami kalmaz.
  expect(screen.queryByRole('button', { name: 'Dinlenme sayacını aç' })).not.toBeInTheDocument();

  // Antrenmana donunce panel geri gelir (kullanici kucultmediyse).
  tikla('antrenmana don');
  expect(panel()).not.toBeNull();
});

test('sayac yokken gorunur satir yoktur ama canli bolge hazirdir', () => {
  render(<Kabuk saniye={null} />);

  expect(panel()).toBeNull();
  expect(gosterge()).toBeNull();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
