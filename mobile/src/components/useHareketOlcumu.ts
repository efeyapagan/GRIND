import { useExercises, type EgzersizOlcumu } from '@grind/shared/api/queries';

/**
 * #346: hareketin setlerinin neyle olculdugu -- set panelinin hangi alanlari cizecegi ve gecmis grafiginin
 * hangi degeri gosterecegi buna bagli. `useAgirlikIbaresi` ile ayni yol: hareket listesinin onbellegi okunur,
 * ikinci bir istek atilmaz; liste henuz gelmediyse kilo + tekrar sayilir.
 */
export function useHareketOlcumu(egzersizId: number): EgzersizOlcumu {
  const { data: egzersizler } = useExercises();
  return egzersizler?.find((e) => e.id === egzersizId)?.measurement ?? 'WeightReps';
}
