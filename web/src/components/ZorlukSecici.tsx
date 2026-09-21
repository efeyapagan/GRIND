import { useTranslation } from 'react-i18next';
import type { Zorluk } from '../api/queries';

interface Props {
  onSec: (zorluk: Zorluk | null) => void;
  bekliyor: boolean;
}

/** Sunucunun enum degerleri Ingilizce (`Easy`/`Medium`/`Hard`); etiket katalogdan gelir (#177). */
const SECENEKLER: { deger: Zorluk; anahtar: 'antrenman.zorluk.Easy' | 'antrenman.zorluk.Medium' | 'antrenman.zorluk.Hard' }[] = [
  { deger: 'Easy', anahtar: 'antrenman.zorluk.Easy' },
  { deger: 'Medium', anahtar: 'antrenman.zorluk.Medium' },
  { deger: 'Hard', anahtar: 'antrenman.zorluk.Hard' },
];

/**
 * "Antrenmani bitir"in ardindan cikan zorluk sorusu (#118). Secim ZORUNLU DEGIL: "Atla" antrenmani
 * zorluksuz bitirir. Deger AI yorumuna baglam olarak girer (export metni uzerinden).
 *
 * `accent` KULLANILMAZ (gorsel tasarim spec'i Karar 2): burada secili bir durum yok, uc secenek de
 * esit -- dokunus antrenmani BITIRIR, bu yuzden bir "secili hap" hali hic olusmaz.
 */
export default function ZorlukSecici({ onSec, bekliyor }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-label text-muted">{t('antrenman.nasilGecti')}</span>
      {SECENEKLER.map(({ deger, anahtar }) => (
        <button
          key={deger}
          type="button"
          onClick={() => onSec(deger)}
          disabled={bekliyor}
          className="min-h-11 rounded-full bg-surface-3 px-4 text-label text-fg disabled:opacity-60"
        >
          {t(anahtar)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSec(null)}
        disabled={bekliyor}
        className="min-h-11 rounded-lg px-2 text-label text-muted disabled:opacity-60"
      >
        {t('ortak.atla')}
      </button>
    </div>
  );
}
