import { useCallback } from 'react';
import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import {
  hareketiKaldir,
  queryKeys,
  setDegistiTazele,
  setiSil,
  useAddSessionExercise,
  useAddSet,
  useDeleteSession,
  useFinishSession,
  useReorderSessionExercises,
  useStartSession,
  useUpdateSet,
  type AcikOturum,
  type Egzersiz,
  type GecmisSayfasi,
  type Sablon,
  type SetDuzeltmesi,
  type SetKaydi,
  type TakvimOzeti,
  type YeniSetGirdisi,
  type Zorluk,
} from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { useCevrimdisi } from '../baglanti/BaglantiSaglayici';
import { useKuyruk } from './KuyrukSaglayici';
import { tekilAnahtar } from './kuyruk';
import {
  baslatIyimser,
  gecmisOzeti,
  hareketEkleIyimser,
  hareketKaldirIyimser,
  setDuzeltIyimser,
  setEkleIyimser,
  setSilIyimser,
  siralaIyimser,
  takvimeIsle,
  yeniSetKaydi,
} from './iyimser';

/**
 * #174 dilim 2: antrenman ekranlarinin yazma hook'larinin kuyruklu surumleri. Arayuz paylasilan hook'larla
 * AYNIDIR (mutateAsync / isPending / isError) -- ekranlar yalnizca import'u degistirir.
 *
 * Cevrimiciyken ve kuyruk bosken bugunku hook calisir (davranis degismez). Cevrimdisiyken, kuyrukta bekleyen
 * islem varken (sira korunmali) ya da istek AG hatasiyla duserse islem kuyruga yazilir ve ekran iyimser
 * olarak hemen guncellenir. Sunucunun reddettigi (ApiError) istek kuyruga YAZILMAZ: hatasi ekranda gorunur.
 *
 * `networkMode: 'always'`: TanStack cevrimdisiyken mutasyonlari bekletir; kuyruklu yol hic calismazdi.
 */

let sonGeciciKimlik = 0;

/** Uygulama yeniden acilsa da cakismayan negatif gecici kimlik. */
function yeniGeciciKimlik(): number {
  sonGeciciKimlik = Math.min(sonGeciciKimlik - 1, -Date.now() * 1000);
  return sonGeciciKimlik;
}

function agHatasiMi(hata: unknown): boolean {
  return !(hata instanceof ApiError);
}

function acikOturum(queryClient: QueryClient): AcikOturum | null {
  return queryClient.getQueryData<AcikOturum | null>(queryKeys.openSession) ?? null;
}

function oturumSetleri(queryClient: QueryClient, oturumId: number): SetKaydi[] {
  return queryClient.getQueryData<SetKaydi[]>(queryKeys.sessionSets(oturumId)) ?? [];
}

function yazAcikOturum(queryClient: QueryClient, oturum: AcikOturum, setler?: SetKaydi[]) {
  queryClient.setQueryData(queryKeys.openSession, oturum);
  if (setler) {
    queryClient.setQueryData(queryKeys.sessionSets(oturum.id), setler);
  }
}

/** TR takviminde bu haftanin pazartesisi ("YYYY-MM-DD"); seri ve hedef haftalari Pazartesi-Pazar. */
function buHaftaninPazartesisi(): string {
  const bugun = trBugundenOnce(0);
  const haftaninGunu = new Date(`${bugun}T12:00:00Z`).getUTCDay();
  return trBugundenOnce((haftaninGunu + 6) % 7);
}

/**
 * Cevrimdisi bitirilen antrenmani onbellekteki TUM takvim araliklarina isler (kullanici karari: takvimde ve
 * haftalik hedefte hemen gorunur). Antrenmanin gunu baslangicinin TR gunudur (CLAUDE.md kurali).
 */
function takvimlereIsle(queryClient: QueryClient, startedAt: string, setSayisi: number) {
  const gun = trBugundenOnce(0, new Date(startedAt));
  const takvimler = queryClient.getQueriesData<TakvimOzeti>({ queryKey: queryKeys.calendarAll });
  const yeniGun = !takvimler.some(([, ozet]) => ozet?.days.some((g) => g.date === gun));
  const buHaftaMi = gun >= buHaftaninPazartesisi();
  for (const [anahtar, ozet] of takvimler) {
    if (!ozet) {
      continue;
    }
    const [, from, to] = anahtar as [string, string, string];
    queryClient.setQueryData(anahtar, takvimeIsle(ozet, { from, to }, { gun, setSayisi, yeniGun, buHaftaMi }));
  }
}

function egzersiz(queryClient: QueryClient, exerciseId: number): Egzersiz | undefined {
  return queryClient.getQueryData<Egzersiz[]>(queryKeys.exercises)?.find((aday) => aday.id === exerciseId);
}

