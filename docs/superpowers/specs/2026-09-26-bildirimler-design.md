# Bildirimler — tasarım (#325)

Tarih: 2026-09-26 · Issue: #325 · Platformlar: backend + mobil (web donduruldu, #326)

## Sorun

#324 ana sayfanın sağ üstüne bir zil ve **boş** bir bildirim ekranı (`mobile/app/(tabs)/bildirimler.tsx`)
getirdi. Bu iş o ekranı gerçek bildirimlerle doldurur ve zile okunmamış sayısı rozeti ekler.

## Kullanıcı kararları

- **Olaylar (ilk dilim):** yalnızca iki tür.
  - **Takip** — biri seni takip etti; takip karşılıklıysa "Artık arkadaşsınız".
  - **Rekor** — takip ettiğin biri bir antrenmanda kişisel rekor kırdı. Alıcı **takipçilerdir**, kişinin
    kendisi değil (kendi rekoru zaten set panelinde rozetle görünüyor).
- **Rekor yoğunluğu:** antrenman **bitince** tek bildirim; o antrenmanda rekor kırılan hareketler
  içinde listelenir. Set başına ya da anlık bildirim yok.
- **Okundu:** zilde okunmamış **sayısı** rozeti; bildirim ekranı açılınca **hepsi** okundu sayılır.
  Okunmamış satırlar o ziyaret boyunca vurgulu görünür. Tek tek okundu yapma yok.
- **Takip döngüsü:** aynı kişiden en fazla bir takip bildirimi. Takip bırakılınca bildirim kaybolur,
  yeniden takip edilince yeni zamanla en üste gelir.
- **Pencere:** son 30 gün, en fazla 50 bildirim, sayfalama yok.
- **Kapsam dışı:** push bildirimi (Expo / web push), haftalık hedef ve seri hatırlatmaları, GRINDY
  yorumu bildirimi, tek tek okundu/silme, web arayüzü.

## Yaklaşım — tablo yok, bildirimler sorgu anında türetilir

İki olayın ikisi de veritabanında zaten duruyor (`Follow` satırı; bitmiş `WorkoutSession` + rekorlu
`SetEntry`). Ayrı bir `Notification` tablosu bu satırlarla senkron kalması gereken ikinci bir doğruluk
kaynağı olurdu (set silme, rekor yeniden hesaplama, oturum silme, takibi bırakma, pasif hesap — her biri
"bildirimi de düzelt" kodu isterdi). Bu yüzden bildirimler mevcut foreign key'ler üzerinden join'lenen
sorgularla üretilir; okundu durumu için tek bir zaman damgası saklanır.

Tablo ancak türetilemeyen bir durum gerektiğinde açılır: push'un "gönderildi mi" durumu, veride izi
olmayan olaylar, bildirim başına okundu/silme ya da olay anındaki içeriğin dondurulması. Bu gün
geldiğinde o türe özel bir **kaynak** eklenir (aşağıda `INotificationSource`); API sözleşmesi ve
istemci değişmez.

## Backend

### Veri

- `User.NotificationsSeenAt` (`timestamp with time zone`, nullable, UTC) — kullanıcının bildirim
  ekranını en son açtığı an. `null` = hiç açmadı; penceredeki her bildirim okunmamıştır.
- Migration `dotnet ef migrations add BildirimGorulmeZamani` ile üretilir; veri taşımaz.
- Yeni tablo, yeni foreign key ve yeni indeks yok. Kullanılan mevcut indeksler: `Follow(FolloweeId)`,
  `Follow(FollowerId, FolloweeId)` (benzersiz), `WorkoutSession(UserId, StartedAt)`,
  `SetEntry(WorkoutSessionId)`.

### Bildirim türleri

| Tür (`NotificationKind`) | Kaynak | `occurredAt` |
|---|---|---|
| `Follow` | `Follow` satırı, `FolloweeId = ben` | `Follow.CreatedAt` |
| `Records` | Takip ettiğim kişinin `EndedAt IS NOT NULL` antrenmanı; içinde `RecordType <> None` en az bir set var; `EndedAt > benim onu takip ettiğim an` (`Follow.CreatedAt`) | `WorkoutSession.EndedAt` |

Ortak filtreler: işi yapan kişi pasif değil (`DeletedAt IS NULL`); `occurredAt >= şimdi − 30 gün`.

Sonuçlar:
- Takip bırakılınca (`Follow` satırı silinir) hem takip bildirimi hem o kişinin rekor bildirimleri kaybolur.
- Antrenman silinince (setler CASCADE) ya da rekorlar yeniden hesaplanıp rekorlu set kalmayınca rekor
  bildirimi kaybolur.
