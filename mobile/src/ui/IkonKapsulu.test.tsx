import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import IkonKapsulu from './IkonKapsulu';

test('ikonu degistirmeden kapsulun icinde cizer', async () => {
  await render(
    <IkonKapsulu>
      <Text>ikon</Text>
    </IkonKapsulu>,
  );

  expect(screen.getByText('ikon')).toBeTruthy();
});

/**
 * Karar 9 (gorsel tasarim spec'i): renkler `var(--color-*)` oldugu icin `bg-fg/10`, `border-fg/10` gibi
 * opaklik ekleri kenari SIYAH ciziyor. Yari saydamlik katmanin `opacity-*`'sinden gelir.
 */
test('yari saydamligi renge degil katmana verir', async () => {
  await render(
    <IkonKapsulu>
      <Text>ikon</Text>
    </IkonKapsulu>,
  );

  for (const id of ['ikon-kapsulu-dolgu', 'ikon-kapsulu-kenar']) {
    const sinif: string = screen.getByTestId(id).props.className;
    expect(sinif).toMatch(/\bopacity-\d+\b/);
    expect(sinif).not.toMatch(/(bg|border)-[a-z-]+\/\d+/);
  }
});

test('boyut verilince kapsul o olcude ve tam yuvarlak olur', async () => {
  await render(
    <IkonKapsulu boyut={40}>
      <Text>ikon</Text>
    </IkonKapsulu>,
  );

  const kapsul = screen.getByTestId('ikon-kapsulu');
  expect(kapsul.props.style).toMatchObject({ width: 40, height: 40 });
  expect(kapsul.props.className).toContain('rounded-full');
});

test('boyut verilmezse 32 olur', async () => {
  await render(
    <IkonKapsulu>
      <Text>ikon</Text>
    </IkonKapsulu>,
  );

  expect(screen.getByTestId('ikon-kapsulu').props.style).toMatchObject({ width: 32, height: 32 });
});