/** Cevrimdisi yol mu: baglanti yok ya da sirayi korumak icin kuyrukta bekleyen islem var. */
function useKuyrukYolu() {
  const cevrimdisi = useCevrimdisi();
  const { bekleyenVar } = useKuyruk();
  return useCallback(
    async <T,>(cevrimici: () => Promise<T>, kuyruga: () => T): Promise<T> => {
      if (cevrimdisi || bekleyenVar) {
        return kuyruga();
      }
      try {
        return await cevrimici();
      } catch (hata) {
        if (agHatasiMi(hata)) {
          return kuyruga();
        }
        throw hata;
      }
    },
    [cevrimdisi, bekleyenVar],
  );
}

export function useKuyrukluStartSession() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useStartSession();

  return useMutation({
    networkMode: 'always',
    mutationFn: (templateId: number | null) =>
      yol(
        () => cevrimici.mutateAsync(templateId),
        () => {
          const sablon = templateId === null
            ? null
            : queryClient.getQueryData<Sablon[]>(queryKeys.templates)?.find((aday) => aday.id === templateId) ?? null;
          const oturum = baslatIyimser({ oturumId: yeniGeciciKimlik(), startedAt: new Date().toISOString(), sablon });
          yazAcikOturum(queryClient, oturum, []);
          ekle({ tur: 'oturumBaslat', anahtar: tekilAnahtar(), oturumId: oturum.id, templateId, startedAt: oturum.startedAt });
          return oturum;
        },
      ),
  });
}

export function useKuyrukluAddSet() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useAddSet();

  return useMutation({
    networkMode: 'always',
    mutationFn: (girdi: YeniSetGirdisi) =>
      yol(
        () => cevrimici.mutateAsync(girdi),
        () => {
          const hareket = egzersiz(queryClient, girdi.exerciseId);
          const createdAt = new Date().toISOString();
          let oturumId = girdi.sessionId;
          if (oturumId === undefined) {
            // `POST /api/sets` acik antrenman yoksa kendisi acar; cevrimdisi da bos antrenman baslatilir.
            let oturum = acikOturum(queryClient);
            if (!oturum) {
              oturum = baslatIyimser({ oturumId: yeniGeciciKimlik(), startedAt: createdAt, sablon: null });
              yazAcikOturum(queryClient, oturum, []);
              ekle({ tur: 'oturumBaslat', anahtar: tekilAnahtar(), oturumId: oturum.id, templateId: null, startedAt: createdAt });
            }
            oturumId = oturum.id;
          }
          const set = yeniSetKaydi({
            id: yeniGeciciKimlik(),
            sessionId: oturumId,
            exerciseId: girdi.exerciseId,
            exerciseName: hareket?.name ?? '',
            weight: girdi.weight,
            reps: girdi.reps,
            rir: girdi.rir,
            durationSeconds: girdi.durationSeconds,
            measurement: hareket?.measurement ?? 'WeightReps',
            createdAt,
          });
          const oturum = acikOturum(queryClient);
          if (oturum && oturum.id === oturumId) {
            const sonuc = setEkleIyimser(oturum, oturumSetleri(queryClient, oturumId), set);
            yazAcikOturum(queryClient, sonuc.oturum, sonuc.setler);
          }
          ekle({
            tur: 'setEkle',
            anahtar: tekilAnahtar(),
            oturumId,
            setId: set.id,
            exerciseId: girdi.exerciseId,
            weight: girdi.weight,
            reps: girdi.reps,
            rir: girdi.rir,
            durationSeconds: girdi.durationSeconds,
            createdAt,
          });
          return set;
        },
      ),
  });
}

export function useKuyrukluUpdateSet() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useUpdateSet();

  return useMutation({
    networkMode: 'always',
    mutationFn: (duzeltme: SetDuzeltmesi) =>
      yol(
        () => cevrimici.mutateAsync(duzeltme),
        () => {
          const oturum = acikOturum(queryClient);
          const setler = oturum ? setDuzeltIyimser(oturumSetleri(queryClient, oturum.id), duzeltme) : [];
          if (oturum) {
            queryClient.setQueryData(queryKeys.sessionSets(oturum.id), setler);
          }
          const { id, ...alanlar } = duzeltme;
          ekle({ tur: 'setDuzelt', anahtar: tekilAnahtar(), setId: id, ...alanlar });
          return setler.find((set) => set.id === duzeltme.id) as SetKaydi;
        },
      ),
  });
}

/** Set silmenin kuyruklu hali (antrenman ekraninda geri alma suresi dolunca cagrilir). */
export function useKuyrukluSetSil() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();

  return useCallback(
    (kayit: SetKaydi) =>
      void yol(
        async () => {
          await setiSil(kayit.id);
          setDegistiTazele(queryClient, kayit);
        },
        () => {
          const oturum = acikOturum(queryClient);
          if (oturum) {
            const sonuc = setSilIyimser(oturum, oturumSetleri(queryClient, oturum.id), kayit.id);
            yazAcikOturum(queryClient, sonuc.oturum, sonuc.setler);
          }
          ekle({ tur: 'setSil', anahtar: tekilAnahtar(), setId: kayit.id });
        },
      ).catch(() => undefined),
    [ekle, queryClient, yol],
  );
}

