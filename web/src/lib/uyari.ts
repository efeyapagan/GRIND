/**
 * Dinlenme bitis uyarilari ve ekran kilidi (spec Karar 6, Riskler). Hepsi istege baglidir: API yoksa
 * (iOS Safari'de titresim, eski tarayicida Wake Lock, jsdom'da hicbiri) sessizce atlanir; sayac yine
 * calisir.
 */

let sesBaglami: AudioContext | null = null;

/**
 * Tarayicilar sesi ancak kullanici etkilesimiyle acilmis/surdurulmus bir AudioContext ile calar. Bu
 * yuzden "Set ekle" dokunusunda cagrilir; bitis bipi aylar sonra degil ~dakikalar sonra ayni baglamla
 * calar.
 */
export function sesiHazirla(): void {
  if (typeof window.AudioContext === 'undefined') {
    return;
  }
  sesBaglami ??= new AudioContext();
  if (sesBaglami.state === 'suspended') {
    void sesBaglami.resume();
  }
}

export function bipCal(): void {
  if (!sesBaglami) {
    return;
  }
  const osilator = sesBaglami.createOscillator();
  const kazanc = sesBaglami.createGain();
  osilator.frequency.value = 880;
  kazanc.gain.value = 0.2;
  osilator.connect(kazanc).connect(sesBaglami.destination);
  const baslangic = sesBaglami.currentTime;
  osilator.start(baslangic);
  osilator.stop(baslangic + 0.2);
}

export function titret(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(200);
  }
}

/** Ekrani acik tutar; birakma fonksiyonu doner. Destek yoksa ya da istek reddedilirse `null`. */
export async function ekraniAcikTut(): Promise<(() => void) | null> {
  if (!('wakeLock' in navigator)) {
    return null;
  }
  try {
    const kilit = await navigator.wakeLock.request('screen');
    return () => {
      void kilit.release();
    };
  } catch {
    return null;
  }
}
