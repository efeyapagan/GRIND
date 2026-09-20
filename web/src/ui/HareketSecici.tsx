import { useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { Egzersiz, EgzersizKategorisi } from '../api/queries';
import { egzersizAra } from '../lib/egzersizler';

/** Kategori hapları (#77): `null` = Tümü. Push/Pull/Legs uygulamanın kendi terimleri, çevrilmez. */
const KATEGORI_HAPLARI: { deger: EgzersizKategorisi | null; etiket: string }[] = [
  { deger: null, etiket: 'Tümü' },
  { deger: 'Push', etiket: 'Push' },
  { deger: 'Pull', etiket: 'Pull' },
  { deger: 'Legs', etiket: 'Legs' },
  { deger: 'Other', etiket: 'Diğer' },
];

interface Props {
  id: string;
  egzersizler: readonly Egzersiz[];
  secilenId: number;
  /** Secilinin adi ayrica verilir: arsivlenmis bir hareket listede YOKTUR ama satirda kalir. */
  secilenAd: string;
  /** Baska bir satirda zaten secilenler: gorunur ama secilemez. */
  devreDisiIdler?: ReadonlySet<number>;
  onSec: (exerciseId: number) => void;
  /** Monte olunca odaklan (ve listeyi ac): yalnizca bir eylemle acilan secicilerde (#62 "Hareket ekle"). */
  otomatikOdak?: boolean;
  /** Liste alanin USTUNDE acilir: ekranin altindaki bir panelde asagi acilan liste sekme cubugunun altinda kalirdi. */
  listeYukari?: boolean;
}

/** Devre disi secenekleri atlayarak sonraki secilebilir indeksi bulur; yoksa mevcut indeks kalir. */
function sonrakiSecilebilir(
  liste: readonly Egzersiz[],
  devreDisi: ReadonlySet<number>,
  baslangic: number,
  yon: 1 | -1,
): number {
  for (let i = baslangic + yon; i >= 0 && i < liste.length; i += yon) {
    if (!devreDisi.has(liste[i].id)) {
      return i;
    }
  }
  return baslangic;
}

/**
 * Hareketi YAZARAK arayip secme (issue #48). Yerel `<select>`in yerini alir: havuz buyuyunce
 * (bkz. #49) uzun bir listede kaydirarak aramak zorlasiyordu.
 *
 * Erisilebilir combobox deseni: `role="combobox"` tasiyan bir metin alani, `role="listbox"`
 * bir liste ve `aria-activedescendant` ile gezinen etkin secenek. Odak HER ZAMAN metin alaninda
 * kalir -- ok tuslariyla gezerken ekran okuyucu etkin secenegi duyurur, kullanici yazmaya devam
 * edebilir. UI kutuphanesi yok (gorsel tasarim spec'i).
 *
 * Arama ISTEMCIDE: liste zaten tek bir istekle cekiliyor, her tus vurusunda sunucuya gitmenin
 * karsiligi yok (bkz. `egzersizAra`).
 */
export default function HareketSecici({
  id,
  egzersizler,
  secilenId,
  secilenAd,
  devreDisiIdler,
  onSec,
  otomatikOdak = false,
  listeYukari = false,
}: Props) {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [kategori, setKategori] = useState<EgzersizKategorisi | null>(null);
  const [etkin, setEtkin] = useState(0);
  const alanRef = useRef<HTMLInputElement>(null);
  const devreDisi = devreDisiIdler ?? new Set<number>();

  const sonuclar = acik ? egzersizAra(egzersizler, sorgu, kategori) : [];
  const listeId = `${id}-liste`;
  const secenekId = (exerciseId: number) => `${id}-secenek-${exerciseId}`;

  function ac() {
    if (acik) {
      return;
    }
    // Sorgu bos baslar (secili ad yer tutucuda gorunur): kullanici once TUM listeyi gorur,
    // secimini silmek zorunda kalmaz.
    setSorgu('');
    setEtkin(Math.max(0, egzersizler.findIndex((eg) => eg.id === secilenId)));
    setAcik(true);
  }

  function kapat() {
    setAcik(false);
    setSorgu('');
    setKategori(null);
  }

  function sec(egzersiz: Egzersiz) {
    if (devreDisi.has(egzersiz.id)) {
      return;
    }
    onSec(egzersiz.id);
    kapat();
    alanRef.current?.focus();
  }

  function tusaBasildi(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!acik) {
        ac();
        return;
      }
      setEtkin((mevcut) => sonrakiSecilebilir(sonuclar, devreDisi, mevcut, e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (e.key === 'Enter') {
      // Bilesen bir <form> icinde yasiyor: bastirilmazsa Enter formu GONDERIR.
      e.preventDefault();
      if (acik && sonuclar[etkin]) {
        sec(sonuclar[etkin]);
      }
      return;
    }
    if (e.key === 'Escape' && acik) {
      e.preventDefault();
      kapat();
    }
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search aria-hidden size={18} className="pointer-events-none absolute left-3 text-muted" />
        <input
          ref={alanRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={acik}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={acik && sonuclar[etkin] ? secenekId(sonuclar[etkin].id) : undefined}
          autoComplete="off"
          autoFocus={otomatikOdak}
          value={acik ? sorgu : secilenAd}
          placeholder={acik ? secilenAd : undefined}
          onFocus={ac}
          onBlur={kapat}
          onChange={(e) => {
            setSorgu(e.target.value);
            setEtkin(0);
            setAcik(true);
          }}
          onKeyDown={tusaBasildi}
          className="h-12 w-full rounded-lg bg-inset pr-4 pl-10 text-body-lg text-fg placeholder:text-muted/50 focus:bg-surface-3"
        />
      </div>

      {/* Sonuc sayisi duyurulur: ekran okuyucu kullanicisi listeyi goremez, kac sonuc kaldigini bilmeli. */}
      <p role="status" className="sr-only">
        {acik ? `${sonuclar.length} hareket bulundu` : ''}
      </p>

      <div
        hidden={!acik}
        className={`absolute inset-x-0 z-30 rounded-lg bg-surface-3 ${
          listeYukari ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
      >
        {/* Kategori haplari (#77). Odak metin alaninda kalir (secenekler gibi pointerdown bastirilir):
            blur listeyi kapatirdi. Klavye kullanicisi zaten yazarak arar; haplar Tab sirasina girmez. */}
        <div className="flex flex-wrap gap-1 border-b border-surface-4 p-1">
          {KATEGORI_HAPLARI.map(({ deger, etiket }) => (
            <button
              key={etiket}
              type="button"
              tabIndex={-1}
              aria-pressed={kategori === deger}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setKategori(deger);
                setEtkin(0);
              }}
              className={`min-h-11 rounded-full px-3 text-label ${
                kategori === deger ? 'bg-surface-4 text-fg' : 'text-muted'
              }`}
            >
              {etiket}
            </button>
          ))}
        </div>
        <ul
          id={listeId}
          role="listbox"
          aria-label="Hareketler"
          className="max-h-64 overflow-y-auto py-1"
        >
          {sonuclar.map((egzersiz, sira) => {
            const secili = egzersiz.id === secilenId;
            const kapali = devreDisi.has(egzersiz.id);
            return (
              <li
                key={egzersiz.id}
                id={secenekId(egzersiz.id)}
                role="option"
                aria-selected={secili}
                aria-disabled={kapali}
                // Dokunus/tiklama alani odagi metin alanindan ALMAMALI: blur once calisirsa
                // liste kapanir ve tiklama hicbir zaman secenege ulasmaz.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => sec(egzersiz)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-body ${
                  sira === etkin ? 'bg-surface-4' : ''
                } ${kapali ? 'text-muted opacity-50' : 'text-fg'}`}
              >
                {egzersiz.name}
                {secili && <Check aria-hidden size={18} className="shrink-0 text-accent-fg" />}
              </li>
            );
          })}
          {acik && sonuclar.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-body text-muted">
              Eşleşen hareket yok.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
