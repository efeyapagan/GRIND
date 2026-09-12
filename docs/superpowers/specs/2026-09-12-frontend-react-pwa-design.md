# Frontend Tasarımı — React PWA (mimari plan)

**Tarih:** 2026-09-12
**Kapsam:** PLAN.md'nin 8. adımı (frontend teknolojisi kararı) ve ilk dilimin mimari planı.
**Durum:** 📋 Plan. Kullanıcı kararları: **React**, **kurulabilir PWA**, ilk dilim **antrenman
çekirdeği**. Kullanıcı ayrıca "tasarıma girme, şimdilik sadece plan" dedi — bu doküman GÖRSEL tasarım
(renk paleti, tipografi, yerleşim) İÇERMEZ; o ayrı bir adımdır.

## Bu Doküman Ne Değildir

Görsel tasarım değildir. Telefonda kullanılabilirlik burada yalnızca **gereksinim** olarak geçer
(dokunma hedefi, tek elle erişim, klavye tipi, çevrimdışı davranış); nasıl görüneceği sonra
kararlaştırılacak.

Backend'in kendisi de burada yeniden tanımlanmaz. Uç listesi ve DTO'lar `src/Grind.Api` içindedir;
aşağıda yalnızca frontend'i doğrudan etkileyen **davranışlar** kayda geçirilir.

---

## Karar 1 — Yığın: Vite + React + TypeScript, PWA olarak paketlenir

- **Vite**: dev sunucusu anında açılır, üretim derlemesi Rollup. CRA ölü, Next.js ise bize SSR ve bir
  Node sunucusu getirir — API zaten ayrı bir servis, sunucu tarafı render etmemiz gereken bir şey yok
  ve statik bir dosya kümesi dağıtmak (herhangi bir CDN/nginx) en ucuz seçenek.
- **TypeScript zorunlu.** API'nin 13 fazlık DTO yüzeyi var; tip güvenliği olmadan alan adı hatası
  ancak çalışma anında görünür.
- **PWA**: `vite-plugin-pwa` (Workbox). Manifest + service worker ile ana ekrana eklenir, tam ekran
  açılır. Salonda zayıf sinyal gerçek bir sorun olduğu için uygulama kabuğu (HTML/JS/CSS) önbellekten
  açılmalı.
- **Paket yöneticisi:** npm. Ek bir araç kurmayı gerektirmez, lock dosyası tek.

Reddedilenler: Next.js (gereksiz sunucu katmanı), Create React App (bakımı bıraktı), React Native
(kullanıcı web tarafını seçti; tarayıcıdan erişim kaybolurdu).

## Karar 2 — Konum: repo kökünde `web/`

Aynı repoda, `web/` klasöründe. Backend `src/Grind.Api`'de kalır.

- Tek repo: API sözleşmesi değiştiğinde backend ve frontend AYNI commit'te değişebilir, ikisi
  birbirinden ayrı sürüklenmez.
- `web/` kökte durur, `src/` altına girmez: `Grind.slnx` ve `dotnet` komutları .NET dünyasında kalır,
  JS araçları kendi köklerinde çalışır.
- CI: mevcut `.github/workflows/ci.yml` yalnızca .NET adımlarını çalıştırıyor ve `web/` eklendiğinde
  de çalışmaya devam eder. Frontend için AYRI bir workflow eklenir (kurulum + tip kontrolü + test +
  build), böylece bir tarafın hatası diğerini bloklamaz.

## Karar 3 — API tipleri OpenAPI'den ÜRETİLİR, elle yazılmaz

Backend geliştirme ortamında `/swagger/v1/swagger.json` yayınlıyor. `openapi-typescript` ile tipler
`web/src/api/schema.d.ts` içine üretilir ve **commit edilir**; `npm run api:types` betiği yeniden
üretir.

Gerekçe: elle yazılan tipler ilk DTO değişikliğinde sessizce yalan söylemeye başlar — ve bu projede
DTO'lar 13 faz boyunca sürekli değişti. Üretilen tipte alan adı değişince derleme kırılır, bu da tam
istediğimiz erken uyarı. Commit edilmesinin sebebi: CI ve yeni bir geliştirici için çalışan bir
backend gerekmesin.

