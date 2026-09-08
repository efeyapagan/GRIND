# WorkoutTemplate Tasarımı — Şablonlar ve Egzersiz Listesi

**Tarih:** 2026-09-08
**Kapsam:** PLAN.md Faz 6
**Durum:** ✅ Onaylandı (2026-09-08) — altı sorunun da A seçeneği

## Bu Doküman Ne Değildir

CLAUDE.md şablonun ne olduğunu (bir gün tipinin egzersiz listesi), `TemplateExercise`'in neden
ayrı bir tablo olduğunu (1NF), ağırlık/tekrarın şablonda YER ALMADIĞINI ve silme davranışlarını
zaten söylüyor. Faz 5 sahiplik desenini kurdu. Bu doküman onları tekrar etmez; yalnızca Faz 6'nın
açık bıraktığı kararları kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- `WorkoutTemplate` her zaman bir kullanıcıya ait (`UserId` nullable DEĞİL) — global şablon yok.
  Yani sahiplik kontrolü Exercise'tan **daha basit**: görünür olan = sahip olunan, "global mi?"
  dalı yok.
- **Silme gerçek silmedir** (Exercise'ın aksine). `TemplateExercise` satırları CASCADE ile gider,
  `WorkoutSession.TemplateId` SET NULL olur — geçmiş oturum hangi şablondan başladığını unutur
  ama kendisi silinmez. **Bu ikisi Faz 1'de zaten konfigüre edilmiş**; Faz 6'nın işi uygulamak
  değil, testle doğrulamak.
- `PlannedSets > 0` veritabanında CHECK constraint olarak duruyor.
- Ağırlık/tekrar şablonda yok — sadece `OrderIndex` ve `PlannedSets`.
- **Egzersiz erişilebilirlik kontrolü `ExerciseService`'in görünürlük desenini yeniden
  kullanacak**, `UserId == x || UserId == null` yüklemini satır içinde tekrar yazmayacak
  (Faz 5'ten devreden not). Çok egzersizli bir şablon için repository'ye toplu bir
  `GetVisibleByIdsAsync(ids, userId)` eklenecek — aksi halde N egzersizlik bir şablon
  N ayrı sorgu demek.

---

## Karar bekleyen altı soru

### Soru 1 — Egzersiz listesi nasıl yönetilecek?

Bu fazın en büyük kararı. İki yaklaşım var.

**A — Liste, şablonun bir parçası olarak toptan gönderilir (önerim).**
`POST /api/templates` ve `PUT /api/templates/{id}` gövdesinde tüm liste yer alır:

```json
{ "name": "Push Day A",
  "exercises": [ { "exerciseId": 1, "plannedSets": 4 },
                 { "exerciseId": 3, "plannedSets": 3 } ] }
```

Sıralama = dizideki konum. Ekleme, çıkarma ve **yeniden sıralama** aynı tek istekle olur.
Gerçek arayüz zaten "şablonu düzenle → sürükle-bırak sırala → Kaydet" akışı olacak; bu, o akışın
birebir karşılığı. Tek kod yolu, tek test yüzeyi.

**B — Egzersizler alt kaynak olarak yönetilir.**
`POST /api/templates/{id}/exercises`, `DELETE .../exercises/{teId}`,
`PUT .../exercises/{teId}` ve sıralama için ayrı bir `POST .../exercises/reorder`.
Daha granüler. Bedeli: dört ayrı endpoint, dört ayrı test kümesi, ve yeniden sıralamanın
kendi tasarımı. Bir şablonda 5-8 egzersiz varken tümünü göndermenin maliyeti sıfıra yakın.

### Soru 2 — `OrderIndex`'i kim belirler?

**A — Sunucu, dizideki konumdan türetir (önerim).** İstemci `orderIndex` göndermez.
Böylece çakışan indeksler, boşluklar (0,1,5) ya da negatif değerler **oluşamaz** — doğrulanacak
bir şey kalmaz.

**B — İstemci gönderir.** Daha esnek. Bedeli: benzersizlik ve süreklilik doğrulaması yazmak
gerekir, ve bunu unutmak sıralaması bozuk şablonlar üretir.

### Soru 3 — Aynı egzersiz bir şablonda iki kez yer alabilir mi?

**A — Hayır, reddedilir (önerim).** Şablonda ağırlık/tekrar olmadığı için aynı egzersizin iki
kaydı yalnızca `PlannedSets` ve sıra bakımından ayrışır — "4 set" demek yerine "3 set + 1 set"
demek ek bir bilgi taşımıyor. Ayrıca **kısıtı sonradan gevşetmek güvenli, sonradan sıkmak
değil**: bugün izin verirsek ve yarın yasaklamak istersek elde geçersiz veri kalır.

**B — Evet, izin verilir.** Bazı programlarda aynı hareket iki blokta geçer. Bedeli: yukarıdaki
tersine çevrilemezlik, ve "bu egzersiz şablonda var mı?" kontrolünün anlamsızlaşması.

### Soru 4 — Arşivlenmiş bir egzersiz şablona eklenebilir mi?

**A — Hayır; ama var olan şablonlar arşivlenmiş egzersizi göstermeye devam eder (önerim).**
CLAUDE.md "arşivlenen egzersiz sadece yeni seçim listelerinde görünmez" diyor — bir şablona
eklemek tam olarak yeni bir seçimdir. Buna karşılık eski bir şablonu **okurken** arşivlenmiş
egzersiz çözülebilmeli, yoksa geçmişte kurulmuş şablonlar bozulur.
Yani: **yazarken katı, okurken hoşgörülü.**

**B — İzin verilsin.** Daha az kural. Bedeli: arşivleme kavramının anlamı zayıflar.

### Soru 5 — Şablon adı benzersiz mi olmalı?

**A — Evet, kullanıcı başına ve büyük/küçük harf gözetmeden (önerim).** Egzersizlerdeki kuralın
aynısı. İki "Push Day" bir tercih değil, bir hatadır ve seçim listesinde ayırt edilemez.
Veritabanında bu isim için unique index YOK — kontrol uygulama katmanında olacak (CLAUDE.md
"en azından uygulama katmanında" diyor). Faz 4'te eklenen `UnitOfWork` yarış-durumu çevirisi
zaten arkada duruyor.

**B — Hayır, serbest.** Daha az sürtünme. Bedeli: yukarıdaki.

### Soru 6 — `PUT` ve `PATCH` ikisi de olsun mu?

Faz 5'te `PUT`'un tam değiştirme olması gerçek bir kullanım sorunu yarattı: sadece adı
değiştirmek için tüm nesneyi göndermek gerekiyordu. Burada aynısı daha keskin — sadece şablonu
yeniden adlandırmak için tüm egzersiz listesini göndermek gerekir.

**A — İkisi de olsun (önerim).** `PUT` tam değiştirme (ad + liste), `PATCH` kısmi
(`{ "name": "..." }` ile sadece ad; `exercises` gönderilirse liste toptan değişir).
Faz 5'te kurulan desenin aynısı — API'nin kaynaklar arasında tutarlı olması öğrenilebilirliği
belirler.

**B — Yalnızca `PATCH`.** `PATCH` zaten `PUT`'un yapabildiği her şeyi yapabiliyor, o hâlde
`PUT` gereksiz (YAGNI). Bedeli: Exercise'da iki fiil var, Template'te bir — aynı API içinde
iki farklı desen.

---

## Önerilen tasarım (A + A + A + A + A + A)

```
src/Grind.Api/
├─ Models/Dtos/Template/
│  ├─ TemplateResponse.cs           Id, Name, CreatedAt, Exercises[]
│  ├─ TemplateExerciseResponse.cs   Id, ExerciseId, ExerciseName, Category, IsArchived, OrderIndex, PlannedSets
│  ├─ TemplateExerciseRequest.cs    ExerciseId, PlannedSets
│  ├─ CreateTemplateRequest.cs      Name, Exercises[]
│  ├─ UpdateTemplateRequest.cs      Name, Exercises[]
│  └─ PatchTemplateRequest.cs       Name?, Exercises?
├─ Repositories/
│  └─ IWorkoutTemplateRepository    (+ IExerciseRepository'ye GetVisibleByIdsAsync)
├─ Services/
│  ├─ IWorkoutTemplateService.cs
│  └─ WorkoutTemplateService.cs
└─ Controllers/
   └─ TemplatesController.cs
```

**Endpoint'ler** (hepsi `[Authorize]`, kimlik `ICurrentUserService`'ten):

| Metot | Yol | Anlam | Hatalar |
|---|---|---|---|
| GET | `/api/templates` | kullanıcının şablonları | — |
| GET | `/api/templates/{id}` | tek şablon + egzersiz listesi | 404 |
| POST | `/api/templates` | oluştur | 400, 404 (egzersiz), 409 (isim) |
| PUT | `/api/templates/{id}` | tam değiştir | 400, 404, 409 |
| PATCH | `/api/templates/{id}` | kısmi güncelle | 400, 404, 409 |
| DELETE | `/api/templates/{id}` | **gerçek sil** (CASCADE + SET NULL) | 404 |

**Erişilemeyen bir egzersiz id'si gönderilirse ne dönmeli?** `NotFoundException` → **404**,
mesaj hangi id olduğunu SÖYLEMEDEN. Sebep Faz 3'ün kararıyla aynı: "şu id'li egzersiz sizin
değil" demek, saldırgana id taraması yaptırır. Şablonun kendisi bulunamadığında da aynı nötr
404 kullanılır.

**Boş şablon serbest.** Önce şablonu oluşturup sonra doldurmak doğal bir akış; `exercises`
boş dizi olabilir.

**Test:** IDOR (başkasının şablonu → 404, hem okuma hem yazma); başkasının egzersizini şablona
eklemeye çalışmak → 404; arşivlenmiş egzersiz eklemek → 400, ama var olan şablonda görünmeye
devam etmesi; aynı egzersizi iki kez → 400; isim çakışması (büyük/küçük harf); sıralamanın
diziden türediği; `PATCH` ile sadece adı değiştirince listenin korunduğu; şablon silinince
`TemplateExercise` satırlarının gittiği ve `WorkoutSession.TemplateId`'nin NULL olduğu
(Faz 1'de konfigüre edildi, burada doğrulanıyor). Bu testler veritabanı ister.

---

## Onay

Altı sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını yazıp
görev görev ilerleyeceğim.
