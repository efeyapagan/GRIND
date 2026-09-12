import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useAddSet, useExercises, useOpenSession } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { ApiError } from '../api/problem';

/**
 * Spec Karar 8 (cevrimdisi kuyruk YOK): fetch'in kendisi reddederse (ag yok) `request()`
 * ApiError DISINDA bir istisna firlatir -- bunu burada ayirt edip acik bir Turkce mesaj
 * gosteriyoruz. Gece yarisindan sonra gonderilen kuyruklu bir set yanlis gune duserdi, o yuzden
 * kuyruklama bilerek yapilmiyor; kullanici tekrar denemeli.
 *
 * DIKKAT (review bulgusu R15): `fetch` reddettiginde istemci istegin sunucuya ULASIP
 * ULASMADIGINI BILEMEZ -- zayif bir baglantida yanit kaybolmus ama set sunucuda kaydedilmis
 * olabilir. Bu yuzden mesaj "kaydedilmedi" diye KESIN bir iddiada BULUNMAZ (bu, kullaniciyi
 * tekrar denemeye ve sunucu tarafinda YINELENEN bir set olusturmaya -- ve o yinelenen setin
 * PR tespitini de etkilemeye -- iter); yerine kullaniciyi listeyi kontrol etmeye yonlendirir.
 */
const BAGLANTI_HATASI_MESAJI =
  'Sunucuya ulaşılamadı. Set kaydedilmemiş olabilir; tekrar denemeden önce listeyi kontrol edin.';

// `apiHatasiniAyir`e bu formun render ettigi alan adlarini bildiriyoruz (I3) -- yardimci bunu
// kendi basina bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
const BILINEN_ALANLAR = ['weight', 'reps', 'rir'];

/**
 * Set ekleme formu -- bos durumda da (henuz acik oturum yokken) kullanilabilir olmasi gerekir,
 * cunku ilk set eklendiginde oturum sunucu tarafinda kendiliginden acilir (spec). Bu yuzden
 * TodayPage'in acik oturum olup olmadigina bakmadan hep render edilir.
 */
export default function AddSetForm() {
  const queryClient = useQueryClient();
  const { data: egzersizler } = useExercises();
  const { data: acikOturum } = useOpenSession();
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
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  const agirlikRef = useRef<HTMLInputElement>(null);

  /**
   * Bos (ya da sadece bosluk) birakilmis bir agirlik/tekrar alani "girilmedi" demektir,
   * "0" degil -- `Number('')` sessizce 0'a donustugu icin bunu erkenden yakalamazsak, yanlislikla
   * gonderilen bos bir form gercek bir set olarak kaydedilir ve sunucu onun uzerinde PR tespiti
   * calistirir (review bulgusu). Agirlik icin "0" (barfiks/dips) GECERLI bir deger oldugundan
   * burada deger degil, SADECE bosluk kontrolu yapilir.
   *
   * DIKKAT (review bulgusu I3): bosluk kontrolunun USTUNE sayisal bicim kontrolu de eklendi.
   * "Tekrar" sunucuda `int` -- "8.5" gibi ondalikli bir deger JSON'da sayi olarak GECERLI oldugu
   * icin sessizce gonderilir ve sunucu deserializasyonda 400 doner, ama o 400'un alan anahtarlari
   * (`$.reps` gibi) bu formun render ettigi hicbir alanla eslesmez -- kullanici hicbir hata
   * gormeden "Set Ekle"ye basar ve hicbir sey olmaz. Ayni sekilde RIR "abc" yazilirsa
   * `Number('abc')` NaN'a, NaN da JSON.stringify'da `null`'a donusur ve kullanicinin ne yazdigi
   * SESSIZCE kaybolur. Bu yuzden ust sinir/ondalik hane sayisi sunucuya birakilsa da, "sayisal
   * bicimde gecerli mi" istemcide kontrol edilip GECERSIZSE istek hic GONDERILMEZ.
   */
  function alanlariDogrula(): Record<string, string> {
    const hatalar: Record<string, string> = {};

    const agirlikMetni = agirlik.trim();
    if (agirlikMetni === '') {
      hatalar.weight = 'Ağırlık girilmeli.';
    } else if (!Number.isFinite(Number(agirlikMetni.replace(',', '.')))) {
      hatalar.weight = 'Ağırlık geçerli bir sayı olmalı.';
    }

    const tekrarMetni = tekrar.trim();
    if (tekrarMetni === '') {
      hatalar.reps = 'Tekrar sayısı girilmeli.';
    } else if (!Number.isInteger(Number(tekrarMetni))) {
      hatalar.reps = 'Tekrar sayısı tam sayı olmalı.';
    }

    const rirMetni = rir.trim();
    if (rirMetni !== '' && !Number.isInteger(Number(rirMetni))) {
      hatalar.rir = 'RIR tam sayı olmalı.';
    }

    return hatalar;
  }

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    setAlanHatalari({});

    const dogrulamaHatalari = alanlariDogrula();
    if (Object.keys(dogrulamaHatalari).length > 0) {
      setAlanHatalari(dogrulamaHatalari);
      return;
    }

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
        // Sunucu CreateSetRequest icin alan bazli DataAnnotations hatalari (orn. Weight/Reps
        // araligi) donebilir -- `apiHatasiniAyir` bunlari LoginPage/RegisterPage ile AYNI
        // desende ilgili alanin altina koyar; hicbir anahtar render edilen bir alanla
        // eslesmezse (orn. deserializasyon hatasi) genel bir hataya duser (I3), sessiz KALMAZ.
        const sonuc = apiHatasiniAyir(hata, BILINEN_ALANLAR);
        setGenelHata(sonuc.genelHata);
        setAlanHatalari(sonuc.alanHatalari);
      } else {
        setGenelHata(BAGLANTI_HATASI_MESAJI);
        // Istek sunucuya ulasip ulasmadigini BILEMEDIGIMIZ icin (R15), baglanti geri gelince
        // ekranin GERCEGI gostermesi icin acik oturumu ve o oturumun setlerini invalidate
        // ediyoruz -- set gercekte kaydedilmis olabilir, kullanici listeyi kontrol edebilsin.
        void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
        if (acikOturum) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(acikOturum.id) });
        }
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
        {alanHatalari.weight && <p role="alert">{alanHatalari.weight}</p>}
      </div>
      <div>
        <label htmlFor="set-tekrar">Tekrar</label>
        <input
          id="set-tekrar"
          inputMode="numeric"
          value={tekrar}
          onChange={(e) => setTekrar(e.target.value)}
        />
        {alanHatalari.reps && <p role="alert">{alanHatalari.reps}</p>}
      </div>
      <div>
        <label htmlFor="set-rir">RIR (opsiyonel)</label>
        <input
          id="set-rir"
          inputMode="numeric"
          value={rir}
          onChange={(e) => setRir(e.target.value)}
        />
        {alanHatalari.rir && <p role="alert">{alanHatalari.rir}</p>}
      </div>
      <button type="submit" disabled={eklemeMutasyonu.isPending}>
        Set Ekle
      </button>
    </form>
  );
}
