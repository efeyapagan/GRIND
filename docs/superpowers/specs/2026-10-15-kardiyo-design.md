# Kardiyo hareketleri (#647)

**Durum:** Onaylandı (2026-10-15) · **Kapsam:** backend + `packages/shared` + `mobile/` (web donduruldu, #326)

## Sorun

Kullanıcılar ağırlık antrenmanından önce ya da sonra kardiyo yapıyor. Bugün kayıtlar ağırlık × tekrar ya da
yalnızca süre (`Measurement = Duration`) üzerine kurulu; mesafe, eğim, hız, seviye ve kardiyoya özgü rekor yok.

## Kullanıcı kararları (2026-10-15)

1. Kardiyo makineleri katalogda **hareket**tir: yeni **Cardio** kategorisi Other'dan ÖNCE gelir, aramayla bulunur,
   antrenmana hareket eklenir gibi eklenir, şablona girebilir.
2. **Arama Türkçe adla da bulur.** Arama Türkçe adla eşleştiyse sonuç "Treadmill (Koşu bandı)", İngilizce adla
   eşleştiyse yalnızca "Treadmill" yazılır.
3. **Her makinenin kendi kutuları var** (aşağıdaki tablo).
4. **Akış:** hareket eklenir → makinenin ayarları (hız, eğim, seviye...) doldurulur → **Başlat** ile süre kendiliğinden
   akar → **Durdur**'a kadar sürer → sonuç kutuları (mesafe, kat...) doldurulup kaydedilir. **Arka kapı:** antrenman
   doğrudan bitirilirse akan kardiyo o anda kapanır (süresi bitiş anına kadar sayılır).
5. Kayıtlar ağırlık setlerinden **ayrı tabloda** (`CardioEntry`): rekor, hacim, 1RM, plato ve ısınma mantığı kardiyoya
   dokunmaz.
6. **Kardiyo rekoru:** hareket başına en uzun süre ve en uzun mesafe.
7. **Haftalık setlerde ayrı grup:** kas grubu kartında "Kardiyo" satırı; hacme ve 1RM'e girmez.
8. **Arkadaşın geçmişinde** kardiyo, antrenman kaydının İÇİNDE (hareketlerin arasında) görünür; ayrı bir kayıt/bölüm yok.
9. **Yalnızca kardiyo yapılmış antrenman boş değildir:** iptal edilmez, bitirilebilir.

## Araştırma: makineler ve ekranları

Makine ekranlarının ortak düzeni: **süre** hep gösterilir; **ayarlar** (hız, eğim, direnç/seviye, damper) hareketten
önce seçilir; **sonuçlar** (mesafe, kat, ortalama tempo, ortalama watt) bitince ekrandan okunur. Kalori ve nabız
makineden makineye tutarsız olduğu için alınmaz. Kaynaklar: koşu bandı ekranı (hız km/s, eğim %, mesafe, süre),
kürek monitörü (süre, metre, /500 m, çekiş/dk, damper 1–10), stepmill (seviye 1–20, kat, kat/dk), eliptik (direnç,
rampa eğimi, adım/dk), bisiklet/air bike (rpm, watt, mesafe; air bike'ta direnç kademesi yok, efora göre artar).

| Hareket (Türkçe ad) | Ayarlar (başlamadan) | Sonuçlar (bitince) |
|---|---|---|
| Treadmill (Koşu bandı) | hız, eğim | mesafe |
| Walking Pad (Yürüyüş bandı) | hız | mesafe |
| Stationary Bike (Kondisyon bisikleti) | seviye | mesafe, tempo (rpm) |
| Recumbent Bike (Yatay bisiklet) | seviye | mesafe, tempo (rpm) |
| Spin Bike (Spinning bisikleti) | seviye | mesafe, tempo (rpm), watt |
| Air Bike (Hava bisikleti) | — | mesafe, tempo (rpm), watt |
| Elliptical (Eliptik bisiklet) | seviye, eğim | mesafe, tempo (adım/dk) |
| Stair Climber (Merdiven makinesi) | seviye | kat |
| Stepper (Step aleti) | seviye | adım |
| Rowing Machine (Kürek makinesi) | damper | mesafe (m), tempo (çekiş/dk), watt |
| Ski Erg (Kayak ergometresi) | damper | mesafe (m), tempo (çekiş/dk), watt |
| Vertical Climber (Dikey tırmanma makinesi) | — | adım |
| Jump Rope (İp atlama) | — | atlama |

Hepsi isteğe bağlıdır; yalnızca süre zorunlu. Ayarlar durdururken de düzeltilebilir (antrenman içinde hız değiştiyse
ortalamayı yazar).

## Karar 1: Hareket kataloğu

- `ExerciseCategory`'ye `Cardio` (Other'dan önce), `ExerciseMeasurement`'a `Cardio` eklenir; 13 makine global hareket
  olarak seed edilir.
- Kutular harekete aittir: `CardioFieldCatalog` (sunucu kodu; seed kimliği → kutular) hareket yanıtında
  `cardioFields` olarak döner: `Speed`, `Incline`, `Level`, `Damper`, `Distance`, `Cadence`, `Floors`, `Steps`,
  `Jumps`, `Watts`. Veritabanında virgüllü bir kolon 1NF'yi bozardı ve 13 makine zaten seed ile kodda duruyor;
  tabloda olmayan (kullanıcının oluşturduğu) kardiyo hareketi yalnızca mesafe sorar. İstemci kutuları buradan
  çizer, makine adına bakmaz. Birimler: mesafe km saklanır; kürek ve kayak
  ergometresinde metre gösterilir (`Distance` + `Damper` birlikteyse — makine adı değil alan seti belirler).
  Tempo etiketi tek: "Tempo (/dk)".
- Türkçe adlar seed'deki takma ad (`AlternateName`, #335) kolonundadır; arama onu zaten tarar. Bu bir arayüz
  çevirisi değil, hareket adının Türkçe karşılığıdır; dil ne olursa olsun Türkçe arama bulur. Eşleşme Türkçe
  addan geldiyse ad parantezle yazılır (`egzersizGorunenAdi`, yalnızca Cardio kategorisinde).
- Şablon kartı figürü (#621) `Cardio`'da da `Other` gibi çizilmez.

## Karar 2: Kayıt (`CardioEntry`)

`Id`, `WorkoutSessionId` (FK, CASCADE), `ExerciseId` (FK, RESTRICT), `StartedAt`, `DurationSeconds` (null = akıyor),
`SpeedKmh`, `InclinePercent`, `Level`, `Damper`, `DistanceKm`, `Cadence`, `Floors`, `Steps`, `Jumps`, `Watts`,
`IsDurationRecord`, `IsDistanceRecord`, `CreatedAt`, `ClientRequestId`.

| Alan | Tip | Aralık |
|---|---|---|
| `DurationSeconds` | `int`, null | 1–14400; null yalnızca akan kayıtta |
| `SpeedKmh` | `numeric(4,1)` | 0.1–40 |
| `InclinePercent` | `numeric(4,1)` | 0–40 |
| `Level`, `Damper` | `int` | 1–30, 1–10 |
| `DistanceKm` | `numeric(6,3)` | 0.001–200 |
| `Cadence`, `Floors`, `Steps`, `Jumps`, `Watts` | `int` | 1–300, 1–1000, 1–100000, 1–100000, 1–2000 |

- Hareketin `cardioFields`'ında olmayan alan dolu gelirse 400 (`SetMeasurementRules` gibi). Kardiyo harekete set,
  kilolu harekete kardiyo girilemez (400).
- **Bir antrenmanda aynı anda tek akan kardiyo** (kısmi benzersiz indeks); ikincisini başlatmak 409.
- Antrenmanın hareket listesi (`SessionExercise`) değişmez: kardiyo hareketi de listeye girer; önce mi sonra mı
  yapıldığı listedeki yerinden okunur.

## Karar 3: Akış ve uçlar

| Uç | Davranış |
|---|---|
| `POST /api/sessions/{id}/cardio` | başlat: ayarlarla + `startedAt` (istemci zamanı, `ClientTimestamp` kuralları); yalnızca açık antrenman |
| `POST /api/cardio/{id}/stop` | durdur: süre = durdurma anı − başlangıç; sonuçlar ve düzeltilmiş ayarlar gövdede; rekorlar burada hesaplanır |
| `PUT /api/cardio/{id}`, `DELETE /api/cardio/{id}` | bitmiş kaydı düzelt (tüm kutular + süre, tam değiştirme)/sil; akan kayıt düzeltilemez (409); rekorlar yeniden taranır |
| `GET /api/sessions/{id}/cardio` | antrenmanın kayıtları |

- **Arka kapı:** `POST /api/sessions/{id}/finish` akan kardiyoyu aynı `SaveChangesAsync`'te bitiş anıyla kapatır ve
  rekorlarını hesaplar.
- Uygulama kapanıp açılsa da akan kardiyo kaybolmaz: başlangıç sunucuda (ya da kuyrukta) durur, sayaç
  `StartedAt`'ten hesaplanır.
- Başkasının antrenmanı/kaydı 404; görünmeyen hareket 404.

## Karar 4: Rekor

- `CardioRecordTracker` (saf, `RecordTracker` deseni): (kullanıcı, hareket) serisini kronolojik görür; süre ve mesafe
  ayrı çıtalar, **eşitlik rekor değil**, çıtayı ilk kayıt koyar, mesafesiz kayıt mesafe çıtasını etkilemez. Akan
  kayıt hesaba girmez.
- Durdurma, düzeltme, silme ve antrenman silmede ilgili hareket(ler) bir kez baştan taranır, tek `SaveChangesAsync`.
- Rekorlar sekmesi kardiyo hareketinde en uzun süre ve mesafeyi gösterir; rekor bildirimi kardiyo rekorlarını da sayar.

## Karar 5: İstatistik, geçmiş, export

- `GET /api/stats/weekly` satırına `cardio` (kayıt sayısı); kas grubu kartında "Kardiyo" satırı. Hacim, 1RM, plato,
  aşırı yüklenme kardiyoyu görmez. Takvim ve seri oturuma baktığı için kardiyo günü antrenman günüdür.
- "Boş antrenman" = seti de kardiyo kaydı da yok.
- Geçmiş (kendi ve arkadaşın) kardiyoyu antrenmanın hareketleri arasında, o hareketin altında gösterir.
- Export JSON kayıtları taşır; metin "Treadmill: 20 dk · 3,2 km · 9 km/s · %6 [PR: mesafe]" yazar (Türkçe kalır, #199).

## Karar 6: Mobil

- Kategori çipleri: Push · Pull · Legs · Cardio · Other. Arama Türkçe adı da tarar (Karar 1).
- Kardiyo hareketi antrenmana diğer hareketler gibi listenin sonuna bir **kardiyo kartı** olarak eklenir;
  mevcut sürükle-sırala (#407) ile en üste ya da istenen yere taşınır. Yeni sıralama kodu yok.
- Karta basınca ağırlık hareketlerindeki gibi odak kartı açılır: önce makinenin ayar kutuları, üstte **Başlat**;
  akarken büyük sayaç + **Durdur**; durunca sonuç kutuları (+ düzeltilebilir süre) + **Kaydet**. Kardiyo dinlenme
  sayacını başlatmaz. **Uygulamada:** Durdur süreyi hemen sunucuya yazar (`stop`, o anki ayarlarla); sonuç adımı
  `PUT` ile kaydedilir — sonuçlar girilmeden panel kapatılsa da kayıt süresiyle kalır.
- Antrenmanın ilerlemesinde kardiyo hareketinin "tamamlanan set"i bitmiş kardiyo kaydı sayısıdır; istemcinin boş
  antrenman ve ilerleme hesabı kardiyoyu ayrıca bilmez. Kardiyo kartında set sayacı çizilmez.
- Akan kardiyo kartta canlı süreyle görünür; panel kapatılsa da akmaya devam eder.
- Kayıt satırı: "20:00 · 3,2 km · 9 km/sa · %6", rekor rozetiyle; antrenmanda dokununca düzenleyici açılır (set
  satırı gibi: süre + tüm kutular, Sil geri alınabilir). Geçmişte kayıt salt-okunurdur.
- Çevrimdışı (#174): başlat/durdur/düzelt/sil kuyruğa girer (istemci zamanı + `clientRequestId`); rekor cihazda
  hesaplanmaz.
- Yeni metinler `tr.ts` ve `en.ts`'e aynı commit'te.

## Kapsam dışı

- Kardiyo için ilerleme grafiği; kalori, nabız, tempo; Strava'dan veri çekmek.
- Kullanıcının kendi kardiyo hareketini oluşturması (mobilde hareket oluşturma arayüzü yok).
- Kardiyo sayacının Dynamic Island'da görünmesi (#414 yalnızca dinlenme sayacı).
- Dışarıda koşu/yürüyüş.
- Geçmiş antrenmandaki kardiyo kaydını düzeltmek/silmek ve bitmiş antrenmana kardiyo eklemek (#564'ün kardiyo
  karşılığı).
