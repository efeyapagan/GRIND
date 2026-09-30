# Aşamalı yüklenme analizi (#184)

**Durum:** Tasarım onaylandı (2026-09-30), spec incelemede · **Kapsam:** backend + `packages/shared` + `mobile/`
(web donduruldu, #326; issue yorumu: web'e geliştirme yapılmaz)

## Amaç

Kullanıcı zaman içinde ilerleyip ilerlemediğini tek ekranda görsün: haftalık hacim yükü trendi, seçilen
bir hareketin tahmini 1RM trendi ve kas grubuna göre haftalık set dağılımı. Hareket başına ilerleme
grafiği (antrenman ekranındaki hareket kartı) zaten var; bu ekran **genel** görünümdür.

"Kas grubu" = `Exercise.Category` (Push / Pull / Legs / Other). Yeni bir sınıflandırma yoktur.

## Karar 1 — Yer: Profil'de "İlerleme" sekmesi

`/profile/progress`, Geçmiş · Rekorlar · Ölçüler'den sonra dördüncü sekme, ikon `TrendingUp`. Yalnızca
kendi profilinde; arkadaş profilinde (`/profile/u/[username]`) yok — başkasının verisine yeni bir uç
açılmaz (CLAUDE.md Yetkilendirme Kuralı istisnası genişlemez).

## Karar 2 — Backend: tek uç, hafta başına bir satır

`GET /api/stats/weekly` — parametre almaz.

```
WeeklyStatsResponse(IReadOnlyList<WeeklyStatsRow> Weeks)
WeeklyStatsRow(DateOnly WeekStart, decimal Volume, int PushSets, int PullSets, int LegsSets, int OtherSets)
```

- Satırlar kullanıcının **ilk antrenman haftasından bu haftaya** kadar, eskiden yeniye; aradaki
  antrenmansız haftalar sıfırla doldurulur. Hiç seti yoksa `Weeks` boştur.
- Bir set, **oturumunun** başlangıcının TR günü üzerinden haftaya düşer (`StreakCalculator.WeekStart`,
  Pazartesi–Pazar). Antrenmanın hangi güne ait olduğu kuralı CLAUDE.md'dekiyle aynı: gece yarısını aşan
  bir oturumun setleri başladığı günün haftasındadır.
- `Volume` = `Σ Weight × (Reps ?? 0)` — diğer hacim uçlarıyla aynı tanım; ağırlıksız ve süreli setler
  (#346) 0 katar.
- Kategori sayıları ölçüm tipinden bağımsızdır: bir plank seti de Other'a bir set yazar.
- Kategoriler sözlük değil düz alan: Swagger'dan üretilen tip net olur, istemci doğrulaması basit kalır.
- Denetleyicideki "ayrı uç" gerekçesi (satırların yarısı boş bir `groupBy` DTO'su) burada geçerli değil:
  her satır iki bilgiyi de her zaman taşır.
- Hesap `StatsService.GetWeeklyAsync`; okuma rekorlar/plato ucuyla aynı desen (kullanıcının setleri,
  hareket ve oturumla birlikte, gruplama bellekte — TR günü kuralının SQL'de ikinci kopyası yazılmaz).
- Yalnızca `currentUserId`.

Yeni tablo yok.

## Karar 3 — Haftalık hacim kartı

- Mevcut `CizgiGrafik`, üstte "Şu anki / Fark" (hareket grafiğiyle aynı görsel dil).
- **Yalnızca tamamlanmış haftalar** çizilir: devam eden hafta grafiğe girmez, yoksa Pazartesi günü
  tek antrenmanla "Şu anki" düşük görünür ve gerileme gibi okunur. Boş geçmiş haftalar 0 olarak
  çizilir: grafik noktaları tarihe göre değil eşit aralıkla dizdiği için boş haftayı atlamak bir tatili
  görünmez yapar ve "Fark"ı yanıltır.
- Aralık: 1A = son 4 tamamlanmış hafta, 3A = son 13, Tüm. Kesim istemcide (veri tek istekte gelir).

## Karar 4 — Kas grubu dağılımı kartı

- Seçili haftanın dört çubuğu (Push, Pull, Legs, Other), uzunluk o haftanın en yüksek grubuna oranlı,
  yanında set sayısı ve geçen haftaya göre fark ("+2", "−1", eşitse yazılmaz).
- Varsayılan **bu hafta** ("şimdiye kadar ne yaptım"); başlıkta ‹ Bu hafta ›, geçmiş haftalarda tarih
  aralığı ("22–28 Eyl"). İlk haftadan geriye, bu haftadan ileriye gidilmez.
- Seti olmayan hafta: dört sıfır çubuk yerine "Bu hafta antrenman yok" (geçmiş haftada "Bu hafta"
  yerine tarih aralığı).
- Tek renk (`accent`); tasarım token'larına yeni renk eklenmez.

## Karar 5 — Tahmini 1RM kartı

- Başlıkta hareket adı; dokununca `HareketSecici` açılır, yalnızca `WeightReps` hareketler listelenir
  (ağırlıksız/süreli harekette 1RM yok).
- Varsayılan hareket: **son 90 günde en çok set atılan kilolu hareket** — `GET
  /api/stats/volume/by-exercise?From=` yanıtındaki set sayısından. Hiç kilolu hareket yoksa kart kısa bir
  açıklama gösterir.
- Veri mevcut `GET /api/stats/exercises/{id}/progress` — **antrenman başına** nokta, hareket kartındaki
  1RM grafiğinin çizimi ve 1A · 3A · Tüm seçicisi. Yeni backend yok.

## Durumlar ve metinler

- Yükleniyor / hata: mevcut `HataKutusu` ve yükleniyor metni.
- Hiç set yoksa ekranda tek boş durum ("Antrenman kaydettikçe ilerlemen burada görünür"), kartlar yok.
- Her metin tr + en kataloglarında (CLAUDE.md Çok Dil kuralı).

## Testler

- Backend (`StatsServiceTests`): hafta ataması (Pazar 23:30'da başlayan oturum o haftada); boş haftalar
  sıfırla dolar; ağırlıksız ve süreli setler hacme 0 katar ama kategorisine sayılır; başka kullanıcının
  setleri görünmez; hiç set yoksa boş liste.
- Shared: haftalık yanıt doğrulaması; hafta kesimi (tamamlanmış haftalar, 1A/3A) ve geçen haftaya fark
  saf yardımcı olarak test edilir.
- Mobil: sekme yalnızca kendi profilde; hafta okları ve fark metni; boş hafta metni; 1RM kartında
  varsayılan hareket.

## Kapsam dışı

- Kas grubu için yeni sınıflandırma (göğüs/sırt/omuz…).
- Birden fazla hareketin 1RM'ini aynı grafikte karşılaştırma, yüzde değişim görünümü.
- Arkadaş profilinde İlerleme sekmesi.
