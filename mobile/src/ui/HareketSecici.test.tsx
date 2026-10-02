import { render, screen, fireEvent } from '@testing-library/react-native';
import HareketSecici, { LISTE_YUKSEKLIGI } from './HareketSecici';
import { EkranKaydiriciBaglami } from './EkranKaydirici';
import type { Egzersiz } from '@grind/shared/api/queries';

const EGZERSIZLER: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 3, name: 'Squat', category: 'Legs' },
];

test('yazim hatasinda Bunu mu demek istediniz? onerisi gosterilir ve dokununca secilir (#231)', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');
  await fireEvent.changeText(screen.getByTestId('secici'), 'sqaut');

  expect(screen.getByText('Bunu mu demek istediniz?')).toBeTruthy();
  expect(screen.queryByText('Eşleşen hareket yok.')).toBeNull();

  await fireEvent.press(screen.getByText('Squat'));

  expect(onSec).toHaveBeenCalledWith(3);
});

// ---- Secilmemis satirda silik yer tutucu (#559 ucuncu bulgu) ----

/**
 * #559 (kullanici bildirdi): yeni eklenen bir hareket satiri sanki GERCEK bir ad yaziliymis gibi
 * goruluyordu (otomatik secilen ilk hareketin adi). `secilenAd` bos ise (henuz secim yok) alan
 * artik genel, silik bir yer tutucu gosterir -- hem kapaliyken hem ararken (henuz yazilmadiysa).
 */
test('secilenAd bosken kapali alanda silik "Hareket ara" yer tutucusu gorunur', async () => {
  const onSec = jest.fn();
  await render(<HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={0} secilenAd="" onSec={onSec} />);

  expect(screen.getByTestId('secici').props.placeholder).toBe('Hareket ara');
  expect(screen.getByTestId('secici').props.value).toBe('');
});

test('secilenAd bosken ararken de ayni yer tutucu gorunur, yazilinca sorguya gecer', async () => {
  const onSec = jest.fn();
  await render(<HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={0} secilenAd="" onSec={onSec} />);

  await fireEvent(screen.getByTestId('secici'), 'focus');
  expect(screen.getByTestId('secici').props.placeholder).toBe('Hareket ara');

  await fireEvent.changeText(screen.getByTestId('secici'), 'ben');
  expect(screen.getByTestId('secici').props.value).toBe('ben');
});

/** Mevcut bir secim varsa (eski davranis AYNEN kalir): ararken yer tutucu o secimi hatirlatir. */
test('secilenAd doluyken ararken yer tutucu mevcut secimi gosterir', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici').props.placeholder).toBe('Bench Press');
});

// ---- Oneri listesi tam 4 satir gosterir (#559 dorduncu bulgu) ----

/**
 * #559 (kullanici bildirdi: "4.5 gözüküyor"): `max-h-64` (256) kategori satirinin ustune ~4.5
 * sonuc satiri sigdiriyordu, son satir yarim kesiliyordu. Liste artik TAM 4 sonuc satirina gore
 * olculenmis bir yukseklik kullanir; `LISTE_YUKSEKLIGI` (disari verilen sabit, mt-1 dahil) ile
 * ScrollView'in kendi ic yuksekligi (mt-1 HARIC) ayni kaynaktan gelir -- iki sayi birbirinden
 * kopamaz.
 */
test('oneri listesinin ic ScrollView yuksekligi LISTE_YUKSEKLIGI eksi mt-1 kadardir', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  const ic = screen.getByTestId('secici-liste').props.children.props;
  expect(ic.style.maxHeight).toBe(LISTE_YUKSEKLIGI - 4);
});

// ---- Oneri listesinin acilma yonu (#559) ----

/**
 * #559 (kullanici bildirdi, ikinci bulgu): sablon formunda en sondaki hareketin adini girerken
 * asagi acilan oneri listesinin son 1-2 secenegi klavyenin altinda kaliyordu -- asagida yeterli
 * yer yoktu. `listeYukari` verilmezse varsayilan asagi acar (mevcut davranis, cogu satir icin dogru).
 */
