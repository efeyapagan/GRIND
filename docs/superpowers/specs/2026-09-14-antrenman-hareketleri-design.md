# Antrenman hareketleri — antrenmana hareket ekleme ve kaldırma

**Tarih:** 2026-09-14
**Issue'lar:** #60 (yanlış eklenen hareketi kaldırma), #62 (önce hareket ekle, harekete dokununca set ekle)
**Kapsam:** Antrenmana ait kalıcı bir hareket listesi (`SessionExercise`), şablonla başlarken kopyalama,
hareket ekleme ve kaldırma uçları, Bugün ekranında "Hareket ekle" akışı ve hareket kaldırma.
**Durum:** ✅ Uygulandı (2026-09-14; ayrıntı ve devreden notlar PLAN.md "İstek #60 + #62"). #61 (antrenman
yokken "Şablon oluştur") ayrı iştir.

**Bağlayıcılık:** Görsel kurallar `2026-09-12-frontend-gorsel-tasarim-design.md`, mimari kurallar
`2026-09-12-frontend-react-pwa-design.md` ve CLAUDE.md (Code-First, 3NF, IDOR, tek `SaveChangesAsync`)
geçerliliğini korur.

Kullanıcı kararları:
- Model: **antrenmana kopyala** (şablon hareketleri antrenman başlarken antrenmana kopyalanır).
- Her antrenman bir şablonla başlar (#61'de karar verildi); şablonsuz antrenman arayüzden başlatılmaz.
- İş akışı: önce yalnızca gerekli testler yazılır ve sunulur, onaydan sonra kod.

---

## Mevcut durum (koddan okundu)

- `WorkoutSessionService.ProgressAsync` kartları ve "0 / 3 set" ilerlemesini her istekte **şablonun güncel**
  `TemplateExercises`'ından üretir; `completedSets` o oturumun setlerinden sayılır. Şablonsuz oturumda
  ilerleme boştur.
- Sonuç: (1) şablon düzenlenince başlamış ve geçmiş antrenmanların ilerlemesi de değişir (gizli hata);
  (2) bir hareketi yalnızca bugünkü antrenmandan kaldırmanın yeri yok; (3) setsiz bir hareket antrenmana
  eklenemez — şablon dışı hareket ancak ona set girilince "Plan dışı" bölümünde görünür.
- `PATCH /api/sessions/{id}` yalnızca notu değiştirir. Geçmiş ve export yalnızca şablon **adını** kullanır
  (`HistoryMapping`), ilerlemeyi kullanmaz.
- `POST /api/sets` bugüne ait açık oturum yoksa şablonsuz oturum açar (Faz 8 seam'i, tek commit).

---

## Karar 1 — Entity: `SessionExercise`

| Alan | Tip | Not |
|---|---|---|
| `Id` | `long` | surrogate key |
| `WorkoutSessionId` | `long` | FK, **CASCADE** (antrenmansız anlamsız — composition) |
| `ExerciseId` | `long` | FK, **RESTRICT** (egzersiz hard-delete edilmez, arşivlenir) |
| `OrderIndex` | `int` | kartların sırası |
| `PlannedSets` | `int?` | hedef set; **null = hedefsiz** (sonradan eklenen hareket). CHECK: `NULL` ya da `> 0` |
| `RestSeconds` | `int` | 0–900, varsayılan `TemplateExercise.DefaultRestSeconds` (90); CHECK ve sentinel `-1` `TemplateExercise` ile aynı desen |

- **Benzersiz indeks** `(WorkoutSessionId, ExerciseId)`: aynı hareket bir antrenmanda iki kez olamaz
  (servis de kontrol eder; indeks son savunma hattı).
- 3NF: `OrderIndex`/`PlannedSets`/`RestSeconds` satırın kimliğine bağlıdır. Şablondan kopyalanmaları
  transitive dependency değildir, **bilinçli anlık görüntüdür** (`SetEntry.RecordType` notuyla aynı gerekçe):
  antrenman başladığı andaki planı saklar, şablon sonradan değişse de başlamış antrenman değişmez.
- Migration `dotnet ef migrations add` ile üretilir, elle düzenlenmez.

Değerlendirilen seçenekler: (b) şablondan üretmeye devam edip "eklenen/çıkarılan" farklarını tutmak — iki
kaynağın birleştirilmesi gerekir ve şablon değişince geçmiş yine değişir; (c) yalnızca istemcide tutmak —
yenilemede kaybolur ve şablon kartını kaldırmayı çözmez. Kullanıcı (a)'yı seçti.

## Karar 2 — Şablonla başlarken kopyalama

- `GetOrOpenTodayAsync` yeni oturumu şablonlu açarken şablonun hareketlerini `OrderIndex` sırasıyla
  `SessionExercise` olarak ekler (`PlannedSets`, `RestSeconds` kopyalanır). Kayıt, oturumla **aynı commit'te**
  gider (seam kaydetmez kuralı korunur).
- Açık oturum zaten varsa (idempotent 200) hiçbir şey kopyalanmaz.

## Karar 3 — Set eklenince hareket listeye girer

- `SetEntryService.CreateAsync`, setin hareketi antrenmanın listesinde yoksa onu **sona, hedefsiz**
  (`PlannedSets = null`, `RestSeconds = 90`) ekler; set ve satır tek commit'te gider. Varsa dokunmaz.
- Böylece "Plan dışı" diye ayrı bir kavram kalmaz: antrenmandaki her hareket bir karttır.

## Karar 4 — İlerleme antrenmanın listesinden üretilir

- `ProgressAsync` artık şablona değil `SessionExercise`'lara bakar (`OrderIndex` sırası) ve `Template`
  navigasyonuna bağımlı değildir. `completedSets` yine setlerden sayılır.
- `SessionProgressResponse.PlannedSets` → `int?` (API sözleşmesi değişir; frontend tipleri `npm run api:types`
  ile yeniden üretilir). Şablonsuz ve setsiz oturumda ilerleme boş kalır.

## Karar 5 — Uçlar

**`POST /api/sessions/{id}/exercises`** gövde `{ "exerciseId": 12 }` → **201** + güncel `SessionResponse`.
- Oturum sahiplik sorgusuyla bulunur; başkasının ya da olmayan oturum **404** (nötr mesaj, IDOR).
- Oturum bitmişse (`EndedAt` dolu) **409** — geçmiş antrenman düzenleme kapsam dışı.
- Egzersiz `GetVisibleByIdAsync` ile bulunur; görünmeyen/başkasının **404** ("Egzersiz bulunamadı.").
  Arşivlenmiş egzersiz **400** (set eklemedeki kuralla aynı).
- Hareket zaten listedeyse **409**.
- Sona, hedefsiz (`PlannedSets = null`, `RestSeconds = 90`) eklenir.

**`DELETE /api/sessions/{id}/exercises/{exerciseId}`** → **204**.
- Sahiplik 404 ve bitmiş oturum 409 kuralları aynı.
- Hareket listede yoksa **404** ("Hareket bu antrenmanda yok.").
- Satır ve **o hareketin bu antrenmandaki bütün setleri** silinir; o hareketin rekorları **bir kez**
  yeniden hesaplanır (`RecalculateAsync(exerciseId, excludeSessionId: id)` — silinen setler commit'ten önce
  sorguda hâlâ görünür). Hepsi **tek `SaveChangesAsync`**.
- Controller ince kalır; kurallar `WorkoutSessionService`'te (`AddExerciseAsync`, `RemoveExerciseAsync`).

## Karar 6 — Mevcut veri

- Migration'da veri taşıma YOK (migration elle düzenlenmez). Migration'dan önce başlamış antrenmanların
  listesi boştur; setleri olan eski antrenmanlarda ilerleme boş döner. Etkisi pratikte yalnızca migration
  anında açık olan antrenmandır: o antrenmana set girilince hareketler Karar 3 ile listeye girer.
- Geçmiş (`/api/history`), export ve istatistik uçları ilerleme kullanmadığı için etkilenmez.

## Karar 7 — Bugün ekranı (arayüz)

- **Kartlar = ilerleme:** antrenmandaki her hareket bir kart; "Plan dışı" bölümü kalkar. Hedefsiz kartta sayaç
  "2 set" olarak, hedefli kartta "2 / 3 set" olarak görünür; tamamlandı işareti yalnızca hedefli kartta.
- **Alt alan, açık antrenmanda:** "+ Hareket ekle" düğmesi. Açılan seçici `HareketSecici` (#48) ile
  **yalnızca hareketleri** listeler (arşivliler ve zaten antrenmanda olanlar hariç); seçince `POST` atılır,
  yeni kart sona eklenir ve seçili olur.
- **Set ekleme karta bağlıdır:** karta dokunmak kartı seçer ve set panelini açar (dilim 3 Karar 6 korunur).
  Açık antrenmanda panelde hareket `<select>`'i **yoktur**; başlık seçili hareketin adını gösterir.
  Antrenman yokken bugünkü davranış #61'e kadar aynen kalır.
- **Hareketi kaldır:** seçili kartın içinde "Hareketi kaldır" düğmesi. Onay yok, geri alınabilir: kart hemen
  gizlenir, "Hareket kaldırıldı · Geri al" şeridi çıkar, `DELETE` süre dolunca ya da sayfadan çıkınca gider
  (`lib/gecikmeliSilme`, #57 ile aynı gerekçe: silinen setler geri getirilemez).
- Tazelemeler: açık oturum, o oturumun setleri, rekorlar, geçmiş, kaldırılan hareketin grafiği.

## Testler (yalnızca gerekli olanlar)

Backend: kopyalama ve şablon değişikliğinden bağımsızlık; set eklenince listeye girme (bir kez); ekleme
(sona, hedefsiz); geçersiz eklemeler (zaten var 409, başkasının egzersizi 404, arşivli 400); bitmiş oturum
409; başkasının oturumu 404; kaldırma (satır + yalnızca o hareketin setleri + rekor yeniden hesabı); listede
olmayanı kaldırma 404; uçların durum kodları.

Frontend: hedefsiz kart sayacı; "Hareket ekle" seçicisi yalnızca uygun hareketleri listeler ve seçim `POST`
atar; açık antrenmanda panelde hareket seçimi yok; hareketi kaldır → kart gizlenir, geri al → `DELETE` yok,
süre dolunca `DELETE`.

## Kapsam dışı

#61 (antrenman yokken "Şablon oluştur"), geçmiş antrenmanları düzenleme, eklenen hareketin hedef set/dinlenme
süresini düzenleme, kart sırasını değiştirme, backend'deki otomatik oturum açmayı kaldırma.
