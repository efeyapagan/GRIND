# Exercise Tasarımı — Listeleme, Sahiplik, Medya

**Tarih:** 2026-09-02
**Kapsam:** PLAN.md Faz 5
**Durum:** ✅ Onaylandı (2026-09-02) — altı sorunun da A seçeneği

## Bu Doküman Ne Değildir

CLAUDE.md sahiplik kuralını, `Exercise`'in soft-delete ile arşivlendiğini, isim çakışmasının
en azından uygulama katmanında kontrol edileceğini ve medyanın ayrı bir `ExerciseMedia`
tablosunda durduğunu zaten söylüyor. Faz 3 hata çevirisini, Faz 4 kimliği çözdü. Bu doküman
onları tekrar etmez; yalnızca Faz 5'in açık bıraktığı kararları kayda geçirir. Çelişki olursa
CLAUDE.md kazanır.

**Bu faz kalıbı belirliyor.** Faz 6 (Template), 7 (Session), 8 (SetEntry), 10 (BodyWeightLog)
aynı sahiplik desenini miras alacak. Burada verilen kararlar dört fazı birden bağlar.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- Kullanıcı SADECE kendi (`UserId = currentUserId`) veya global (`UserId = null`) egzersizi görür.
- Başkasının özel egzersizi → **404**, 403 değil (Faz 3 kararı, enumerasyon sızıntısı).
- Global egzersiz düzenlenemez/arşivlenemez → **403** (`ForbiddenException`; kaydın varlığı
  zaten biliniyor, orada 404 yanlış olurdu).
- Silme yok, arşivleme var (`IsArchived = true`) — geçmiş `SetEntry`/`TemplateExercise` bozulmasın.
- Repository katmanı hazır: `GetVisibleAsync(userId, includeArchived)`, `GetVisibleByIdAsync(id, userId)`,
  `NameExistsAsync(userId, name)` (büyük/küçük harf gözetmez, arşivlileri de sayar).

---

## Önce: tasarımda bir boşluk

`ExerciseMedia`'nın **sahibi yok** — yalnızca `ExerciseId` taşıyor. Bu, global bir egzersize
medya eklenmesine izin verirsek şu anlama gelir: bir kullanıcının eklediği video **bütün
kullanıcılara** görünür. Tek kullanıcılı bugünkü halde zararsız görünüyor ama paylaşılan bir
kaynağı tek kullanıcının yazabilmesi, sahiplik kuralının tam olarak engellemek için var olduğu
şey. Aşağıdaki Soru 2 bunu karara bağlıyor.

---

## Karar bekleyen altı soru

### Soru 1 — Fallback authorization policy şimdi eklensin mi?

Faz 4'ten devreden not bunu Faz 5 başına bırakmıştı. Şu an `AddAuthorization()` hiçbir
`FallbackPolicy` olmadan çağrılıyor: **işaretlenmeyen her endpoint anonim erişime açık.**

**A — Şimdi eklensin (önerim).** `options.FallbackPolicy = new AuthorizationPolicyBuilder()
.RequireAuthenticatedUser().Build()`. Bundan sonra `[Authorize]` yazmayı unutmak endpoint'i
açıkta bırakmaz, kapatır — "fail closed". `AuthController`'daki `[AllowAnonymous]` da fiilen
işlevsel hâle gelir. Bu fazın ilk korumalı controller'ını yazarken bunu yapmamak, tam olarak
hatanın en ucuz olduğu anı kaçırmak olur.

**B — Her controller'a tek tek `[Authorize]`.** Daha az global değişiklik. Bedeli: Faz 6-13
boyunca her yeni controller'da unutulabilecek, unutulduğunda sessizce açık kalacak bir satır.

> Not: Swagger UI'ın fallback policy'den etkilenip etkilenmediği plan yazılırken deneyle
> doğrulanacak; etkileniyorsa Swagger endpoint'leri açıkça muaf tutulur. Kararı değiştirmez.

### Soru 2 — Global bir egzersize medya eklenebilsin mi?

**A — Hayır, yalnızca kendi egzersizine (önerim).** Global egzersize medya eklemek → **403**,
tıpkı global egzersizi düzenlemek gibi. Sebep yukarıdaki boşluk: `ExerciseMedia`'nın sahibi
olmadığı için eklenen medya herkese görünür olurdu; bir kullanıcı paylaşılan listeyi
kirletebilirdi. Bu, "düzenleyemezsin" kuralının medyaya da uzanması demek — tutarlı.

**B — Evet, herkes global egzersize medya ekleyebilsin.** Ortak bir kütüphane oluşur.
Bedeli: `ExerciseMedia`'ya `UserId` eklemeden bu güvenli değil; eklemek de bu fazın kapsamını
şişirir (yeni migration, yeni sahiplik kuralı, "kimin medyası görünür" sorusu).

> Karar A ise: global egzersizlerin medyası ileride seed data ile eklenebilir — bu şimdi
> yapılmıyor, sadece yol açık bırakılıyor.

### Soru 3 — Arşivleme/geri alma endpoint'leri nasıl görünsün?

**A — `DELETE /api/exercises/{id}` = arşivle, `POST /api/exercises/{id}/restore` = geri al (önerim).**
İstemci tarafında `DELETE` beklenen fiil; soft-delete olduğu sunucunun iç kararı. Geri alma
ayrı ve açık bir aksiyon. Yanıt: her ikisi de **204 No Content**.

