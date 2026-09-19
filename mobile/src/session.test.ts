import * as SecureStore from 'expo-secure-store';
import { session } from './session';

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await session.clear();
});

test('hydrate oncesi read null doner', () => {
  expect(session.read()).toBeNull();
});

test('write sonrasi read senkron olarak yeni degeri doner', async () => {
  await session.write('token-1', ileriTarih(60_000), 'efe');

  expect(session.read()).toEqual({ token: 'token-1', expiresAtUtc: expect.any(String), username: 'efe' });
});

test('write SecureStore a kalici olarak yazar', async () => {
  await session.write('token-2', ileriTarih(60_000), 'efe');

  const ham = await SecureStore.getItemAsync('grind.oturum');
  expect(ham).not.toBeNull();
  expect(JSON.parse(ham as string)).toMatchObject({ token: 'token-2', username: 'efe' });
});

test('hydrate SecureStore taki degeri belleğe yukler', async () => {
  await SecureStore.setItemAsync(
    'grind.oturum',
    JSON.stringify({ token: 'kalici-token', expiresAtUtc: ileriTarih(60_000), username: 'kalici-kullanici' }),
  );

  await session.hydrate();

  expect(session.read()).toMatchObject({ token: 'kalici-token', username: 'kalici-kullanici' });
});

test('clear hem bellegi hem SecureStore u temizler', async () => {
  await session.write('token-3', ileriTarih(60_000), 'efe');

  await session.clear();

  expect(session.read()).toBeNull();
  expect(await SecureStore.getItemAsync('grind.oturum')).toBeNull();
});

test('isValid suresi dolmus token icin false doner', async () => {
  await session.write('eski-token', ileriTarih(-1000), 'efe');

  expect(session.isValid()).toBe(false);
});

test('isValid gecerli token icin true doner', async () => {
  await session.write('gecerli-token', ileriTarih(60_000), 'efe');

  expect(session.isValid()).toBe(true);
});

test('isValid oturum yokken false doner', () => {
  expect(session.isValid()).toBe(false);
});
