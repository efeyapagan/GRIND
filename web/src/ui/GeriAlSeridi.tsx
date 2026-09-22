import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  mesaj: string;
  sureMs: number;
  onGeriAl: () => void;
  // Kararli olmali: asagidaki zamanlayicinin bagimligidir.
  onSureDoldu: () => void;
}

/**
 * Silmeden sonra kisa sureligine cikan "Geri al" seridi (issue #46). Sekme cubugunun hemen ustunde
 * durur; sure dolunca kendini kaldirir ve `onSureDoldu` ile gercek silmeyi tetikler.
 *
 * Kalan sure her tikte `Date.now()`'dan HESAPLANIR (geri sayilan bir sayac tutulmaz) -- sekme arka
 * plana atilip geri gelince sure dogru kalir; `DinlenmeSayaci` ile ayni gerekce.
 *
 * Bitis ani BURADA, monte olurken kurulur; cagiran taraf yalnizca sureyi verir. Boylece `Date.now()`
 * cagrisi bir render fonksiyonuna sizmaz. Ard arda iki geri alma penceresi acilirsa bilesen `key` ile
 * yeniden monte edilmeli -- aksi halde ilk pencerenin bitis ani oldugu yerde kalir.
 *
 * `env(safe-area-inset-bottom)` keyfi deger olarak yazilir: Tailwind'de guvenli alan tokeni yok.
 * 5.5rem = sekme cubugu yuksekligi (App.tsx'teki h-14 = 3.5rem) + ortadaki "+" dugmesinin
 * halkasinin tastigi 2rem (issue #159) -- yalnizca 3.5rem kullanilirsa serit o dugmeyle CAKISIYORDU.
 *
 * `document.body`'ye portal ile cizilir (#232): kabuktaki `main` geri kaydirma sirasinda `transform`
 * tasir ve `transform`lu bir ata `fixed` ogenin kapsayicisi olur -- serit sayfayla birlikte kayardi.
 */
export default function GeriAlSeridi({ mesaj, sureMs, onGeriAl, onSureDoldu }: Props) {
  const { t } = useTranslation();
  const [bitisMs] = useState(() => Date.now() + sureMs);
  const [simdi, setSimdi] = useState(() => Date.now());
  const kalanMs = Math.max(0, bitisMs - simdi);

  useEffect(() => {
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 100);
    return () => clearInterval(zamanlayici);
  }, [bitisMs]);

  useEffect(() => {
    if (kalanMs === 0) {
      onSureDoldu();
    }
  }, [kalanMs, onSureDoldu]);

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 px-4"
    >
      <div className="mx-auto flex max-w-md flex-col gap-2 rounded-xl bg-surface-4 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label text-fg">{mesaj}</span>
          <button
            type="button"
            onClick={onGeriAl}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-label text-accent-fg"
          >
            <Undo2 aria-hidden size={18} />
            {t('ortak.geriAl')}
          </button>
        </div>
        {/* Kalan sure: yerel <progress>, satir ici style gerektirmeden dolar (DinlenmeSayaci deseni). */}
        <progress
          aria-hidden
          value={kalanMs}
          max={sureMs}
          className="h-1 w-full appearance-none overflow-hidden rounded-full bg-surface-3 [&::-moz-progress-bar]:bg-accent-fg [&::-webkit-progress-bar]:bg-surface-3 [&::-webkit-progress-value]:bg-accent-fg"
        />
      </div>
    </div>,
    document.body,
  );
}
