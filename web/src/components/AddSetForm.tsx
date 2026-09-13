import { useMemo, useRef, useState, type FormEvent, type Ref } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { queryKeys, useAddSet, useExercises, useOpenSession } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { adaGoreSirala } from '../lib/egzersizler';
import { ApiError } from '../api/problem';
import { formatWeight } from '../lib/format';
import { dinlenmeBaslat, dinlenmeSuresi, type Dinlenme } from '../lib/dinlenme';
import { sesiHazirla } from '../lib/uyari';
import BirincilDugme from '../ui/BirincilDugme';
import SecimKutusu from '../ui/SecimKutusu';
import DinlenmeSayaci from './DinlenmeSayaci';

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

interface SayiAlaniProps {
  id: string;
  etiket: string;
  // Gorunmeyen ama erisilebilir ada giren ek (orn. " (kg)") -- etiket gorselde kisa kalir.
  ekranOkuyucuEki?: string;
  birim: string;
  inputMode: 'decimal' | 'numeric';
  placeholder: string;
  value: string;
  onChange: (deger: string) => void;
  hata?: string;
  girdiRef?: Ref<HTMLInputElement>;
}

/**
 * Paneldeki kompakt sayi alani. Girdi kutunun TAMAMIDIR (60 px dokunma hedefi); etiket ve birim
 * onun ustune bindirilir ve `pointer-events-none` ile dokunmayi girdiye birakir. Birim `aria-hidden`
 * -- erisilebilir ad etiketten gelir ("Ağırlık (kg)").
 */
function SayiAlani({
  id,
  etiket,
  ekranOkuyucuEki,
  birim,
  inputMode,
  placeholder,
  value,
  onChange,
  hata,
  girdiRef,
}: SayiAlaniProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="relative block">
        <input
          id={id}
          ref={girdiRef}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-15 w-full rounded-lg bg-inset pt-5 pr-12 pl-2 text-heading text-fg tabular-nums placeholder:text-muted/40 focus:bg-surface-2"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-2 left-2 text-label-xs text-muted uppercase"
        >
          {etiket}
          {ekranOkuyucuEki && <span className="sr-only">{ekranOkuyucuEki}</span>}
        </label>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2.5 text-label-xs text-muted"
        >
          {birim}
        </span>
      </span>
      {hata && <p role="alert" className="text-label text-danger">{hata}</p>}
    </div>
  );
}

interface Props {
  // Secim TodayPage'dedir (hareket kartlari ve panel ayni secimi paylasir, spec Karar 5). `null`:
  // egzersiz listesi henuz yuklenmedi.
  egzersizId: number | null;
  onEgzersizSec: (exerciseId: number) => void;
}

/**
 * Set ekleme formu -- bos durumda da (henuz acik oturum yokken) kullanilabilir olmasi gerekir,
 * cunku ilk set eklendiginde oturum sunucu tarafinda kendiliginden acilir (spec). Bu yuzden
 * TodayPage'in acik oturum olup olmadigina bakmadan hep render edilir. Secilen egzersiz disaridan
 * gelir (kontrollu).
 */
export default function AddSetForm({ egzersizId, onEgzersizSec }: Props) {
  const queryClient = useQueryClient();
  const { data: egzersizler } = useExercises();
  const { data: acikOturum } = useOpenSession();
  const eklemeMutasyonu = useAddSet();

  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);

  const [agirlik, setAgirlik] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rir, setRir] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  // Spec davranis 5: son eklenen set gorunur + role=status ile duyurulur; bir sonraki gonderimde
  // ya da hatada temizlenir. Dugmenin adi degismez.
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);

  // Spec Karar 6: her basarili set sonrasi yeniden baslar; hareket secimini degistirmek durdurmaz.
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(null);

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
    // Ses ancak kullanici etkilesimiyle acilabilir: "Set ekle" dokunusu bu etkilesimdir.
    sesiHazirla();
    setGenelHata(null);
    setAlanHatalari({});
    setSonEklenen(null);

    if (egzersizId === null) {
      return;
    }

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
        exerciseId: egzersizId,
        weight: ayristirilmisAgirlik,
        reps: ayristirilmisTekrar,
        rir: ayristirilmisRir,
      });
      // Basarili gonderimden sonra egzersiz/agirlik/tekrar KORUNUR -- ust uste ayni seti girmek
      // en sik akis (spec Karar 6). Odak agirlik alanina doner.
      setSonEklenen(`Eklendi: ${formatWeight(ayristirilmisAgirlik)} kg × ${ayristirilmisTekrar}`);
      setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(acikOturum?.progress ?? [], egzersizId)));
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
    // Panel sekme cubugunun HEMEN ustunde sabit (spec): 4rem = sekme cubugu yuksekligi (h-16).
    <form
      onSubmit={gonder}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2"
    >
      <div className="mx-auto flex max-w-md flex-col gap-2 rounded-xl bg-surface-3 p-4 shadow-2xl">
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />
        {genelHata && <p role="alert" className="text-label text-danger">{genelHata}</p>}
        <div>
          <label htmlFor="set-egzersiz" className="sr-only">
            Egzersiz
          </label>
          <SecimKutusu
            id="set-egzersiz"
            value={egzersizId ?? ''}
            onChange={(e) => onEgzersizSec(Number(e.target.value))}
          >
            {siraliEgzersizler.map((eg) => (
              <option key={eg.id} value={eg.id}>
                {eg.name}
              </option>
            ))}
          </SecimKutusu>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SayiAlani
            id="set-agirlik"
            etiket="Ağırlık"
            ekranOkuyucuEki=" (kg)"
            birim="kg"
            inputMode="decimal"
            placeholder="0"
            value={agirlik}
            onChange={setAgirlik}
            hata={alanHatalari.weight}
            girdiRef={agirlikRef}
          />
          <SayiAlani
            id="set-tekrar"
            etiket="Tekrar"
            birim="tekrar"
            inputMode="numeric"
            placeholder="0"
            value={tekrar}
            onChange={setTekrar}
            hata={alanHatalari.reps}
          />
          <SayiAlani
            id="set-rir"
            etiket="RIR"
            ekranOkuyucuEki=" (opsiyonel)"
            birim="kalan"
            inputMode="numeric"
            placeholder="—"
            value={rir}
            onChange={setRir}
            hata={alanHatalari.rir}
          />
        </div>
        <p role="status" className="min-h-4 text-label text-muted">
          {sonEklenen}
        </p>
        <BirincilDugme type="submit" yukseklik="buyuk" disabled={eklemeMutasyonu.isPending}>
          <Plus aria-hidden size={24} />
          Set ekle
        </BirincilDugme>
      </div>
    </form>
  );
}
