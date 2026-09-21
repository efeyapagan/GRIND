import { DIL_ANAHTARI, diliDegistir, etkinDil } from './dil';

afterEach(() => {
  localStorage.removeItem(DIL_ANAHTARI);
  vi.restoreAllMocks();
});

test('tercih yokken tarayici dili Ingilizce ise Ingilizce acilir', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
  expect(etkinDil()).toBe('en');
});

test('secilen dil saklanir ve yeniden acilista tarayici dilini ezer', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['tr-TR']);
  diliDegistir('en');
  expect(localStorage.getItem(DIL_ANAHTARI)).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  expect(etkinDil()).toBe('en');
});
