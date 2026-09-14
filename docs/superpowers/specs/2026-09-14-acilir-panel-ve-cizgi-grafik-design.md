# Frontend Dilim 3 — Açılır set paneli, çizgi grafik ve tahmini 1RM

**Tarih:** 2026-09-14
**Issue:** #43
**Kapsam:** Bugün ekranındaki "Set ekle" panelinin yalnızca gerektiğinde açılması; hareket grafiğinin
sekmeli, turuncu bir çizgi grafiğe dönüşmesi (Ağırlık / Antrenman / Tahmini 1RM, 1 Ay / 3 Ay / Tüm);
bunu besleyen yeni bir hareket ilerleme ucu ve tahmini 1RM hesaplayıcısı.
**Durum:** 📋 Spec. Kullanıcı kararları (2026-09-14, telefonda gerçek kullanım sonrası):
- Panel her zaman açık olmasın; **harekete dokununca açılsın**.
- Grafik referans görseldeki gibi olsun (sekmeler, "Şu anki" / "Fark", noktalı dolgulu çizgi, aralık
  seçimi) ve **turuncu** olsun.
- Tahmini 1RM eklensin; formül önerisi (Brzycki) itirazsız kabul edildi.

**Bağlayıcılık:** Bu doküman bağlayıcıdır. Görsel kurallar için
`2026-09-12-frontend-gorsel-tasarim-design.md` (bu dokümanın Karar 3'teki genişlemesiyle), mimari kurallar
için `2026-09-12-frontend-react-pwa-design.md`, dilim 2 davranışları için
`2026-09-13-sablonlar-ve-dinlenme-design.md` geçerliliğini korur; burada değişenler açıkça yazılıdır.

---

## Mevcut durum (koddan okundu)

- `AddSetForm` ekranın altına `fixed` bir form; içinde dinlenme sayacı (`DinlenmeSayaci`, durumu formun
  içinde), egzersiz seçimi, ağırlık/tekrar/RIR ve "Set ekle". Her durumda açık; `TodayPage` listenin
  son satırı örtülmesin diye `pb-72` bırakıyor.
- Hareket grafiği `components/HareketGecmisi` + `ui/HacimGrafigi` (çubuk, yalnızca hacim). Veri
  `GET /api/history?ExerciseId=&PageSize=10` — oturum başına `totalVolume`/`setCount`. Oturum başına
  **en ağır set** ve **tahmini 1RM** hiçbir uçta yok.
- İstatistik uçları `StatsController` / `StatsService` altında; ortak aralık tipi `StatsRangeQuery`
  (`From`/`To`, TR günü, iki uç dahil, opsiyonel). Saf hesaplayıcılar `Common/Records/RecordTracker`
  ve `StreakCalculator` desenindedir.
- Görsel tasarım spec'i `accent`'i yalnızca birincil düğme, rekor rozeti/noktası, aktif sekme, marka ve
  odak halkasına ayırıyor.

---

## Karar 1 — Backend: tahmini 1RM hesaplayıcısı

- `Common/Records/OneRepMaxEstimator` — saf, statik: `decimal? Estimate(decimal weight, int reps)`.
- Formül **Brzycki**: `weight × 36 / (37 − reps)`, 2 ondalığa `MidpointRounding.AwayFromZero`.
- `reps == 1` → `weight` (formül zaten bunu verir; ayrı dal gerekmez ama test sabitler).
- **Tahmin edilemez → `null`:** `weight <= 0` (barfiks/dips gibi 0 kg setler; 1RM anlamsız),
  `reps < 1`, `reps > 12` (tekrar tavanı sabiti `MaxRepsForEstimate = 12`; yüksek tekrarda formül
  güvenilmez).
- **Saklanmaz:** sorgu anında hesaplanır; formül değişirse migration gerekmez (Obsidian notu
  "Tahmini 1RM"). `RecordType`'a üçüncü değer eklenmez (rekor rozetleri değişmez).
- Birim testleri: bilinen değerler (100×5 → 112.5, 110×3 → 116.47), 1 tekrar, 12 tekrar sınırı, 13 →
  null, 0 kg → null, 0 tekrar → null, yuvarlama.

Değerlendirilen seçenek: Epley (`w × (1 + r/30)`). Düşük tekrarda (<10) Brzycki daha isabetli ve
tavanla birlikte kullanılacağı için Brzycki seçildi.

## Karar 2 — Backend: hareket ilerleme ucu

- `GET /api/stats/exercises/{exerciseId}/progress?From=&To=` (`StatsController`, ince). İş mantığı ayrı
  bir `IExerciseProgressService`'te (SRP; `StatsService`'in kurucusu Export ve AiInsight testlerinde de
  kullanıldığı için ona dokunulmaz).
  Parametre tipi mevcut `StatsRangeQuery` (TR günü; `from > to` → 400; ikisi de opsiyonel = tüm geçmiş).
