import { request } from '@grind/shared/api/client';
import { ApiError } from '@grind/shared/api/problem';
import { kimlikEsle, sablonuBirak, type BekleyenIslem } from './kuyruk';

export interface KimlikEslemesi {
  tur: 'oturum' | 'set' | 'sablon';
  gecici: number;
  gercek: number;
}

export interface GonderimSonucu {
  /** Gonderilemeyen (ve sonrasindaki) islemler; gecici kimlikler bulunan gerceklerle eslenmis. */
  kalan: BekleyenIslem[];
  eslemeler: KimlikEslemesi[];
  /** Sunucunun reddettigi (4xx) ve bu yuzden atlanan islem sayisi -- ekran tazelenmeli. */
  atlanan: number;
  /** Ag/sunucu hatasiyla durdu mu (sonra tekrar denenecek). */
  durdu: boolean;
}

function govde(veri: unknown): RequestInit {
  return { body: JSON.stringify(veri) };
}

/** Tek islemi sunucuya gonderir; yeni kayit acildiysa gercek kimligini doner. */
async function gonder(islem: BekleyenIslem): Promise<KimlikEslemesi | null> {
  switch (islem.tur) {
    case 'oturumBaslat': {
      const yanit = await request<{ id: number }>('/sessions', {
        method: 'POST',
        ...govde({ templateId: islem.templateId, startedAt: islem.startedAt, clientRequestId: islem.anahtar }),
      });
      return { tur: 'oturum', gecici: islem.oturumId, gercek: yanit.id };
    }
    case 'setEkle': {
      const yanit = await request<{ id: number }>(`/sessions/${islem.oturumId}/sets`, {
        method: 'POST',
        ...govde({
          exerciseId: islem.exerciseId,
          weight: islem.weight,
          reps: islem.reps,
          rir: islem.rir,
          durationSeconds: islem.durationSeconds,
          clientCreatedAt: islem.createdAt,
          clientRequestId: islem.anahtar,
        }),
      });
      return { tur: 'set', gecici: islem.setId, gercek: yanit.id };
    }
    case 'setDuzelt':
      await request(`/sets/${islem.setId}`, {
        method: 'PATCH',
        ...govde({ weight: islem.weight, reps: islem.reps, rir: islem.rir, durationSeconds: islem.durationSeconds }),
      });
      return null;
    case 'setSil':
      await request(`/sets/${islem.setId}`, { method: 'DELETE' });
      return null;
    case 'hareketEkle':
      await request(`/sessions/${islem.oturumId}/exercises`, { method: 'POST', ...govde({ exerciseId: islem.exerciseId }) });
      return null;
    case 'hareketKaldir':
      await request(`/sessions/${islem.oturumId}/exercises/${islem.exerciseId}`, { method: 'DELETE' });
      return null;
    case 'hareketSirala':
      await request(`/sessions/${islem.oturumId}/exercises/order`, {
        method: 'PUT',
        ...govde({ exerciseIds: islem.exerciseIds }),
      });
      return null;
    case 'oturumBitir':
      await request(`/sessions/${islem.oturumId}/finish`, {
        method: 'POST',
        ...govde({ difficulty: islem.zorluk, clientEndedAt: islem.endedAt }),
      });
      return null;
    case 'oturumIptal':
      await request(`/sessions/${islem.oturumId}`, { method: 'DELETE' });
      return null;
    case 'sablonOlustur': {
      const yanit = await request<{ id: number }>('/templates', {
        method: 'POST',
        ...govde({
          name: islem.name,
          exercises: islem.exercises,
          clientRequestId: islem.anahtar,
          sessionId: islem.baglananOturumId,
        }),
      });
      return { tur: 'sablon', gecici: islem.sablonId, gercek: yanit.id };
    }
    case 'sablonGuncelle':
      await request(`/templates/${islem.sablonId}`, {
        method: 'PUT',
        ...govde({ name: islem.name, exercises: islem.exercises }),
      });
      return null;
    case 'sablonSil':
      await request(`/templates/${islem.sablonId}`, { method: 'DELETE' });
      return null;
    case 'sablonSirala':
      await request('/templates/order', { method: 'PUT', ...govde({ templateIds: islem.templateIds }) });
      return null;
    case 'sablonSabitle':
      await request(`/templates/${islem.sablonId}/pin`, { method: 'PUT', ...govde({ isPinned: islem.isPinned }) });
      return null;
  }
}

/**
 * #174 dilim 2: kuyrugu bastan sona, SIRAYLA gonderir. Ag hatasinda ya da 5xx'te durur (islem ve
 * sonrakiler kuyrukta kalir, sonra tekrar denenir; 401 de -- yeniden giristen sonra). 4xx alan islem atlanir -- sunucu onu kabul etmeyecek,
 * kuyrugu tikamamali; ekran tazelemeyle gercegi gosterir. Basarili islemin acdigi kaydin gercek kimligi
 * sonraki islemlere uygulanir.
 *
 * `onIslemBasliyor`: gonderilmekte olan islemin anahtari (kuyruk sikistirmasi onu degistirmesin).
 */
export async function kuyruguGonder(
  kuyruk: readonly BekleyenIslem[],
  onIslemBasliyor: (anahtar: string | undefined) => void = () => {},
): Promise<GonderimSonucu> {
  let kalan = [...kuyruk];
  const eslemeler: KimlikEslemesi[] = [];
  let atlanan = 0;

  while (kalan.length > 0) {
    const [islem, ...sonrakiler] = kalan;
    onIslemBasliyor(islem.anahtar);
    try {
      const esleme = await gonder(islem);
      kalan = sonrakiler;
      if (esleme) {
        eslemeler.push(esleme);
        kalan = kimlikEsle(kalan, esleme.tur, esleme.gecici, esleme.gercek);
      }
    } catch (hata) {
      // 401: oturum dusmus -- islem gecersiz degil, yeniden giristen sonra gonderilir (atilirsa antrenman kaybolur).
      if (hata instanceof ApiError && hata.status >= 400 && hata.status < 500 && hata.status !== 401) {
        atlanan += 1;
        // Reddedilen sablon hic olusmayacak: onunla baslatilan antrenman sablonsuz gider, kaybolmaz.
        kalan = islem.tur === 'sablonOlustur' ? sablonuBirak(sonrakiler, islem.sablonId) : sonrakiler;
        continue;
      }
      onIslemBasliyor(undefined);
      return { kalan, eslemeler, atlanan, durdu: true };
    }
  }

  onIslemBasliyor(undefined);
  return { kalan, eslemeler, atlanan, durdu: false };
}
