---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / sorgu
---

# Antrenman süresi

## Fikir

`WorkoutSession.StartedAt` ve `EndedAt` zaten var, ama süre hiçbir yerde
raporlanmıyor. Oturum yanıtına bir `Duration`, istatistiklere ortalama/toplam
antrenman süresi eklenebilir. Yeni veri gerekmez.

## Karar gerekenler

1. **Açık oturum (`EndedAt = null`)**: süre hesaplanamaz → `null` dönmeli ve
   ortalamaya **katılmamalı**. "Şu ana kadar geçen süre" diye doldurmak, devam eden
   oturumu bitmiş gibi gösterir.
2. **Kapatmayı unutulan oturumlar**: kullanıcı "Antrenmanı Bitir"e üç saat sonra
   basarsa süre şişer. Bu proje bilerek otomatik kapatma yapmıyor (CLAUDE.md, KISS),
   yani bu veri kirliliği gerçek. Ortalama alınırken bir aykırı değer sınırı
   (ör. > 4 saat sayma) gerekebilir — ya da medyan kullanmak.

İkisi de aynı kök sorunun belirtisi; [[Set arası dinlenme süresi]] notundaki
"kaydedilen an ≠ yapılan an" sınırıyla akraba.