/** Hareket kaldirmanin kuyruklu hali (geri alma suresi dolunca cagrilir). */
export function useKuyrukluHareketKaldir() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();

  return useCallback(
    ({ sessionId, exerciseId }: { sessionId: number; exerciseId: number }) =>
      void yol(
        async () => {
          await hareketiKaldir(sessionId, exerciseId);
          setDegistiTazele(queryClient, { sessionId, exerciseId });
        },
        () => {
          const oturum = acikOturum(queryClient);
          if (oturum) {
            const sonuc = hareketKaldirIyimser(oturum, oturumSetleri(queryClient, oturum.id), exerciseId);
            yazAcikOturum(queryClient, sonuc.oturum, sonuc.setler);
          }
          ekle({ tur: 'hareketKaldir', anahtar: tekilAnahtar(), oturumId: sessionId, exerciseId });
        },
      ).catch(() => undefined),
    [ekle, queryClient, yol],
  );
}

export function useKuyrukluAddSessionExercise() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useAddSessionExercise();

  return useMutation({
    networkMode: 'always',
    mutationFn: (girdi: { sessionId: number; exerciseId: number }) =>
      yol(
        () => cevrimici.mutateAsync(girdi),
        () => {
          const oturum = acikOturum(queryClient) as AcikOturum;
          const guncel = hareketEkleIyimser(oturum, {
            exerciseId: girdi.exerciseId,
            exerciseName: egzersiz(queryClient, girdi.exerciseId)?.name ?? '',
          });
          yazAcikOturum(queryClient, guncel);
          ekle({ tur: 'hareketEkle', anahtar: tekilAnahtar(), oturumId: girdi.sessionId, exerciseId: girdi.exerciseId });
          return guncel;
        },
      ),
  });
}

export function useKuyrukluReorderSessionExercises() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useReorderSessionExercises();

  return useMutation({
    networkMode: 'always',
    mutationFn: (girdi: { sessionId: number; exerciseIds: number[] }) =>
      yol(
        () => cevrimici.mutateAsync(girdi),
        () => {
          const guncel = siralaIyimser(acikOturum(queryClient) as AcikOturum, girdi.exerciseIds);
          yazAcikOturum(queryClient, guncel);
          ekle({ tur: 'hareketSirala', anahtar: tekilAnahtar(), oturumId: girdi.sessionId, exerciseIds: girdi.exerciseIds });
          return guncel;
        },
      ),
  });
}

/**
 * Bitirme. Cevrimdisi (kullanici karari): antrenman gecmiste, takvimde ve haftalik hedefte HEMEN gorunur --
 * ozeti gecmisin ilk sayfasinin basina yazilir, takvim araliklarina islenir (setsiz antrenman sayilmaz, sunucu
 * gibi); gonderilince hepsi sunucunun degerleriyle sabitlenir. Donen oturumun `durationSeconds`i cihazda hesaplanir.
 */
export function useKuyrukluFinishSession() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useFinishSession();

  return useMutation({
    networkMode: 'always',
    mutationFn: (girdi: { sessionId: number; zorluk: Zorluk | null }) =>
      yol(
        () => cevrimici.mutateAsync(girdi),
        () => {
          const endedAt = new Date().toISOString();
          const oturum = acikOturum(queryClient) as AcikOturum;
          const ozet = gecmisOzeti(oturum, oturumSetleri(queryClient, oturum.id), endedAt);
          if (ozet.setCount > 0) {
            takvimlereIsle(queryClient, oturum.startedAt, ozet.setCount);
          }
          queryClient.setQueryData<InfiniteData<GecmisSayfasi>>(queryKeys.historyInfinite, (onceki) =>
            onceki && onceki.pages.length > 0
              ? {
                  ...onceki,
                  pages: [{ ...onceki.pages[0], items: [ozet, ...onceki.pages[0].items] }, ...onceki.pages.slice(1)],
                }
              : onceki,
          );
          ekle({ tur: 'oturumBitir', anahtar: tekilAnahtar(), oturumId: girdi.sessionId, zorluk: girdi.zorluk, endedAt });
          return { ...oturum, isOpen: false, durationSeconds: ozet.durationSeconds };
        },
      ),
  });
}

export function useKuyrukluDeleteSession() {
  const queryClient = useQueryClient();
  const { ekle } = useKuyruk();
  const yol = useKuyrukYolu();
  const cevrimici = useDeleteSession();

  return useMutation({
    networkMode: 'always',
    mutationFn: (sessionId: number) =>
      yol(
        () => cevrimici.mutateAsync(sessionId),
        () => {
          queryClient.setQueryData(queryKeys.openSession, null);
          queryClient.removeQueries({ queryKey: queryKeys.sessionSets(sessionId) });
          ekle({ tur: 'oturumIptal', anahtar: tekilAnahtar(), oturumId: sessionId });
        },
      ),
  });
}

