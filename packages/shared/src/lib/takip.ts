import type { TakipIliskisi } from '../api/queries';

/** Kullanici aramasi her tusta degil, yazma bu kadar durunca gider (#284, iki platform). */
export const ARAMA_GECIKMESI_MS = 300;

export interface TakipDugmesi {
  /** true: takip et (POST), false: birak (DELETE). */
  takipEt: boolean;
  etiketAnahtari: 'takip.takipEt' | 'takip.geriTakipEt' | 'takip.takibiBirak';
}

/**
 * Iliskiye gore takip dugmesi (#284), web ve mobilde ortak. Kendin icin dugme yok. Arkadasa "Takibi
 * birak" profilde cizilir; liste satirlari arkadasa dugme yerine gosterge koyar (`arkadasMi`).
 */
export function takipDugmesi(iliski: TakipIliskisi): TakipDugmesi | null {
  switch (iliski) {
    case 'Self':
      return null;
    case 'None':
      return { takipEt: true, etiketAnahtari: 'takip.takipEt' };
    case 'FollowedBy':
      return { takipEt: true, etiketAnahtari: 'takip.geriTakipEt' };
    case 'Following':
    case 'Friends':
      return { takipEt: false, etiketAnahtari: 'takip.takibiBirak' };
  }
}