**B — `PUT /api/exercises/{id}` gövdesinde `IsArchived` alanı.** Tek endpoint. Bedeli:
arşivleme ile yeniden adlandırma aynı isteğe karışır; "sadece arşivle" demek için tüm
nesneyi göndermek gerekir.

### Soru 4 — Yeniden adlandırmada isim çakışması nasıl kontrol edilecek?

`NameExistsAsync(userId, name)` bugün kaydın kendisini de sayıyor. Yani bir egzersizin
yalnızca kategorisini değiştirmek — ya da adını aynı bırakmak — **yanlışlıkla 409** verir.

**A — Repository'ye `excludeId` eklensin (önerim).**
`NameExistsAsync(long userId, string name, long? excludeId = null, ...)`. Kontrol tek yerde
kalır, servis katmanı SQL kurmaz (Faz 2'nin "IQueryable sızdırılmaz" kararına uygun).

**B — Servis, dönen kaydı okuyup kendi Id'siyle karşılaştırsın.** Repository'ye dokunmadan.
Bedeli: `NameExistsAsync` bool döndüğü için bunu yapamaz; ayrıca bir "isme göre getir" metodu
gerekir ve mantık iki yere dağılır.

### Soru 5 — Medya URL'i ne kadar sıkı doğrulansın?

**A — Mutlak `http`/`https` URI zorunlu, en fazla 500 karakter (önerim).**
`javascript:` ve `data:` şemaları bilerek reddediliyor: bu alan ileride bir arayüzde `<video src>`
ya da bağlantı olarak render edilecek ve o şemalar orada doğrudan XSS taşıyıcısıdır. Doğrulamayı
veriyi kabul ederken yapmak, render eden koda güvenmekten ucuz.

**B — Yalnızca `[Required]` + uzunluk.** Daha esnek (yerel dosya yolu, göreli yol vb.).
Bedeli: yukarıdaki.

### Soru 6 — Listeleme hangi filtreleri alsın?

**A — Yalnızca `includeArchived` (varsayılan `false`) (önerim).** Repository zaten bunu
destekliyor. Kategori/isim filtresi eklenmiyor: kişisel ölçekte liste birkaç düzine satır,
istemci kendi filtreler (YAGNI).

**B — Kategori ve isim araması da eklensin.** İleride gerekebilir. Bedeli: bugün kullanılmayan
sorgu yüzeyi ve test yükü.

---

## Önerilen tasarım (A + A + A + A + A + A)

```
src/Grind.Api/
├─ Models/Dtos/Exercise/
│  ├─ ExerciseResponse.cs        Id, Name, Category, IsArchived, IsGlobal, Media[]
│  ├─ ExerciseMediaResponse.cs   Id, MediaType, Url, CreatedAt
│  ├─ CreateExerciseRequest.cs   Name, Category
│  ├─ UpdateExerciseRequest.cs   Name, Category
│  └─ AddMediaRequest.cs         MediaType, Url
├─ Services/
│  ├─ IExerciseService.cs
│  └─ ExerciseService.cs
└─ Controllers/
   └─ ExercisesController.cs
```

**Endpoint'ler** (hepsi `[Authorize]`, kimlik `ICurrentUserService`'ten):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| GET | `/api/exercises?includeArchived=` | kendi + global, isme göre sıralı | — |
| GET | `/api/exercises/{id}` | tek egzersiz + medyası | 404 |
| POST | `/api/exercises` | özel egzersiz oluştur | 400, 409 |
| PUT | `/api/exercises/{id}` | ad/kategori güncelle | 400, 403 (global), 404, 409 |
| DELETE | `/api/exercises/{id}` | arşivle (soft delete) | 403 (global), 404 |
| POST | `/api/exercises/{id}/restore` | arşivden çıkar | 403 (global), 404 |
| POST | `/api/exercises/{id}/media` | medya ekle | 400, 403 (global), 404 |
| DELETE | `/api/exercises/{id}/media/{mediaId}` | medya sil | 403 (global), 404 |

**Sahiplik kararının sırası — her metotta aynı, DRY:**
1. `GetVisibleByIdAsync(id, userId)` → `null` ise `NotFoundException` (**404**).
   Başkasının egzersizi buradan zaten `null` döner; ayrı bir dal yok.
2. Yazma işlemiyse `OwnershipGuard.EnsureOwnedBy(exercise.UserId, userId)` → global veya
   başkasınınsa `ForbiddenException` (**403**). Adım 1'den sonra "başkasının" durumu zaten
   imkânsız, yani bu pratikte "global mi?" kontrolüdür.

**404 mesajlarının nötrlüğü:** Faz 3'ten devreden not, 404-over-403 kararını hiçbir tipin
korumadığını söylüyor. Bu fazda "bulunamadı" mesajı tek bir sabitten gelecek ve bir test onun
kaydın sahipliği hakkında hiçbir şey söylemediğini doğrulayacak — `"Bu egzersiz size ait değil"`
gibi bir mesaj kararı geçersiz kılardı.

**Test:** IDOR (başkasının egzersizi → 404, hem okuma hem yazma yollarında); global egzersizi
düzenleme/arşivleme/medya ekleme → 403; isim çakışması (kendi + global, büyük/küçük harf
gözetmeden, arşivli olanla da); yalnızca kategori değiştirmenin 409 vermediği; arşivleme
sonrası listede görünmediği ama `includeArchived=true` ile göründüğü; `javascript:` URL'inin
reddedildiği. Bu testler veritabanı ister.

---

## Onay

Altı sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını yazıp
görev görev ilerleyeceğim.
