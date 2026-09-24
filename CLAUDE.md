# Antrenman Takip Uygulaması — Proje Planı

## Genel Bakış
Kişisel bir antrenman takip uygulaması. Kullanıcı egzersiz seçer, set/tekrar/ağırlık girer.
Sistem otomatik olarak kişisel rekor (PR) tespiti yapar (ağırlık rekoru veya aynı ağırlıkta
tekrar rekoru). Antrenman verileri (hacim, geçmiş, rekorlar) dışa aktarılabilir; kullanıcı bu
veriyi bir yapay zeka ajanına yapıştırıp yorumlatabilir.

## Kapsam ve Sıra — ÖNEMLİ
- **Backend tamamlandı (Faz 0-13, 2026-09-12).** Frontend kararı verildi: **React + Vite +
  TypeScript, kurulabilir PWA** — repo kökünde `web/` klasöründe. Mimari plan:
  [docs/superpowers/specs/2026-09-12-frontend-react-pwa-design.md](docs/superpowers/specs/2026-09-12-frontend-react-pwa-design.md).
- **Görsel tasarım tamamlandı (2026-09-13).** Bağlayıcı kaynak
  [docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md](docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md):
  yeni ekranlar yalnızca oradaki token setini (Karar 2) kullanır; yeni bir Stitch çıktısının renkleri
  Karar 2'nin eşleme tablosuyla çevrilir, kodu olduğu gibi kopyalanmaz (Karar 7); `accent` kullanım
  kuralı bağlayıcıdır. Yeni bir görsel yön (yeni bileşen dili) için kullanıcıya sor. **Açık tema (#178, 2026-09-20):**
  `web/` iki temalıdır — token'lar `:root[data-theme='light']` altında ezilir, bileşen sınıfları
  tema bilmez; yeni bir `--color-*` token eklerken açık varyantını tanımla ya da kasıtlı olarak
  iki temada aynı kalacağını işaretle (`IKI_TEMADA_AYNI`) — kontrast testi
  (`paletKontrast.test.ts`) bunu ve sayılan metin/yüzey çiftlerinin eşik üstünde kalmasını zorlar.
  `mobile/` şimdilik koyu kalır. Ayrıntı:
  [docs/superpowers/specs/2026-09-20-acik-tema-design.md](docs/superpowers/specs/2026-09-20-acik-tema-design.md).
- **Çok dilli arayüz dilim 1 (#177, 2026-09-21)** — `web/` Türkçe + İngilizce; katalog
  `packages/shared/src/i18n/` (`tr.ts` tek kaynak, `en.ts` onun tipini taşır). Kullanıcıya görünen
  yeni her metin katalogdan gelir (`t(...)`), `cevrilmemisMetin.test.ts` web'de Türkçe harfli metni
  yakalar. Dil tercihi cihazda (`grind.dil`). Backend hata kodları dilim 2, mobil arayüz dilim 3;
  AI/export dili #199. Ayrıntı:
  [docs/superpowers/specs/2026-09-21-coklu-dil-web-design.md](docs/superpowers/specs/2026-09-21-coklu-dil-web-design.md).
- İlk dilim antrenman çekirdeğidir: giriş/kayıt, bugünün oturumu, set ekleme, PR rozetleri, basit
  geçmiş. Şablonlar dilim 2'de geldi; istatistik, tartı, export ve AI ekranları sonraki dilimlere
  bırakıldı.
- **Frontend dilim 1 tamamlandı (2026-09-12)** — ayrıntı ve devreden notlar PLAN.md'de. Kapsam
  dışı kalanlar: çevrimdışı okuma/yazma, dağıtım/CORS
  ve yukarıdaki sonraki dilimler. `web/`'de tip kontrolü `npm run typecheck` = `tsc -b`'dir:
  `tsc --noEmit` kök tsconfig'te (`files: []` + proje referansları) HİÇBİR dosyayı kontrol etmez,
  geri çevirme.
- **Frontend dilim 2 tamamlandı (2026-09-13)** — şablon ekranları, şablonla başlatma ve hareket kartları,
  dinlenme sayacı, hareket geçmişi grafiği; ayrıntı ve devreden notlar PLAN.md'de. Takvim/seri ayrı bir
  dilim.
- **Frontend dilim 3 tamamlandı (2026-09-14, issue #43)** — açılır set paneli, sekmeli turuncu çizgi
  grafik (Ağırlık / Antrenman / Tahmini 1RM), hareket ilerleme ucu; ayrıntı PLAN.md'de. Bu dilimden
  itibaren her iş GitHub issue ile başlar (CONTRIBUTING.md).
- **Takvim (2026-09-15, issue #81)** — Bugün sayfasında antrenman yokken "Şablonla başla"nın üstünde
  Aylık/Haftalık ısı haritası; veri `GET /api/stats/calendar`, backend değişmedi. Ayrıntı PLAN.md'de.
- **Antrenmandan şablon + boş antrenman (2026-09-22, #209/#186)** — "Şablonla başla" birincil yol, altında
  ikincil "Boş antrenman başlat" (#61 kararı tamamlandı, geri alınmadı); açık antrenmanda "Şablon olarak
  kaydet" ve şablonsuz antrenmanı bitirince aynı soru, dolu şablon formunu açar. Ayrıntı PLAN.md'de.
- **Profil başlığı (2026-09-23, #283)** — iki platformda Instagram tarzı başlık (fotoğraf, ad, yaş, üç
  sayaç, "Profili düzenle" · "Hesap ayarları") ve yalnızca ikonlu sekmeler Geçmiş (varsayılan) · Rekorlar ·
  Ölçüler. Hesap artık sekme değil: `/profile/account` ve `/profile/edit` başlıksız alt ekranlardır. Fotoğraf
  istemcide 256×256 JPEG'e küçültülüp yüklenir; kimlikli uç olduğu için web data URL'e çevirir, mobil `Image`'a
  yetki başlığı verir (`kimlikliKaynak`).
- Database şeması **Code-First** yaklaşımıyla ilerleyecek: önce C# entity sınıfları yazılır,
  migration'lar bunlardan üretilir. Elle SQL şeması yazılmaz.

## Teknoloji Yığını
| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core Web API (C#, .NET 10 LTS) |
| ORM | Entity Framework Core — Code-First, Migrations |
| Veritabanı | PostgreSQL (Npgsql provider) |
| Mimari | Katmanlı: Controller → Service → Repository / Unit of Work |
| Frontend | React + Vite + TypeScript, PWA (`web/`); sunucu durumu TanStack Query, yönlendirme React Router; stil Tailwind CSS v4, ikonlar lucide-react, uygulamaya gömülü Inter fontu, çeviri i18next + react-i18next |

## Kod Prensipleri — ZORUNLU
Her yeni sınıf, servis veya endpoint yazılırken **SOLID, DRY ve KISS** prensiplerine uyulacak.
Detaylı kurallar `solid-dry-kiss` skill'inde — kod yazmadan veya inceleme yaparken bu skill
devreye girmeli. Bir tasarım kararı bu prensiplerden birine aykırıysa, kararı uygulamadan önce
gerekçesini açıkla.

## Çok Dil (Türkçe + İngilizce) — ZORUNLU
Uygulama iki dillidir (#177); her geliştirme İngilizceyi de kapsar, "önce Türkçe, İngilizce sonra"
yoktur (#202).
- Kullanıcıya görünen yeni ya da değişen her metin — etiket, buton, boş durum, hata/uyarı, onay
  diyaloğu, `aria-label`/`title`/`placeholder`, sayfa başlığı — satır içi yazılmaz;
  `packages/shared/src/i18n/tr.ts` ve `en.ts`'e **aynı commit'te** eklenir ve `t(...)` ile kullanılır.
  `tr.ts` tek kaynaktır, `en.ts` onun tipini taşır; bir dili boş ya da "sonra çevrilecek" bırakmak yok.
- Anahtar ve grup kuralları (ASCII camelCase, ekran grubu, iki+ dosyada geçen metin `ortak`'ta,
  sayıya bağlı metin `_one`/`_other` ile iki katalogda da, modül seviyesinde `t` çağrılmaz):
  [docs/superpowers/plans/2026-09-21-coklu-dil-web.md](docs/superpowers/plans/2026-09-21-coklu-dil-web.md)
  "Katalog kuralları".
- Tarih/sayı gösterimi `useDil()`'den gelen `dil` ile `format*` yardımcılarından geçer; `tr-TR`
  gibi sabit yerel ayar yazılmaz. Saat dilimi `Europe/Istanbul` kalır.
- Bitti sayılmadan önce: `katalog.test.ts` ve `cevrilmemisMetin.test.ts` yeşil; yeni ekran/metin
  İngilizcede de gözle kontrol edilir (Profil → Dil → English).
- **Mobil** (dilim 3'e kadar arayüzü Türkçe sabit): yeni ya da değişen mobil metin de katalogdan
  gelir ve İngilizcesiyle eklenir — dilim 3'ü büyütmemek için.
- **Backend** (dilim 2'ye kadar): yeni hata mesajları bugünkü gibi Türkçe `detail` taşır; dilim 2
  gelince `code` + `params`'a çevrilir. Yeni bir istemci-tarafı metin backend `detail`'ine
  dayanmaz.
- Kapsam dışı: AI yorumu içeriği ve export metninin dili (#199); kullanıcının girdiği veriler
  (egzersiz/şablon adları, notlar) çevrilmez.

## Web + Mobil — ZORUNLU
Kullanıcıya görünen her geliştirme hem `web/` hem `mobile/` için **aynı işte** yapılır; "önce
web, mobil sonra" (ya da tersi) yoktur (#211). Çok Dil kuralıyla aynı mantık.
- Issue açarken kapsam iki platformu da yazar (dokunulacak web ve mobil dosyaları); bir platform
  bilerek dışarıda bırakılacaksa gerekçesi issue'da yazılır ve kullanıcıya sorulur.
- Platforma uygun etkileşim serbesttir (mobilde döner kadran, web'de seçenek satırı gibi); aynı
  olması gereken şey özelliğin kendisi ve API'den gelen veridir — hesap iki istemcide de sunucudan
  gelir.
- Mevcut platform farkları kural değil, geçici durumdur: mobil tema koyu kalır (açık tema), mobil
  arayüz dili dilim 3'e kadar Türkçe sabit (Çok Dil). Bunlar kendi dilimlerinde kapanır.
- Yalnızca backend'e, dokümana ya da altyapıya dokunan işler bu kuralın dışındadır.
- Bitti sayılmadan önce: iki platformun testleri ve tip kontrolü yeşil, özellik iki platformda da
  gözle denenmiş.

## Yetkilendirme Kuralı — ZORUNLU
`Exercise.UserId` gibi nullable-sahiplik alanı olan her kaynakta, bir kullanıcı SADECE kendi
kayıtlarına (`UserId = currentUserId`) veya global kayıtlara (`UserId = null`) erişebilir.
Başka bir kullanıcının özel egzersizini/şablonunu/session'ını görüntüleyemez, düzenleyemez,
kendi template/session'ına referans veremez. Bu kontrol her ilgili servis metodunda açıkça
yapılmalı — sadece Id ile sorgulayıp sahiplik kontrolünü atlamak bir IDOR (Insecure Direct
Object Reference) açığıdır.

> İstisna (arkadaş görünümü — #282, 2026-09-24): arkadaşlar (karşılıklı takip) birbirinin **Geçmiş** ve
> **Rekorlarını salt-okunur** görür — yalnızca `GET /api/users/{username}/history` ve `/records`. Bu iki
> uç TEK kapıdan geçer: `FriendActivityService` (hedef pasif/yoksa 404, bakan kendisi ya da arkadaşı
> değilse 403; yetki her istekte veritabanından okunur, takipten çıkıldığı an erişim biter). Geçmiş ve
> rekor servislerinin `userId` alan metotları (`GetForUserAsync`, `GetAllTimeForUserAsync`) yetki kontrolü
> YAPMAZ — yalnızca bu kapıdan sonra çağrılır; mevcut `/api/history`, `/api/records` ve yazan her uç hâlâ
> yalnız `currentUserId` ile çalışır. Paylaşılmayanlar: oturum notu (`FriendHistorySessionResponse`'ta alan
> olarak yok), ölçüler, AI yorumları, export. Arkadaş verisine yeni bir uç açmak bu istisnayı genişletmektir:
> aynı kapıdan geçer ve buraya yazılır.

> Karar (JWT içeriği): JWT SADECE kimlik taşır (`UserId`, `Username`) — rol/plan gibi
> zamanla değişebilecek öznitelikler token'a claim olarak gömülmez. Sebep: kullanıcı
> premium'a geçtiğinde/düştüğünde, eski token hâlâ eski durumu taşımaya devam eder (süresi
> dolana kadar) — "yükselttim ama göremiyorum" ya da tam tersi tutarsızlıklara yol açar.
> Yetki gerektiren her istekte (ör. ileride bir premium özellik), kullanıcının GÜNCEL durumu
> veritabanından okunarak kontrol edilir — yukarıdaki sahiplik kontrolüyle aynı desen. Şu an
> tek bir kullanıcı tipi olduğu için bir `Role`/`Plan` alanı/tablosu ŞİMDİDEN eklenmiyor
> (YAGNI) — ama JWT'yi bilerek sade tutmak, ileride bu alanı token yapısını bozmadan
> eklemeyi kolaylaştırır.

## Mimari Katmanlar
- **Controllers**: sadece HTTP request/response ve girdi doğrulama; iş mantığı içermez.
- **Services**: iş mantığı (PR hesaplama, hacim hesaplama, export formatlama) burada yaşar.
- **Repositories / Unit of Work**: veri erişimi; EF Core `DbContext`'e sadece bu katman dokunur.
- **DTOs**: entity'ler doğrudan dışarı verilmez, her endpoint kendi DTO'sunu kullanır.

> Not (global exception handling middleware): pipeline'ın başına yakın kaydedilen, tüm
> isteği saran bir middleware. Görevi: (1) altından kaçan (yakalanmamış) her exception'ı
> yakalamak, (2) exception + request path + zaman damgası (mümkünse UserId) bilgisiyle
> loglamak, (3) exception tipini uygun HTTP status koduna eşlemek (örn. "bulunamadı" tipi bir
> hata → 404, doğrulama hatası → 400, yetkisiz erişim → 403, eşleşmeyen her şey → 500), (4)
> tutarlı bir hata formatında (RFC 7807 ProblemDetails: `type`, `title`, `status`, `detail`,
> `instance`) yanıt dönmek. İç exception detaylarını / stack trace'i (özellikle production'da)
> asla client'a sızdırmaz. Rollback işini YAPMAZ — rollback ondan önce Unit of Work
> seviyesinde bitmiş olmalı (bkz. aşağıdaki transaction notu); bu middleware sadece kaçan
> hatalar için bir güvenlik ağı ve tutarlı hata formatı sağlar.

> Not (transaction/rollback): transaction sınırı Unit of Work'te (Service katmanında) tutulur —
> her anlamlı iş operasyonu (örn. "set ekle + rekorları güncelle", "session sil + etkilenen
> egzersizlerin rekorlarını yeniden hesapla") TEK bir `SaveChangesAsync()` çağrısı altında
> toplanır; EF Core bunu otomatik atomic yapar, ayrı bir `BeginTransaction`/`Commit` genelde
> gerekmez. Birden fazla `SaveChangesAsync()` gerektiren daha karmaşık senaryolarda UoW içinde
> açık transaction kullanılır. Yukarıdaki global exception handling middleware bunun YERİNE
> değil, TAMAMLAYICISI olarak kalır — rollback ondan önce UoW seviyesinde bitmiş olmalı.
> DİKKAT: tüm HTTP isteğini middleware seviyesinde bir DB transaction'a sarmak
> (transaction-per-request deseni) burada ÖNERİLMEZ — AI-insight özelliği gibi yavaş dış API
> çağrıları (LLM'e istek atmak) transaction açıkken çalışırsa, DB kilitleri gereksiz yere uzun
> süre açık kalır.

## Domain Modeli
- **User**: `Id`, `Username`, `PasswordHash`, `CreatedAt`, `DeletedAt` (nullable — `null` ise hesap
  aktif; dolu ise hesap pasifleştirilmiş demektir, verisi durur), `WeeklyTargetDays` (nullable, 1–7 —
  haftalık antrenman günü hedefi, #97; `PUT /api/settings/weekly-target`), `DisplayName` (nullable, en fazla
  50 karakter, kırpılır, benzersiz değil — #280), `BirthDate` (nullable `date`, #280 — yaş SAKLANMAZ, sorgu
  anında TR gününe göre `AgeCalculator` ile hesaplanır; 13–120 yaş dışı 400). Uçlar: `GET/PUT /api/profile`
- **UserAvatar** (#280): `Id`, `UserId` (FK, benzersiz, CASCADE), `Content` (`bytea`), `ContentType`,
  `UpdatedAt` — profil fotoğrafı veritabanında, `User`'dan ayrı tabloda (her kullanıcı sorgusunda resim
  baytları taşınmasın). En fazla 256 KB; tür istemcinin beyanından değil dosya imzasından belirlenir
  (JPEG/PNG/WebP). `PUT/DELETE /api/profile/avatar`; `GET /api/users/{username}/avatar` kimlikli herkese
  açık (profil başlığı), pasif/fotoğrafsızda 404, `ETag` + `Cache-Control: private, no-cache`; profil
  yanıtındaki `avatarVersion` (Unix ms) istemcide önbellek kırıcıdır. Pasif hesabın fotoğrafı silinmez
- **Exercise**: `Id`, `UserId` (FK, nullable — null ise varsayılan/global egzersiz), `Name`,
  `Category` (Push / Pull / Legs / Other), `IsArchived` (soft delete — geçmiş kayıtlar
  bozulmasın)
- **WorkoutTemplate**: `Id`, `UserId` (FK), `Name` (örn. "Push Day A"), `CreatedAt`
- **TemplateExercise**: `Id`, `WorkoutTemplateId` (FK), `ExerciseId` (FK), `OrderIndex`,
  `PlannedSets` — o egzersiz için hedeflenen set sayısı (ağırlık/tekrar burada YOK, onlar
  gerçek performans anında `SetEntry`'ye girilir), `RestSeconds` — setler arası dinlenme (0–900 sn,
  varsayılan 90, `0` = sayaç yok; dilim 2)
- **WorkoutSession**: `Id`, `UserId` (FK), `TemplateId` (FK, nullable — şablonsuz açılan
  session'lar için null), `StartedAt`, `EndedAt` (nullable — `null` = oturum hâlâ açık/devam
  ediyor), `Notes` (nullable — serbest metin, örn. "omuz sıkıştı, güçlü hissettim"),
  `Difficulty` (nullable — antrenman ne kadar zor geldi; #118'de geldi, #153'te beş kademe oldu:
  `VeryEasy`/`Easy`/`Medium`/`Hard`/`Maximal`. Adıyla saklanır (`varchar(20)`), bu yüzden yeni uç
  eklemek migration gerektirmez ama var olan adı değiştirmek eski satırları okunamaz yapar. Yalnızca
  `POST /api/sessions/{id}/finish` gövdesinde belirlenir, sonradan değiştiren bir uç yoktur. İki
  platformda da bitirme ayrı bir ekranda (web `/antrenman/bitir`, mobil `antrenman-bitir`) alt kısmı
  açık bir sürat kadranıyla sorulur — #182; geometri `packages/shared/src/lib/zorlukKadrani.ts`.
  Altında "Devam et" oturumu açık bırakıp geri döner, "Atla" zorluksuz kapatır)
- **SessionExercise** (#60/#62): `Id`, `WorkoutSessionId` (FK, CASCADE), `ExerciseId` (FK, RESTRICT),
  `OrderIndex`, `PlannedSets` (nullable — `null` = hedefsiz, antrenmana sonradan eklenen hareket),
  `RestSeconds` (0–900, varsayılan 90) — antrenmanın kendi hareket listesi; `(WorkoutSessionId, ExerciseId)`
  benzersiz
- **SetEntry**: `Id`, `WorkoutSessionId` (FK), `ExerciseId` (FK), `Weight`, `Reps`,
  `RecordType` (None / Weight / Reps), `Rir` (nullable — Reps in Reserve, ileride koçluk
  önerileri için veri toplamaya şimdiden başlıyoruz; #266'dan beri yarım adımlı `numeric(4,1)`:
  0–5, 2.5 = "2–3 arası", 5 = "4+"; iki platformda kaydırıcıdan seçilir, etiketi
  `packages/shared/src/lib/rir.ts`. Eski kayıtlarda 5'ten büyük değer kalabilir, "4+" gösterilir),
  `CreatedAt`
- **BodyWeightLog**: `Id`, `UserId` (FK), `Weight`, `RecordedAt` — antrenman verisinden
  bağımsız, performansla zaman ekseninde karşılaştırmak için ayrı bir kayıt
- **ExerciseMedia**: `Id`, `ExerciseId` (FK), `MediaType` (Video / Gif), `Url`, `CreatedAt` —
  bir egzersizin yapılışını gösteren medya; global veya özel her egzersiz için geçerli, aynı
  `Exercise` sahiplik/yetkilendirme kuralını miras alır (egzersizi görebiliyorsan medyasını da
  görebilirsin)
- **AiInsight**: `Id`, `UserId` (FK), `Kind` (Insight / Suggestion), `WorkoutSessionId` (FK,
  nullable), `SetEntryId` (FK, nullable — bir sete özel öneri için), `RangeFrom` / `RangeTo`
  (nullable `date`, TR yerel günü, iki ucu dahil — yorumun kapsadığı aralık; `Insight`'ta dolu,
  oturum kapsamlı `Suggestion`'da null), `Content`, `Model`, `TokensUsed` (nullable),
  `EstimatedCostUsd` (nullable), `CreatedAt`
- **Follow** (#281): `Id`, `FollowerId` (FK → User, RESTRICT), `FolloweeId` (FK → User, RESTRICT),
  `CreatedAt` — tek yönlü takip; `(FollowerId, FolloweeId)` benzersiz, kendini takip CHECK ile yasak

> Karar (takip ve arkadaşlık — #281, 2026-09-23): takip **doğrudan**dır (istek/onay yok), satırın
> varlığı takibin kendisidir. **Arkadaş = karşılıklı takip** ve SAKLANMAZ: iki `Follow` satırından
> sorgulanır — ayrı bir `Friendship` tablosu bu satırlarla senkron kalması gereken ikinci bir doğruluk
> kaynağı olurdu. Takip ve bırakma idempotenttir (204). Pasif hesaplar listelerde, sayaçlarda ve
> aramada görünmez, profilleri 404'tür; satırları silinmez, hesap geri açılınca ilişki geri gelir.
> `/api/users/{username}/...` uçları yalnızca herkese açık başlık bilgisi (ad, sayaçlar, bakanın
> ilişkisi) döner — antrenman verisi paylaşmaz; istisna arkadaşa salt-okunur geçmiş/rekor uçlarıdır
> (#282, bkz. Yetkilendirme Kuralı istisnası).

> Karar: Çoklu kullanıcı desteği en baştan ekleniyor. Basit bir username + password (hash'lenmiş)
> + JWT authentication yeterli — OAuth/üçüncü parti login gerekmiyor (KISS).

> Karar (hesap silme = SOFT DELETE — Faz 13): Hesap silme hiçbir satırı silmez, yalnızca
> `User.DeletedAt`'i damgalar ("verilerin kaybolmasını istemiyoruz"). `DELETE /api/auth/me` şifre
> teyidi ister ve 204 döner; kimlik token'dan gelir, gövdeden id alınmaz. Pasif hesabın elindeki
> token ANINDA geçersizleşir: `OnTokenValidated`'da kimlikli her istekte hesabın güncel durumu
> veritabanından okunur — token 7 gün yaşadığı için bu olmasaydı pasifleştirme bir hafta etkisiz
> kalırdı (yukarıdaki JWT kararının aynı mantığı). Doğru şifreyle giriş hesabı GERİ AÇAR; ayrı bir
> "reactivate" ucu yoktur. Pasiflik kontrolü şifre doğrulamasından SONRA gelir ve login'in nötr 401'i
> korunur — yoksa yanlış şifreyle bile hesabın pasif olduğu sızardı. Pasif hesabın kullanıcı adı
> REZERVE kalır: aynı adla kayıt 409 alır ve mevcut şifre hash'i ezilmez (hesap devralma yok).
> Gerçek silme (purge) bilinçli olarak yapılmadı; uygulama başkalarına açılırsa KVKK/GDPR için
> ayrıca yazılır.

> Karar: Bir günde birden fazla antrenman oturumu olabilir (örn. sabah/akşam). Bu yüzden
> `WorkoutSession` gün bazlı bir `Date` yerine gerçek bir zaman aralığı (`StartedAt`/`EndedAt`)
> taşıyor. Set eklerken servis, kullanıcının `EndedAt IS NULL` olan (açık) session'ını bulur;
> yoksa yeni bir session açar. Session'ı kapatmak (`EndedAt` set etmek) açık bir kullanıcı
> aksiyonu (örn. "Antrenmanı Bitir") — otomatik zaman aşımıyla kapatma şimdilik yok (KISS,
> gerçek ihtiyaç çıkarsa eklenir).

> Karar: Bir gün tipinin (örn. "Push Day") egzersiz listesi ayrı bir `TemplateExercise` join
> tablosunda tutuluyor (many-to-many). `WorkoutTemplate` üzerinde bir "ExerciseIds" dizi/CSV
> alanı kullanmak 1NF'yi ihlal ederdi (atomic olmayan, tekrar eden grup). Şablon, session'ı
> sadece egzersiz listesiyle önceden dolduruyor — kullanıcı session sırasında egzersiz
> ekleyip çıkarabilir, bu DB seviyesinde kısıtlanmıyor.

> Karar: `TemplateExercise` sadece hedef set sayısını (`PlannedSets`) tutuyor — ağırlık ve
> tekrar şablonda yer almıyor, çünkü bunlar "plan" değil "gerçekleşen performans" verisi.
> Bu ayrım Single Responsibility'ye uygun: `TemplateExercise` = plan, `SetEntry` = gerçek
> kayıt. Session'daki ilerleme ("4 setten 2'si tamamlandı" gibi), o session + egzersiz için
> var olan gerçek `SetEntry` sayısını `PlannedSets` ile karşılaştırarak hesaplanır — önceden
> boş `SetEntry` satırları oluşturulmaz (bu, `Weight`/`Reps`'i nullable yapmayı gerektirirdi
> ve "planlanan" ile "gerçekleşen" veriyi aynı tabloda karıştırırdı).

> Karar (antrenmanın hareket listesi — #60/#62, 2026-09-14): antrenman şablonla başlarken şablonun
> hareketleri (`OrderIndex`, `PlannedSets`, `RestSeconds`) `SessionExercise`'a **kopyalanır**; ilerleme
> artık şablondan değil bu listeden hesaplanır. Kopya bilinçli bir anlık görüntüdür (`RecordType` notuyla
> aynı gerekçe): şablon sonradan değişse de başlamış ve geçmiş antrenman değişmez. Antrenmana hareket
> eklemek (`POST /api/sessions/{id}/exercises`) sona hedefsiz satır ekler; set girilen hareket listede
> yoksa aynı commit'te hedefsiz girer ("Plan dışı" kavramı yok). Kaldırmak
> (`DELETE /api/sessions/{id}/exercises/{exerciseId}`) satırı ve o hareketin bu antrenmandaki setlerini
> siler, rekorları bir kez yeniden hesaplar — tek `SaveChangesAsync`. Yalnızca açık antrenman düzenlenir
> (bitmişte 409). Migration veri taşımaz: migration'dan önce başlamış antrenmanların listesi boştur.

> Karar: "AI'nin verdiği öneriler" için ayrı bir tablo açılmıyor — mevcut `AiInsight` tablosu
> genişletiliyor: bir `Kind` alanı (`Insight` = genel yorum/rapor, `Suggestion` = session içi
> aksiyon önerisi) ve opsiyonel bir `SetEntryId` eklendi. Sebep: bir "rapor" ile bir "öneri"
> veri şekli olarak aynı — kim söyledi, ne dedi, ne zaman, hangi kapsamda, ne maliyetle; ikisi
> için ayrı tablo açmak DRY'ı ihlal ederdi. Yeni bir öneri üretilirken, aynı kullanıcı +
> egzersiz için geçmiş `Kind = Suggestion` kayıtları LLM'e bağlam olarak verilebilir — AI
> kendi geçmiş çıktısını bu tablodan sorgulayarak hatırlar, ayrı bir "hafıza" mekanizması
> gerekmez.

> Karar: Egzersiz gösterim medyası (video/gif) `Exercise` tablosuna sütun olarak eklenmiyor,
> ayrı bir `ExerciseMedia` tablosunda tutuluyor — çünkü bir egzersizin birden fazla medyası
> olabilir (örn. hem bir gif hem farklı açılardan videolar). `Exercise.VideoUrl` gibi tek bir
> alan bunu desteklemez; virgülle ayrılmış birden fazla URL tutmak da 1NF'yi ihlal ederdi.
> Medyanın nerede barındırılacağı (CDN, bulut depolama, dış link vb.) sadece `Url` alanının
> içeriğini etkiler, şema tasarımını etkilemez — bu, ileride ele alınacak.

> Karar: Bir set silindiğinde, eğer silinen set bir rekor taşıyorsa (`RecordType != None`),
> o kullanıcı + egzersiz için TÜM `SetEntry` kayıtları kronolojik sırayla yeniden taranır ve
> `RecordType` alanları sıfırdan yeniden hesaplanır (aynı PR-tespit mantığı en baştan tekrar
> uygulanır). Bu mantık `PersonalRecordCalculator` içinde ayrı bir `RecalculateRecords(userId,
> exerciseId)` metodu olarak yaşamalı — `AddSet` akışındaki "bu set önceki en iyiyi geçiyor mu"
> kontrolü ortak bir yardımcı fonksiyonda tutulup her iki akışta da (ekleme ve yeniden hesaplama)
> aynı fonksiyon çağrılmalı (DRY).

> Karar: AI-yorumlama özelliğinin iki yolu için de altyapı şimdiden kuruluyor: (1) basit
> okunabilir metin/JSON export — herhangi bir tabloya ihtiyaç duymaz, mevcut veriden sorgulanır;
> (2) backend'in doğrudan bir LLM API'sine bağlanıp yorumu kendisi alması — sonucu `AiInsight`
> tablosunda saklar (tekrar tekrar API'ye sorup ücret ödenmesin, geçmiş yorumlar görüntülenebilsin)
> ve `TokensUsed`/`EstimatedCostUsd` ile kullanım/maliyet takip edilebilsin. Hangi yolun ne zaman
> aktif edileceğine maliyet netleşince karar verilecek — ikisi de aynı anda var olabilir.

> Karar (AI sağlayıcısı ve aktivasyon — Faz 12): Yorum üretimi `IAiInsightProvider` arkasında durur
> ve **varsayılan olarak KAPALIDIR** (`Ai:Provider = None` → `NullAiInsightProvider` → 503). Gerçek
> sağlayıcı (Anthropic, resmi C# SDK) yazılıdır ama yalnızca yapılandırmayla açılır:
> `dotnet user-secrets set "Ai:Provider" "Anthropic"` + `Ai:ApiKey`. Anahtar `appsettings.json`'a
> YAZILMAZ, orada boş kalır; eksik ya da geçersiz ayar ilk isteği değil BOOT'u durdurur (`Jwt:Key`
> ile aynı desen). Üretim bugün yalnızca `Kind = Insight` yazar — set arası öneri motoru hâlâ
> kapsam dışı. Aralık verilmezse son 30 gün, en fazla 366 gün; aralıkta hiç oturum ve tartı yoksa
> LLM'e hiç gidilmez (400), çünkü bir modele "veri yok" dedirtmek için para ödenmez. LLM'e giden
> bağlam Faz 11'in export metnidir; ikinci bir "LLM'e özet" biçimi yazılmaz. Ücretli adım (LLM
> çağrısı ve onu izleyen tek `SaveChangesAsync`) isteğin iptal belirtecini DEĞİL
> `CancellationToken.None` kullanır: istek LLM'e ulaştığı anda ücret doğduğu için, istemci koparsa
> bile yanıt saklanır. Fiyatlar yapılandırmada (`Ai:InputUsdPerMillionTokens` /
> `Ai:OutputUsdPerMillionTokens`) durur ve varsayılan modelinkidir — model değişirse fiyatlar da
> değişmeli; fiyat verilmezse `EstimatedCostUsd` null kalır (bilinmeyen maliyet, yanlış bir sayıdan
> iyidir).

> Karar (silme davranışları):
> - `Exercise` hard-delete edilmez; bunun yerine `IsArchived = true` yapılır (soft delete).
>   Geçmiş `SetEntry`/`TemplateExercise` kayıtları geçerliliğini korur, arşivlenen egzersiz
>   sadece yeni seçim listelerinde görünmez.
> - `WorkoutTemplate` silinirse, ona bağlı `TemplateExercise` satırları CASCADE ile silinir
>   (template'siz anlamsızlar — composition ilişkisi). Ama `WorkoutSession.TemplateId` SET
>   NULL olur (geçmiş session hangi şablondan başladığını unutur ama kendisi silinmez — bu
>   sadece bir referans, geçmiş veri değil).
> - `WorkoutSession` silinirse, ona bağlı `SetEntry` satırları CASCADE ile silinir. Bu durumda
>   etkilenen egzersizlerin distinct listesi çıkarılıp her biri için BİR KERE
>   `RecalculateRecords` çağrılmalı (her set için ayrı ayrı değil — performans, DRY).

> Karar (unutulan açık session — issue #191 ile güncellendi): "açık session" ararken sadece
> `EndedAt IS NULL` yetmez — `StartedAt`'in yeterince YAKIN zamanda olması da kontrol edilmeli.
> Aksi halde kullanıcı bir session'ı kapatmayı unutursa, günler sonra eklediği yeni bir set
> yanlışlıkla o eski session'a (ve eski tarihe) eklenmiş olur. **İlk sürümde bu sınır "TR yerel
> takvim günü" idi (bkz. eski `TurkeyDay.RangeFor` kullanımı) — ama gece yarısını gerçek bir
> sorun hâline getiriyordu: 23:50'de başlayan bir antrenman 00:05'te "bugüne ait değil" sayılıp
> erişilemez oluyordu (issue #191).** Sınır artık takvim günü değil, süre penceresi:
> `WorkoutSessionService.AcikOturumPenceresi` (6 saat) içinde başlamış ve hâlâ `EndedAt IS NULL`
> olan en son session açık sayılır (`WorkoutSessionRepository.GetOpenSessionStartedAfterAsync` —
> tek eşikli, üst sınırsız). Pencere gece yarısını doğal olarak aşar ama gerçekten unutulmuş
> (saatler önce başlamış) bir session'ı yine de yutmaz. Pencere dışında açık session yoksa yeni
> bir session açılır; eski açık session zorla kapatılmaz, öylece kalır.
>
> Not (bu kararla karıştırılmasın): bir antrenmanın **hangi güne ait sayılacağı** (geçmiş,
> takvim, seri/istatistik) bu pencereden ETKİLENMEZ — her zaman `StartedAt`'in kendi TR yerel
> günüdür. 23:30'da başlayıp 00:30'da biten bir antrenman, ne zaman kapatılırsa kapatılsın,
> geçmişte 23:30'un günü (T) altında görünür, T+1'de değil.

## Veritabanı Tasarım Kuralları
Şema en az **3NF (Üçüncü Normal Form)**'a uygun olmalı:
- **1NF**: her sütun atomik bir değer tutar; tekrar eden gruplar veya diziler olmaz.
- **2NF**: 1NF + hiçbir non-key alan, composite key'in sadece bir parçasına bağımlı olmaz.
  (Bu projede tüm tablolar tek sütunlu surrogate key — `Id` — kullandığı için 2NF otomatik
  sağlanır.)
- **3NF**: 2NF + hiçbir non-key alan başka bir non-key alana bağımlı olmaz (transitive
  dependency yok). Bir alan (örn. `Exercise.Category`) yalnızca kendi ek açıklayıcı özellikleri
  varsa (örn. bir `CategoryDescription`, `DisplayColor`) ayrı bir tabloya çıkarılmalı; tek başına
  bir enum/etiket olarak kalması 3NF'yi ihlal etmez.

Kural: yeni bir entity/tablo eklerken, bir alanın gerçekten satırın kendi kimliğine mi bağımlı
olduğunu, yoksa başka bir non-key alana (transitive) mi bağımlı olduğunu kontrol et. Bir alan
kendi başına birden fazla özelliği olan bir kavrama dönüşürse (örn. kategori artık sadece bir
isim değil, açıklama + renk + sıralama da taşıyorsa), ayrı bir lookup tablosuna çıkar.

> Not: `SetEntry.RecordType` (PR olup olmadığı) hesaplanabilir bir değer ama bilerek satırda
> saklanıyor — bu bir normalizasyon ihlali değil, bilinçli bir tarihsel/audit kaydı (o an PR
> olup olmadığının anlık görüntüsü; sonraki setler eklenince geçmiş kayıtlar yeniden
> hesaplanmasın diye).

> Not: Antrenman yapılan gün sayısı, seri (streak), aylık katılım gibi istatistikler
> `WorkoutSession.StartedAt` üzerinden (gün bazında gruplanarak) **sorgulanarak** hesaplanır —
> bunlar için ayrı bir tablo açılmaz. Ayrı bir tablo, kaynak veriyle senkron kalması gereken
> ikinci bir doğruluk kaynağı yaratır ve normalizasyon/DRY prensiplerini ihlal eder.


1. Kullanıcı kayıt / giriş — basit username + password, JWT tabanlı authentication
2. Egzersiz yönetimi — varsayılan (global) liste + kullanıcıya özel egzersiz ekleme
3. Antrenman şablonları (taslak) — bir gün tipi için (örn. "Push Day") önceden belirlenen
   egzersiz listesi ve her egzersiz için hedef set sayısı; ağırlık/tekrar şablonda yer almaz,
   session sırasında girilir. Session başlatırken şablon seçilirse egzersizler ve hedef set
   sayıları otomatik doluyor (kullanıcı yine de sapabilir)
4. Set kaydı — ağırlık, tekrar, egzersiz, tarih (giriş yapmış kullanıcıya bağlı)
5. Kişisel rekor (PR) hesaplama:
   - **Ağırlık rekoru**: yeni ağırlık, o egzersizdeki önceki maksimum ağırlığı geçerse
   - **Tekrar rekoru**: aynı ağırlıkta önceki maksimum tekrarı geçerse
   - **Tahmini 1RM** (dilim 3): Brzycki `ağırlık × 36 / (37 − tekrar)`, tekrar tavanı 12, 0 kg setlerde
     yok; `OneRepMaxEstimator` saf hesaplayıcısında, **sorgu anında hesaplanır, saklanmaz** (formül
     değişirse migration gerekmez); rekor rozetlerini (`RecordType`) değiştirmez
   - Ek: "tüm zamanların rekorları" özet endpoint'i — her egzersiz için güncel en iyi
     ağırlık/tekrarı listeler (yeni veri gerektirmez, mevcut `SetEntry`'den sorgulanır)
6. Antrenman geçmişi sorgulama — tarih aralığı ve/veya egzersize göre filtre
7. Antrenman takvimi / katılım istatistiği — hangi günlerde antrenman yapıldığı, toplam gün
   sayısı, seri (streak) gibi bilgiler (seri #96'dan beri HAFTA sayar: en az bir antrenman günü olan
   ardışık Pazartesi–Pazar haftaları; #97 hedef serisi aynı hesap); **yeni bir tablo açılmadan**, mevcut
   `WorkoutSession.StartedAt` üzerinden (gün bazında gruplanarak) sorgulanır (bkz. Veritabanı
   Tasarım Kuralları)
8. Hacim hesaplama — set, oturum ve egzersiz bazında (ağırlık × tekrar toplamı)
9. Dışa aktarma:
   - Ham JSON export
   - AI-özet formatında export (okunabilir düz metin — bir yapay zeka ajanına yapıştırılabilir)
   - *(Altyapısı hazır, aktivasyonu maliyete göre sonra)* backend'in doğrudan bir LLM API'sine
     bağlanıp veriyi yorumlaması, sonucun `AiInsight` olarak saklanması
10. Vücut ağırlığı takibi — periyodik ağırlık kaydı; antrenman hacmi/performansıyla aynı zaman
    ekseninde karşılaştırılabilir (basit bir sorgu/join, yeni hesaplama mantığı gerektirmez)
11. Egzersiz gösterim medyası (video/gif) — *(altyapısı hazır, arayüz/gösterim ileride)*
    her egzersize birden fazla video/gif eklenebilir (`ExerciseMedia`)

## Önerilen Geliştirme Sırası
1. Proje iskeleti — ASP.NET Core Web API, klasör yapısı (Controllers / Services / Repositories / Models / DTOs)
2. Entity'ler + `DbContext` (Code-First)
3. İlk migration, veritabanı oluşturma
4. Repository katmanı + Unit of Work
5. Service katmanı (PR mantığı dahil) — burada birim testleri özellikle önemli
6. Controller'lar ve endpoint'ler
7. Export endpoint'leri
8. ✅ Frontend kararı verildi (2026-09-12): React + Vite + TypeScript, kurulabilir PWA.

## Kısıtlar / Yapılmaması Gerekenler
- Görsel tasarım spec'inin dışına çıkma: Tailwind'in hazır renk paleti, satır içi `style=`, `@apply`,
  UI kütüphanesi ve `focus:outline-none` kullanılmaz; tekrarlanan sınıf kümesi bir bileşene çıkar.
- Frontend'de sunucudaki hesabı istemcide yeniden hesaplama (hacim, PR, seri): bunların hepsi
  API'den gelir, ikinci bir doğruluk kaynağı üretme.
- Kişisel/tek kullanıcı ölçeğinde gereksiz karmaşıklık ekleme (mikroservis, mesaj kuyruğu, vb. — KISS).
- Migration'ları elle düzenleme; her zaman `dotnet ef migrations add` ile üret.

## Ek Teknik Notlar
- **Git akışı ve PR kuralları**: `CONTRIBUTING.md`'de. Özet: feature branch'i `master`'dan
  açılır → `dev`'e PR → kabul edilirse aynı branch'ten `master`'a ikinci PR → **master `dev`'e
  geri-merge edilir**. Bu son adım atlanırsa iki branch aynı feature'ın kopya merge commit'lerini
  taşır, GitHub PR'lar için merge commit üretemez ve `pull_request` workflow'ları **sessizce hiç
  çalışmaz** (kırmızı değil, hiç yok). Squash/rebase merge repo ayarlarında kapalıdır.
  **Bir issue'yu üstüne almaktan geri-merge'e kadar her git adımında `git-flow` skill'i
  ([git-flow/SKILL.md](git-flow/SKILL.md)) devreye girmeli** — komutlar ve dur-bildir durumları orada.
  Skill her git adımından ÖNCE okunur (hatırladığın hâli değil, güncel hâli).
  **Bir iş `dev`'e merge edilince bitmiş sayılmaz**: aynı oturumda aynı branch'ten `master` PR'ı
  açılır, merge edilir ve `master` `dev`'e geri-merge edilir. "Master'a çıkayım mı?" diye
  sorulmaz — karar verilmiştir. İşe başlamadan önce
  `git log origin/master..origin/dev` ile `dev`'de master'a çıkmamış iş kalmış mı bakılır; kalmışsa
  (kimin işi olursa olsun) önce onlar kendi branch'lerinden kronolojik sırayla terfi ettirilir.
- **Seed data**: varsayılan/global egzersizler (`Exercise.UserId = null` olanlar — Bench Press,
  Squat vb.) EF Core migration'ında `HasData` ile seed edilir, elle INSERT atılmaz.
- **Şifre hashleme**: kendi hash fonksiyonu yazılmaz; ASP.NET Core Identity'nin
  `PasswordHasher<T>`'ı veya `BCrypt.Net-Next` gibi test edilmiş bir kütüphane kullanılır.
- **Zaman damgaları UTC'de tutulur**: `StartedAt`, `EndedAt`, `CreatedAt` veritabanında UTC
  olarak saklanır. Gün bazlı gruplamalar (takvim/katılım özelliği gibi) sadece sorgu/görüntüleme
  katmanında yerel saate (TR, UTC+3) çevrilerek yapılır — aksi halde gece geç saatteki bir
  antrenman yanlış güne düşebilir.
- **Swagger/OpenAPI**: geliştirme sırasında endpoint'leri test etmek için baştan açık tutulur.
- **Secrets**: JWT imzalama anahtarı ve connection string `appsettings.json`'a değil,
  user-secrets / ortam değişkenlerine yazılır — repoya commit edilmez.
- **Username case-insensitive olmalı**: karşılaştırma/uniqueness case-insensitive yapılır
  (örn. PostgreSQL'de `citext` tipi ya da kayıttan önce lowercase normalizasyonu) — yoksa
  "Efe" ve "efe" farklı kullanıcı sanılabilir.
- **Aynı isimde egzersiz tekrarı engellenmeli**: bir kullanıcının aynı isimde iki egzersiz
  eklemesi (veya var olan bir global egzersizin adını tekrar özel egzersiz olarak eklemesi)
  en azından uygulama katmanında kontrol edilmeli.

## Gelecek Fikirler (Şimdilik Yapılmayacak, Sadece Not)
- **Set arası koçluk önerileri**: Bir LLM, aynı session içindeki ardışık setlere bakıp (örn.
  tekrar sayısı düşüyor, `Rir` azalıyor) "yorgunluk artıyor, dinlenmeyi uzat" gibi öneriler
  verebilir. Bunun için `SetEntry.Rir` alanı şimdiden eklendi ki veri kaybolmasın. Üretilecek
  öneriler `AiInsight`'a `Kind = Suggestion` ve ilgili `SetEntryId` ile kaydedilir — ama öneri
  motorunun kendisi şimdi kurulmuyor, kapsam ve maliyet netleşince ele alınacak.

## Açık Sorular (varsayım yapmadan kullanıcıya sorulacak)
- [x] Auth / çoklu kullanıcı: `User` tablosu en baştan eklendi, basit username+password (JWT) yeterli.
- [x] .NET sürümü: **.NET 10** (LTS, Kasım 2028'e kadar destekli). .NET 9 (Watchtower'da
      kullanılan) 10 Kasım 2026'da destek dışı kalıyor, yeni bir proje için uygun değil.
- [x] PostgreSQL: Docker ile çalışılacak (`docker-compose.yml`, repo kökünde). Migration'ları
      sıfırdan test etmeyi kolaylaştırıyor ve gerçek deploy senaryosuna daha yakın (dev/prod
      parity). Uygulama kodu açısından fark yok — sadece bir connection string.
- [x] Rekor olarak işaretlenmiş bir set silinirse: o egzersiz için rekorlar yeniden hesaplanır
      (bkz. yukarıdaki `RecalculateRecords` notu).
- [x] AI-özet export: hem basit metin/JSON export hem `AiInsight` altyapısı kuruluyor; hangisinin
      ne zaman aktif olacağına maliyet netleşince karar verilecek.
