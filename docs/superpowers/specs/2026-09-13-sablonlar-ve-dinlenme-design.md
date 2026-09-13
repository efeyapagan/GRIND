# Frontend Dilim 2 — Şablonlar ve dinlenme sayacı

**Tarih:** 2026-09-13
**Kapsam:** Antrenman şablonlarının (ör. "Push Day") arayüzü, antrenmanı şablonla başlatma ve hareket
kartlarıyla ilerleme, setler arası dinlenme sayacı (süre harekete göre şablonda), Geçmiş'te antrenman
türü rozeti. Takvim ve seri ayrı bir dilimdir.
**Durum:** 📋 Spec. Kullanıcı kararları:
- Şablon bir "taslak"tır: bir kez kurulur, dokununca hareketler hazır gelir.
- Bir harekete dokununca mevcut "Set ekle" paneli o hareket seçili gelir; panel aynen kalır.
- Dinlenme süresi **harekete göre**, şablonda saklanır (backend değişikliği kabul edildi).
- Görünüm Stitch turu olmadan **mevcut tasarım diliyle** tasarlanır.

**Bağlayıcılık:** Bu doküman bağlayıcıdır. Görsel kurallar için
`2026-09-12-frontend-gorsel-tasarim-design.md` (tokenlar, `accent` kuralı, erişilebilirlik) ve mimari
kurallar için `2026-09-12-frontend-react-pwa-design.md` geçerliliğini korur.

---

## Mevcut durum (koddan okundu)

