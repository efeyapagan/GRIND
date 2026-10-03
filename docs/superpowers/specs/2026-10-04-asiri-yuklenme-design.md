# Aşırı yüklenme (overreaching) sinyali (#176)

**Durum:** Tasarım onaylandı (2026-10-04), spec incelemede · **Kapsam:** backend + `packages/shared` + `mobile/`
(web donduruldu, #326)

## Amaç

Birikmiş yorgunluğu fark edip kullanıcıya deload ya da aktif dinlenme önermek. "Daha az kaldırıyorum ama
daha çok zorlanıyorum" örüntüsü — aşırı yüklenmenin tanımı — yandığında İlerleme sekmesinde bir kart çıkar.
GRINDY yorumu (#76) bu sinyali bağlamında görür ve açıklar.

## Karar 1 — Kural tabanlı tespit, GRINDY'ye hafif bağlantı

- Tespit saf, durumsuz bir hesaplayıcıdır (`OverreachingDetector`, `PlateauDetector` deseni): bedava,
  anında, her zaman aynı sonuç, testle sabitlenir. AI kapalıyken de çalışır.
- Sonuç **saklanmaz**, sorgu anında hesaplanır. `AiInsight`'a yeni bir tür (`Suggestion`) eklenmez.
- AI bağlantısı: export yanıtına sinyal eklenir; GRINDY yorumu export metniyle üretildiği için sinyali
  görür. Yeni bir AI isteği, prompt ya da ücretli akış yoktur. "Sinyali açıkla" düğmesi kapsam dışı.

## Karar 2 — Sinyal kuralı: performans düşüşü VE efor artışı

Pencereler, bugüne göre TR günü; bir set, oturumunun başladığı TR gününe aittir (CLAUDE.md'deki "hangi güne
ait" kuralı):

- **Son dönem:** bugün dahil son 14 gün.
- **Önceki dönem:** ondan önceki 28 gün (toplam 6 hafta, plato penceresiyle aynı).

**Performans düşüşü** — yalnızca `WeightReps` hareketler, iki dönemde de tahmini 1RM'i
(`OneRepMaxEstimator`) hesaplanabilen en az bir seti olanlar:

- düşüş oranı = `(önceki en iyi − son en iyi) / önceki en iyi`; **≥ %5** ise hareket "düşüyor";
- koşul: **en az 2** hareket düşüyor.

**Efor artışı** — ikisinden biri yeter:

- **RIR:** iki dönemde de RIR girilmiş **en az 3'er** set var ve son dönemin ortalama RIR'ı önceki dönemden
  **en az 1** düşük;
- **Zorluk:** son dönemde zorluğu işaretlenmiş **en az 2** bitmiş oturum var ve bunların **en az yarısı**
  `Hard` ya da `Maximal`.

Sinyal = performans koşulu **ve** efor koşulu. Efor verisi (RIR, zorluk) hiç girilmiyorsa sinyal yanmaz —
bilinçli: yalnızca performans düşüşü bilinçli deload, hastalık ya da tatil sonrasında da görülür ve yanlış
alarm üretir.

Eşikler kodda sabittir (14/28 gün, %5, 2 hareket, 1 RIR, 3 set, 2 oturum), sorgu parametresi değildir.

## Karar 3 — Uç

`GET /api/stats/overreaching` → `{ "signal": null }` ya da:

```
OverreachingResponse(OverreachingSignalResponse? Signal)
OverreachingSignalResponse(
    IReadOnlyList<ExerciseDropResponse> Drops,   // düşüşü büyükten küçüğe
    decimal? RirBefore, decimal? RirRecent,       // RIR koşulu değerlendirilebildiyse dolu (iki dönemde ≥3 set)
    int HardSessions, int RatedSessions)          // son dönem: Zor/Maksimal ve zorluğu işaretli oturum sayısı
ExerciseDropResponse(long ExerciseId, string ExerciseName, decimal PreviousBest, decimal RecentBest, decimal DropPercent)
```

- Yalnızca `currentUserId`. Arkadaşa açılmaz (Yetkilendirme Kuralı istisnası genişlemez).
- Hesap `StatsService`'te; setler oturum başlangıcı ve zorluğuyla tek projeksiyon sorgusuyla okunur.
- `DropPercent` bir ondalık hanelik yüzde (7.3 = %7,3). Yeni tablo yok.

## Karar 4 — GRINDY bağlantısı (export)

`ExportResponse`'a isteğe bağlı `Overreaching` (`OverreachingSignalResponse?`) eklenir. Metin
biçimlendiricisi sinyal varsa "Aşırı yüklenme sinyali (bugüne göre, aralıktan bağımsız)" bölümünü yazar
(düşen hareketler, RIR ve zorluk satırları); yoksa bölümü hiç yazmaz. Bölüm kullanıcının indirdiği export
metninde de görünür — veri, AI'a özel değil.

## Karar 5 — Mobil kart

- Profil → İlerleme sekmesinin **en üstünde**, yalnızca sinyal varken; yokken hiçbir şey çizilmez.
- `CamKart`; başlık "Aşırı yüklenme sinyali", yanında `accent-soft` "Deload önerisi" rozeti. Yeni renk yok.
- Düşen hareket satırları: "Bench Press · 100 → 93 kg (−7%)", düşüşü en büyük olan üstte.
- Efor satırı (yanan hangisiyse, ikisi de yandıysa ikisi): "Ortalama RIR 2,5 → 1" ve "Son 2 haftada 3/4
  antrenman Zor ya da Maksimal".
- Sabit öneri: deload (aynı hareketler, setlerin yaklaşık yarısı, ağırlıkta ~%10 azaltma) ya da 2–3 gün
  aktif dinlenme; GRINDY'den yorum istenirse sinyali ayrıntılı açıklar.
- **Kapatılamaz:** sinyal veriye bağlıdır; deload yapılıp performans toparlanınca kendiliğinden kaybolur.
- `useOverreaching()`; set ekleme/düzeltme/silme, oturum silme ve oturum bitirme (zorluk bitirirken
  işaretlenir) sonrası tazelenir.
- Metinler tr + en; sayılar `format*` yardımcılarıyla.

## Testler

- Saf hesaplayıcı: tek harekette düşüş → yok; %4,9 → sayılmaz, %5 → sayılır; efor verisi yok → yok; RIR 1
  düştü → var; zorluk yarısı Zor/Maksimal → var; yalnızca bir dönemde çalışılan hareket ve ağırlıksız/süreli
  hareket değerlendirilmez; pencere sınırı ve gece yarısını aşan oturum.
- Uç: yalnızca kendi verisi.
- Export: sinyal varken bölüm yazılır, yokken yazılmaz.
- Mobil: sinyal varken kart üstte, yokken hiç çizilmez; düşüş ve efor satırları.

## Kapsam dışı

- AI ile ayrı "sinyali açıkla" akışı, `AiInsight` `Suggestion` kaydı.
- Kartı kapatma/gizleme; bildirim (#325) ile uyarı.
- Eşiklerin kullanıcıya göre ayarlanması.
