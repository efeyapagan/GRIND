import type { Zorluk } from '../api/queries';

interface Props {
  onSec: (zorluk: Zorluk | null) => void;
  bekliyor: boolean;
}

/** Sunucunun enum degerleri Ingilizce (`Easy`/`Medium`/`Hard`), kullaniciya gosterilen etiket Turkce. */
const SECENEKLER: { deger: Zorluk; etiket: string }[] = [
  { deger: 'Easy', etiket: 'Kolay' },
  { deger: 'Medium', etiket: 'Orta' },
  { deger: 'Hard', etiket: 'Zor' },
];

/**
 * "Antrenmani bitir"in ardindan cikan zorluk sorusu (#118). Secim ZORUNLU DEGIL: "Atla" antrenmani
 * zorluksuz bitirir. Deger AI yorumuna baglam olarak girer (export metni uzerinden).
 *
 * `accent` KULLANILMAZ (gorsel tasarim spec'i Karar 2): burada secili bir durum yok, uc secenek de
 * esit -- dokunus antrenmani BITIRIR, bu yuzden bir "secili hap" hali hic olusmaz.
 */
export default function ZorlukSecici({ onSec, bekliyor }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-label text-muted">Nasıl geçti?</span>
      {SECENEKLER.map(({ deger, etiket }) => (
        <button
          key={deger}
          type="button"
          onClick={() => onSec(deger)}
          disabled={bekliyor}
          className="min-h-11 rounded-full bg-surface-3 px-4 text-label text-fg disabled:opacity-60"
        >
          {etiket}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSec(null)}
        disabled={bekliyor}
        className="min-h-11 rounded-lg px-2 text-label text-muted disabled:opacity-60"
      >
        Atla
      </button>
    </div>
  );
}
