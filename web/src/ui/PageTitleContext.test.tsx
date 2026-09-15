import { render, screen } from '@testing-library/react';
import { PageTitleProvider, useHeaderTitle, usePageTitle } from './PageTitleContext';

function Sayfa({ baslik }: { baslik: string }) {
  usePageTitle(baslik);
  return <p>Sayfa gövdesi</p>;
}

function Baslik() {
  return <h1>{useHeaderTitle()}</h1>;
}

test('bir sayfanin bildirdigi baslik ust kabukta gorunur', () => {
  render(
    <PageTitleProvider>
      <Baslik />
      <Sayfa baslik="Bugün" />
    </PageTitleProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Bugün' })).toBeInTheDocument();
});

test('sayfa degisince (yeniden mount) baslik yeni degere gunceller', () => {
  const { rerender } = render(
    <PageTitleProvider>
      <Baslik />
      <Sayfa baslik="Bugün" />
    </PageTitleProvider>,
  );
  expect(screen.getByRole('heading')).toHaveTextContent('Bugün');

  rerender(
    <PageTitleProvider>
      <Baslik />
      <Sayfa baslik="Geçmiş" />
    </PageTitleProvider>,
  );

  expect(screen.getByRole('heading')).toHaveTextContent('Geçmiş');
});

test('Provider disinda kullanmak acik bir hata firlatir', () => {
  // console.error'u bilerek susturuyoruz: React, bir bilesen render sirasinda firlattiginda
  // testin kendi cikisina ayrica bir hata log'u basar -- test zaten bunu bekliyor.
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(() => render(<Sayfa baslik="Bugün" />)).toThrow(
    'usePageTitle/useHeaderTitle, PageTitleProvider içinde kullanılmalıdır.',
  );

  consoleError.mockRestore();
});
