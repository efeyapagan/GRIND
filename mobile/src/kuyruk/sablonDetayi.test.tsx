import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { queryKeys, useTemplate } from '@grind/shared/api/queries';

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
const requestMock = request as jest.Mock;

const GECICI = {
  id: -5, name: 'Leg Day', exercises: [], visibility: 'Friends', savedFromUsername: null, lastUsedAt: null, isPinned: false,
};

/**
 * #174 dilim 3: cevrimdisi olusturulan sablon sunucuda yok -- duzenleme ekrani istek atmadan listedeki kopyayla
 * acilir (aksi halde `/templates/-5` 404 donup ekran hata gosterirdi).
 */
test('gecici kimlikli sablonun detayi istek atmadan listeden gelir', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(queryKeys.templates, [GECICI]);

  const { result } = await renderHook(() => useTemplate(-5), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });

  expect(result.current.data?.name).toBe('Leg Day');
  expect(result.current.isError).toBe(false);
  expect(requestMock).not.toHaveBeenCalled();
});
