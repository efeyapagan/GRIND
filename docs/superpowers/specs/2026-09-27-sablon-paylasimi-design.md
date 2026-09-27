# Şablon Paylaşımı ve Kaydetme — Tasarım (#467)

## Amaç

Kullanıcılar antrenman şablonlarını arkadaşlarıyla (karşılıklı takip) paylaşabilsin; bir
arkadaşın paylaştığı şablon beğenilirse kendi hesaba **anlık görüntü olarak** kopyalanıp
oradan doğrudan antrenman başlatılabilsin. Yalnızca `mobile/` kapsamındadır (web donduruldu,
#326).

## Kapsam kararları (kullanıcıyla netleşti)

- Paylaşım **arkadaşlık (karşılıklı takip) şartlıdır** — `History`/`Records`'taki gibi
  arkadaşlıksız/`PrivacyLevel`-tabanlı herkese açık model burada kullanılmaz. Arkadaş olmayana
  da açma ("influencer" senaryosu) **gelecek bir iş** olarak not edilir, bu issue'da
  yapılmaz.
- Başkasının profilinde "Şablonlar" sekmesi **sadece arkadaşsan** render edilir; arkadaş
  değilsen sekme hiç görünmez (History/Records'taki "her zaman görünür + boş durum" deseninin
  aksine).
- Kaydetme sırasında isim çakışması olursa **otomatik ayırt edici eklenir** (kaynak kullanıcı
  adı isme eklenir), 409 hatası dönülmez.

## Veri Modeli

`WorkoutTemplate`'e iki yeni alan:

- **`IsSharedOverride`** (`bool?`) — şablonun paylaşım durumunu hesabın varsayılanına göre
  tersine çeviren bayrak. Hesaplanmış "görünür mü" değeri **saklanmaz**.
  - `null` → varsayılan: hesabın `PrivacyLevel`'i `Acik`/`Kisitli` ise paylaşımda, `Gizli` ise
    paylaşımda değil.
  - `true` → hesap `Gizli` olsa da bu şablonu istisnai olarak paylaşıma aç.
  - `false` → hesap `Acik`/`Kisitli` olsa da bu şablonu istisnai olarak herkesten gizle.
- **`SavedFromUserId`** (`long?`, FK → `User`, `RESTRICT`) — `null` ise kendi oluşturduğun
  şablon; dolu ise bir arkadaştan kaydedilmiş kopya. Kullanıcı adı değiştirme ucu olmadığı için
  canlı join ile "kimden kaydedildi" bilgisi her zaman doğru kalır — ayrı bir string alan
  kopyalanmaz (DRY, 3NF).

Migration: `dotnet ef migrations add SablonPaylasimi`, elle SQL yazılmaz (CLAUDE.md).

`TemplateResponse`'a yeni alan: **`LastUsedAt`** (`DateTime?`) — bu şablonla en son ne zaman
antrenman başlatıldığı (`WorkoutSession.StartedAt` üzerinden sorgulanır, saklanmaz). Hem kendi
şablonlarında hem kaydedilenlerde dolabilir; mobil yalnızca kaydedilenler listesinin
sıralamasında kullanır.

## Yetkilendirme ve Servisler

### `IFriendshipService` (yeni)

```csharp
Task<bool> AreFriendsAsync(long userId1, long userId2, CancellationToken ct = default);
```

`Follow` tablosunda karşılıklı satır (`A→B` ve `B→A`) var mı diye bakar. Tek yerde yaşar,
ileride başka bir arkadaşlık-şartlı özellik de bunu kullanır (DRY).

### `ISharedTemplateService` (yeni — `PublicActivityService`'ten AYRI bir kapı)

- **`GetSharedTemplatesAsync(username)`** — hedef aktif değilse/yoksa 404. Arkadaş değilsen
  **boş liste** döner (403 değil — arkadaşlık eksikliği bir yetki hatası değil, görünürlük
  kuralıdır). Arkadaşsan: hedefin şablonları `IsSharedOverride` + `PrivacyLevel` ile
  çözümlenip yalnızca görünenler döner.
- **`GetSharedTemplateDetailAsync(username, templateId)`** — yukarıdaki görünürlük kümesinde
  değilse `NotFoundException` (mevcut "Şablon bulunamadı" metniyle aynı, sızıntı yok — IDOR
  koruması).
- **`SaveTemplateAsync(username, templateId)`** — aynı görünürlük kontrolünden geçer, sonra
  egzersiz listesini o anki haliyle kopyalar (`WorkoutTemplateService.ReplaceExercisesAsync`
  ile aynı desen), `SavedFromUserId` set eder. İsim çakışırsa `"{ad} ({kaynakKullaniciAdi})"`
  ile yeniden dener (kullanıcı adı benzersiz olduğu için sonsuz döngü riski yok).

### Uçlar

Yeni `SharedTemplatesController`, mevcut `TemplatesController`'a (`/api/templates`) dokunmaz:

- `GET /api/users/{username}/templates` — `GetSharedTemplatesAsync`
- `GET /api/users/{username}/templates/{id}` — `GetSharedTemplateDetailAsync`
- `POST /api/users/{username}/templates/{id}/save` — `SaveTemplateAsync`, yeni `TemplateResponse` döner
- `PUT /api/templates/{id}/sharing` — gövde `{ "override": true | false | null }`. Mevcut
  `PatchTemplateRequest`'e eklenmez çünkü orada `null` zaten "dokunma" anlamına geliyor;
  override'ı bilerek `null`'a (varsayılana dön) çevirmek gerekebilir, bu yalnızca bu ucun tek
  işi olduğu için ambiguity yok.

Tüm uçlar `Follow`/`PrivacyLevel`/sahiplik kontrolünü **servis katmanında açıkça** yapar
(CLAUDE.md Yetkilendirme Kuralı — yalnızca Id ile sorgulayıp kontrolü atlamak IDOR'dur).

## Mobil Arayüz

### Başkasının profilinde "Şablonlar" sekmesi

`mobile/app/(tabs)/profile/u/[username]/_layout.tsx`: kendi profilde Ölçümler'in olduğu en
sağ konumda, ama **sadece `relation === 'Friends'`** ise `sekmeler` dizisine eklenir (mevcut
`gizli` filtresinin yanına yeni bir koşul). Yeni route:
`profile/u/[username]/templates.tsx` — `GetSharedTemplatesAsync`'i listeler, mevcut boş durum
deseniyle tutarlı.

Detay ekranı: `profile/u/[username]/templates/[id].tsx` — salt-okunur (egzersiz listesi, hedef
set sayıları), kendi şablon düzenleme formunu KULLANMAZ. En üstte **"Şablonu kaydet"**
düğmesi; basınca `SaveTemplateAsync` çağrılır, başarı onayı gösterilir.

### Antrenman sekmesi → "My Templates" altında kaydedilenler listesi

`SablonlaBasla.tsx` içine, mevcut `SablonKaruseli`'nin altına yeni bir bölüm. Yeni bileşen
`SablonKayitliKarti.tsx`:

- Yatay, uzun dikdörtgen kart. Eni `SablonVitrinKarti` ile aynı, boyu `KART_YUKSEKLIGI`'nin
  (272) yarısı (136).
- Sağ ucunda turuncu (`bg-accent/20` zemin, `accentSoft` ikon) kutuda `Dumbbell` ikonu —
  `SablonVitrinKarti`'deki rozet deseniyle aynı, dikdörtgene sığdırılmış.
- İçerik: şablon adı + kimden kaydedildiği (`sablonlar.kaydedilenKaynak`, `{{kullaniciAdi}}`
  parametreli) + kategori piktogramı (`SablonFiguru`, küçük boyut).
- Kartın **her yeri** dokununca direkt antrenman başlatır (büyük kare kartlarla aynı
  davranış) — ayrı bir "başlat" düğmesi yok.
- Basılı tutma → mevcut `SablonMenusu` açılır: "Düzenle" kendi kopyanı (`/templates/{id}`,
  mevcut form değişmeden çalışır), "Sil" yalnızca bu satırı kaldırır; orijinal sahibin şablonu
  etkilenmez.
- **Sıralama**: `useTemplates()`'ten gelen liste `SavedFromUserId != null` olanlara ayrılır,
  her biri `LastUsedAt`'e göre azalan sıralanır (istemci tarafında — küçük liste, ekstra uç
  gerekmiyor). Bu, kendi şablonlarının manuel `OrderIndex` sıralamasından (#344) kasıtlı
  olarak farklıdır.

## Çok Dil (ZORUNLU)

Aynı commit'te `tr.ts` + `en.ts`'e eklenecek anahtarlar: sekme adı (`kabuk.sekmeSablonlar`),
"Şablonu kaydet" düğmesi + erişilebilirlik etiketi, "kimden kaydedildi" alt metni
(`sablonlar.kaydedilenKaynak`), kaydetme başarı/hata mesajları, boş durum metinleri, gerekiyorsa
yeni Düzenle/Sil erişilebilirlik etiketleri (kaydedilen kart için).

## Test Planı

- **Backend (xUnit)**: `IFriendshipService` (karşılıklı / tek yönlü / hiç takip yok);
  `ISharedTemplateService` görünürlük matrisi (Açık/Kısıtlı/Gizli × override
  null/true/false × arkadaş/değil); kaydetme (isim çakışması → otomatik ayırt edici,
  egzersiz anlık görüntüsü, `SavedFromUserId` set edilmesi); IDOR — arkadaş olmayanın
  detay/kaydet ucuna 404.
- **Mobil (jest-expo)**: sekme koşullu render (arkadaş/değil); kaydedilen kart dokunma
  davranışı; sıralama mantığı (son kullanıma göre).
- **Ortak paket**: `katalog.test.ts`, `cevrilmemisMetin.test.ts`.

## Kenar Durumlar

- Kaydettikten sonra arkadaşlıktan çıkılırsa: kopya etkilenmez (bağımsız satır).
- Kaynak hesap pasifleştirilirse (soft-delete): kopya etkilenmez; kullanıcı adı rezerve
  kaldığı için "kimden kaydedildi" join'i çalışmaya devam eder.
- Kaynak şablon silinirse: kopya bağımsız `WorkoutTemplate` satırı olduğu için etkilenmez.
- Aynı şablonun birden fazla kez kaydedilmesi engellenmez; her seferinde yeni bir kopya
  oluşur, isim çakışması otomatik ayırt edilir.

## Gelecek İşi (bu issue'da yapılmayacak)

- Arkadaş olmayana da şablon paylaşımı açma ("influencer" senaryosu) — `PrivacyLevel`
  tabanlı, arkadaşlıksız bir görünürlük modeli. Şimdilik not, ayrı bir issue.
