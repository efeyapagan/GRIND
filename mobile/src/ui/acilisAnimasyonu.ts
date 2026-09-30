/**
 * Ozet kartlarinin acilis animasyonlari (#547): alevin tirmanisi ve ok atisi uygulama SURECI basina
 * BIR KEZ oynar (kullanici karari: "uygulama ilk acildiginda animasyon oynasin, sonra kapatilip acilana
 * kadar son hali kalsin"). Modul seviyesinde tutulur: ekrandan cikip donmek bileseni yeniden takar ama
 * bu kumeyi sifirlamaz; uygulama kapatilip acilinca modul yeniden yuklenir ve animasyonlar tekrar oynar.
 *
 * Her animasyonun kendi anahtari var: alev oynayinca ok atisinin bayragi tukenmez.
 */
export type AcilisAnimasyonu = 'alev' | 'dart';

const oynayanlar = new Set<AcilisAnimasyonu>();

/** Bayragi tuketir: bu surecte ilk cagri `true`, sonrakiler `false`. */
export function acilistaIlkKezMi(anahtar: AcilisAnimasyonu): boolean {
  if (oynayanlar.has(anahtar)) {
    return false;
  }
  oynayanlar.add(anahtar);
  return true;
}

/** Yalnizca testler icin: bir sonraki takilisi "uygulamanin ilk acilisi" yapar. */
export function acilisAnimasyonlariniSifirla() {
  oynayanlar.clear();
}
