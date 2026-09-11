---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / sorgu
---

# Durağanlık tespiti

## Fikir

"Bench Press'te 6 haftadır rekor yok." Mevcut `SetEntry.RecordType` verisinden
çıkar — her egzersiz için `RecordType != None` olan **son** setin tarihine bakılır.
Yeni tablo, yeni alan yok.

Deload (yük azaltma) kararının doğrudan girdisi.

## Karar gerekenler

1. **Eşik kaç hafta?** 4-6 hafta tipik. Bu bir tercih; sabit mi olsun yoksa sorgu
   parametresi mi?
2. **Hangi rekor sayılır?** Sadece ağırlık rekoru mu, `Weight`/`Reps` ikisi de mi?
   [[Tahmini 1RM]] eklenirse daha iyi bir ölçüt olur — çünkü asıl sorulan
   "ilerliyor muyum", "yeni bir kova açtım mı" değil.

## Dikkat

Son N haftada **hiç çalışılmamış** egzersiz durağan değildir, terk edilmiştir.
İkisini ayırmadan listelemek, altı ay önce bıraktığın her hareketi "durağan"
diye önüne koyar. Filtre: yalnızca son N haftada en az bir seti olan egzersizler.
