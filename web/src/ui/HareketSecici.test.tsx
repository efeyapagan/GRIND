import { useState, type FormEvent } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HareketSecici from './HareketSecici';
import type { Egzersiz } from '../api/queries';

const EGZERSIZLER: Egzersiz[] = [
  { id: 1, name: 'Bench Press' },
  { id: 2, name: 'Incline Dumbbell Press' },
  { id: 3, name: 'Squat' },
  { id: 4, name: 'Sırt Çekişi' },
];

function seciciyiOlustur(
  secenekler: { devreDisi?: Set<number>; onGonder?: (e: FormEvent) => void } = {},
) {
  function Sarmalayici() {
    const [secilen, setSecilen] = useState(EGZERSIZLER[0]);
    return (
      // Form icinde: Enter'in formu GONDERMEDIGI de sinanir.
      <form onSubmit={secenekler.onGonder}>
        <label htmlFor="secici">Egzersiz</label>
        <HareketSecici
          id="secici"
          egzersizler={EGZERSIZLER}
          secilenId={secilen.id}
          secilenAd={secilen.name}
          devreDisiIdler={secenekler.devreDisi}
          onSec={(id) => setSecilen(EGZERSIZLER.find((eg) => eg.id === id) ?? secilen)}
        />
      </form>
    );
  }
  render(<Sarmalayici />);
  return { alan: screen.getByLabelText('Egzersiz'), kullanici: userEvent.setup() };
}

test('kapaliyken secilenin adini gosterir, acilinca tum liste gorunur', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  expect(alan).toHaveValue('Bench Press');
  expect(alan).toHaveAttribute('aria-expanded', 'false');

  await kullanici.click(alan);

  expect(alan).toHaveAttribute('aria-expanded', 'true');
  // Sorgu bos baslar: kullanici secimini silmek zorunda kalmadan TUM listeyi gorur.
  expect(alan).toHaveValue('');
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(4);
});

test('yazmak listeyi daraltir ve sonuc sayisi duyurulur', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.type(alan, 'press');

  const secenekler = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(secenekler.map((s) => s.textContent)).toEqual(['Bench Press', 'Incline Dumbbell Press']);
  // Ekran okuyucu kullanicisi listeyi goremez: kac sonuc kaldigi duyurulmali.
  expect(screen.getByRole('status')).toHaveTextContent('2 hareket bulundu');
});

test('Turkce harfler noktasiz/sapkasiz yazilsa da bulunur', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.type(alan, 'sirt');

  expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Sırt Çekişi' })).toBeInTheDocument();
});

test('ok tuslariyla gezilir, Enter secer ve formu GONDERMEZ', async () => {
  const onGonder = vi.fn((e: FormEvent) => e.preventDefault());
  const { alan, kullanici } = seciciyiOlustur({ onGonder });

  await kullanici.click(alan);
  await kullanici.keyboard('{ArrowDown}{Enter}');

  expect(alan).toHaveValue('Incline Dumbbell Press');
  expect(alan).toHaveAttribute('aria-expanded', 'false');
  // Secici bir <form> icinde yasiyor: bastirilmasaydi Enter formu gonderirdi.
  expect(onGonder).not.toHaveBeenCalled();
});

test('Escape secim yapmadan kapatir', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.keyboard('{ArrowDown}{Escape}');

  expect(alan).toHaveAttribute('aria-expanded', 'false');
  expect(alan).toHaveValue('Bench Press');
});

test('baska satirda secilmis hareket secilemez ve ok tuslari onu atlar', async () => {
  // Incline (2) baska bir satirda secili.
  const { alan, kullanici } = seciciyiOlustur({ devreDisi: new Set([2]) });

  await kullanici.click(alan);
  await kullanici.click(screen.getByRole('option', { name: 'Incline Dumbbell Press' }));
  expect(alan).toHaveValue('');

  // Ok tusu da uzerinden atlar: Bench Press -> (Incline atlanir) -> Squat.
  await kullanici.keyboard('{ArrowDown}{Enter}');
  expect(alan).toHaveValue('Squat');
});

test('eslesme yoksa acik bir bos durum gosterilir', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.type(alan, 'zzz');

  expect(screen.getByText('Eşleşen hareket yok.')).toBeInTheDocument();
  expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toHaveLength(0);
});