- **Sahiplik (CLAUDE.md IDOR kuralı):** egzersiz `IExerciseRepository.GetVisibleByIdAsync` ile
  (kendi ya da global) çözülür; görünmüyorsa **nötr** `NotFoundException` (404). Arşivlenmiş egzersiz
  okunabilir (geçmiş kayıtlar bozulmasın deseni).
- **Yanıt** `ExerciseProgressResponse(long ExerciseId, string ExerciseName, IReadOnlyList<ExerciseProgressPointResponse> Points)`;
  nokta `ExerciseProgressPointResponse(long SessionId, DateTime StartedAt, DateOnly Date, decimal TopWeight, int TopWeightReps, decimal Volume, int SetCount, decimal? EstimatedOneRepMax)`.
  - Yalnızca o kullanıcının, o egzersize **en az bir seti olan** oturumları; açık bugünkü oturum dahil.
  - Sıra **eskiden yeniye** (`StartedAt`, eşitlikte `SessionId` artan — toplam sıra).
  - `Date` = oturum başlangıcının TR günü (`TurkeyDay.LocalDateOf`); aralık filtresi oturumun
    `StartedAt`'i üzerinden (Faz 9 Karar 7 ile aynı kural, setin `CreatedAt`'i değil).
  - `TopWeight` = o oturumdaki en ağır set; eşitlikte en çok tekrarlı olan (`TopWeightReps`).
  - `Volume` = Σ ağırlık × tekrar, `SetCount` = set sayısı — `GET /api/history?ExerciseId=` ile aynı
    tanım.
  - `EstimatedOneRepMax` = o oturumun setlerinin `OneRepMaxEstimator.Estimate` değerlerinin en büyüğü;
    hiçbiri tahmin edilemiyorsa `null`.
- Veri erişimi: kullanıcı + egzersiz + oturum başlangıç aralığıyla filtrelenmiş setler **tek sorguda**,
  izlemesiz (`AsNoTracking`), oturum başlangıcıyla birlikte; gruplama ve hesap serviste bellekte
  (kullanıcı başına tek egzersizin setleri — küçük). Mevcut `FilterBySessionRange` yardımcısı yeniden
  kullanılır (DRY).
- Testler: servis (gruplama, en ağır set eşitliği, 1RM null ve maksimum, aralık filtresinin oturum
  başlangıcına göre çalışması, gece yarısını aşan oturumun TR günü, IDOR 404, başkasının setleri
  dahil edilmez, sıralama), uçtan uca (401, 200 şekli, ters aralık 400, başkasının özel egzersizi 404).

## Karar 3 — Görsel kural genişlemesi: grafik turuncu

Görsel tasarım spec'i Karar 2'nin `accent` listesine **kullanıcı kararıyla** eklenir:
- hareket çizgi grafiğinin **çizgisi**, **noktaları**, **alan dolgusu** (accent'ten saydama dikey
  degrade) ve **değer etiketleri** (accent dolgu + `on-accent` metin; kontrast kuralı gereği opaklık
  uygulanmaz);
- grafik sekmelerinde **aktif sekmenin alt çizgisi** (mevcut "aktif sekme" kuralının uzantısı).

Izgara çizgileri, eksen metinleri, "Şu anki"/"Fark" etiketleri ve aralık seçici **nötr** kalır
(`surface-*`, `muted`, `fg`). Görsel tasarım spec'inin renk kuralları bu genişlemeyle güncellenir.

## Karar 4 — Çizgi grafik bileşeni (veri bilmeyen)

- `ui/CizgiGrafik` — `HacimGrafigi`'nin yerini alır (o dosya ve testi silinir; tek tüketicisi
  `HareketGecmisi` idi). Girdi: `noktalar: { etiket: string; deger: number }[]` (eskiden yeniye),
  `birim: string` ("kg"), `baslik: string` (erişilebilir ad). Hareket, oturum, API bilmez.
