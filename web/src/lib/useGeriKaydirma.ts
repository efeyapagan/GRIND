import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { geriGidilsinMi, geriHedefi, kenardanMi, yonKarari } from './geriKaydirma';

/** Birakinca sayfanin disari kaymasi ya da yerine oturmasi (ms). */
const ANIMASYON_MS = 150;

interface Dokunus {
  id: number;
  x0: number;
  y0: number;
  yon: 'bekle' | 'geri' | 'yok';
  sonX: number;
  sonZaman: number;
  /** px/sn -- son iki pointermove arasindan. */
  vx: number;
  /** Dokunus basladigindaki konum anahtari: tarayici bu arada kendisi geri gittiyse bir daha gidilmez. */
  konumAnahtari: string;
}

/**
 * Sol kenardan saga kaydirarak geri donme (#232) -- kabuktaki `<main>`e baglanir. Karar kurallari
 * paylasilan `geriKaydirma` modulunde (mobil kabukla ayni).
 *
 * Yalnizca dokunmatik/kalem: fare yok sayilir (masaustunde tarayici geri dugmesi var, fareyle metin
 * secimi bozulmasin). `main` `touch-action: pan-y` tasir; yatay hareket tarayiciya gitmez, bu yuzden
 * tarayici `pointercancel` gondermez -- gonderirse (tarayici sekmesinde kenar hareketini sistem
 * yakaladiysa) sayfa yerine oturur.
 *
 * Kayma `main.style.transform`a ref uzerinden yazilir (her harekette React render'i yok). Satir ici
 * stil yasaginin istisnasi `useSuruklenebilirOge` ile ayni gerekce: calisma anindaki bir sayi, sabit
 * bir sinifla ifade edilemez (hareket fizigi, gorsel tercih degil).
 */
export function useGeriKaydirma() {
  const navigate = useNavigate();
  const konum = useLocation();
  const ref = useRef<HTMLElement | null>(null);
  const dokunus = useRef<Dokunus | null>(null);
  const tiklamayiYut = useRef(false);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guncelKonum = useRef(konum);

  useEffect(() => {
    guncelKonum.current = konum;
  }, [konum]);

  useEffect(
    () => () => {
      if (zamanlayici.current) {
        clearTimeout(zamanlayici.current);
      }
    },
    [],
  );

  function kaydir(x: number, animasyonlu: boolean) {
    const main = ref.current;
    if (!main) {
      return;
    }
    main.style.transition = animasyonlu ? `transform ${ANIMASYON_MS}ms ease-out` : 'none';
    main.style.transform = `translateX(${x}px)`;
  }

  function temizle() {
    const main = ref.current;
    if (main) {
      main.style.transition = '';
      main.style.transform = '';
    }
  }

  /** Animasyon bitince `sonra`yi calistirir ve kaymayi siler. */
  function animasyondanSonra(sonra?: () => void) {
    if (zamanlayici.current) {
      clearTimeout(zamanlayici.current);
    }
    zamanlayici.current = setTimeout(() => {
      zamanlayici.current = null;
      sonra?.();
      temizle();
    }, ANIMASYON_MS);
  }

  function yerineOtur() {
    kaydir(0, true);
    animasyondanSonra();
  }

  function onPointerDown(e: React.PointerEvent) {
    dokunus.current = null;
    tiklamayiYut.current = false;
    if (
      e.pointerType === 'mouse' ||
      !kenardanMi(e.clientX) ||
      geriHedefi(konum.pathname, true) === 'yok' ||
      (e.target instanceof Element && e.target.closest('dialog'))
    ) {
      return;
    }
    dokunus.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      yon: 'bekle',
      sonX: e.clientX,
      sonZaman: performance.now(),
      vx: 0,
      konumAnahtari: konum.key,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dokunus.current;
    if (!d || d.id !== e.pointerId || d.yon === 'yok') {
      return;
    }
    const dx = e.clientX - d.x0;
    if (d.yon === 'bekle') {
      d.yon = yonKarari(dx, e.clientY - d.y0);
      if (d.yon !== 'geri') {
        return;
      }
      tiklamayiYut.current = true;
      // jsdom setPointerCapture uygulamaz.
      ref.current?.setPointerCapture?.(e.pointerId);
    }

    const simdi = performance.now();
    const gecen = simdi - d.sonZaman;
    if (gecen > 0) {
      d.vx = ((e.clientX - d.sonX) / gecen) * 1000;
    }
    d.sonX = e.clientX;
    d.sonZaman = simdi;
    kaydir(Math.max(0, dx), false);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = dokunus.current;
    dokunus.current = null;
    if (!d || d.id !== e.pointerId || d.yon !== 'geri') {
      return;
    }
    const genislik = window.innerWidth;
    if (!geriGidilsinMi(e.clientX - d.x0, d.vx, genislik)) {
      yerineOtur();
      return;
    }
    kaydir(genislik, true);
    animasyondanSonra(() => {
      const simdiki = guncelKonum.current;
      if (simdiki.key !== d.konumAnahtari) {
        return;
      }
      const hedef = geriHedefi(simdiki.pathname, simdiki.key !== 'default');
      if (hedef === 'geri') {
        void navigate(-1);
      } else if (hedef === 'anaSayfa') {
        void navigate('/');
      }
    });
  }

  function onPointerCancel(e: React.PointerEvent) {
    const d = dokunus.current;
    dokunus.current = null;
    if (d && d.id === e.pointerId && d.yon === 'geri') {
      yerineOtur();
    }
  }

  /** Kaydirmayi bir dugmenin ustunde bitirmek o dugmeye basmasin. */
  function onClickCapture(e: React.MouseEvent) {
    if (tiklamayiYut.current) {
      tiklamayiYut.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return {
    ref,
    isaretciler: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
