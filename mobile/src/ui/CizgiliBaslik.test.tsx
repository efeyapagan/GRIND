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