test('listeYukari verilmezse oneri listesi asagi acar', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici-liste').props.className).toContain('top-full');
  expect(screen.getByTestId('secici-liste').props.className).not.toContain('bottom-full');
});

test('listeYukari verilince oneri listesi yukari acar', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici
      id="secici"
      egzersizler={EGZERSIZLER}
      secilenId={1}
      secilenAd="Bench Press"
      onSec={onSec}
      listeYukari
    />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici-liste').props.className).toContain('bottom-full');
  expect(screen.getByTestId('secici-liste').props.className).not.toContain('top-full');
});

// ---- Son satirda gecici kaydirma payi (#559 ikinci duzeltme) ----

/**
 * #559 (kullanici karari): `sonSatirMi` ile liste yine ASAGI acar (yon degismez) ama acilinca
 * `EkranKaydiriciBaglami.asagiKaydir` cagrilir -- ScrollView'e, listenin klavyenin ustunde tam
 * gorunmesi icin gecici yer acilir. Kapaninca (blur) ayni miktar GERI alinir -- sanal bosluk
 * yalnizca ihtiyac aninda var olur.
 */
test('sonSatirMi ile liste acilinca asagi kaydirma istenir, kapaninca geri alinir', async () => {
  const onSec = jest.fn();
  const asagiKaydir = jest.fn();
  await render(
    <EkranKaydiriciBaglami.Provider value={{ asagiKaydir }}>
      <HareketSecici
        id="secici"
        egzersizler={EGZERSIZLER}
        secilenId={1}
        secilenAd="Bench Press"
        onSec={onSec}
        sonSatirMi
      />
    </EkranKaydiriciBaglami.Provider>,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici-liste').props.className).toContain('top-full');
  expect(asagiKaydir).toHaveBeenCalledWith(168);

  await fireEvent(screen.getByTestId('secici'), 'blur');

  expect(asagiKaydir).toHaveBeenCalledWith(-168);
});

test('sonSatirMi verilmezse liste acilinca asagi kaydirma istenmez', async () => {
  const onSec = jest.fn();
  const asagiKaydir = jest.fn();
  await render(
    <EkranKaydiriciBaglami.Provider value={{ asagiKaydir }}>
      <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />
    </EkranKaydiriciBaglami.Provider>,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(asagiKaydir).not.toHaveBeenCalled();
});

/**
 * #559 (kullanici bildirdi, uc'uncu bulgu): sanal bosluk HareketSecici'nin KENDI icine
 * eklenince dropdown'un `top-full` (%100) anchor'i o kapsayicinin toplam yuksekligine gore
 * hesaplandigi icin dropdown'u da asagi itiyor, "yine klavyenin altinda kalmis" sorununu
 * YENIDEN yaratiyordu. Bosluk artik BURADA render edilmez -- yalnizca `onAcikDegisti` ile
 * acilip kapandigi bildirilir, cagiran taraf (SablonFormu) boslugu KENDI disinda ekler.
 */
test('onAcikDegisti acilinca true, kapaninca false bildirir; bilesen kendi icinde sanal bosluk render etmez', async () => {
  const onSec = jest.fn();
  const onAcikDegisti = jest.fn();
  await render(
    <HareketSecici
      id="secici"
      egzersizler={EGZERSIZLER}
      secilenId={1}
      secilenAd="Bench Press"
      onSec={onSec}
      sonSatirMi
      onAcikDegisti={onAcikDegisti}
    />,
  );

  expect(onAcikDegisti).toHaveBeenCalledWith(false);

  await fireEvent(screen.getByTestId('secici'), 'focus');
  expect(onAcikDegisti).toHaveBeenCalledWith(true);
  // Liste acikken bile LISTE_YUKSEKLIGI kadar baska bir View bu bilesenin disinda -- bu
  // bilesen artik boylesi bir sanal bosluk EKLEMEZ (cagirana birakilir).
  expect(screen.queryByTestId('sanal-bosluk')).toBeNull();

  await fireEvent(screen.getByTestId('secici'), 'blur');
  expect(onAcikDegisti).toHaveBeenCalledWith(false);
});
