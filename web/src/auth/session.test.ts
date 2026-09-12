import { session } from './session';

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

function geriTarih(msOnce: number): string {
  return new Date(Date.now() - msOnce).toISOString();
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test('write sonra read token, expiresAtUtc ve username degerlerini aynen doner', () => {
  const sonaErme = ileriTarih(60_000);
  session.write('deneme-token', sonaErme, 'efe');

  const okunan = session.read();

  expect(okunan).toEqual({ token: 'deneme-token', expiresAtUtc: sonaErme, username: 'efe' });
});

test('isValid gecmis expiresAtUtc ile false doner', () => {
  session.write('eski-token', geriTarih(60_000), 'efe');

  expect(session.isValid()).toBe(false);
});

test('isValid gelecek expiresAtUtc ile true doner', () => {
  session.write('gecerli-token', ileriTarih(60_000), 'efe');

  expect(session.isValid()).toBe(true);
});

test('hic oturum kayitli degilse isValid false doner', () => {
  expect(session.read()).toBeNull();
  expect(session.isValid()).toBe(false);
});

test('depodaki deger bozuk/JSON olmayan bir metinse read hata firlatmaz ve isValid false doner', () => {
  localStorage.setItem('grind.oturum', 'bu-gecerli-bir-json-degil{{{');

  expect(() => session.read()).not.toThrow();
  expect(session.read()).toBeNull();
  expect(session.isValid()).toBe(false);
});

test('clear depoyu bosaltir', () => {
  session.write('token', ileriTarih(60_000), 'efe');
  expect(session.read()).not.toBeNull();

  session.clear();

  expect(session.read()).toBeNull();
  expect(session.isValid()).toBe(false);
});
