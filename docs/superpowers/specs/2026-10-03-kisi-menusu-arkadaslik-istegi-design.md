# Kişi menüsü + arkadaşlık isteği (#628) — tasarım

Tarih: 2026-10-03 · Issue: #628 · Kapsam: backend + `packages/shared` + `mobile/` (web donduruldu, #326)

## Amaç
Başkasının profilinde Instagram düzeni kurulacak: solda takip düğmesi, sağda arkadaşlık düğmesi.
- Takip ediyorsan sol düğme **"Takiptesin ⌄"** olur ve bir kişi menüsü açar.
- Arkadaşlık bir **istekle** kurulur. İstek kabul edilince iki taraf birbirini takip eder.
- Sessize alınan kişiden hiçbir bildirim gelmez.
- Kendi takip listelerinde her satırda listeye göre bir düğme bulunur.

**Kısıtla** bu dalda YOK: kapsamını kullanıcı sonra belirleyecek. Menüde ölü bir satır olarak da durmaz.

## Kullanıcı kararları (2026-10-03)
1. Arkadaş = karşılıklı takip, saklanmaz (#281 değişmez).
2. "Arkadaş olarak ekle" bir istek gönderir. **Kabul** edilince eksik takip satırları oluşturulur ve iki taraf arkadaş olur. **Ret** takipleri değiştirmez.
3. **Arkadaşlıktan çıkar yalnızca onun BENİ takibini kaldırır; ben takipte kalırım** (2026-10-04, ilk karar olan "iki yön"ün yerini aldı).
   - Arkadaşlık biter: `Friends` kademesindeki şablonlar, haftalık hedef bildirimi, karşılaştırma ve arkadaş listesi kapanır.
   - Takibe bağlı olanlar sürer: rekor bildirimleri. Gizlilik seviyesine bağlı olanlar da sürer: geçmiş ve rekorlar.
   - Bağlantıyı tamamen koparmak isteyen ayrıca "Takibi bırak" der.
   - Veri işlemi olarak "Takipçiden çıkar"ın aynısıdır; aynı uç kullanılır, yalnızca etiket ve onay metni farklıdır.
4. Karşılıklı istek **otomatik kabul edilmez**: iki istek ayrı ayrı bekler.
5. Aynı kişiye **üst üste 3 ret** olduysa yeni istek gönderilemez.
6. **Sessize al**, o kişiden gelen TÜM bildirim türlerini kapatır. Takip sürer.

## Bu spec'te alınan kararlar
- **Geri çekilen istek 3'lük sınıra sayılmaz.** Satır silinir. Sınırın amacı karşı tarafı rahatsız etmemek; geri çekilen istek karşı tarafa bir "hayır" yükü bindirmez.
- **Sessize alma takip satırında yaşar** (`Follow.NotificationsMuted`).
  - Menü yalnızca takip ederken açılır. Takibi bırakınca sessize alma da kalkar.
  - Ayrı bir tablo olsaydı takip bittikten sonra sessizden çıkaracak bir arayüz kalmazdı.
  - Sonuç: takip etmediğin birini sessize alamazsın. Seni takip eden ama senin takip etmediğin birinin "seni takip etti" bildirimi gelmeye devam eder.
- **Ret sayacı saklanmaz.** Reddedilen istek satırı `RejectedAt` ile durur ve sayılır. Ayrı bir sayaç ikinci bir doğruluk kaynağı olurdu (CLAUDE.md DRY/3NF).
- **Kabul sırasında çiftin TÜM istek satırları silinir** (iki yön, bekleyen ve reddedilmiş). Böylece ret sayacı sıfırlanır ve karşı yöndeki bekleyen istek temizlenir.
- **Arkadaşlıktan çıkar ve takipçiden çıkar istek satırlarına dokunmaz.** Arkadaşken bekleyen istek zaten olmaz. Reddedilmiş satırlar da kabulde silindiği için arkadaşlık boyunca kalmaz.
- **Arkadaşken istek gönderilmez.** Tek istisna, karşılıklı takip zaten varken istek göndermektir: idempotent 204 döner ve satır açılmaz.

## Veri modeli

### `FriendRequest` (yeni)
| Alan | Not |
|---|---|
| `Id` | |
| `RequesterId` | FK → User, RESTRICT |
| `TargetId` | FK → User, RESTRICT |
| `CreatedAt` | UTC |
| `RejectedAt` | nullable UTC. `null` = bekliyor, dolu = reddedildi |

- **Bekleyen istek benzersiz:** `(RequesterId, TargetId)` üzerinde, filtresi `RejectedAt IS NULL` olan benzersiz indeks.
- **Kendine istek yok:** CHECK `RequesterId <> TargetId`.
- **Pasif hesaplar:** satırlar silinmez (Follow ile aynı). Sorgular pasif kişileri dışarıda bırakır.

### `Follow` (değişen)
- `NotificationsMuted bool NOT NULL DEFAULT false` eklenir. Anlamı: `FollowerId`, `FolloweeId`'den gelen bildirimleri istemiyor.

Migration `dotnet ef migrations add` ile üretilir. Veri taşınmaz.

## Uçlar
Hepsi `UsersController`'da (`api/users/{username}/...`). Hedef kullanıcı adıyla verilir; pasif ya da olmayan hedef 404. Kimlik yalnızca token'daki `currentUserId`'den alınır. Kendine yönelik her işlem 400.

| Uç | Davranış |
|---|---|
| `POST {u}/friend-request` | Karşılıklı takip zaten varsa → 204 (no-op). Benden ona bekleyen istek varsa → 204 (no-op). Benden ona gönderilmiş ve reddedilmiş (`RejectedAt` dolu) istek sayısı ≥ 3 ise → 400. Değilse satır açılır → 204. Eşzamanlı ikinci istek benzersiz indekse takılırsa yutulur (FollowAsync deseni). |
| `DELETE {u}/friend-request` | Benden ona bekleyen isteği siler. Yoksa no-op. 204. |
| `POST {u}/friend-request/accept` | Ondan bana bekleyen istek yoksa → 404. Varsa: eksik `Follow` satırları eklenir (o→ben, ben→o), çiftin tüm `FriendRequest` satırları silinir; tek `SaveChangesAsync`. 204. |
| `POST {u}/friend-request/reject` | Ondan bana bekleyen istek yoksa → 404. Varsa `RejectedAt = now`. 204. |
| `DELETE {u}/follower` | o→ben takip satırı silinir. İdempotent, 204. "Takipçiden çıkar" ile "Arkadaşlıktan çıkar"ın ikisi de bu uçtur. |
| `PUT {u}/mute` gövde `{ "muted": bool }` | ben→o takip satırı yoksa → 400. Varsa alan yazılır. 204. |

İş mantığı yeni bir `FriendRequestService`'te yaşar (istek, geri çekme, kabul, ret). Takipçiden çıkar (= arkadaşlıktan çıkar) ve sessize al takip satırıyla ilgili olduğu için `FollowService`'e eklenir.

### Profil yanıtı (`UserProfileResponse`) — yeni alanlar
- `friendRequest`: `None` | `Sent` | `Received` (bekleyen istek yönü; karşılıklı takipte her zaman `None`)
- `canSendFriendRequest`: `false` = 3 ret sınırına ulaşıldı. Kendi profilinde `false`.
- `notificationsMuted`: ben→o satırındaki değer. Takip yoksa `false`.

`UserSummaryResponse` değişmez. Liste satırları bu alanlara ihtiyaç duymaz.

## Bildirimler
- **Yeni tür `NotificationKind.FriendRequest`:** kaynağı `FriendRequestNotificationSource`, satırı bana gelen **bekleyen** istek. `OccurredAt = CreatedAt`, aktör isteği gönderen kişi.
  - Kabul ya da ret edilince bildirim kaybolur (satır yok ya da artık bekliyor değil). Bu, #325'teki "türetilir" ilkesiyle uyumludur.
  - Okunmamış sayısına da dahildir.
- **Kabul sonrası:** isteği gönderen kişi ayrı bir türe gerek kalmadan mevcut `Follow` bildirimini ("seni takip etti · Artık arkadaşsınız") alır.
- **Sessize alma süzgeci:** her kaynak sorgusunda, aktör `A` için ben→A takip satırında `NotificationsMuted = true` olan satırlar dışarıda kalır. Kural tek yerde, `NotificationRepository` sorgularının ortak bir süzgecinde durur. Dört tür de (`Follow`, `Records`, `WeeklyGoal`, `FriendRequest`) bu süzgeçten geçer.

## Yetkilendirme
- Kabul ve ret yalnızca isteğin **hedefi**, geri çekme yalnızca **gönderen** tarafından yapılabilir. Servis isteği her zaman `(RequesterId, TargetId)` çiftiyle, çiftin bir ucu `currentUserId` olacak şekilde arar. İstek Id ile ASLA aranmaz, bu yüzden IDOR yüzeyi yoktur.
- Takipçiden çıkar yalnızca `FolloweeId = currentUserId` satırını, sessize al yalnızca `FollowerId = currentUserId` satırını değiştirir.
- Bu uçlar antrenman verisi paylaşmaz. Yetki istisnası genişlemez.

## Paylaşılan paket (`packages/shared`)
- **Tip ve sorgular:** `schema.d.ts` yeniden üretilir (CLAUDE.md'deki sabit sürüm komutuyla). `api/queries`'e mutasyonlar eklenir: `useArkadaslikIstegi` (gönder/geri çek), `useArkadaslikYaniti` (kabul/ret), `useTakipcidenCikar` (arkadaşlıktan çıkar da bunu kullanır), `useSessizeAl`.
  - Hepsi başarı sonrası profil, takip listeleri ve bildirim sorgularını geçersiz kılar (`useTakipEt` ile aynı tazeleme).
- **`lib/takip.ts` saf eşlemeler:**
  - `arkadaslikDugmesi(profil)`: ilişki + `friendRequest` + `canSendFriendRequest` → `{ durum: 'ekle' | 'gonderildi' | 'gelen' | 'arkadas' | 'sinirDoldu', etiketAnahtari }`. Kendisi için `null`.
  - `takipMenusuAcilir(iliski)`: `Following` | `Friends` için true. Sol düğme bu durumda "Takiptesin ⌄" olur.
  - `listeSatiriEylemi(liste, kendiListem, iliski)`: kendi listemde `friends` → `arkadasliktanCikar`, `following` → `takibiBirak`, `followers` → `takipcidenCikar`. Başkasının listesinde `null` (bugünkü takip düğmesi).
- **i18n:** yeni metinler `takip` ve `bildirimler` gruplarında, `tr.ts` + `en.ts` aynı commit'te.

## Mobil
- **`ProfilBasligi` düğme satırı** (`u/[username]/_layout.tsx`):
  - Sol: `TakipDugmesi`. "Takip et" ve "Geri takip et" bugünkü gibi doğrudan çalışır. Takip ediyorsan **"Takiptesin ⌄"** olur ve `KisiMenusu`'nü açar.
  - Sağ: `ArkadaslikDugmesi`. İki düğme eşit genişliktedir.
  - Ad yanındaki "Arkadaş" rozeti kalkar; bilgi artık sağ düğmede.
- **`ArkadaslikDugmesi`** durumları:
  - `ekle`: istek gönderir.
  - `gonderildi`: basınca geri çeker.
  - `gelen` ("İsteği yanıtla"): basınca Kabul et / Reddet seçeneklerini açar.
  - `arkadas` ("Arkadaşsınız"): basınca arkadaşlıktan çıkarma onayını açar.
  - `sinirDoldu`: pasif, "İstek gönderilemez".
- **`KisiMenusu`:** alttan açılan cam sayfa (Karar 9, `CamKatmanlari`).
  - Üstte fotoğraf ve kullanıcı adı, sağ üstte kapat.
  - Satırlar sırasıyla: arkadaşlık satırı (ekle / İstek gönderildi / Arkadaşlıktan çıkar — `arkadaslikDugmesi` ile aynı eşleme), Sessize al / Sessizden çıkar, Takibi bırak.
  - Yıkıcı satırlar (Arkadaşlıktan çıkar, Takibi bırak) menünün içinde onay sorar. Başarıda menü kapanır.
- **`KullaniciSatiri` / `TakipListesi`:**
  - Kendi listende (`ad` = ben) satırın sağında `listeSatiriEylemi` düğmesi bulunur ve basınca onay sorar.
  - Başkasının listesinde bugünkü takip düğmesi ya da "Arkadaş" rozeti kalır.
- **`BildirimSatiri`:** `FriendRequest` türünde "{{ad}} sana arkadaşlık isteği gönderdi" metni ve satır içinde **Kabul et / Reddet** düğmeleri gösterilir. Satıra dokunmak bugünkü gibi profili açar.
- **Çevrimdışı (#174):** bu eylemlerin hepsi `useCevrimiciEylem` ile korunur.

## Hata durumları
- İşlem başarısız olursa bugünkü `takip.islemYapilamadi` metni düğmenin ya da menünün altında gösterilir.
- 3 ret sınırına ulaşıldığında istemci düğmeyi zaten pasif çizer. Sunucunun 400'ü de aynı metne düşer.
- Bildirimden kabul/ret yaparken istek bu arada geri çekilmişse 404 gelir. Liste tazelenir ve satır kaybolur; ayrı bir hata metni gösterilmez.

## Testler
Her test tek bir karar kalemini sabitler.
- **Backend servis:**
  - istek açılır
  - arkadaşken no-op
  - 3 retten sonra 400, geri çekilen sayılmaz
  - kabul iki takibi oluşturur ve çiftin isteklerini siler
  - ret takipleri değiştirmez
  - başkasının isteğini kabul edemez (404)
  - takipçiden çıkar (= arkadaşlıktan çıkar) yalnızca o→ben satırını siler, ben takipte kalırım
  - takip etmeden sessize alma 400
  - sessize alınan aktör dört bildirim türünde de görünmez
  - FriendRequest bildirimi yalnızca bekleyen istekten gelir
- **Backend entegrasyon:** yeni uçların yönlendirmesi ve durum kodları (uç başına bir mutlu yol + 404).
- **Data:** `ModelShapeTests` yeni entity'yi içerir. CHECK ve kısmi benzersiz indeks test edilir.
- **Shared:** `arkadaslikDugmesi`, `takipMenusuAcilir`, `listeSatiriEylemi` tabloları.
- **Mobil:**
  - `ArkadaslikDugmesi` durum → eylem
  - `KisiMenusu` satırları ve onay
  - kendi listesindeki satır düğmesi
  - `BildirimSatiri` Kabul/Reddet
  - `cevrilmemisMetin` ve `katalog` yeşil

## CLAUDE.md güncellemesi
- Domain Modeli'ne `FriendRequest` ve `Follow.NotificationsMuted` eklenir.
- Takip/arkadaşlık kararının altına arkadaşlık isteği notu eklenir.
- Kapsam listesine #628 satırı eklenir.
