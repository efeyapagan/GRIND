/**
 * AI yorumunun icerigini cozumler (#454). Saf: ag, saat, React yok.
 *
 * Yorum iki bicimde olabilir:
 * - **yapisal**: modelin dondugu JSON (ozet + basarilar/uyarilar/tavsiyeler). Arayuz her maddeyi
 *   kendi karti, ikonu ve rengiyle cizer.
 * - **duz**: her sey. #454 oncesi uretilmis kayitlar markdown; model bozuk JSON da donebilir.
 *
 * KURAL: bir yorum ASLA kaybolmaz. Cozumleme basarisizsa metin oldugu gibi gosterilir -- ucret
 * LLM cagrisi aninda dogdugu icin bos bir kart gostermek en kotu sonuctur (#199'daki bolum
 * isareti kuraliyla ayni gerekce).
 */
export type YorumIcerigi =
  | { bicim: 'duz'; metin: string }
  | {
      bicim: 'yapisal';
      ozet: string;
      basarilar: string[];
      uyarilar: string[];
      tavsiyeler: string[];
    };

/** Model JSON'u bazen ``` blogunun icine sarar; bu bozuk bir yanit degil. */
const KOD_BLOGU = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/;

/** Metin olmayan ve bos maddeler ATILIR: ekranda "[object Object]" ya da bos satir gorunmesin. */
function metinListesi(deger: unknown): string[] {
  if (!Array.isArray(deger)) {
    return [];
  }
  return deger
    .filter((madde): madde is string => typeof madde === 'string')
    .map((madde) => madde.trim())
    .filter((madde) => madde.length > 0);
}

function metin(deger: unknown): string {
  return typeof deger === 'string' ? deger.trim() : '';
}

export function yorumuCozumle(icerik: string): YorumIcerigi {
  const duz: YorumIcerigi = { bicim: 'duz', metin: icerik };
  const cikarilan = KOD_BLOGU.exec(icerik)?.[1] ?? icerik;

  let ayrisan: unknown;
  try {
    ayrisan = JSON.parse(cikarilan);
  } catch {
    return duz;
  }

  if (typeof ayrisan !== 'object' || ayrisan === null || Array.isArray(ayrisan)) {
    return duz;
  }

  const kayit = ayrisan as Record<string, unknown>;
  const ozet = metin(kayit.ozet);
  const basarilar = metinListesi(kayit.basarilar);
  const uyarilar = metinListesi(kayit.uyarilar);
  const tavsiyeler = metinListesi(kayit.tavsiyeler);

  // Gecerli bir JSON ama bizim semamiz degilse (ya da hepsi bossa) cizecek bir sey yok: duz
  // metin en azindan kullaniciya bir sey gosterir.
  if (ozet === '' && basarilar.length === 0 && uyarilar.length === 0 && tavsiyeler.length === 0) {
    return duz;
  }

  return { bicim: 'yapisal', ozet, basarilar, uyarilar, tavsiyeler };
}
