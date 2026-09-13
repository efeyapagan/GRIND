import { useState } from 'react';
import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react';
import Alan, { type AlanProps } from './Alan';

type Props = Omit<AlanProps, 'type' | 'sagEk' | 'ikon'> & {
  ikon?: LucideIcon;
  gosterEtiketi?: string;
};

/**
 * Sifre alani + goster/gizle dugmesi (spec davranis 2). Dugmenin adi SABITTIR, durum
 * `aria-pressed` ile bildirilir (toggle button kalibi); goz ikonu durumu gorsel olarak degistirir.
 */
export default function SifreAlani({ ikon = Lock, gosterEtiketi = 'Şifreyi göster', ...alan }: Props) {
  const [gorunur, setGorunur] = useState(false);
  const GozIkonu = gorunur ? EyeOff : Eye;

  return (
    <Alan
      {...alan}
      ikon={ikon}
      type={gorunur ? 'text' : 'password'}
      sagEk={
        <button
          type="button"
          aria-label={gosterEtiketi}
          aria-pressed={gorunur}
          aria-controls={alan.id}
          onClick={() => setGorunur((g) => !g)}
          className="flex size-11 items-center justify-center rounded-lg text-muted"
        >
          <GozIkonu aria-hidden size={20} />
        </button>
      }
    />
  );
}
