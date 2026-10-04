# Çevrimdışı kullanım — tasarım (#174)

**Durum:** onaylandı (kullanıcı, 2026-10-03); dilim 1 ve 2 tamamlandı, dilim 3 sırada. **Kapsam:** yalnızca `mobile/` (web donduruldu, #326) + gereken
backend uçları. Ekran ekran kararlar issue #174'ün gövdesindedir; bu belge NASIL yapılacağını anlatır.

## Amaç

Çekim olmayan salonda antrenman kesintisiz yapılabilsin ve kaydedilsin; temel ekranlar son senkronize
hâlden görüntülensin; bağlantı gelince çevrimdışı yapılanlar sunucuya sırayla gönderilsin.

## Karar 1 — "Çevrimdışı" sunucuya ulaşılamamaktır, cihazın ağ durumu değil

Wi-Fi'ye bağlı ama internetsiz bir salon, cihazın ağ API'sine göre "çevrimiçi"dir. Bu yüzden ölçüt
sunucudur:

- `request()` (ortak paket) her isteğin sonucunu bildirir: **herhangi bir HTTP yanıtı** (4xx/5xx dahil)
  "sunucuya ulaşıldı", ağ hatası (fetch reddi / zaman aşımı) "ulaşılamadı" demektir.
- `BaglantiDurumu` (mobil) son başarılı yanıtın zamanını ve ilk ağ hatasının zamanını tutar.
  **İlk hatadan bu yana 5 sn geçmiş ve arada hiçbir yanıt alınmamışsa** durum `cevrimdisi` olur.
- Hata durumundayken (istek atan ekran olmasa da) birkaç saniyede bir hafif bir **sağlık ucu**
  (`GET /api/health`, kimliksiz, 204) yoklanır; ilk yanıtta durum `cevrimici`ye döner.
- **Ön plana dönüş:** uygulama arka plandan dönünce sayaçlar sıfırlanır, hemen bir yoklama atılır ve
  **ilk 3 sn** şerit gösterilmez. Bu süre içinde yanıt gelirse şerit hiç görünmez.
- TanStack Query'nin `onlineManager`'ı bu duruma bağlanır: `cevrimdisi` iken sorgular ağa gitmeye
  çalışmaz (önbellekteki veri kalır), dönünce aktif sorgular tazelenir.

Gösterge: üstte kırmızı bir şeritte yalnızca "Çevrimdışı" (`danger-bg` / `on-danger-bg` token'ları;
iki temada kontrast testleri zaten var).

## Karar 2 — Okuma: TanStack sorgu önbelleği cihaza kalıcı yazılır

- **Veri varken hata yok, `null` da veridir:** "açık antrenman yok" (`null`) gibi geçerli önbellek verisi
  varken arka plan yenilemesinin hatası ekranı hataya düşürmez; hata yalnızca hiç veri yokken (`undefined`)
  sayılır (simülatörde çevrimdışı soğuk açılışta antrenman ekranında bulundu).
- `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`, depolama
  `@react-native-async-storage/async-storage` (Expo Go'da hazır; `expo-secure-store` 2 KB sınırı yüzünden
  uygun değil).
- `gcTime` kalıcılık süresiyle uyumlu yükseltilir (7 gün); aksi hâlde bellekten düşen sorgu diske de yazılmaz.
- Önbellek **kullanıcıya bağlıdır**: anahtarın içinde kullanıcı adı vardır ve çıkışta (`logout`) diskteki
  kopya da silinir — paylaşılan bir cihazda başka hesabın verisi görünmez.
- **Takvim önden çekilir (kullanıcı kararı):** bu ayın ve bir önceki ayın geçmiş haftaları çevrimdışı da
  görünsün diye çevrimiçiyken bu aralıklar (aylık + bu iki aya dokunan her haftalık; `onbelleklenecekTakvimAraliklari`, takvimin anahtarlarıyla birebir) önceden çekilir (`CevrimdisiOnYukleme`; dilim 3'ten beri şablon ve hareket listesi de — salonda ilk kez şablon oluşturan ya da antrenmana hareket ekleyen kullanıcı listeyi hiç açmamış olabilir). Kuyrukta bekleyen işlem
  varken çekilmez — sunucudaki eski takvim, çevrimdışı antrenmanın işlendiği takvimin üstüne yazılırdı.
- Hatalı bir sorgu verisini korur. Ekranlar "veri varsa göster, yoksa hata/uyarı" sırasına çekilir:
  çevrimdışıyken önbellekte veri olan ekranda hata kutusu ÇIKMAZ.

## Karar 3 — "İnternete bağlan" uyarısı tek bileşen

`CevrimdisiUyari` (tek metin, katalogdan) ve `useCevrimdisi()` kancası. Önbellekten gösterilmeyen ekranlar
(arkadaşlar kartı, rekorlar, ölçüler, ilerleme, arkadaş arama, başkasının profili, GRINDY) çevrimdışıyken
içerik yerine bu uyarıyı çizer ve isteğe hiç çıkmaz. Çevrimdışı izin verilmeyen eylemler (şifre değiştir,
profil kalemi, şablon paylaşımı, geçmişte set düzenle/sil) ya gizlenir (profil
kalemi — kullanıcı kararı) ya da basılınca uyarı gösterir.

## Karar 3b — Çevrimdışıyken şablon figürleri sabit durur

Kullanıcı kararı: çevrimdışıyken antrenman ekranındaki şablon figürleri (`SablonFiguru`) oynamaz, başlangıç
karesinde durur. Bileşen bunu "hareketi azalt" ve `canli=false` için zaten yapıyor; koşula `useCevrimdisi()`
eklenir. Aynı figürün kullanıldığı her yerde (kaydedilen şablonlar, paylaşılan şablon satırları) aynı
davranır — tek bileşen, tek kural.

## Karar 4 — Yazma: bekleyen işlemler kuyruğu (dilim 2, tamamlandı)

- **Karma yol:** çevrimiçiyken ve kuyruk boşken yazmalar bugünkü gibi doğrudan sunucuya gider (davranış
  değişmez). Çevrimdışıyken, kuyrukta bekleyen işlem varken (sıra korunmalı) ya da istek AĞ hatasıyla
  düşerse işlem kuyruğa yazılır ve ekran iyimser güncellenir. Sunucunun reddettiği (ApiError) istek kuyruğa
  YAZILMAZ — hatası ekranda görünür.
- Ekranlar paylaşılan hook'ların aynı arayüzlü **kuyruklu sürümlerini** kullanır (`mobile/src/kuyruk/
  kuyrukluMutasyonlar.ts`: başlat, set ekle/düzelt/sil, hareket ekle/kaldır/sırala, bitir, iptal).
  `networkMode: 'always'`: TanStack çevrimdışıyken mutasyonları bekletir, kuyruklu yol hiç çalışmazdı.
- **Kuyruk** (`kuyruk.ts`) kullanıcıya bağlı olarak AsyncStorage'a yazılır, uygulama kapansa da kaybolmaz.
  Geçici kimlikler NEGATİFTİR; gönderilmemiş kayıtlar üzerindeki işlemler sıkıştırılır (geçici sete düzeltme
  bekleyen eklemeyi günceller, silme eklemeyle birlikte düşer, çevrimdışı başlatılan antrenmanın iptali o
  antrenmanın tüm işlemlerini düşürür).
- **Gönderim** (`gonderici.ts`, `KuyrukSaglayici.tsx`): işlemler TEK TEK, sırayla gider; sunucunun verdiği
  gerçek kimlik sonraki işlemlere uygulanır. Ağ hatası, 5xx ve 401'de durur (sonra tekrar denenir; 401
  yeniden girişten sonra — atılırsa antrenman kaybolurdu); diğer 4xx atlanır, kuyruk tıkanmaz.
- **Kuyruk boşalana kadar** açık antrenman, set ve geçmiş sorguları sunucudan hiç çekilmez (`enabled:
  false` varsayılanı — başka bir yerin invalidate'i de çekemez); boşalınca antrenmanın dokunduğu her şey
  (PR'lar, geçmiş, takvim, ilerleme) tazelenir. Negatif kimlikli antrenmanın setleri hiç sunucuya sorulmaz.
- **Kullanıcı kararı (CLAUDE.md "istemci yeniden hesaplamaz" kuralına bilinçli istisna):** gönderilmeyi
  bekleyen antrenmanın set sayacı telefonda artar ve çevrimdışı bitirilen antrenman geçmişte HEMEN görünür
  (set sayısı, süre, hacim cihazda hesaplanır). Gerekçe: internet çekmeyen salondaki kullanıcı antrenmanını
  ve gelişimini görebilmeli. Bu değerler yalnızca bekleyen antrenman içindir; gönderilince sunucununkilerle
  değişir. **PR asla cihazda hesaplanmaz** — rozet hiç yoktur, PR'ları sunucu yüklemede hesaplar.
- **Takvim ve haftalık hedef de (kullanıcı kararı):** çevrimdışı bitirilen (setli) antrenman önbellekteki her
  takvim aralığına işlenir (`takvimeIsle`: gün eklenir/artar; o gün yeni antrenman günüyse antrenmanlı gün ve
  bu haftaysa haftalık hedefin gün sayısı artar). Günü başlangıcın TR günüdür. **Seriler (hafta serisi, hedef
  serisi) önceki haftalara bağlı sunucu hesabıdır, değişmez;** gönderilince sunucunun değerleriyle sabitlenir.
  Kuyruk boşalana kadar takvim de dondurulur.
- **Backend:**
  - `POST /api/sessions/{id}/sets`: antrenman AÇIKSA canlı ekleme gibidir (hareket listede yoksa eklenir,
    zaman `clientCreatedAt`, rekorlar yeniden hesaplanır); bitmiş antrenmanda #564 davranışı aynen kalır.
    Kuyruk setleri bu uca antrenman kimliğiyle gönderir — `POST /api/sets`'in "son 6 saatte açık antrenman"
    araması saatler sonra gönderilen antrenmanı ıskalardı.
  - `POST /api/sessions/{id}/finish` `clientEndedAt` alır (başlangıçtan önce ya da gelecekte olamaz).
  - `clientRequestId` (başlatma ve set ekleme): aynı anahtarla ikinci istek yeni kayıt açmaz, ilk kaydı döner
    (`WorkoutSession (UserId, ClientRequestId)` ve `SetEntry (WorkoutSessionId, ClientRequestId)` filtreli
    benzersiz indeksleri). Başlatmada açık oturum penceresine bakılmaz.
- Antrenman bitince paylaşım penceresi **çevrimdışıyken açılmaz**; "şablon olarak kaydet" sorusu dilim 3'ten
  beri çevrimdışı da gelir (Karar 5).

## Karar 5 — Çevrimdışı şablon oluşturma (dilim 3)

Kullanıcı kararı: telefondaki (önbellekteki) şablonlar için **oluşturma, düzenleme, silme, sıralama ve
sabitleme** çevrimdışı da çalışır; **yalnızca paylaşım (görünürlük) internet ister** (`useCevrimiciEylem`).

- Aynı kuyruk (`sablonOlustur` / `sablonGuncelle` / `sablonSil` / `sablonSirala` / `sablonSabitle`); ekranlar
  `useKuyrukluCreateTemplate` vb. kullanır, liste ve detay önbelleği hemen güncellenir. Kuyruk beklerken
  şablon sorguları da dondurulur.
- `POST /api/templates` istemci anahtarıyla (`WorkoutTemplate (UserId, ClientRequestId)` filtreli benzersiz
  indeksi; aynı anahtarla ikinci istek ilk şablonu döner). Anahtar çevrimiçi denemede de gider: yanıt
  kaybolup işlem kuyruğa düşerse ikinci şablon açılmaz.
- Çevrimdışı oluşturulan şablon geçici (negatif) kimlik taşır; onunla çevrimdışı antrenman başlatılabilir,
  gönderilince kimlik kuyruğun geri kalanında gerçeğiyle değişir. `useTemplate` geçici kimlikte istek atmaz,
  detay listedeki kopyadan gelir; geçici şablonun formunda paylaşım bölümü gösterilmez.
- Ad çakışmasını (sunucuda 409, büyük/küçük harf duyarsız) çevrimdışı cihaz yakalar ve işlemi kuyruğa
  yazmaz. Sunucu kuyruktaki oluşturmayı yine de reddederse, o şablonla başlatılmış antrenman şablonsuz
  gönderilir — antrenman kaybolmaz (`sablonuBirak`).
- Henüz gönderilmemiş şablonu düzenlemek bekleyen oluşturmaya katlanır; silmek onun bütün işlemlerini düşürür.

## Dilimler

1. Kalıcı önbellek, bağlantı durumu (Karar 1-3), sağlık ucu, ekran uyarıları.
2. Çevrimdışı antrenman (Karar 4) — tamamlandı.
3. Çevrimdışı şablon oluşturma, düzenleme, silme, sıralama, sabitleme (Karar 5) — tamamlandı.

## Kapsam dışı

- Aynı hesabın iki cihazda aynı anda çevrimdışı kullanımı ve çakışma çözümü (kişisel ölçek, KISS).
- Çevrimdışı PR hesabı (kural gereği yok).
- Web (#326).
