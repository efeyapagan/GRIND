import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';

/**
 * Issue #119: Profil kendi içinde rota-tabanlı sekmelerden oluşur (#179'dan beri Hesap, Geçmiş,
 * Ölçüler, Rekorlar -- kullanıcı kararıyla bu sırada, varsayılan yine Rekorlar). Gerçek alt
 * sayfalar yerine basit yer tutucular kullanılır -- burada sınanan `ProfileLayout`'ın kendisi (sekme çubuğu + `Outlet`),
 * her sekmenin kendi içeriği değil.
 */
function profiliOlustur(baslangicYolu = '/profile') {
  render(
    <MemoryRouter initialEntries={[baslangicYolu]}>
      <Routes>
        <Route path="/profile" element={<ProfileLayout />}>
          <Route index element={<Navigate to="records" replace />} />
          <Route path="account" element={<p>Hesap içeriği</p>} />
          <Route path="measurements" element={<p>Ölçüler içeriği</p>} />
          <Route path="history" element={<p>Geçmiş içeriği</p>} />
          <Route path="records" element={<p>Rekorlar içeriği</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('varsayilan olarak Rekorlar sekmesine yonlendirir', async () => {
  profiliOlustur();

  expect(await screen.findByText('Rekorlar içeriği')).toBeInTheDocument();
});

test('dort sekme de gorunur ve tiklaninca ilgili sayfaya gider', async () => {
  const kullanici = userEvent.setup();
  profiliOlustur();

  await screen.findByText('Rekorlar içeriği');

  await kullanici.click(screen.getByRole('link', { name: 'Geçmiş' }));
  expect(await screen.findByText('Geçmiş içeriği')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Ölçüler' }));
  expect(await screen.findByText('Ölçüler içeriği')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Hesap' }));
  expect(await screen.findByText('Hesap içeriği')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Rekorlar' }));
  expect(await screen.findByText('Rekorlar içeriği')).toBeInTheDocument();
});

test('aktif sekme aria-current tasir', async () => {
  profiliOlustur('/profile/measurements');

  await screen.findByText('Ölçüler içeriği');

  expect(screen.getByRole('link', { name: 'Ölçüler' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Hesap' })).not.toHaveAttribute('aria-current');
});

/**
 * Issue #179: sekme sırası kullanıcı kararıdır -- Hesap en sola, Rekorlar en sağa alındı.
 * Yukarıdaki testler linklere tek tek baktığı için sıraya duyarlı değil; bu test sırayı sabitler.
 */
test('sekmeler soldan saga Hesap, Gecmis, Olculer, Rekorlar sirasinda gorunur', async () => {
  profiliOlustur();

  await screen.findByText('Rekorlar içeriği');

  const sekmeCubugu = screen.getByRole('navigation', { name: 'Profil sekmeleri' });
  const etiketler = within(sekmeCubugu)
    .getAllByRole('link')
    .map((link) => link.textContent);

  expect(etiketler).toEqual(['Hesap', 'Geçmiş', 'Ölçüler', 'Rekorlar']);
});
