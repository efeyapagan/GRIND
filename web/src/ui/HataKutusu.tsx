import { CircleAlert } from 'lucide-react';

/** Formun genel hatasi (spec): danger-bg kutu, baslik + mesaj, role=alert. */
export default function HataKutusu({ baslik, mesaj }: { baslik: string; mesaj: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg p-4 text-on-danger-bg">
      <CircleAlert aria-hidden size={20} className="mt-0.5 shrink-0 text-danger" />
      <div className="flex flex-col">
        <span className="text-label font-bold">{baslik}</span>
        <span className="text-body">{mesaj}</span>
      </div>
    </div>
  );
}
