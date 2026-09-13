import type { ReactNode } from 'react';
import { Dumbbell } from 'lucide-react';

interface Props {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
  altBaglanti: ReactNode;
}

/**
 * Giris ve Kayit'in TEK ortak duzeni (spec): ustte logo karosu (PWA ikonuyla ayni motif) + GRIND +
 * slogan, ortada kart, altta gecis baglantisi. Bu ekranlarda kabuk (baslik/sekme cubugu) yok.
 */
export default function AuthLayout({ baslik, aciklama, children, altBaglanti }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-surface-3 text-accent">
          <Dumbbell aria-hidden size={28} />
        </div>
        <span className="text-title uppercase">GRIND</span>
        <p className="mt-1 text-body text-muted">Güç antrenmanı günlüğü</p>
      </div>
      <section className="flex flex-col gap-4 rounded-xl bg-surface-1 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-heading">{baslik}</h1>
          {aciklama && <p className="text-body text-muted">{aciklama}</p>}
        </div>
        {children}
      </section>
      <p className="mt-4 text-center text-body text-muted">{altBaglanti}</p>
    </main>
  );
}