- **Ölçü:** kapsayıcının gerçek genişliği `ResizeObserver` ile ölçülür ve koordinatlar piksel olarak
  hesaplanır (dilim 2'deki `preserveAspectRatio="none"` noktaları/köşeleri esnetiyordu). Yükseklik sabit
  (ör. 220 px). `ResizeObserver` yoksa (jsdom) makul bir varsayılan genişlik (ör. 320).
- **Çizim:** SVG; `text-accent` ile `currentColor`: çizgi `stroke`, nokta halkası, degrade `stop-color`.
  Y ekseni: sağda 4–5 yuvarlak değer ve yatay ızgara (`surface-3`); ölçek min–max'a pay bırakır.
  X ekseni: ilk, orta ve son noktanın tarih etiketi (`formatKisaTarih` biçimi, çağıran verir). Değer
  etiketi: **ilk** ve **son** nokta (referans görsel). Tek nokta: tek nokta + etiket, çizgi yok.
  Boş girdi: `null`.
- **Erişilebilirlik:** SVG `role="img"` + `aria-label={baslik}`; aynı veri görsel olarak gizli listeyle
  (etiket + değer + birim). Süs öğeleri `aria-hidden`.
- Değerler `formatWeight` ile (TR ondalık), `tabular-nums`.

## Karar 5 — Hareket grafiği bölümü (`HareketGecmisi`)

- Veri `useExerciseProgress(exerciseId, aralik)` → Karar 2 ucu. `useExerciseHistory` ve
  `queryKeys.exerciseHistory` kaldırılır (tek tüketicisi buydu). Sorgu anahtarı
  `['exerciseProgress', exerciseId, aralik]`; `useAddSet` o egzersizin **tüm aralıklarını** önekle
  tazeler.
- **Sekmeler** (`role="tablist"`, her biri `role="tab"` + `aria-selected`): **Ağırlık** (`TopWeight`,
  varsayılan), **Antrenman** (`Volume`), **Tahmini 1RM** (`EstimatedOneRepMax`; `null` noktalar bu
  sekmede çizilmez).
- **Aralık** (segment kontrol, `aria-pressed`): **1 Ay** (varsayılan), **3 Ay**, **Tüm**. `From` = TR
  bugününden 30 / 90 gün önce, `To` verilmez; "Tüm"de ikisi de verilmez. Tarih hesabı sunum işidir
  (`lib/format` yanında TR bugünü yardımcısı).
- **Özet:** "Şu anki" = seçili sekmede son noktanın değeri; "Fark" = son − ilk nokta (işaretli,
  "+2,5" / "−32,5"; tek noktada gösterilmez). Bunlar sunucu değerlerinin sunumudur (yeniden hesap değil:
  hacim, 1RM ve en ağır set sunucudan gelir; istemci yalnızca iki değeri çıkarır). Altında aralığın
  tarih metni ("25 Ağu – 10 Eyl 2026").
- **Boş durumlar:** aralıkta hiç nokta yok → "Bu aralıkta kayıt yok" (Tüm'de: "Bu hareketin ilk
  antrenmanı"); 1RM sekmesinde tüm noktalar `null` → "Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set
  gerekir". Yükleniyor düz metin, hata `role="alert"`.
- "Geçen sefer" satırı kalkar (yerini "Şu anki / Fark" alır).
- **Yerleşim değişmez:** şablonlu oturumda seçili kartın altında; şablonsuz oturumda set listesinin
  üstünde.

## Karar 6 — Açılır set paneli

- Bugün ekranının altındaki alan iki durumludur ve **varsayılan kapalıdır**:
  - **Kapalı:** sekme çubuğunun hemen üstünde ince bir çubuk — solda (varsa) dinlenme sayacının kompakt
    görünümü, sağda birincil **"+ Set ekle"** düğmesi (accent, mevcut birincil düğme kuralı).
  - **Açık:** bugünkü panel (egzersiz seçimi, ağırlık/tekrar/RIR, "Set ekle") + sağ üstte
    **"Paneli kapat"** ikon düğmesi (`aria-label`, `aria-expanded` açma düğmesinde).
- **Açma:** "+ Set ekle" düğmesi; **şablonlu oturumda bir hareket kartına dokunmak** o hareketi seçer
  **ve** paneli açar (kullanıcı kararı). Şablonsuz oturumda ve boş durumda açma yolu "+ Set ekle"dir.
- **Kapatma:** "Paneli kapat". Set eklendikten sonra panel **açık kalır** (üst üste set en sık akış,
  dilim 1 Karar 6). Başarılı şablon başlatma paneli açmaz.
- **Durum korunur:** panel kapanınca form DOM'dan kaldırılmaz, `hidden` ile gizlenir — yazılmış ağırlık,
  tekrar, RIR ve son eklenen durum satırı kaybolmaz.
- **Odak (final inceleme I2 ile güncellendi):** yalnızca **"+ Set ekle" düğmesiyle** açılınca ağırlık
  alanına taşınır — bir hareket kartına dokunarak açılışta odak TAŞINMAZ (aksi halde telefon
  klavyesi açılıp kartın az önce ortaya çıkardığı grafiği örter); "Paneli kapat" ile kapanınca odak
  "+ Set ekle" düğmesine döner. İlk render'da odak çalınmaz.
- **Dinlenme sayacı panel kapalıyken de görünür:** alt alanın tamamı (sayaç satırı + kapalı çubuk ya da
  açık panel) `AddSetForm`'dadır ve bileşen hiç unmount olmaz; sayaç durumu formda kalır (taşımaya gerek
  yok — KISS). Sayaç satırı alt alanın en üstünde, panel **açık da kapalı da** görünür; süre kuralı
  dilim 2 Karar 6 aynen; canlı bölge tek kalır.
- **Arayüz:** `AddSetForm`'a `acik: boolean` ve `onAcikDegis(acik: boolean)` eklenir; açık/kapalı durumu
  `TodayPage`'dedir (kart dokunuşu da açtığı için).
- **Boşluk:** liste alt boşluğu duruma göre (kapalıyken kısa, açıkken bugünkü `pb-72`).
- Dilim 2'deki diğer panel davranışları (doğrulama, hata, durum satırı, ağ hatası mesajı) değişmez.

## Karar 7 — Sorgular

- `queryKeys.exerciseProgress(exerciseId, aralik)` = `['exerciseProgress', exerciseId, aralik]`;
  önek `['exerciseProgress', exerciseId]` ile tazelenir.
- Yanıt `dogrulanmisIlerlemeNoktasi` / `dogrulanmisHareketIlerlemesi` ile daraltılır (`!` yok;
  `estimatedOneRepMax` null olabilir, `0` geçerli değerlerde `=== undefined` kontrolü).
- Tipler `npm run api:types` ile üretilir.

---

## Test ve doğrulama

- **Backend:** Karar 1 birim testleri; Karar 2 servis ve uçtan uca testleri; mevcut testler yeşil.
- **Frontend (davranış, MSW):**
  - `CizgiGrafik` saf girdiyle: erişilebilir ad ve gizli liste sırası, ilk/son değer etiketleri, tek
    nokta, boş girdi `null`;
  - `HareketGecmisi`: istek `From` parametresi 1 Ay/3 Ay için dolu, Tüm'de yok; sekme değişince
    "Şu anki"/"Fark" ve gizli liste seçili metriğe geçer; 1RM `null` noktalar çizilmez, hepsi null ise
    açıklama metni; aralıkta nokta yoksa boş metin; hata `role="alert"`; set eklenince tazelenir;
  - `TodayPage`: panel başlangıçta kapalı (ağırlık alanı görünmez) ve "+ Set ekle" açar; hareket kartına
    dokunmak seçer ve açar; "Paneli kapat" kapatır, yazılı değer korunur, odak "+ Set ekle"ye döner;
    set eklenince panel açık kalır; sayaç panel kapalıyken görünür; mevcut panel testleri paneli açarak
    aynı davranışı sınar (zayıflatılmaz).
- **Görsel doğrulama:** 390×844 ekran görüntüleri — kapalı panel (sayaçlı ve sayaçsız), açık panel,
  şablonlu Bugün'de grafik üç sekmesi ve aralıklar.

## Kapsam dışı

Rekorlar ekranında grafik; 1RM'nin rekor rozetine dönüşmesi; grafikte dokunarak nokta değeri görme
(tooltip); set listesinin grafik altında tarihe göre gruplanması; takvim/seri; egzersiz arama; rate
limiting; oturum listesi sayfalama.

## Riskler

- **`ResizeObserver` ve jsdom:** testlerde varsayılan genişlik kullanılır; piksel doğruluğu yalnızca
  görsel doğrulamada görülür.
- **Panel kapalıyken klavye/ekran okuyucu:** `hidden` içerik erişilebilirlik ağacından çıkar; açma
  düğmesinin `aria-expanded`'ı durumu bildirir.
- **Hacim tanımının iki uçta aynı kalması:** `history?ExerciseId=` ile ilerleme ucu aynı tanımı
  (Σ ağırlık × tekrar, oturum başlangıcına göre aralık) kullanır; ilerleme ucunun servis ve uçtan uca
  testleri hacmi bu tanıma göre sabitler.
