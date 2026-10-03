# Çevrimdışı kullanım — tasarım (#174)

**Durum:** onaylandı (kullanıcı, 2026-10-03); dilim 1 tamamlandı, dilim 2-3 sırada. **Kapsam:** yalnızca `mobile/` (web donduruldu, #326) + gereken
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
- Hatalı bir sorgu verisini korur. Ekranlar "veri varsa göster, yoksa hata/uyarı" sırasına çekilir:
  çevrimdışıyken önbellekte veri olan ekranda hata kutusu ÇIKMAZ.

## Karar 3 — "İnternete bağlan" uyarısı tek bileşen

`CevrimdisiUyari` (tek metin, katalogdan) ve `useCevrimdisi()` kancası. Önbellekten gösterilmeyen ekranlar
(arkadaşlar kartı, rekorlar, ölçüler, ilerleme, arkadaş arama, başkasının profili, GRINDY) çevrimdışıyken
içerik yerine bu uyarıyı çizer ve isteğe hiç çıkmaz. Çevrimdışı izin verilmeyen eylemler (şifre değiştir,
profil kalemi, şablon düzenle/sil/sırala/sabitle/paylaş, geçmişte set düzenle/sil) ya gizlenir (profil
kalemi — kullanıcı kararı) ya da basılınca uyarı gösterir.

## Karar 3b — Çevrimdışıyken şablon figürleri sabit durur

Kullanıcı kararı: çevrimdışıyken antrenman ekranındaki şablon figürleri (`SablonFiguru`) oynamaz, başlangıç
karesinde durur. Bileşen bunu "hareketi azalt" ve `canli=false` için zaten yapıyor; koşula `useCevrimdisi()`
eklenir. Aynı figürün kullanıldığı her yerde (kaydedilen şablonlar, paylaşılan şablon satırları) aynı
davranır — tek bileşen, tek kural.

## Karar 4 — Yazma: bekleyen işlemler kuyruğu (dilim 2)

- Çevrimdışı ya da isteği ağ hatasıyla düşen her antrenman işlemi (başlat, hareket ekle/çıkar/sırala,
  set ekle/düzenle/sil, bitir, iptal) cihazdaki sıralı bir kuyruğa yazılır (AsyncStorage, kalıcı).
  Ekran işlemi **iyimser** olarak hemen gösterir (TanStack `setQueryData`); antrenman akışı kesilmez.
- Kuyruk bağlantı gelince **aynı sırayla** ve geri çekilmeli tekrar denemeyle (retry) gönderilir. 4xx
  (doğrulama) hatası alan işlem kuyruğu tıkamaz: atlanır, tazeleme gerçeği gösterir.
- Çevrimdışı başlatılan antrenman ve eklenen setler **geçici negatif kimlik** alır; sunucu gerçek kimliği
  dönünce kuyruktaki sonraki işlemlerde ve önbellekte değiştirilir.
- **PR:** çevrimdışı setlerde rozet hiç çizilmez (`RecordType` sunucudan gelene kadar yok sayılır). PR'ları
  sunucu, setler yüklenirken her zamanki gibi hesaplar — istemci PR hesaplamaz.
- **Backend:**
  - Set ekleme ve antrenman bitirme isteğe bağlı **istemci zamanı** alır (`clientCreatedAt`,
    `clientEndedAt`) — antrenman başlatmadaki `clientStartedAt` / `ClientTimestamp` deseni (gelecekteki
    zaman reddedilir). Yoksa geç gönderilen setlerin dinlenme süreleri ve antrenman süresi yanlış çıkar.
  - Oluşturma istekleri isteğe bağlı bir **istemci anahtarı** (`clientRequestId`, GUID) alır; aynı kullanıcı
    için aynı anahtarla ikinci istek yeni kayıt açmaz, ilk kaydı döner (benzersiz indeks, migration). Yanıtı
    kaybolan bir isteğin tekrar denenmesi böylece seti/antrenmanı iki kez yazmaz.
- Antrenman bitince paylaşım penceresi **çevrimdışıyken hiç açılmaz** (kullanıcı kararı).

## Karar 5 — Çevrimdışı şablon oluşturma (dilim 3)

Aynı kuyruk: `POST /api/templates` istemci anahtarıyla; şablon listesinde geçici kimlikle hemen görünür.
Çevrimdışı oluşturulan şablonla çevrimdışı antrenman başlatılabilir (geçici kimlik zinciri).

## Dilimler

1. Kalıcı önbellek, bağlantı durumu (Karar 1-3), sağlık ucu, ekran uyarıları.
2. Çevrimdışı antrenman (Karar 4).
3. Çevrimdışı şablon oluşturma (Karar 5).

## Kapsam dışı

- Aynı hesabın iki cihazda aynı anda çevrimdışı kullanımı ve çakışma çözümü (kişisel ölçek, KISS).
- Çevrimdışı PR hesabı (kural gereği yok).
- Web (#326).