- Backend şablonları Faz 6'dan beri destekliyor: `GET/POST /api/templates`, `GET/PUT/PATCH/DELETE
  /api/templates/{id}`. `PUT` adı ve hareket listesini birlikte değiştirir; `PATCH` yalnızca adı.
- Hareketlerin sırası istek dizisindeki konumdan türetilir (`OrderIndex` istemciden gelmez); her
  kayıtta satırlar yeniden kurulur.
- Servis kuralları: aynı hareket bir şablonda iki kez olamaz (400); görünmeyen ya da başkasının
  egzersizi 404; arşivlenmiş bir egzersiz şablona YENİ eklenemez, var olanda kalabilir (400); şablon
  adı 2–100 karakter, kullanıcı içinde benzersiz (aynı ad 409); hedef set 1–50.
- `POST /api/sessions { templateId }`: bugün açık oturum yoksa 201 ile şablonlu oturum açar; **açık
  oturum varsa 200 döner ve `templateId` UYGULANMAZ**.
- `GET /api/sessions/open` ve `GET /api/sessions/{id}` şablonlu oturumda `progress` taşır: şablon
  sırasıyla her hareket için `plannedSets` ve o oturumdaki gerçek `completedSets`.
- `GET /api/history` her oturumda `templateName` taşır.
- Hiçbir DTO'da ya da tabloda dinlenme süresi yok.

---

## Karar 1 — Backend: `TemplateExercise.RestSeconds`

- Entity'ye `int RestSeconds` eklenir; kolon NOT NULL, veritabanı varsayılanı **90**. Mevcut şablon
  satırları migration'da 90 alır.
- CHECK kısıtı (projedeki kalıpla): `CK_TemplateExercise_RestSeconds_Range` →
  `"RestSeconds" >= 0 AND "RestSeconds" <= 900`. **0 = bu harekette dinlenme sayacı yok.**
- `TemplateExerciseRequest.RestSeconds` → `int?`, `[Range(0, 900)]`. **Gönderilmezse (null) 90**
  kullanılır. Böylece bugünkü istemci ve testler (alanı göndermeyenler) bozulmaz; C#'ın varsayılan
  `0`'ı "sayaç yok" diye sessizce yazılmaz.
- Varsayılan değer tek bir sabitte durur (`TemplateExercise` yanında), servis ve migration aynı değeri
  kullanır.
- `TemplateExerciseResponse` ve `SessionProgressResponse` `RestSeconds` taşır. İlerleme yanıtına
  eklenmesinin sebebi: Bugün ekranı süreyi şablonu ayrıca istemeden, oturumla birlikte alır (tek
  doğruluk kaynağı, tek istek).
- Migration `dotnet ef migrations add` ile üretilir (elle yazılmaz). `PATCH` değişmez.
- Frontend tipleri `npm run api:types` ile yeniden üretilir.
- Testler: CHECK kısıtının SQL'i; kolon eşleme ve varsayılan; şablon uçlarında `restSeconds` gidiş
  dönüşü, gönderilmeyince 90, aralık dışı (-1, 901) 400; oturum `progress`'inde `restSeconds`.

Değerlendirilen seçenek: süreyi yalnızca istemcide, tek bir ayar olarak tutmak (backend değişmezdi).
Kullanıcı harekete göre süreyi seçti; hareketten harekete değişen dinlenme (ör. Bench 3 dk, Pushdown
60 sn) salonda asıl ihtiyaçtır.

## Karar 2 — Şablonların yeri: yeni sekme yok

- Alt sekme çubuğu üç sekmede kalır. Şablonlar iki yerden açılır:
  - **Bugün, boş durumda:** "Şablonla başla" bölümünde şablon kartları (ad + "4 hareket"). Karta
    dokununca antrenman o şablonla başlar. Altında "Şablonları yönet" bağlantısı.
  - **Hesap menüsü:** "Çıkış yap"ın üstünde "Şablonlar" öğesi.
- Rotalar korumalı kabuğun içinde: `/templates` (liste), `/templates/new`, `/templates/:id` (düzenle).
- Hiç şablon yoksa Bugün'deki bölüm "Henüz şablon yok" ve "Şablon oluştur" bağlantısını gösterir.

Değerlendirilen seçenek: dördüncü sekme "Şablonlar". Şablonlar günde bir kez seçilir, sürekli gezinilen
bir yer değildir; sekme çubuğunu kalabalıklaştırmaya değmez.

## Karar 3 — Şablon listesi ve düzenleyici

**Liste (`/templates`):** başlık "Şablonlar"; her şablon bir kart (`surface-2`): ad (`heading`),
"4 hareket" (`label`, `muted`). Karta dokununca düzenleyici açılır. Altta birincil "Yeni şablon"
düğmesi. Boş durum: `BosDurum` ("Henüz şablon yok").

**Düzenleyici (`/templates/new`, `/templates/:id`):**
- "Şablon adı" alanı (mevcut `Alan` bileşeni).
- Hareket satırları, her biri bir kart:
  - egzersiz seçimi (`GET /api/exercises`); aynı şablonda zaten seçilmiş egzersizler diğer
    satırların listesinde pasiftir;
  - "Hedef set" (1–50, `inputMode="numeric"`);
  - "Dinlenme" seçimi: Yok (0), 30 sn, 60 sn, 90 sn, 2 dk, 3 dk, 4 dk, 5 dk. Şablondan gelen değer
    listede yoksa o değer ayrıca seçenek olarak gösterilir (veri kaybolmaz);
  - "Yukarı" / "Aşağı" / "Kaldır" düğmeleri (sürükle-bırak YOK: erişilebilir ve basit).
- "Hareket ekle" (ikincil düğme) yeni satır açar; yeni satırın dinlenmesi 90 sn.
- Arşivlenmiş egzersiz içeren satırda nötr "Artık kullanılmıyor" hapı (yanıttaki `isArchived`).
- "Kaydet" (birincil) → yeni ise `POST`, varsa `PUT`; başarıda `/templates`'e döner.
- Silme yalnızca düzenleyicide: "Şablonu sil" → aynı yerde "Silmek istediğine emin misin? Evet, sil /
  Vazgeç" onayı (tarayıcının `confirm`'ü kullanılmaz). Silinen şablonla başlamış geçmiş antrenmanlar
  silinmez (backend `TemplateId`'yi boşaltır).
- Hatalar mevcut desenle: alan hataları alanın altında, genel hata `HataKutusu`'nda; 409 sunucunun
  mesajıyla ("'Push Day' adında bir şablonunuz zaten var.").
- İstemci doğrulaması sunucu kurallarını yansıtır ama belirleyici sunucudur: ad 2–100 karakter,
  en az bir hareket olmadan da kaydedilebilir (sunucu boş listeyi kabul ediyor), hedef set 1–50.

## Karar 4 — Antrenmanı şablonla başlatmak

- Yalnızca bugün açık oturum yokken (Bugün'ün boş durumu) sunulur.
- Karta dokununca `POST /api/sessions { templateId }`; 201'de açık oturum sorgusu tazelenir.
- 200 dönerse (arada başka bir yerden oturum açılmış): "Bugün zaten açık bir antrenmanın var; şablon
  uygulanmadı." bilgisi gösterilir, açık oturum tazelenir.
- Serbest antrenman aynen kalır: boş durumda ilk seti panelden eklemek şablonsuz oturum açar.
- Açık bir oturuma sonradan şablon bağlamak bu dilimde YOK (backend ucu yok; YAGNI).

## Karar 5 — Şablonlu antrenmanda Bugün ekranı

- Başlıkta mevcut "Devam ediyor" hapı ve başlangıç saatinin yanında şablon adı **nötr hap** olarak
  (`surface-3`, `fg`, büyük harf CSS ile). **`accent` KULLANILMAZ:** görsel tasarım spec'i Karar 2'ye
  göre accent rekorlara, birincil eyleme, aktif sekmeye ve markaya ayrılmıştır.
- Liste, `progress` sırasıyla **hareket kartlarıdır**. Her kart:
  - bir `<button>`'dır, erişilebilir adı "Bench Press, 2 / 4 set";
  - başlıkta sıra numarası, ad ve "2 / 4 SET" (`completedSets` / `plannedSets` — sunucudan, istemci
    HESAPLAMAZ); tamamlanınca (`completedSets >= plannedSets`) numara karosu yerine onay ikonu;
  - seçili kart görünür biçimde işaretlenir (kenar/zemin, `accent` değil) ve `aria-pressed="true"`;
  - kartın altında o hareketin bu oturumdaki setleri, mevcut set satırı biçimiyle.
- Şablonda olmayan harekete girilmiş setler en altta "Plan dışı" başlıklı grupta, mevcut görünümle.
- **Seçim:** bir karta dokunmak paneldeki egzersizi o hareket yapar. Oturum yüklendiğinde varsayılan
  seçim, `completedSets < plannedSets` olan ilk harekettir (hepsi tamamsa ilk hareket). Varsayılan
  YALNIZCA henüz seçim yokken uygulanır: set eklenip bir hareket tamamlandığında seçim kendiliğinden
  sonraki harekete ATLAMAZ (kullanıcı fazladan set yapıyor olabilir). Kullanıcı paneldeki listeden
  başka bir hareket seçerse o seçim korunur.
- Set ekleme paneli, doğrulama, hata, durum satırı ve odak davranışı DEĞİŞMEZ.
- Şablonsuz oturumda Bugün ekranı bugünkü gibidir (hareket kartları yok, gruplu set listesi).

## Karar 6 — Dinlenme sayacı

- **Başlama:** her başarılı "Set ekle"den sonra otomatik başlar. Süre:
  - eklenen setin hareketi şablonda ise o hareketin `restSeconds`'ı; `0` ise sayaç başlamaz;
  - plan dışı hareket ya da şablonsuz antrenmanda **90 sn** (backend varsayılanıyla aynı sabit).
- **Görünüm:** set ekleme panelinin en üstünde bir satır: "Dinlenme" + kalan süre `m:ss`
  (`metric`, `tabular-nums`), ince bir ilerleme çubuğu, "+15 sn" ve "Atla" düğmeleri (≥ 44 px).
  Sayaç yokken satır görünmez.
- **Zaman:** bitiş anı (`Date.now() + süre`) tutulur, kalan süre ondan hesaplanır; sekme arka plana
  gidip dönünce süre doğru görünür. Saniyede bir yenilenir.
- **Bitiş:** satır "Dinlenme bitti" der ve birkaç saniye sonra kaybolur; `navigator.vibrate` varsa kısa
  titreşim, kısa bir bip (Web Audio; ses yalnızca kullanıcı etkileşiminden sonra çalınabilir),
  `role="status"` ile "Dinlenme bitti" duyurusu. Geri sayım saniyeleri ekran okuyucuya duyurulmaz.
- **Yeniden başlama:** yeni bir set eklenince sayaç yeni süreyle baştan başlar. Hareket seçimini
  değiştirmek sayacı durdurmaz.
- **Ekran:** sayaç çalışırken Screen Wake Lock istenir (destek yoksa sessizce atlanır), bitince ya da
  "Atla"da bırakılır; sayfa görünür olunca yeniden istenir.
- **Kalıcılık yok:** sayfa yenilenirse sayaç kaybolur (YAGNI). Uygulama arka plandayken bildirim
  (Notifications API) bu dilimin kapsamı dışında: izin akışı ve iOS kısıtları ayrı bir iş.
- Sayaç mantığı bileşenden ayrı, saf ve test edilebilir bir modülde durur (bitiş anı, kalan süre, +15,
  atla); bileşen yalnızca görüntüler.

## Karar 7 — Geçmiş'te antrenman türü

- Kart özetinde tarihin yanında nötr hap: `templateName` varsa şablon adı ("PUSH DAY"), yoksa
  "Serbest". `accent` kullanılmaz.

## Karar 8 — Sorgular ve durum

- Yeni sorgu anahtarları mevcut `queryKeys` nesnesine eklenir: `templates`, `template(id)`.
- Hook'lar: `useTemplates`, `useTemplate(id)`, `useCreateTemplate`, `useUpdateTemplate`,
  `useDeleteTemplate`, `useStartSession`.
- Tazelemeler: şablon oluşturma/güncelleme/silme → `templates` ve ilgili `template(id)`; güncelleme ve
  silme ayrıca açık oturumu tazeler (ilerleme şablondan canlı okunur). `useStartSession` → açık oturum.
- Açık oturum tipi `templateId`, `templateName` ve `progress` (`exerciseId`, `exerciseName`,
  `plannedSets`, `completedSets`, `restSeconds`) taşır; yanıt tek bir doğrulama noktasında daraltılır
  (mevcut desen, `!` yok).
- Sunucu değerleri istemcide yeniden hesaplanmaz: ilerleme sayıları, tamamlanma, sıra sunucudan gelir.
  Şablon kartındaki "4 hareket" yanıttaki listenin uzunluğudur (sunum).
- Karar 9 için `useExerciseHistory(exerciseId)` ve anahtar `exerciseHistory(exerciseId)`; set ekleme
  ve silme bu anahtarı (o egzersiz için) tazeler.

## Karar 9 — Hareket geçmişi grafiği (ortak bileşen)

Kullanıcı isteği: seçili hareketin önceki antrenmanlardaki hacmi grafikle görünsün, hareketi her
yaptığında grafiğe yeni bir çubuk eklensin. Grafik **her hareket için ayrı yazılmaz**: tek bir ortak
bileşen olur, bugün Bugün ekranında, ileride Rekorlar ve istatistik ekranlarında aynen kullanılır.

- **Veri — backend değişikliği YOK:** `GET /api/history?ExerciseId={id}&PageSize=10`. Bu uç egzersiz
  filtresi verildiğinde her oturumun `totalVolume` ve `setCount`'unu YALNIZCA o egzersizin setlerinden
  hesaplar (Faz 9 spec Karar 8). Böylece hacim sunucudan gelir, istemci yeniden hesaplamaz. Açık
  bugünkü oturum da listededir: set eklenince sorgu tazelenir ve bugünün çubuğu büyür.
- **Ayrım (SOLID):**
  - `HacimGrafigi` (`web/src/ui/`): yalnızca çizer, veriyi bilmez. Girdi
    `noktalar: { etiket: string; deger: number; vurgulu?: boolean }[]` ve erişilebilir `baslik`.
    Hareket, oturum ya da API bilmez; bu yüzden her ekranda kullanılır.
  - `HareketGecmisi` (`web/src/components/`): `exerciseId` alır, `useExerciseHistory` ile veriyi
    çeker, oturumları eskiden yeniye çevirip `HacimGrafigi`'ne verir, bugünkü oturumu `vurgulu`
    işaretler; yüklenme, hata ve boş durumu gösterir.
- **Çizim:** kütüphane YOK (UI kütüphanesi yasağı ve paket boyutu); elle SVG çubuk grafik. Çubuklar
  `surface-4`, bugünkü çubuk `fg` ve altında "Bugün" etiketi. `accent` ve `accent-soft`
  KULLANILMAZ (accent kuralı; accent-soft yalnızca metin/ikon rengidir). Eksen etiketi tarih
  ("12 Eyl"), en yüksek değer çubuğun üstünde "2.400 kg". Yükseklik sabit (ör. 96 px), genişlik
  kaba yayılır. Değerler `tabular-nums`.
- **Erişilebilirlik:** SVG `role="img"` ve özet `aria-label` ("Bench Press hacmi, son 6 antrenman");
  aynı veri görsel olarak gizli bir listeyle ekran okuyucuya verilir (tarih + hacim).
- **Yerleşim:** Bugün ekranında seçili hareketin kartı açıkken, kartın setlerinin altında
  "Geçmiş" başlığıyla. Grafiğin altında tek satır "Geçen sefer: 3 set · 2.400 kg": bugünden önceki
  en yeni oturumun sunucudan gelen `setCount` ve `totalVolume`'u ("en ağır set" gibi istemcide
  türetilen değer gösterilmez). Şablonsuz antrenmanda panelde seçili hareket için aynı bölüm set listesinin
  üstünde gösterilir.
- **Boş durum:** hiç geçmiş yoksa grafik yerine "Bu hareketin ilk antrenmanı" metni. Tek oturum varsa
  tek çubuk çizilir.
- **Kapsam:** yalnızca hacim. Hareket başına en ağır set/1RM grafiği istemci hesabı gerektirir, bu
  dilimde yok (gerekirse ileride sunucu ucu olarak).

---

## Test ve doğrulama

- **Backend:** Karar 1'deki testler; mevcut şablon ve oturum testleri yeşil kalır.
- **Frontend (davranış testleri, MSW):**
  - şablon oluşturma isteği hareketleri sırayla, `plannedSets` ve `restSeconds` ile gönderir;
    yukarı/aşağı sırayı değiştirir; aynı egzersiz ikinci satırda seçilemez; 409 mesajı gösterilir;
    silme iki adımlı onay ister;
  - Bugün boş durumda şablon kartına dokunmak `POST /api/sessions { templateId }` gönderir; 200
    yanıtında "şablon uygulanmadı" bilgisi görünür;
  - şablonlu oturumda kartlar sunucunun `progress` sırasıyla ve "2 / 4 set" değerleriyle görünür; bir
    karta dokunmak paneldeki egzersizi değiştirir; varsayılan seçim tamamlanmamış ilk harekettir;
  - set eklenince sayaç hareketin `restSeconds`'ıyla başlar (sahte zamanlayıcılar), `0`'da başlamaz,
    plan dışında 90 sn; "+15 sn" ve "Atla" çalışır; bitişte "Dinlenme bitti" duyurulur;
  - Geçmiş kartında şablon adı ya da "Serbest" görünür;
  - `HareketGecmisi` `ExerciseId` ve `PageSize=10` ile ister, çubukları eskiden yeniye ve sunucunun
    `totalVolume` değerleriyle çizer, bugünü vurgular, boş geçmişte "Bu hareketin ilk antrenmanı" der;
    set eklenince tazelenir; `HacimGrafigi` saf girdiyle (API'siz) test edilir;
  - sayaç modülünün saf fonksiyonları için birim testleri.
- **Görsel doğrulama:** Playwright ekran görüntüleri (390×844): şablon listesi, düzenleyici, boş
  Bugün'de şablon bölümü, şablonlu Bugün (seçili kart + hareket geçmişi grafiği + çalışan sayaç), Geçmiş rozeti.

## Kapsam dışı

Takvim ve seri; açık oturuma sonradan şablon bağlama; sayaç bildirimi (arka plan); sayaç
kalıcılığı; hareketlerde "geçen sefer 80 kg × 8" ön doldurma; sürükle-bırak sıralama; şablon
kopyalama; egzersiz oluşturma/arşivleme arayüzü.

## Riskler

- **Wake Lock ve titreşim** tarayıcıya göre değişir (iOS Safari titreşimi desteklemez); ikisi de
  isteğe bağlı iyileştirmedir, yokluğunda sayaç çalışmaya devam eder.
- **Ses** ancak kullanıcı etkileşiminden sonra çalınabilir; "Set ekle" dokunuşu bu etkileşimi sağlar.
- **Migration** mevcut şablon satırlarına 90 yazar; bu bilinçli bir varsayılandır.
- **PR #39** (görsel tasarım) henüz merge edilmedi; bu dilim `feature/frontend-tasarim`'ın üzerine
  kurulur.