Reddedilen: tam bir istemci üreteci (orval, kubb vb.). Sorgu katmanını da üretirler; bize yalnızca
tipler lazım, gerisini kendi ince istemcimiz yapar (KISS).

## Karar 4 — Sunucu durumu TanStack Query, global istemci durumu yok denecek kadar az

- **TanStack Query**: bu uygulamanın "durum"unun neredeyse tamamı sunucudaki veri. Query bize
  önbellek, yeniden deneme, `invalidate` ile tazeleme ve "yükleniyor/hata" durumlarını hazır verir;
  elle yazılırsa hepsi tekrar tekrar yazılır.
- **Redux/Zustand YOK.** Geriye kalan gerçek istemci durumu yalnızca oturum bilgisi (token, kullanıcı
  adı) — o da bir React context'i ile taşınır.
- **Yönlendirme:** React Router.

## Karar 5 — Token `localStorage`'da, 401 tek yerde ele alınır

- Token `localStorage`'da tutulur. Sebep: JWT 7 gün geçerli ve uygulamanın yenileme (refresh) akışı
  YOK; `sessionStorage` sekme kapanınca oturumu düşürürdü, bu da salonda telefonu cebe atıp geri
  dönen kullanıcı için kötü.
- **Bilinen risk:** `localStorage` XSS'e karşı korunmasızdır. Bunu kabul ediyoruz çünkü alternatif
  (httpOnly cookie) backend'de cookie tabanlı kimlik + CSRF koruması gerektirir ve JWT kararını
  (CLAUDE.md) değiştirir. Karşı önlem: üçüncü parti script yok, `dangerouslySetInnerHTML` yok.
- **401 = oturumu düşür.** Tek bir API istemcisi tüm 401'lerde token'ı siler ve girişe yönlendirir.
  Faz 13'ten sonra 401'in yeni bir anlamı daha var: **hesap pasifleştirilmiş olabilir** (kullanıcı
  başka bir cihazdan kapatmıştır). İstemci ikisini ayırt etmeye çalışmaz; ikisinin de doğru cevabı
  aynı: girişe dön.
- Token'ın `expiresAtUtc`'si biliniyor; istemci süresi geçmiş token'la istek atmak yerine doğrudan
  giriş ekranına gider (gereksiz 401 turu yok).

## Karar 6 — Hata gövdesinin İKİ şekli var, ikisi de karşılanır