- Açık (bitmemiş) antrenman bildirim üretmez; takipten önce biten antrenman görünmez.
- Pasif hesabın olayları görünmez; hesap geri açılınca geri gelir (#281 kararıyla aynı).
- Rekorlar üç gizlilik seviyesinde de görünür olduğu için `PrivacyLevel` rekor bildirimini kısıtlamaz.

### Uçlar (`NotificationsController`, `[Authorize]`)

Kimlik token'dan gelir; hiçbir uç `userId` almaz.

- `GET /api/notifications` → `NotificationResponse[]`, `occurredAt` azalan (eşitlikte tür, sonra kaynak
  kimliği azalan — sıra deterministik), en fazla 50.
- `GET /api/notifications/unread-count` → `{ count }`.
- `POST /api/notifications/seen` → 204; `NotificationsSeenAt = şimdi` (`TimeProvider`), tek
  `SaveChangesAsync`.

`NotificationResponse`:
- `kind`: `Follow` | `Records`
- `occurredAt`: UTC
- `isUnread`: `NotificationsSeenAt is null || occurredAt > NotificationsSeenAt`
- `actor`: mevcut `UserSummaryResponse` (username, displayName, hasAvatar, avatarVersion, relation).
  `relation == Friends` ise istemci "Artık arkadaşsınız" yazar — karşılıklılık saklanmaz, iki `Follow`
  satırından okunur.
- `records`: yalnızca `Records` türünde; hareket başına bir satır —
  `{ exerciseId, exerciseName, weight, reps, recordType }`. Hareket başına en ağır rekor seti seçilir,
  ağırlık eşitse tekrarı fazla olan. Hareket adı `GET /api/users/{username}/records` ile aynı ad
  kuralından gelir. Satırlar hareketin o antrenmandaki sırasıyla (`SessionExercise.OrderIndex`; listede
  yoksa ilk setin `CreatedAt`'i) dizilir.
  `Follow` türünde `null`.

Okunmamış sayısı, listeyi üreten aynı hattan sayılır (`GET /api/notifications` ile tutarlı; en fazla 50).

### Katmanlar

- `INotificationSource` — `Task<IReadOnlyList<NotificationItem>> GetAsync(long userId, DateTime since,
  int limit, CancellationToken)`. İki uygulama: `FollowNotificationSource`, `RecordNotificationSource`.
  Her kaynak en fazla `limit` öğe döner; sorgular `INotificationRepository`'de yaşar (EF Core'a yalnızca
  repository dokunur).
- `NotificationService` — kaynakları toplar, birleştirir, sıralar, 50'ye keser, `isUnread`'i
  `NotificationsSeenAt`'e göre işaretler, `actor` özetlerini doldurur; görüldü işaretini yazar.
- `BestRecordPicker` (saf) — bir antrenmanın rekorlu setlerinden hareket başına en iyisini seçer.
- `FollowService`'teki özel `SummariesAsync` / `RelationsAsync` (avatar + ilişki ile `UserSummaryResponse`
  üretimi) ortak bir `UserSummaryBuilder` bileşenine taşınır; `FollowService` ve `NotificationService`
  ikisi de onu kullanır (DRY). Davranış değişmez.
- DI kaydı `Services/DependencyInjection.cs`'te; kaynaklar `IEnumerable<INotificationSource>` olarak
  enjekte edilir — yeni bir tür yeni bir kayıttır, servise dokunulmaz.

## Mobil

### Ortak paket (`packages/shared/src/api/queries.ts`)

- `schema.d.ts` backend OpenAPI'sinden yeniden üretilir.
- `useBildirimler()` → `GET /api/notifications`.
- `useOkunmamisBildirimSayisi()` → `GET /api/notifications/unread-count`.
- `useBildirimleriGorulduYap()` → `POST /api/notifications/seen`; başarıda **yalnızca** okunmamış sayısı
  sorgusu geçersiz kılınır (liste değil — açık ekrandaki vurgular kalır).
- Takip/bırak mutasyonları (`useTakipEt`) bildirim sorgularını da geçersiz kılar.

### Zil rozeti (`mobile/src/ui/KabukBaslik.tsx`, yalnızca `/`)

- Okunmamış > 0 ise zilin sağ üstünde küçük sayı rozeti; 9'dan büyükse `9+`. 0 ya da istek hatasında
  rozet çizilmez, zil yine çalışır.
- Rozet zemini `accent` — görsel tasarım spec'ine (Karar 2, `accent` kullanım kuralı) kullanıcı kararıyla
  eklenen bir kullanım olarak yazılır; iki temada kontrast `paletKontrast` ile doğrulanır.
