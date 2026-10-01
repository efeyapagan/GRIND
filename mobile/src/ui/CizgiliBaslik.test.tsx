import { act, render, screen } from '@testing-library/react-native';
import CizgiliBaslik from './CizgiliBaslik';

/** `Path` bilesenin host karsiligi -- RNTL agaci yalnizca host dugumlerini gezer (#548 testleri). */
function cizgiDilimleri() {
  return screen
    .getByTestId('baslik-cizgisi', { includeHiddenElements: true })
    .queryAll((dugum) => dugum.type === 'RNSVGPath');
}

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

/**
 * #524: Ana sayfa basligi da ayni cizgiyi cizer ama BICIMI bir tik farklidir (dalgali); varsayilan
 * (Antrenmana basla) kavis oldugu gibi kalir. Olcum/animasyon mantigi iki bicimde ortaktir.
 */
test('varsayilan cizgi kavistir', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(120);

  expect(screen.getByTestId('cizgi-kavis', gizliDahil)).toBeTruthy();
  expect(screen.queryByTestId('cizgi-dalga', gizliDahil)).toBeNull();
});

test('dalga bicimi secilince dalgali cizgi cizilir, genislik yine basliktan gelir', async () => {
  await render(<CizgiliBaslik cizgi="dalga">Ana sayfa</CizgiliBaslik>);
  await olc(150);

  expect(screen.getByTestId('cizgi-dalga', gizliDahil)).toBeTruthy();
  expect(screen.queryByTestId('cizgi-kavis', gizliDahil)).toBeNull();
  expect(screen.getByTestId('baslik-cizgisi', gizliDahil).props.width).toBe(150);
});

// ---- Sag uc solukluk gradyani (#548) ----

/**
 * #548 (kullanici bildirdi): cizgi sagda kalinlasarak inceliyordu ama hep TAM opaklikta ani
 * bitiyordu. Govde artik duz renk (hex) degil, bir SVG gradyanina referans veriyor --
 * react-native-svg `url(#id)` stringini `{ brushRef: id, type: 1 }` seklinde cozumler, bu yuzden
 * dogrulama brushRef uzerinden yapilir (duz bir string DEGIL).
 */
test('kavis govdesi duz renk degil solukluk gradyanina referans verir', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(200);

  const stroke = screen.getByTestId('cizgi-kavis', gizliDahil).props.stroke;
  expect(stroke.brushRef).toMatch(/^cizgiSolukluk/);
});

test('dalga govdesi de ayni bicimde solukluk gradyanina referans verir', async () => {
  await render(<CizgiliBaslik cizgi="dalga">Ana sayfa</CizgiliBaslik>);
  await olc(200);

  const stroke = screen.getByTestId('cizgi-dalga', gizliDahil).props.stroke;
  expect(stroke.brushRef).toMatch(/^cizgiSolukluk/);
});

// ---- Surekli incelme, sicramasiz kalinlik (#548 ikinci bulgu) ----

/**
 * #548 (kullanici bildirdi, ilk duzeltme YETERSIZDI): "resmen kalemin ucunu degistirir gibi 2 tane
 * gecis noktasi" -- eski 3 sabit parca (3.6 -> 2.4 -> 1.3) arasinda ~1.1-1.2 birimlik ani sicrama
 * vardi. Govde artik COK sayida ince dilime bolunur; ardisik dilimler arasindaki kalinlik farki
 * kucuk olmali (eski sicramadan belirgin derecede kucuk) ki goze surekli bir incelme gibi gorunsun.
 */
test('kavis govdesi cok sayida dilime boler, ardisik dilimler arasinda ani kalinlik sicramasi olmaz', async () => {
  await render(<CizgiliBaslik>Antrenman</CizgiliBaslik>);
  await olc(200);

  const dilimler = cizgiDilimleri();
  expect(dilimler.length).toBeGreaterThan(10);

  const kalinliklar = dilimler.map((d) => d.props.strokeWidth as number);
  for (let i = 1; i < kalinliklar.length; i++) {
    // Eski 3 parcali tasarimda ardisik fark ~1.1-1.2'ydi; yeni tasarimda cok daha kucuk olmali.
    expect(Math.abs(kalinliklar[i] - kalinliklar[i - 1])).toBeLessThan(0.5);
  }
  // Govde baslangictan sona dogru INCELIR (kalinlasmaz).
  expect(kalinliklar[0]).toBeGreaterThan(kalinliklar[kalinliklar.length - 1]);
});

test('dalga govdesi de ayni sekilde cok sayida dilime boler, sicramasiz incelir', async () => {
  await render(<CizgiliBaslik cizgi="dalga">Ana sayfa</CizgiliBaslik>);
  await olc(200);

  const dilimler = cizgiDilimleri();
  expect(dilimler.length).toBeGreaterThan(10);

  const kalinliklar = dilimler.map((d) => d.props.strokeWidth as number);
  for (let i = 1; i < kalinliklar.length; i++) {
    expect(Math.abs(kalinliklar[i] - kalinliklar[i - 1])).toBeLessThan(0.5);
  }
  expect(kalinliklar[0]).toBeGreaterThan(kalinliklar[kalinliklar.length - 1]);
});
