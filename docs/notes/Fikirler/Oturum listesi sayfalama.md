---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / sorgu
---

# Oturum listesi sayfalanmalı

## Sorun

`GET /api/sessions` → `WorkoutSessionRepository.GetAllAsync` tüm geçmişi tek
seferde dönüyor, hiçbir sınır yok. Haftada 4 antrenmanla iki yılda ~400 satır,
ve büyümesi hiç durmuyor.

Geçmiş sorgusunda (`/api/history`) sayfalama **zaten var**; oturum listesinde
olmaması bir tutarsızlık.

## Nasıl

Yeni bir şey icat edilmeyecek — mevcut iki tip kullanılacak (DRY):

- `PagedRangeQuery` — `From`/`To` (TR yerel günü, iki uç dahil), `Page` (varsayılan 1),
  `PageSize` (varsayılan 20, en fazla 100), ve taşmaya karşı korumalı `Skip()`
- `PagedResponse<T>` — `Items`, `Page`, `PageSize`, `TotalCount`, türetilmiş `TotalPages`

Sıralama zaten `StartedAt` azalan (yeniden eskiye) — sayfalamayla birlikte kalmalı.

## Dikkat

Sıralama **toplam** olmalı: `StartedAt` eşitse (aynı anda başlatılmış iki oturum)
sayfalar arasında satır tekrarlayabilir veya kaybolabilir. `ThenBy(Id)` eklenmeli —
`StatsService`'te aynı ders zaten yaşanmış (Faz 8/9 notu: "sıralamayı koşulsuz
toplam hale getir").

Liste yanıtında `progress` bilerek boş kalıyor (her satır için ayrı sayım sorgusu
N+1 olurdu) — sayfalama bunu değiştirmiyor, ama sayfa başına 20 satırla ileride
istenirse tek bir toplu sorguyla doldurmak mümkün hale gelir.
