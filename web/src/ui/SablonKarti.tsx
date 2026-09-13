import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const KART =
  'flex min-h-16 w-full items-center justify-between gap-4 rounded-xl bg-surface-2 p-4 text-left disabled:opacity-60';

type Props = { ad: string; hareketSayisi: number } & (
  | { to: string }
  | { onClick: () => void; disabled?: boolean }
);

/**
 * Sablon ozeti karti: Sablonlar listesinde duzenleyiciye giden baglanti, Bugun bos durumunda
 * antrenmani baslatan dugme. "N hareket" yanittaki listenin uzunlugudur (sunum).
 */
export default function SablonKarti(props: Props) {
  const icerik = (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body-lg font-semibold">{props.ad}</span>{' '}
        <span className="text-label text-muted">{props.hareketSayisi} hareket</span>
      </span>
      <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
    </>
  );

  if ('to' in props) {
    return (
      <Link to={props.to} className={KART}>
        {icerik}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={KART}>
      {icerik}
    </button>
  );
}
