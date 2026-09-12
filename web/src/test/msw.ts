import { setupServer } from 'msw/node';

/**
 * Varsayilan handler yok -- her test kendi senaryosunu `server.use(...)` ile tanimlar.
 * `test/setup.ts` bu server'in listen/resetHandlers/close yasam donguesunu kurar.
 */
export const server = setupServer();
