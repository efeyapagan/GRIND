import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { odakDinleyicisiniKur } from './queryOdak';

/**
 * Issue #175: TanStack Query'nin VARSAYILAN odak dinleyicisi yalnizca DOM'un `visibilitychange`
 * olayini dinler (query-core/focusManager) -- bu olay React Native'de HIC tetiklenmez, dolayisiyla
 * `refetchOnWindowFocus` varsayilan acik olmasina ragmen uygulama on plana dondugunde acik
 * antrenman (ve diger sorgular) tazelenmez; ekran saatler oncesinin anlik goruntusunu gosterir.
 * Bu modul `focusManager`i RN'in `AppState`ine baglar.
 */
let durumDegisti: ((durum: AppStateStatus) => void) | null = null;

beforeEach(() => {
  durumDegisti = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _tip: string,
    dinleyici: (durum: AppStateStatus) => void,
  ) => {
    durumDegisti = dinleyici;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
  // focusManager bir singleton -- odak durumunu varsayilana birak ki sonraki testleri etkilemesin.
  focusManager.setFocused(undefined);
});

test('uygulama arka plana gecince odak kapanir', () => {
  odakDinleyicisiniKur();

  durumDegisti!('background');

  expect(focusManager.isFocused()).toBe(false);
});

test('uygulama on plana donunce odak acilir -- bayat sorgular tazelenebilir', () => {
  odakDinleyicisiniKur();

  durumDegisti!('background');
  durumDegisti!('active');

  expect(focusManager.isFocused()).toBe(true);
});
