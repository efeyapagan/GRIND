---
name: solid-dry-kiss
description: Apply SOLID, DRY, and KISS principles when writing, reviewing, planning, or refactoring backend code in this project (C#/ASP.NET Core). ALWAYS consult this skill before creating a new class, service, controller, repository, or endpoint, before finalizing an architecture or design decision, and when reviewing a diff — even if not explicitly asked to check these principles.
---

# SOLID, DRY, KISS — Kod Prensipleri

Bu projede yazılan her kod SOLID, DRY ve KISS prensiplerine göre değerlendirilir. Yeni bir sınıf,
servis, controller ya da repository yazmadan önce, ve mevcut kodu incelerken bu dosyadaki kontrol
listesini uygula.

## SOLID

### S — Single Responsibility (Tek Sorumluluk)
Her sınıfın **tek bir değişme nedeni** olmalı.
- Controller'lar sadece HTTP request/response ile ilgilenir; iş mantığı, hesaplama, veri erişimi
  içermez.
- `WorkoutService` gibi bir servis sadece antrenman iş mantığından sorumludur; PR hesaplama
  mantığı büyürse ayrı bir `PersonalRecordCalculator` sınıfına taşınabilir.
- `ExerciseRepository` sadece `Exercise` entity'sinin veri erişiminden sorumludur, başka
  entity'lere dokunmaz.

Kontrol sorusu: "Bu sınıfı değiştirmek için kaç farklı sebep olabilir?" Birden fazlaysa böl.

### O — Open/Closed (Açık/Kapalı)
Yeni davranış eklemek mevcut kodu değiştirmeden mümkün olmalı.
- Örnek: PR tipleri (ağırlık rekoru, tekrar rekoru) ileride çoğalırsa (örn. hacim rekoru), mevcut
  `if/else` zincirini genişletmek yerine bir `IPersonalRecordRule` arayüzü ve her kural için ayrı
  implementasyon düşünülebilir — ama bu soyutlama sadece gerçekten ikinci bir kural eklenince
  gerekçelendirilir (bkz. KISS).

### L — Liskov Substitution
Bir arayüzün (`IRepository<T>`, `IExerciseRepository` vb.) herhangi bir implementasyonu, çağıran
kodu bozmadan diğerinin yerine geçebilmeli. Bir implementasyon, üst tipin verdiği sözü
daraltmamalı (örn. temel arayüz null dönebilir derken bir implementasyonun bunun yerine
exception fırlatması).

### I — Interface Segregation
Kullanılmayan metotları içeren "her şeyi yapan" büyük arayüzler yazma.
- `IWorkoutService` içine set ekleme, export, istatistik gibi ilgisiz sorumlulukları tek
  arayüzde toplama; ihtiyaç oldukça küçük, odaklı arayüzlere böl (`ISetRecorder`,
  `IWorkoutExporter` gibi).

### D — Dependency Inversion
Üst seviye modüller (Controller, Service) somut sınıflara değil soyutlamalara (interface)
bağımlı olmalı.
- Controller, `AppDbContext`'i doğrudan görmez; `IExerciseRepository` gibi bir arayüze bağımlıdır.
- Bağımlılıklar constructor injection ile verilir, `Program.cs`'te DI container'a kaydedilir.

## DRY (Don't Repeat Yourself)
- PR hesaplama mantığı **tek bir yerde** yaşar; hem set eklenirken hem export sırasında aynı
  hesaplama fonksiyonu çağrılır — iki yerde kopyalanmaz.
- Ortak validasyon (örn. "ağırlık ve tekrar pozitif olmalı") bir extension method veya validator
  sınıfında toplanır, her controller'da tekrar yazılmaz.
- Tekrar eden LINQ sorguları repository metotlarına taşınır.
- İstisna: iki kod parçası şu an tesadüfen aynı görünüyor ama farklı sebeplerle değişecekse
  (farklı iş kuralları), onları soyutlayıp birleştirme — bu yanlış bir soyutlamaya (DRY'ın kötüye
  kullanımı) yol açar.

## KISS (Keep It Simple, Stupid)
Bu kişisel ölçekte bir proje — gereksiz karmaşıklıktan kaçın.
- Şu an ihtiyaç olmayan bir şey için (mikroservis, mesaj kuyruğu, generic plugin mimarisi, ileri
  seviye design pattern) altyapı kurma. Gerçek bir ikinci kullanım durumu ortaya çıkınca soyutla.
- Basit bir `if (weight > maxWeight)` kontrolü yeterliyse, bunun için bir Strategy pattern kurma.
- Bir CRUD işlemi için gereğinden fazla katman ekleme (örn. hem Repository hem "Manager" hem
  "Handler"); Controller → Service → Repository üç katmanı bu proje için yeterli.

## SOLID ile KISS Gerilimi
SOLID ilkelerini "olabildiğince soyutla" diye okumak KISS'i ihlal eder. Kural: bir soyutlama,
**şu an var olan somut bir ihtiyacı** çözüyorsa ekle; "ileride lazım olabilir" varsayımıyla
ekleme. Emin değilsen önce en basit çözümü yaz, ikinci somut kullanım durumu ortaya çıkınca
refactor et.

## Kod Yazmadan / Onaylamadan Önce Kontrol Listesi
- [ ] Bu sınıfın tek bir sorumluluğu var mı?
- [ ] Bu mantık başka bir yerde zaten var mı? (DRY ihlali riski)
- [ ] Bu soyutlama gerçek bir ihtiyaçtan mı geliyor, yoksa varsayımsal mı? (KISS)
- [ ] Controller'da iş mantığı sızıyor mu?
- [ ] Servis somut bir `DbContext`'e değil, arayüze mi bağımlı?
- [ ] Yeni bir entity/tablo/alan ekleniyorsa: bu alan gerçekten satırın kendi kimliğine mi
      bağımlı, yoksa başka bir non-key alana mı bağımlı (3NF ihlali riski)?
