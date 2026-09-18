import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import IkonDugmesi from './IkonDugmesi';

interface Props {
  acik: boolean;
  onKapat: () => void;
  baslik: string;
  children: ReactNode;
}

const BASLIK_ID = 'modal-baslik';

/**
 * Yeniden kullanılabilir pencere (issue #119, kullanıcı isteği: "yeni ölçü girme penceresi").
 * Platformun kendi `<dialog>` elemanı kullanılır (Popover API'yi HesapMenusu'nde kullanma
 * gerekçesiyle aynı): gerçek bir tarayıcıda odak tuzağı, Escape ile kapanma ve backdrop'u
 * TARAYICI sağlar. `showModal`/`close` FEATURE-DETECT edilir -- jsdom (test ortamı) bu ikisini
 * uygulamaz; öyle bir ortamda `open` özniteliğine dönülür (modal olmayan ama yine de doğru
 * `<dialog>` semantiği).
 *
 * İçerik `acik` FALSE iken HİÇ RENDER EDİLMEZ (yalnızca `open` özniteliğine güvenmek yerine) --
 * jsdom, gerçek tarayıcıların `dialog:not([open]) { display: none }` UA kuralını uygulamaz, bu
 * yüzden "pencere kapalı" durumu ortamdan bağımsız olarak İÇERİĞİN YOKLUĞUYLA garanti edilir.
 */
export default function Modal({ acik, onKapat, baslik, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    if (acik && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!acik && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [acik]);

  if (!acik) {
    return <dialog ref={ref} onClose={onKapat} />;
  }

  return (
    <dialog
      ref={ref}
      onClose={onKapat}
      onClick={(e) => {
        if (e.target === ref.current) {
          onKapat();
        }
      }}
      aria-labelledby={BASLIK_ID}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border-0 bg-surface-1 p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between gap-2 p-4">
        <h2 id={BASLIK_ID} className="text-heading">
          {baslik}
        </h2>
        <IkonDugmesi etiket="Kapat" onClick={onKapat}>
          <X aria-hidden size={20} />
        </IkonDugmesi>
      </div>
      <div className="flex flex-col gap-4 p-4 pt-0">{children}</div>
    </dialog>
  );
}
