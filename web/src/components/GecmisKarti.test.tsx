import { fireEvent, render, screen } from '@testing-library/react';
import GecmisKarti from './GecmisKarti';
import type { GecmisOturum } from '../api/queries';

const OTURUM: GecmisOturum = {
  sessionId: 1,
  startedAt: '2026-09-10T08:00:00Z',
  templateName: 'Push Day',
  totalVolume: 1000,
  setCount: 3,
  medianRestSeconds: null,
  sets: [],
};

function kartiOlustur() {
  const onSil = vi.fn();
  const { container } = render(
    <ul>
      <GecmisKarti oturum={OTURUM} onSil={onSil} />
    </ul>,
  );
  const ozet = screen.getByText('10.09.2026').closest('summary');
  if (!ozet) {
    throw new Error('Kart ozeti bulunamadi.');
  }
  return { onSil, ozet, ayrinti: container.querySelector('details') };
}

/** Parmagi (x, y) noktasindan (x + dx, y + dy) noktasina goturur ve kaldirir. */
function kaydir(hedef: Element, dx: number, dy: number) {
  fireEvent.pointerDown(hedef, { clientX: 200, clientY: 100 });
  fireEvent.pointerMove(hedef, { clientX: 200 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(hedef, { clientX: 200 + dx, clientY: 100 + dy });
  fireEvent.click(hedef);
}

test('sola kaydirmak karti acar ama ayrinti panelini ACMAZ', () => {
  const { ozet, ayrinti } = kartiOlustur();

  kaydir(ozet, -80, 0);

  // Kaydirarak acan parmak birakinca kart icerigini de acsaydi, her silme denemesi ayni
  // zamanda set listesini acardi.
  expect(ayrinti).not.toHaveAttribute('open');
});

test('dikey hareket kaydirma sayilmaz, kart normal sekilde acilir', () => {
  const { ozet, ayrinti } = kartiOlustur();

  // Listede asagi inmeye calisan parmak: kartlar kaydirilmamali, dokunus normal islemelidir.
  kaydir(ozet, -4, 60);

  expect(ayrinti).toHaveAttribute('open');
});

test('kart icindeki silme yolu once onay sorar, onay onSil cagirir', () => {
  const { onSil } = kartiOlustur();

  fireEvent.click(screen.getByRole('button', { name: 'Antrenmanı sil' }));
  expect(onSil).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Evet, sil' }));
  expect(onSil).toHaveBeenCalledTimes(1);
});

test('kart ozeti sunucudan gelen medyan dinlenmeyi gosterir (#71)', () => {
  render(
    <ul>
      <GecmisKarti oturum={{ ...OTURUM, medianRestSeconds: 105 }} onSil={vi.fn()} />
    </ul>,
  );
  const ozet = screen.getByText('10.09.2026').closest('summary');

  expect(ozet).toHaveTextContent('1:45');
});
