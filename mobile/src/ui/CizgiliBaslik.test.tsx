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
  await act(async () => {
    screen.getByRole('header').props.onLayout({ nativeEvent: { layout: { width: 120 } } });
  });

  const cizgiKabi = screen.getByTestId('baslik-cizgisi', gizliDahil).parent;
  expect(cizgiKabi?.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ top: '100%' })]),
  );
});