Backend RFC 7807 döner ama iki farklı şekilde (Faz 5'te bilinçli olarak kabul edilmiş bir durum):

1. `ValidationProblemDetails` — DataAnnotations hatası; alan bazlı `errors` nesnesi taşır.
2. Düz `ProblemDetails` — servisin fırlattığı iş kuralı hatası; yalnızca `detail` taşır.

Tek bir `parseProblem()` yardımcısı ikisini de tek bir iç tipe indirger: `{ status, detail,
fieldErrors }`. Formlar `fieldErrors` varsa alanın altına yazar, yoksa `detail`'i form üstünde
gösterir. Bunu her çağrı yerinde ayrı ayrı yapmak, ikinci şekli unutup kullanıcıya boş bir hata
göstermenin en kısa yolu olurdu.

## Karar 7 — Zaman: ekranda **Türkiye günü**, cihazın saat dilimi değil

API tüm zaman damgalarını UTC döner ve gün bazlı gruplamaları (takvim, seri, "bugünün oturumu")
**Türkiye yerel gününe** göre yapar. Frontend de bu yüzden `Europe/Istanbul` ile biçimlendirir
(`Intl.DateTimeFormat`, sabit `timeZone`), cihazın saat dilimiyle DEĞİL.

Aksi hâlde yurt dışındaki bir telefonda "bugünün oturumu" sunucununkinden farklı bir güne düşer ve
kullanıcı setini neden başka günde gördüğünü anlamaz.

## Karar 8 — İlk dilim: antrenman çekirdeği

Ekranlar:

1. **Giriş / Kayıt.** Kullanıcı adı ASCII 3-50 (`^[a-zA-Z0-9_-]{3,50}$`), şifre en az 8 karakter ve
   en fazla 72 BAYT. Aynı kurallar istemcide de uygulanır ki kullanıcı sunucuya gidip gelmeden görsün
   — ama sunucunun cevabı belirleyicidir.
2. **Bugün.** Açık oturum, içindeki setler (egzersize göre gruplu), hızlı set ekleme, PR rozetleri,
   "Antrenmanı bitir".
3. **Geçmiş.** Sayfalı oturum listesi, bir oturuma girince setleri.
4. **Rekorlar.** Egzersiz başına en ağır set ve en çok tekrar.

Kapsam dışı (sonraki dilimler): şablonlar, istatistik/grafikler, vücut ağırlığı, export, AI yorumları,
egzersiz yönetimi (oluşturma/arşivleme) — ilk dilimde egzersiz listesi yalnızca OKUNUR (set eklerken
seçim için).

## Karar 9 — Telefonda kullanılabilirlik gereksinimleri (görsel tasarım değil)

- Dokunma hedefleri en az 44×44 px; birincil eylemler (set ekle) başparmağın rahat eriştiği ALT
  bölgede.
- Sayısal alanlar `inputmode="decimal"` (ağırlık) ve `inputmode="numeric"` (tekrar) — telefon doğru
  klavyeyi açsın. Ağırlıkta ondalık ayırıcı olarak hem `,` hem `.` kabul edilir, sunucuya nokta ile
  gider.
- Hiçbir işlev yalnızca hover'a bağlı olmaz (dokunmatikte hover yok).
- `viewport-fit=cover` + `env(safe-area-inset-*)`: alttaki eylem çubuğu çentik/gesture çubuğunun
  altında kalmaz.
- Set ekledikten sonra odak ve kaydırma konumu korunur — arka arkaya set girmek en sık akış.
- Ekran uyanık kalsın diye Wake Lock API'si DEĞERLENDİRİLİR ama ilk dilimde yok (YAGNI).

## Karar 10 — Çevrimdışı: kabuk önbellekten açılır, YAZMA çevrimiçi ister

- Service worker uygulama kabuğunu ve son okunan `GET` yanıtlarını önbelleğe alır: sinyalsiz bodrumda
  uygulama açılır ve son durumu gösterir.
- **Yazma işlemleri (set ekleme vb.) çevrimiçi ister.** Bağlantı yoksa istemci bunu açıkça söyler ve
  girdiyi formda tutar.
- **Neden kuyruk yok:** `POST /api/sets` oturum seçmez — sunucu seti **o anın Türkiye gününe** ait
  açık oturuma yazar. Çevrimdışı kuyruğa alınan bir set gece 23:50'de girilip 00:10'da gönderilseydi
  YANLIŞ GÜNE düşerdi. Doğru kuyruk, setin gerçek zamanını taşıyan bir API (geçmişe dönük giriş)
  gerektirir — ki bu Faz 8'de bilinçli olarak kapsam dışı bırakıldı. Bu yüzden çevrimdışı yazma
  ayrı bir dilim ve muhtemelen küçük bir backend işi.

> **Dilim 1 sapması (2026-09-12):** Yukarıdaki ilk madde bu dilimde BİLEREK uygulanmadı — service
> worker yalnızca uygulama kabuğunu önbelleğe alır, `GET /api/*` yanıtlarını almaz
> (`vite.config.ts`: `navigateFallbackDenylist: [/^\/api\//]`, runtime caching yok). İki sebep:
> (1) önbellek URL'e göre anahtarlanır, kullanıcıya göre değil — uygulama çok kullanıcılı olduğu
> için paylaşılan bir telefonda çıkış/giriş sonrası çevrimdışı kalan kullanıcıya BAŞKA bir hesabın
> antrenman verisi gösterilebilirdi; (2) bir bayatlık göstergesi olmadan bayat antrenman verisi
> göstermek hiç göstermemekten kötü, gösterge ise görsel tasarım işi. Bedeli: sinyalsiz salonda
> kabuk açılır ama veri gelmez. Aynı sebeple `logout` bellekteki TanStack Query önbelleğini de
> temizler. İleride çevrimdışı okuma istenirse önerilen yol: kullanıcıya özel adlı bir NetworkFirst
> önbelleği, `logout`'ta `caches.delete` ile silinir, ekranda bir "son güncelleme" işareti.

## Karar 11 — Geliştirmede CORS yok: Vite proxy

Backend'de CORS yapılandırması **yok** (`Program.cs`'te `AddCors`/`UseCors` geçmiyor). Geliştirmede
buna gerek de kalmaz: Vite dev sunucusu `/api`'yi backend'e proxy'ler, tarayıcı için her şey aynı
origin'den gelir.

