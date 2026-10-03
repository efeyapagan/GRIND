import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';
import CamAyirici from './CamAyirici';

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Cam kartin icindeki satir listesi (#615; #589/#590'daki "liquid'in icinde kutu kalmis" bulgusunun son
 * adimi): satirlar dolgulu kutu degil, aralarina sac teli cizgi (`CamAyirici`) cekilmis duz satirlardir.
 * Cizgi yalnizca iki satir ARASINDA durur; `false`/`null` cocuklar (kosullu satirlar) sayilmaz.
 */
export default function AyiricliListe({ children, className = 'flex-col' }: Props) {
  const satirlar = Children.toArray(children);
  return (
    <View className={className}>
      {satirlar.map((satir, i) => (
        <Fragment key={isValidElement(satir) && satir.key !== null ? satir.key : i}>
          {i > 0 && <CamAyirici />}
          {satir}
        </Fragment>
      ))}
    </View>
  );
}
