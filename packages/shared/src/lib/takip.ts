import type { KullaniciProfili, TakipIliskisi, TakipListesiTuru } from '../api/queries';

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
 * Takip ediyorsan (#628) mobil sol dugme `takipMenusuAcilir` ile "Takiptesin" cizer; bu esleme web ve
 * baskasinin listesi icin kalir.
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

/** Sağdaki arkadaşlık düğmesinin hali (#628). Kendin için `null`. */
export type ArkadaslikDurumu = 'ekle' | 'gonderildi' | 'gelen' | 'arkadas' | 'sinirDoldu';

export function arkadaslikDurumu(
  profil: Pick<KullaniciProfili, 'relation' | 'friendRequest' | 'canSendFriendRequest'>,
): ArkadaslikDurumu | null {
  if (profil.relation === 'Self') return null;
  if (profil.relation === 'Friends') return 'arkadas';
  if (profil.friendRequest === 'Sent') return 'gonderildi';
  if (profil.friendRequest === 'Received') return 'gelen';
  return profil.canSendFriendRequest ? 'ekle' : 'sinirDoldu';
}

/** "Takiptesin ⌄": yalnızca takip ederken sol düğme kişi menüsünü açar (#628). */
export function takipMenusuAcilir(iliski: TakipIliskisi): boolean {
  return iliski === 'Following' || iliski === 'Friends';
}

export type ListeSatiriEylemi = 'arkadasliktanCikar' | 'takibiBirak' | 'takipcidenCikar';

const LISTE_EYLEMI = {
  friends: 'arkadasliktanCikar',
  following: 'takibiBirak',
  followers: 'takipcidenCikar',
} as const satisfies Record<TakipListesiTuru, ListeSatiriEylemi>;

/** Kendi takip listemde satırın sağındaki eylem (#628); başkasının listesinde bugünkü takip düğmesi kalır. */
export function listeSatiriEylemi(liste: TakipListesiTuru, kendiListem: boolean): ListeSatiriEylemi | null {
  return kendiListem ? LISTE_EYLEMI[liste] : null;
}
