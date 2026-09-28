import { act, render, screen } from '@testing-library/react-native';
import CizgiliBaslik from './CizgiliBaslik';

jest.mock('expo-router', () => ({ useFocusEffect: (geriCagri: () => void) => geriCagri() }));

/**
 * #487: acik antrenmanda baslik "Antrenmana basla" -> "Antrenman" olarak kisalir ve altindaki
 * kavisli turuncu cizgi de kisalmali. Cizgi genisligi basligin KENDI olcumunden gelir; sabit bir
 * genislik yazilirsa metin degisince cizgi metne uymaz.
 */
// Cizgi erisilebilirlik agacindan gizli (dekoratif) -- sorgu gizlileri de kapsamali.
const gizliDahil = { includeHiddenElements: true };

/** Tek bir `onLayout` olayi: cizginin hem genisligi hem konumu bu olcumden turer. */
async function olc(width: number, height = 31) {
  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width, height } } });
  });
}

/** Cizgi kabinin stili dizi olarak veriliyor; testler tek bir nesne uzerinden bakar. */
function cizgiKabi() {
  return screen.getByTestId('baslik-cizgisi', gizliDahil).parent;
}

function cizgiKabiStili(): Record<string, unknown> {
  return Object.assign({}, ...[cizgiKabi()?.props.style].flat().filter(Boolean));
}

test('cizgi basligin olculen genisligini alir', async () => {
  await render(<CizgiliBaslik>Antrenmana başla</CizgiliBaslik>);

  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 210 } } });
  });
  expect(screen.getByTestId('baslik-cizgisi', gizliDahil).props.width).toBe(210);

  // Kisa baslik -> dar cizgi.
  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 120 } } });
  });
  expect(screen.getByTestId('baslik-cizgisi', gizliDahil).props.width).toBe(120);
});

/**
 * #487 (kullanici bildirdi): antrenman baslayinca baslik kisaliyor ama cizgi ESKI uzunlugunda
 * kaliyordu ("olmasi gerekenden uzun"); ekrandan cikip girince duzeliyordu. Bayat olcum atilir --
 * cizgi yeni baslik olculene kadar CIZILMEZ, yanlis uzunlukta beklemez.
 */
test('baslik degisince cizgi eski genisligini korumaz', async () => {
  const { rerender } = await render(<CizgiliBaslik>Antrenmana başla</CizgiliBaslik>);
  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 210 } } });
  });
  expect(screen.getByTestId('baslik-cizgisi', gizliDahil).props.width).toBe(210);

  await rerender(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  expect(screen.queryByTestId('baslik-cizgisi', gizliDahil)).toBeNull();

  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 120 } } });
  });
  expect(screen.getByTestId('baslik-cizgisi', gizliDahil).props.width).toBe(120);
});

/**
 * #499: olcum METNE baglidir -- baska bir metne ait olcum yok sayilir. Boylece cizgi ya dogru
 * uzunlukta cizilir ya hic cizilmez; "bir sure yanlis uzunlukta durma" hali kalmadi (kullanici:
 * "ilk acilista yine uzun ciziliyor").
 */
test('eski metne ait olcum yeni baslikta kullanilmaz', async () => {
  const { rerender } = await render(<CizgiliBaslik>Antrenmana başla</CizgiliBaslik>);
  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 210 } } });
  });

  // Yeni baslik, ESKI metne ait olcumu tasiyan bir olay: yok sayilmali.
  await rerender(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  expect(screen.queryByTestId('baslik-cizgisi', gizliDahil)).toBeNull();
});

/** Cizgi yerlesime GIRMEZ: bilesenin yuksekligi metin kadardir, bar metni ortalar (#499). */
test('cizgi metnin altina asilir, yerlesime girmez', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(120);

  // NativeWind sinifi jest'te stile derlenmiyor; kontrol sinif adi uzerinden yapilir.
  expect(cizgiKabi()?.props.className).toContain('absolute');
});

/**
 * #502 (kullanici bildirdi: "cizgi havada duruyor"): konum YUZDE degil, olculen metin
 * yuksekliginden gelen bir SAYI. `top: '100%'` React Native'de metin kutusunun altina degil ~35pt
 * asagiya dusuyordu; cizgi baslikla "Sablonlarim" arasindaki bosluga kaciyordu.
 */
test('cizgi olculen metin yuksekliginin hemen altinda durur', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(120, 31);

  const { top } = cizgiKabiStili();
  expect(typeof top).toBe('number');
  expect(top).toBeGreaterThanOrEqual(31);
  // Baslikla cizgi arasi bir tirnak bosluk: yapisik ama metne degmiyor.
  expect(top).toBeLessThanOrEqual(31 + 8);
});

/** Metin uzunlugu degil, YUKSEKLIGI konumu belirler: daha uzun bir metin cizgiyi asagi iter. */
test('metin yukseklige gore cizgi de asagi iner', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(120, 31);
  const alcak = cizgiKabiStili().top as number;

  await olc(120, 48);
  expect(cizgiKabiStili().top).toBe(alcak + 17);
});

/**
 * #502: baslik barin dikey ORTASINDA durmali -- kokteki `self-start` barin `items-center`'ini
 * eziyor ve basligi 64 px'lik barin tepesine yapistiriyordu; sagdaki GRIND ortada kaldigi icin
 * ikisi hizasizdi ve baslik Ana sayfa basligindan yukaridaydi.
 */
test('baslik kokunu dikeyde yukari sabitlemez', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);

  // `self-start` saran barin `items-center`'ini ezip basligi tepeye yapistiriyordu.
  expect(screen.getByRole('header').parent?.props.className).not.toContain('self-start');
});
