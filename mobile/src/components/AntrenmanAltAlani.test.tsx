import { render, screen } from '@testing-library/react-native';
import AntrenmanAltAlani from './AntrenmanAltAlani';

/** #589: "Antrenmani bitir"/"Iptal et" kutusu duz `bg-surface-3` degil cam kart (spec Karar 9). */
test('alt alan cam yuzeydedir', async () => {
  await render(
    <AntrenmanAltAlani
      egzersizler={[]}
      onHareketEkle={jest.fn()}
      acik={false}
      onAcikDegis={jest.fn()}
      bitirCagrisi={{ onBitir: jest.fn() }}
    />,
  );

  const sinif: string = screen.getByTestId('antrenman-alt-alani').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
});

/**
 * #589 (kullanici bildirdi: "liquid'in icinde kutu kalmis"): bos oturumdaki "Iptal et" camin icinde
 * opak bir `surface-4` kutu cizmez -- dugmenin yuzeyi camin kendisidir.
 */
test('iptal dugmesi camin icinde opak kutu cizmez', async () => {
  await render(
    <AntrenmanAltAlani
      egzersizler={[]}
      onHareketEkle={jest.fn()}
      acik={false}
      onAcikDegis={jest.fn()}
      iptalCagrisi={{ onIptal: jest.fn() }}
    />,
  );

  const sinif: string = screen.getByRole('button', { name: 'Antrenmanı iptal et' }).props.className;
  expect(sinif).not.toMatch(/bg-surface/);
});
