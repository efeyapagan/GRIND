import '@testing-library/jest-dom/vitest';
import { matchMediaSifirla, matchMediaStubuKur } from './matchMedia';
import { server } from './msw';

// MSW: gercek ag cagrisi asla gitmesin -- tanimlanmamis bir istek gelirse test hemen patlasin
// (sessizce gecmesin), ki eksik bir handler fark edilmeden kalmasin.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom matchMedia tanimlamaz; tema kodu (#178) onsuz patlar.
matchMediaStubuKur();
afterEach(matchMediaSifirla);