**Dağıtım anında** frontend ayrı bir origin'den sunulacaksa backend'e bir CORS politikası eklenmesi
GEREKİR (izinli origin listesi, `Authorization` başlığına izin). Bu, dağıtım kararı verildiğinde
yapılacak küçük bir backend işidir ve o zamana kadar YAGNI. Aynı origin'den (API'nin `wwwroot`'undan)
sunmak da bir seçenek — o durumda CORS hiç gerekmez.

## Karar 12 — Test: Vitest + Testing Library + MSW, ölçülü

- **Vitest + React Testing Library**: davranış testleri (form doğrulama, hata gösterimi, PR rozetinin
  görünmesi).
- **MSW** ile API taklidi; taklit yanıtlar **üretilen OpenAPI tiplerine** uyar, böylece sözleşme
  değişince testler de derlenmez hâle gelir.
- Uçtan uca (Playwright) ilk dilimde YOK. Backend'in kendi uçtan uca testleri var; tarayıcı otomasyonu
  ayrı bir bakım yükü ve gerçek ihtiyaç çıkınca eklenir.

---

## Backend'den öğrenilen ve istemciyi doğrudan bağlayan davranışlar

Bunlar frontend yazılırken bilinmezse hata üretir; hepsi backend kodundan okunarak çıkarıldı.

| Davranış | İstemcinin yapması gereken |
|---|---|
| `POST /api/sets` oturum id'si ALMAZ; sunucu bugünün açık oturumunu bulur/açar. Yanıt `sessionId` taşır. | Set eklemeden önce oturum açmaya çalışma; yanıttaki `sessionId` ile "Bugün" ekranını tazele. |
| `POST /api/sessions` idempotent: açık oturum varsa **200** ve gövdedeki `templateId`/`notes` UYGULANMAZ; yeni açıldıysa **201**. | 200 ile 201'i ayır; 200'de "zaten açık oturumun var" de, gönderdiğin notu uygulanmış sayma. |
| `GET /api/sessions/open` açık oturum yoksa **404** döner. | 404'ü hata olarak gösterme; "bugün henüz antrenman yok" boş durumu olarak ele al. |
| `GET /api/sessions` listesinde `progress` HER ZAMAN boş (N+1'den kaçınmak için). | İlerlemeyi listeden çizme; `GET /api/sessions/{id}` veya `/open` kullan. |
| `GET /api/exercises` listesinde `media` HER ZAMAN boş. | Medya için detay ucuna git. |
| Enum'lar telde METİN (`"Push"`, `"Weight"`). | Sayı bekleme; üretilen tipler zaten string union verir. |
| `recordType` `"None" \| "Weight" \| "Reps"`. | PR rozetini buradan çiz; hesaplama yapma. |
| Ağırlık 0 GEÇERLİ (barfiks/dips), en fazla 2 ondalık. | "0 girilemez" gibi bir istemci kuralı yazma. |
| `GET /api/records` kullanıcının TÜM setlerini okur. | Sık sık çağırma/polling yapma; set eklendikçe `invalidate` yeterli. |
| `GET /api/history` sayfalı zarf döner (`items`, `page`, `pageSize`, `totalCount`, `totalPages`). | Sonsuz kaydırmayı bu zarf üzerinden kur. |
| Hesap pasifse **her** kimlikli istek 401 alır (Faz 13). | 401'de oturumu düşür — bu artık "token süresi doldu"nun yanı sıra "hesap kapatılmış" da olabilir. |

---

## Açık sorular (sonra karara bağlanacak)

- **Görsel tasarım** (palet, tipografi, yerleşim, boş/hata durumlarının dili) — kullanıcı bu adımı
  bilerek erteledi.
- **Dağıtım:** frontend nereden sunulacak (API'nin `wwwroot`'u / ayrı statik host / CDN)? CORS
  ihtiyacı buna bağlı.
- **Çevrimdışı yazma** ve onun gerektirdiği "geçmişe dönük set girişi" backend işi.
- Şablonlar, istatistik ekranları, tartı, export ve AI yorumları için dilim sırası.
