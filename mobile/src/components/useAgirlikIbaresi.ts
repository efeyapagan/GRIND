import { useTranslation } from 'react-i18next';
import { useExercises } from '@grind/shared/api/queries';
import { agirlikIbaresiAnahtari } from '@grind/shared/lib/agirlikIbaresi';

/**
 * #413: agirlik kutusunun sag ustunde duracak ibare ("Teki" / "Toplam") -- yoksa `undefined`.
 * Set paneli ve set duzenleyici AYNI kutuyu (`SayiAlani`) kullandigi icin hesap burada, tek yerde.
 *
 * Ekipman hareket listesinden okunur (`useExercises` onbellegi -- antrenman ekrani zaten bu listeyi
 * cekiyor, ikinci bir istek atilmaz); liste henuz gelmediyse ibare cizilmez, gelince kendiliginden
 * gorunur. Bu yuzden `SessionProgressResponse`a yeni bir alan eklemeye gerek yoktu.
 */
export function useAgirlikIbaresi(egzersizId: number): string | undefined {
  const { t } = useTranslation();
  const { data: egzersizler } = useExercises();
  const anahtar = agirlikIbaresiAnahtari(egzersizler?.find((e) => e.id === egzersizId)?.equipment);
  return anahtar ? t(anahtar) : undefined;
}
