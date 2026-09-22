import { useState, type FormEvent } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HareketSecici from './HareketSecici';
import type { Egzersiz } from '../api/queries';

const EGZERSIZLER: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 2, name: 'Incline Dumbbell Press', category: 'Push' },
  { id: 3, name: 'Squat', category: 'Legs' },
  { id: 4, name: 'Sırt Çekişi', category: 'Pull' },
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
  // Sonuc varken oneri bolumu yok (#231).
  expect(screen.queryByText('Bunu mu demek istediniz?')).not.toBeInTheDocument();
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

test('kategori hapi listeyi daraltir, liste acik kalir ve Tumu geri getirir (#77)', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.click(screen.getByRole('button', { name: 'Push' }));

  // Hapa basmak odagi metin alanindan almamali: liste kapanirsa filtre ise yaramaz.
  expect(alan).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Push' })).toHaveAttribute('aria-pressed', 'true');
  const secenekler = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(secenekler.map((s) => s.textContent)).toEqual(['Bench Press', 'Incline Dumbbell Press']);
  expect(screen.getByRole('status')).toHaveTextContent('2 hareket bulundu');

  await kullanici.click(screen.getByRole('button', { name: 'Tümü' }));
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(4);
});

test('eslesme yoksa acik bir bos durum gosterilir', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.type(alan, 'zzz');

  expect(screen.getByText('Eşleşen hareket yok.')).toBeInTheDocument();
  expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toHaveLength(0);
});

test('yazim hatasinda Bunu mu demek istediniz? onerisi gosterilir ve dokununca secilir (#231)', async () => {
  const { alan, kullanici } = seciciyiOlustur();

  await kullanici.click(alan);
  await kullanici.type(alan, 'sqaut');

  expect(screen.getByText('Bunu mu demek istediniz?')).toBeInTheDocument();
  expect(screen.queryByText('Eşleşen hareket yok.')).not.toBeInTheDocument();
  // Ekran okuyucu "1 hareket bulundu" duyarsa yaniltir: eslesme yok, oneri var.
  expect(screen.getByRole('status')).toHaveTextContent('Eşleşme yok, 1 öneri var');

  await kullanici.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Squat' }));

  expect(alan).toHaveValue('Squat');
});
