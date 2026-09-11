---
tarih: 2026-09-11
durum: karar verildi (2026-09-11) — uygulanmadı
kapsam: backend / zaman
---

# Saat dilimi — sabit TR yerine kullanıcının saati

## Fikir (Ada)

Gün sınırını sadece Türkiye'ye sabitlemek yerine **kullanıcının telefonundaki
saate** göre yapmak daha iyi olmaz mı?

## KARAR (2026-09-11, Ada)

**Gün sınırı kaydın özelliğidir, bakanın değil.** Antrenman hangi yerel günde
yapıldıysa o günde kalır; kullanıcı sonradan saat dilimi değiştirse bile geçmiş
takvim ve seri kaymaz.

Aşağıdaki "Karar verilmesi gereken asıl soru" bölümü bu kararla kapandı —
tarihsel kayıt olarak duruyor.

### Bunun pratik karşılığı

Yerel gün **yazma anında hesaplanıp satırda saklanır**. Gün çıpası taşıyan üç yer:

| Tablo | Çıpa alanı | Neden |
|---|---|---|
| `WorkoutSession` | `StartedAt` | takvim, streak, günlük hacim gruplaması |
| `SetEntry` | `CreatedAt` | geçmiş sorgusunun tarih aralığı filtresi |
| `BodyWeightLog` | `RecordedAt` | kilo trendi gruplaması |

Saklanacak iki alan (ikisi birden):

- `LocalDate` (`DateOnly`) — **donmuş cevap**. Gruplama ve filtreleme artık bunun
  üzerinden yapılır; UTC'yi her sorguda yeniden yorumlamak gerekmez, index'lenebilir.
- `TimeZoneId` (IANA, ör. `Europe/Istanbul`) — **kaynak bilgisi**. Kaydın hangi
  saat diliminde girildiğini saklar; ileride "bu antrenmanı Berlin'de yapmışsın"
  demeyi ve gerekirse yeniden türetmeyi mümkün kılar.

### Normalizasyon notu (inceleme sırasında sorulacak)

`LocalDate`, `StartedAt` + `TimeZoneId`'den türetilebilir bir değer — yani teknik
olarak saklanması bir tekrar. Ama bu, projede zaten kabul edilmiş bir desenin aynısı:
CLAUDE.md `SetEntry.RecordType` için "hesaplanabilir bir değer ama bilerek satırda
saklanıyor — bilinçli bir tarihsel/audit kaydı" diyor. Buradaki gerekçe birebir aynı:
amaç zaten **geçmişin yeniden hesaplanmasını engellemek**. Bu, kararın kendisidir.

### Mevcut veriye ne olacak

Bugüne kadarki tüm kayıtlar Türkiye'de girildi. Migration `LocalDate`'i
`StartedAt AT TIME ZONE 'Europe/Istanbul'` ile doldurur, `TimeZoneId`'yi
`'Europe/Istanbul'` yazar. Geriye dönük bir kayıp yok.

### Hâlâ açık olan alt soru

Saat dilimi **yazma anında nereden gelecek**? Bu karar onu kapatmıyor. Aşağıdaki
üç seçenek geçerliliğini koruyor; `User.TimeZoneId` (seçenek 2) hâlâ en uygunu
görünüyor — cihazlar arası tutarlı ve tek doğruluk kaynağı.

---

## Şu anki durum

`src/Grind.Api/Common/Time/TurkeyDay.cs` içinde saat dilimi sabit:

```csharp
private const string TimeZoneId = "Europe/Istanbul";
```

Buna bağlı olan yerler:

- `WorkoutSessionService` → "bugüne ait açık oturum" araması
- `StatsService` → takvim, streak, günlük hacim, kilo/hacim trendi gruplamaları
- `LocalDayRange` → sorgudaki `from`/`to` tarihlerinin UTC'ye çevrilmesi
- `BodyWeightLogService` → gelecek tarihli kaydın reddi

CLAUDE.md'de de kural olarak yazılı ("yerel saate (TR, UTC+3) çevrilerek") —
değişirse orası da güncellenmeli.

## Neden mantıklı

