---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / PR motoru
---

# Tahmini 1RM (tek tekrar maksimumu)

## Sorun

Şu anki rekor mantığı ([[Kişisel rekor motoru]] → `RecordTracker`) iki şeye bakıyor:
ağırlık arttı mı, ya da **aynı ağırlıkta** tekrar arttı mı. Kör noktası şu:

```
100 kg × 5 tekrar   vs   110 kg × 3 tekrar
```

İkincisi büyük ihtimalle daha güçlü bir performans, ama sistem bunu göremiyor —
farklı ağırlık kovalarında oldukları için kıyaslanmıyorlar ve 110x3 "rekor değil"
diye işaretlenebiliyor. Tahmini 1RM iki seti **tek bir sayıya** indirip
karşılaştırılabilir yapıyor.

## Formül seçimi (karar gerekiyor)

| Formül | Hesap | Karakter |
|---|---|---|
| Epley | `w × (1 + r/30)` | Yaygın, yüksek tekrarda cömert |
| Brzycki | `w × 36 / (37 − r)` | Düşük tekrarda (<10) daha isabetli |

İkisi ~10 tekrara kadar birbirine yakın, sonra ayrışıyor. Zaten her ikisi de
yüksek tekrarda güvenilmez — **tekrar sayısına bir tavan** (ör. 12) koyup üstünü
"tahmin edilemez" saymak gerekir.

## Saklanmamalı, sorguda hesaplanmalı

`SetEntry.RecordType` bilerek satırda saklanıyor çünkü amaç geçmişi dondurmak.
1RM'de durum **tersi**: formül seçimi ileride değişebilir ve saklanmış değerlerin
hepsi bir anda yanlış olur. Sorgu anında hesaplamak hem migration istemez hem de
formülü değiştirmeyi bedelsiz kılar.

## Nereye

`Common/Records/` altında saf bir hesaplayıcı — `RecordTracker` ve
`StreakCalculator` ile aynı desen: DB bilmez, saat bilmez, testi veritabanı
istemez.

## Dikkat

- `Weight = 0` (barfiks, dips) setlerde 1RM anlamsız → `null` dönmeli, 0 değil.
- `RecordType`'a üçüncü bir değer olarak eklemek ayrı ve daha büyük bir karar;
  saklama meselesi yüzünden şimdilik önerilmiyor.

İlgili: [[Durağanlık tespiti]] — 1RM gelirse durağanlık ölçütü olarak kullanılabilir.
