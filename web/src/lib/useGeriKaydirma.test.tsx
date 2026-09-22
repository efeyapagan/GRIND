import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { useGeriKaydirma } from './useGeriKaydirma';

/**
 * #232: sol kenardan saga kaydirinca bir onceki sayfa. Kabuk yerine hook'u kullanan en kucuk sayfa:
 * `main` hareketi dinler, icinde o anki konum ve bir dugme durur.
 */
function Sayfa() {
  const { ref, isaretciler } = useGeriKaydirma();
  const konum = useLocation();
  return (
    <main ref={ref} {...isaretciler}>
      <p>konum:{konum.pathname}</p>
      <button type="button" onClick={dugmeyeBasildi}>
        Dugme
      </button>
    </main>
  );
}

let dugmeyeBasildi: () => void;

function kur(girisler: string[]) {
  dugmeyeBasildi = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/', element: <Sayfa /> },
      { path: '/profile', element: <Sayfa /> },
      { path: '/profile/history', element: <Sayfa /> },
    ],
    { initialEntries: girisler, initialIndex: girisler.length - 1 },
  );
  render(<RouterProvider router={router} />);
  return screen.getByRole('main');
}

/**
 * Parmagi (x, 300)'den (x + dx, 300 + dy)'ye goturur ve kaldirir. jsdom genisligi 1024 px: %30 esigi
 * ~307 px, bu yuzden "yeterli" kaydirma 400 px'tir. Hareket iki adimda yapilir (hiz iki pointermove
 * arasindan hesaplanir).
 */
function kaydir(
  hedef: Element,
  { x = 10, dx, dy = 0, pointerType = 'touch' }: { x?: number; dx: number; dy?: number; pointerType?: string },
) {
  fireEvent.pointerDown(hedef, { pointerId: 1, pointerType, clientX: x, clientY: 300 });
  fireEvent.pointerMove(hedef, { pointerId: 1, pointerType, clientX: x + dx / 2, clientY: 300 + dy / 2 });
  fireEvent.pointerMove(hedef, { pointerId: 1, pointerType, clientX: x + dx, clientY: 300 + dy });
  fireEvent.pointerUp(hedef, { pointerId: 1, pointerType, clientX: x + dx, clientY: 300 + dy });
}

/** Gezinme dışarı kayma animasyonundan sonra olur; "olmadi" demeden once o sure beklenir. */
async function animasyonuBekle() {
  await new Promise((coz) => setTimeout(coz, 250));
}

test('sol kenardan saga kaydirmak bir onceki sayfaya doner', async () => {
  const main = kur(['/profile', '/profile/history']);

  kaydir(main, { dx: 400 });

  await waitFor(() => expect(screen.getByText('konum:/profile')).toBeInTheDocument());
});

test('onceki sayfa yoksa Ana Sayfaya gider', async () => {
  const main = kur(['/profile/history']);

  kaydir(main, { dx: 400 });

  await waitFor(() => expect(screen.getByText('konum:/')).toBeInTheDocument());
});

test('sayfanin ortasindan baslayan kaydirma geri gitmez', async () => {
  const main = kur(['/profile', '/profile/history']);

  kaydir(main, { x: 200, dx: 400 });
  await animasyonuBekle();

  expect(screen.getByText('konum:/profile/history')).toBeInTheDocument();
});

test('kenardan baslasa da dikey hareket geri gitmez', async () => {
  const main = kur(['/profile', '/profile/history']);

  kaydir(main, { dx: 40, dy: 400 });
  await animasyonuBekle();

  expect(screen.getByText('konum:/profile/history')).toBeInTheDocument();
});

test('esigi gecmeyen yavas kaydirma sayfayi yerine oturtur', async () => {
  const main = kur(['/profile', '/profile/history']);

  // Iki adim arasi sure test ortaminda ~0 ms oldugu icin hiz buyuk cikabilir; hizi dusurmek icin
  // adimlar arasinda gercekten beklenir.
  fireEvent.pointerDown(main, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 300 });
  fireEvent.pointerMove(main, { pointerId: 1, pointerType: 'touch', clientX: 40, clientY: 300 });
  await new Promise((coz) => setTimeout(coz, 200));
  fireEvent.pointerMove(main, { pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 300 });
  fireEvent.pointerUp(main, { pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 300 });
  await animasyonuBekle();

  expect(screen.getByText('konum:/profile/history')).toBeInTheDocument();
  expect(main.style.transform === '' || main.style.transform === 'translateX(0px)').toBe(true);
});

test('fareyle surukleme yok sayilir', async () => {
  const main = kur(['/profile', '/profile/history']);

  kaydir(main, { dx: 400, pointerType: 'mouse' });
  await animasyonuBekle();

  expect(screen.getByText('konum:/profile/history')).toBeInTheDocument();
});

test('tarayici dokunusu iptal ederse (pointercancel) geri gidilmez', async () => {
  const main = kur(['/profile', '/profile/history']);

  fireEvent.pointerDown(main, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 300 });
  fireEvent.pointerMove(main, { pointerId: 1, pointerType: 'touch', clientX: 410, clientY: 300 });
  fireEvent.pointerCancel(main, { pointerId: 1, pointerType: 'touch' });
  await animasyonuBekle();

  expect(screen.getByText('konum:/profile/history')).toBeInTheDocument();
});

test('kaydirma bir dugmenin ustunde biterse o dugmeye basilmis sayilmaz', async () => {
  kur(['/profile', '/profile/history']);
  const dugme = screen.getByRole('button', { name: 'Dugme' });

  kaydir(dugme, { dx: 400 });
  fireEvent.click(dugme);

  expect(dugmeyeBasildi).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText('konum:/profile')).toBeInTheDocument());
});