- Uygulama tek kullanıcılık değil; başka ülkedeki biri kaydolursa takvimi ve
  serisi yanlış güne düşer.
- Kullanıcı seyahatteyken (ör. ABD'de sabah antrenmanı) TR gününe göre
  gruplamak, antrenmanı bir önceki/sonraki güne yazar.
- Zaten altyapı hazır: kod sabit `+03:00` değil `TimeZoneInfo` kullanıyor, yani
  saat dilimini **parametre** yapmak büyük bir yeniden yazım değil.

## Karar verilmesi gereken asıl soru

**Gün sınırı kimin özelliği — kaydın mı, bakanın mı?**

- **Kaydın özelliği (öneri):** antrenman İstanbul'da yapıldıysa, kullanıcı sonra
  Berlin'e taşınsa bile o antrenman İstanbul gününde kalır. Yazma anındaki yerel
  gün (veya offset) satırda saklanır. Antrenman defteri için doğal olan bu:
  geçmiş sabit kalır.
- **Bakanın özelliği:** her sorgu, isteği yapan cihazın saat dilimine göre
  yeniden gruplanır. Bunun bedeli: kullanıcı saat dilimi değiştirdiğinde
  **geçmiş streak ve takvim geriye dönük kayar**. Bir gün kaybolabilir veya
  seri kırılabilir — kullanıcının yapmadığı bir şey yüzünden.

Bu soru cevaplanmadan uygulamaya başlamamalı.

## Nasıl taşınır (üç seçenek)

1. **İstek başına saat dilimi** — client her istekte IANA id gönderir
   (ör. `X-Time-Zone: Europe/Istanbul`). Durumsuz, seyahati kendiliğinden takip
   eder. Ama dışarıdan gelen veri: geçersiz id 400 ile reddedilmeli ve aynı
   kullanıcı iki cihazdan farklı sonuç görebilir.
2. **Kullanıcı ayarı** — `User.TimeZoneId` sütunu, kayıt anında cihazdan
   doldurulur, sonradan değiştirilebilir. Tek doğruluk kaynağı, cihazlar arası
   tutarlı. Migration + küçük bir endpoint ister.
3. **Karma** — kullanıcı ayarı varsayılan, istek başlığı geçersiz kılar.

İlk bakışta **2** bu projeye en uygunu: KISS, tutarlı, ve "gün sınırı kaydın
özelliğidir" kararıyla uyumlu.

## Teknik etkiler (küçümsenmemeli)

- `TurkeyDay` **static olmaktan çıkar** — saat dilimini parametre alan
  enjekte edilebilir bir servise dönüşür (ör. `ILocalDayResolver`).
  İçindeki `static readonly TimeZoneInfo` alanı bir lookup + cache olur.
- Dosya adı da anlamını kaybeder; `LocalDay` gibi bir isim gerekir.
- `TimeZoneInfo.FindSystemTimeZoneById` artık **kullanıcı girdisiyle** çağrılır:
  `TimeZoneNotFoundException` yakalanıp 400'e çevrilmeli. (`TurkeyDay`'in
  başındaki tzdata uyarısı burada daha da önemli hale gelir.)
- Tam saat olmayan offset'ler (Hindistan +05:30, Nepal +05:45) `TimeZoneInfo`
  ile zaten doğru çalışır — elle offset aritmetiği yazılmamalı.
- **Testler**: `TurkeyDayTests`, `LocalDayRangeTests`, `StreakCalculatorTests`,
  `StatsServiceTests`, `WorkoutSessionServiceTests` TR varsayımıyla yazılmış;
  bu değişiklik onların hepsine dokunur.
- CLAUDE.md'deki "TR, UTC+3" kuralı güncellenmeli.

## Ne zaman yapılmalı

Bu bir Faz 11-13 işi değil, mevcut davranışın değişmesi. Frontend kararı
verilmeden **hangi bilginin cihazdan geleceği** de netleşmiyor — ama kararı
(kaydın mı bakanın mı özelliği) şimdiden vermek iyi olur, çünkü "yazma anındaki
yerel günü sakla" seçeneği **şema değişikliği** demek ve ne kadar geç kalınırsa
geriye dönük doldurulacak satır o kadar artar.
