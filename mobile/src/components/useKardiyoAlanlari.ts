import { useExercises, type KardiyoAlani } from '@grind/shared/api/queries';

/**
 * #647: kardiyo hareketinin sordugu kutular (makineye ozel, sunucudan). `useHareketOlcumu` ile ayni yol: hareket
 * listesinin onbellegi okunur, ikinci istek atilmaz.
 */
export function useKardiyoAlanlari(egzersizId: number): KardiyoAlani[] {
  const { data: egzersizler } = useExercises();
  return egzersizler?.find((e) => e.id === egzersizId)?.cardioFields ?? [];
}

/** #647: antrenmanin kardiyo hareketleri -- kartlar ve panel bu harekette set yerine kardiyo cizer. */
export function useKardiyoHareketleri(): Set<number> {
  const { data: egzersizler } = useExercises();
  return new Set((egzersizler ?? []).filter((e) => e.measurement === 'Cardio').map((e) => e.id));
}
