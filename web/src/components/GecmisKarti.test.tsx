import { fireEvent, render, screen } from '@testing-library/react';
import GecmisKarti from './GecmisKarti';
import type { GecmisOturum } from '../api/queries';

const OTURUM: GecmisOturum = {
  sessionId: 1,
  startedAt: '2026-09-10T08:00:00Z',
  templateName: 'Push Day',
  totalVolume: 1000,
  setCount: 3,
  durationSeconds: null,
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

test('kart ozeti medyan dinlenme yerine antrenman suresini saat ve dakikayla gosterir (#246)', () => {
  render(
    <ul>
      <GecmisKarti oturum={{ ...OTURUM, durationSeconds: 4320 }} onSil={vi.fn()} />
    </ul>,
  );
  const ozet = screen.getByText('10.09.2026').closest('summary');

  expect(ozet).toHaveTextContent('1 sa 12 dk');
});

test('suresi olmayan (hala acik) antrenmanda sure gosterilmez (#246)', () => {
  const { ozet } = kartiOlustur();

  expect(ozet).not.toHaveTextContent('dk');
});

test('son 24 saat icindeki antrenman mutlak tarih yerine goreli zaman gosterir (#218)', () => {
  const ucSaatOnce = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  render(
    <ul>
      <GecmisKarti oturum={{ ...OTURUM, startedAt: ucSaatOnce }} onSil={vi.fn()} />
    </ul>,
  );

  expect(screen.getByText('3 saat önce')).toBeInTheDocument();
});
