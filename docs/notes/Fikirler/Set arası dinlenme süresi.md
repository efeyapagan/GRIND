---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / sorgu
---

# Set arası dinlenme süresi

## Fikir

Ardışık iki setin `SetEntry.CreatedAt` farkı = dinlenme süresi. **Sıfır yeni veri**,
sıfır migration — sadece bir hesap.

CLAUDE.md'nin "Gelecek Fikirler"indeki set arası koçluk önerisi ("yorgunluk artıyor,
dinlenmeyi uzat") bu veri olmadan zaten çalışmaz — `Rir` tek başına yetmez.

## Karar gerektiren: dinlenme neye göre ölçülür?

- **Oturumdaki ardışık setler** (önerilen): superset yapan biri A-B-A-B gider;
  gerçekte dinlendiği süre iki set arasındaki boşluktur, aynı egzersize dönene
  kadar geçen süre değil.
- **Aynı egzersizin ardışık setleri**: superset'te yanıltıcı olur.

Oturumun ilk setinin dinlenmesi yoktur → `null`, `0` değil.

## Bilinen sınır — notta kalsın

`CreatedAt`, setin **kaydedildiği** andır, **yapıldığı** an değil. Kullanıcı üç seti
antrenman sonunda topluca girerse süreler saçmalar (birkaç saniye). Bu, veriyle
çözülecek bir şey değil; ya kullanım biçimi kabul edilir ya da ileride girişin
gerçek zamanlı olduğu varsayımı açıkça yazılır.

Uzun aykırı değerler (telefon, tuvalet, sohbet) de olacak — ortalama alınacaksa
medyan daha dürüst bir özet verir.