- `accessibilityLabel` sayıyı taşır: "Bildirimler, 3 okunmamış" (`_one` / `_other`).
- Sayı ana sayfa odağa gelince ve uygulama ön plana dönünce tazelenir (`useFocusEffect` + mevcut
  `queryOdak.ts` `focusManager`'ı). Periyodik sorgu (polling) yok.

### Bildirimler ekranı (`mobile/app/(tabs)/bildirimler.tsx`)

- Açılınca liste çekilir; liste **başarıyla** geldikten sonra görüldü isteği bir kez atılır.
- Satırlar `mobile/src/components/BildirimSatiri.tsx`'te:
  - Solda `ProfilFotografi`, sağ altta göreli zaman (`formatGoreliTarih`, `useDil()`'in `dil`'i).
  - `Follow`: "**{ad}** seni takip etmeye başladı"; `relation == Friends` ise altında "Artık arkadaşsınız".
    Dokununca `/profile/u/[username]`.
  - `Records`: "**{ad}** {n} harekette rekor kırdı" (`_one`/`_other`); altında her hareket için
    "{hareket} · {ağırlık} × {tekrar}" (`formatWeight`). Dokununca `/profile/u/[username]/records`.
  - Ad: `displayName` varsa o, yoksa `username`.
  - `isUnread` satırlar hafif vurgulu zeminle çizilir (mevcut yüzey token'larından; yeni token gerekmez).
- Liste boşsa mevcut `BosDurum` kalır. Yükleniyor/hata durumları mevcut ekranların desenindedir; hata
  durumunda görüldü isteği atılmaz.
- Renkler `useRenkPaleti()` / `useIkonRenk()`'ten okunur (iki tema).

### Katalog

Bütün yeni metinler aynı commit'te `packages/shared/src/i18n/tr.ts` ve `en.ts`'e, `bildirimler` grubuna
eklenir: takip metni, arkadaşlık satırı, rekor başlığı (`_one`/`_other`), zil erişilebilir etiketi
(`_one`/`_other`), hata/tekrar dene metinleri (varsa `ortak`'taki kullanılır).

## Hata durumları

| Durum | Davranış |
|---|---|
| Liste isteği başarısız | Mevcut hata deseni + "Tekrar dene"; görüldü isteği atılmaz |
| Görüldü isteği başarısız | Kullanıcıya gösterilmez; rozet sonraki odakta sayıyı yine gösterir, bir sonraki açılışta tekrar denenir |
| Sayı isteği başarısız | Rozet çizilmez |
| Kimliksiz istek | 401 (mevcut JWT hattı; pasif hesabın token'ı zaten geçersiz) |

## Testler

Her test tek bir davranışı sabitler.

**Backend — saf:** `BestRecordPickerTests` — hareket başına en ağır set; ağırlık eşitse tekrarı fazla olan.

**Backend — servis** (`NotificationServiceTests`):
- Takip bildirim üretir; bırakılınca kaybolur; yeniden takip yeni zamanla en üste çıkar; karşılıklıysa
  `relation == Friends`.
- Yalnızca bitmiş ve rekorlu antrenman bildirim üretir (açık ya da rekorsuz üretmez); takipten önce
  biten görünmez; antrenman silinince ya da rekorlar yeniden hesaplanıp rekorlu set kalmayınca kaybolur.
- Pasif hesabın olayları görünmez; 30 günden eski gelmez; en fazla 50; yeniden eskiye sıralı.
- `NotificationsSeenAt` öncesi okunmuş, sonrası okunmamış; `null` ise hepsi okunmamış; okunmamış sayısı
  listedekilerle tutarlı.

**Backend — entegrasyon** (`NotificationEndpointsTests`): kimliksiz 401; iki kullanıcı yalnızca kendi
bildirimlerini görür (IDOR); `POST seen` 204 ve ardından sayı 0.

**Backend — veri:** `Grind.Tests.Data` filtresi yeni sütunu kapsar.

**Ortak paket:** `katalog.test.ts` yeşil.

**Mobil** (jest-expo):
- `BildirimSatiri.test.tsx` — takip metni ve arkadaşlık satırı; rekor satırı hareketleri ve sayıya bağlı
  metni; dokununca doğru rota.
- `KabukBaslik.test.tsx` — okunmamış varsa rozet, 0 ise yok; 9'dan büyükte `9+`; etiket sayıyı taşır.
- `bildirimler` ekran testi — liste gelince görüldü bir kez gider; liste boşsa boş durum; hata
  durumunda görüldü gitmez.

**Bitti sayılmadan önce:** ilgili backend testleri + `Grind.Tests.Data`; `mobile` ve `@grind/shared`
testleri ve tip kontrolü yeşil; mobilde iki hesapla gözle denenmiş (biri takip eder ve rekorlu bir
antrenmanı bitirir, diğeri rozeti ve listeyi görür).

## Doküman değişiklikleri (aynı iş)

- `CLAUDE.md`:
  - Domain Modeli → `User`'a `NotificationsSeenAt`.
  - Yetkilendirme Kuralı istisnası → rekor bildirimi, takip edilen kişinin rekorlu antrenmanını
    (hareket adı, ağırlık, tekrar, rekor türü) takipçiye gösterir; rekorlar zaten üç seviyede de açık
    olduğu için yeni bir paylaşım değildir ama başkasının verisine açılan yeni bir yüzey olarak buraya
    yazılır. Not, ölçü, AI yorumu paylaşılmaz.
  - Kapsam ve Sıra → bildirimler maddesi (yaklaşım: sorgu anında türetme, tablo yok).
- Görsel tasarım spec'i → zil rozetinde `accent` kullanımı.
- Issue #325'e not: web donduruldu (#326), yalnızca mobil ve backend yapıldı.
