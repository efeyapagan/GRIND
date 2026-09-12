import '@testing-library/jest-dom/vitest';
import { server } from './msw';

// MSW: gercek ag cagrisi asla gitmesin -- tanimlanmamis bir istek gelirse test hemen patlasin
// (sessizce gecmesin), ki eksik bir handler fark edilmeden kalmasin.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
