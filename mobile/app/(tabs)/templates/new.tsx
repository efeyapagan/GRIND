import { useLocalSearchParams } from 'expo-router';
import { usePageTitle } from '@grind/shared/pageTitle';
import type { SablonTaslakHareketi } from '@grind/shared/lib/sablonTaslagi';
import SablonFormu from '../../../src/components/SablonFormu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';

/** Rota parametresi metindir: bozuk ya da eksik JSON bos form acar, ekran cokmez. */
function hareketleriAyristir(ham: string | undefined): SablonTaslakHareketi[] | undefined {
  if (!ham) {
    return undefined;
  }
  try {
    const deger: unknown = JSON.parse(ham);
    return Array.isArray(deger) ? (deger as SablonTaslakHareketi[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * web/src/pages/SablonDuzenlePage.tsx (`sablon === null` dali) ile ayni. #209/#186: antrenmandan
 * gelinirse `hareketler` parametresi (JSON) formun baslangic satirlaridir. Geri baglantisi artik
 * ust kabukta (issue #255, `altEkranMi`) -- burada ayrica bir tane yazilmaz.
 */
export default function YeniSablonScreen() {
  usePageTitle('Yeni şablon');
  const { donus, hareketler } = useLocalSearchParams<{ donus?: string; hareketler?: string }>();

  return (
    <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <SablonFormu
        sablon={null}
        donusYolu={donus ?? '/templates'}
        baslangicHareketleri={hareketleriAyristir(hareketler)}
      />
    </EkranKaydirici>
  );
}
