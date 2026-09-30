import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import KaydirilabilirSatir from './KaydirilabilirSatir';

// Kisayollar ekran okuyucudan GIZLI (satirin kendi etiketi onlari anlatir), bu yuzden sorgular
// gizli ogeleri de kapsamali -- yoksa RNTL onlari hic gormez.
const GIZLI = { includeHiddenElements: true } as const;

// #297: jest zinciri `Gesture.Pan()` ile baslamadigi icin Babel eklentisi callback'leri otomatik
// worklet yapmiyordu; gesture-handler da onlari JS thread'inde calistirip uyariyordu.
test('kaydirma jestinin callbackleri worklet (UI threadinde calisir)', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');

  await render(
    <KaydirilabilirSatir onSil={jest.fn()} kaydirmaEtiketi="sil">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );

  const { handlers } = panSpy.mock.results[0].value;
  for (const ad of ['onStart', 'onUpdate', 'onEnd'] as const) {
    expect(handlers[ad]).toHaveProperty('__workletHash');
  }
  panSpy.mockRestore();
});

/**
 * #435: satir iki kisayola genisledi. `GecmisKarti` yalnizca `onSil` veriyor -- oradaki bugunku
 * davranis (TEK kirmizi kisayol) aynen kalmali, kart yanlislikla bir "Duzenle" kisayolu acmamali.
 */
test('onDuzenle verilmeyince yalnizca sil kisayolu cizilir', async () => {
  await render(
    <KaydirilabilirSatir onSil={jest.fn()} kaydirmaEtiketi="sil">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );

  expect(screen.getByTestId('kaydir-sil', GIZLI)).toBeTruthy();
  expect(screen.queryByTestId('kaydir-duzenle', GIZLI)).toBeNull();
});

/** #435: iki kisayol varken her dugme KENDI islemini cagirir (ikisi de silmez). */
test('onDuzenle verilince duzenle kisayolu cizilir ve yalnizca onDuzenle cagrilir', async () => {
  const onSil = jest.fn();
  const onDuzenle = jest.fn();
  await render(
    <KaydirilabilirSatir onSil={onSil} onDuzenle={onDuzenle} kaydirmaEtiketi="sil veya duzenle">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );

  await fireEvent.press(screen.getByTestId('kaydir-duzenle', GIZLI));

  expect(onDuzenle).toHaveBeenCalledTimes(1);
  expect(onSil).not.toHaveBeenCalled();
});

/**
 * #491 Gorev 2: kart cam (yari saydam) olunca arkadaki kirmizi "Sil" zemini kartin ALTINDAN gorunur
 * (opaklikla gizlemek yetmedi: kaydirmanin ilk pikselinde tamami aciliyordu). Katman yalnizca kartin
 * actigi bosluk kadar genis olmali -- kirmizi kartin altinda hic bulunmaz.
 */
test('kaydirilmamis satirda kisayol katmaninin genisligi sifirdir', async () => {
  await render(
    <KaydirilabilirSatir onSil={jest.fn()} kaydirmaEtiketi="sil">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );

  expect(screen.getByTestId('kaydir-kisayollar', GIZLI)).toHaveStyle({ width: 0 });
});

test('koseSinifi verilmezse satir rounded-xl kalir, verilirse o uygulanir', async () => {
  const { rerender } = await render(
    <KaydirilabilirSatir onSil={jest.fn()} kaydirmaEtiketi="sil">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );
  expect(screen.getByTestId('kaydirilabilir-satir').props.className).toContain('rounded-xl');

  await rerender(
    <KaydirilabilirSatir onSil={jest.fn()} kaydirmaEtiketi="sil" koseSinifi="rounded-3xl">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );
  const sinif: string = screen.getByTestId('kaydirilabilir-satir').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toContain('rounded-xl');
});
