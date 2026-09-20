import { useState } from 'react';
import SecimKutusu from '../ui/SecimKutusu';
import { tercihiDegistir, tercihiOku, type TemaTercihi } from '../lib/tema';

const SECENEKLER: { deger: TemaTercihi; etiket: string }[] = [
  { deger: 'sistem', etiket: 'Sistem' },
  { deger: 'acik', etiket: 'Açık' },
  { deger: 'koyu', etiket: 'Koyu' },
];

/**
 * Gorunum (tema) secicisi (#178). `HaftalikHedefSecici`in aksine bir mutation'i YOKTUR: tercih
 * cihazda saklanir (spec Karar 4), bu yuzden secim aninda uygulanir ve bekleme/hata durumu olmaz.
 */
export default function GorunumSecici() {
  const [tercih, setTercih] = useState<TemaTercihi>(() => tercihiOku());

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="gorunum-temasi" className="text-label text-muted">
        Tema
      </label>
      <SecimKutusu
        id="gorunum-temasi"
        value={tercih}
        onChange={(olay) => {
          const yeni = olay.target.value as TemaTercihi;
          setTercih(yeni);
          tercihiDegistir(yeni);
        }}
      >
        {SECENEKLER.map((secenek) => (
          <option key={secenek.deger} value={secenek.deger}>
            {secenek.etiket}
          </option>
        ))}
      </SecimKutusu>
    </div>
  );
}
