import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useAddSet, useExercises } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { ApiError } from '../api/problem';

/**
 * Spec Karar 8 (cevrimdisi kuyruk YOK): fetch'in kendisi reddederse (ag yok) `request()`
 * ApiError DISINDA bir istisna firlatir -- bunu burada ayirt edip acik bir Turkce mesaj
 * gosteriyoruz. Gece yarisindan sonra gonderilen kuyruklu bir set yanlis gune duserdi, o yuzden
 * kuyruklama bilerek yapilmiyor; kullanici tekrar denemeli.
 */
const BAGLANTI_HATASI_MESAJI = 'Bağlantı yok. Set kaydedilmedi, tekrar deneyin.';
const VARSAYILAN_HATA_MESAJI = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

/**
 * Set ekleme formu -- bos durumda da (henuz acik oturum yokken) kullanilabilir olmasi gerekir,
 * cunku ilk set eklendiginde oturum sunucu tarafinda kendiliginden acilir (spec). Bu yuzden
 * TodayPage'in acik oturum olup olmadigina bakmadan hep render edilir.
 */
export default function AddSetForm() {
  const { data: egzersizler } = useExercises();
  const eklemeMutasyonu = useAddSet();

  const siraliEgzersizler = useMemo(
    () => [...(egzersizler ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [egzersizler],
  );

  // Kullanici henuz elle bir secim yapmadiysa (`manuelSecim === null`), etkin deger render
  // aninda ilk (isme gore siralanmis) egzersize turetilir -- egzersiz listesi async geldigi icin
  // bunu bir efekt ile state'e yazmak gereksiz bir render zinciri baslatirdi (oxlint uyarisi).
  const [manuelSecim, setManuelSecim] = useState<string | null>(null);
  const ilkEgzersizId = siraliEgzersizler[0]?.id;
  const egzersizId = manuelSecim ?? (ilkEgzersizId !== undefined ? String(ilkEgzersizId) : '');

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);

  const agirlikRef = useRef<HTMLInputElement>(null);

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);

    // Agirlik hem "," hem "." kabul eder (spec) ama sunucuya her zaman nokta ile gider.
    const ayristirilmisAgirlik = Number(agirlik.replace(',', '.'));
    const ayristirilmisTekrar = Number(tekrar);
    const ayristirilmisRir = rir.trim() === '' ? null : Number(rir);

    try {
      await eklemeMutasyonu.mutateAsync({
        exerciseId: Number(egzersizId),
        weight: ayristirilmisAgirlik,
        reps: ayristirilmisTekrar,
        rir: ayristirilmisRir,
      });
      // Basarili gonderimden sonra egzersiz/agirlik/tekrar KORUNUR -- ust uste ayni seti girmek
      // en sik akis (spec Karar 6). Odak agirlik alanina doner.
      agirlikRef.current?.focus();
    } catch (hata) {
      if (hata instanceof ApiError) {
        const sonuc = apiHatasiniAyir(hata);
        setGenelHata(sonuc.genelHata ?? Object.values(sonuc.alanHatalari)[0] ?? VARSAYILAN_HATA_MESAJI);
      } else {
        setGenelHata(BAGLANTI_HATASI_MESAJI);
      }
      // Form icerigi BILEREK temizlenmiyor -- kullanici hatayi duzeltip tekrar denemeli.
    }
  }

  return (
    <form onSubmit={gonder}>
      {genelHata && <p role="alert">{genelHata}</p>}
      <div>
        <label htmlFor="set-egzersiz">Egzersiz</label>
        <select
          id="set-egzersiz"
          value={egzersizId}
          onChange={(e) => setManuelSecim(e.target.value)}
        >
          {siraliEgzersizler.map((eg) => (
            <option key={eg.id} value={eg.id}>
              {eg.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="set-agirlik">Ağırlık (kg)</label>
        <input
          id="set-agirlik"
          ref={agirlikRef}
          inputMode="decimal"
          value={agirlik}
          onChange={(e) => setAgirlik(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="set-tekrar">Tekrar</label>
        <input
          id="set-tekrar"
          inputMode="numeric"
          value={tekrar}
          onChange={(e) => setTekrar(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="set-rir">RIR (opsiyonel)</label>
        <input
          id="set-rir"
          inputMode="numeric"
          value={rir}
          onChange={(e) => setRir(e.target.value)}
        />
      </div>
      <button type="submit" disabled={eklemeMutasyonu.isPending}>
        Set Ekle
      </button>
    </form>
  );
}
