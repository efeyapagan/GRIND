# Repository + Unit of Work Tasarımı

**Tarih:** 2026-08-31
**Kapsam:** PLAN.md Faz 2
**Durum:** 🟡 ONAY BEKLİYOR — implementasyon başlamadı

## Bu Doküman Ne Değildir

CLAUDE.md katmanları tanımlıyor (Controller → Service → Repository/UoW, `DbContext`'e
yalnızca veri erişim katmanı dokunur) ve `solid-dry-kiss` skill'i soyutlama disiplinini
koyuyor. Bu doküman onları kopyalamaz; yalnızca Faz 2'nin açık bıraktığı kararları
kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

---

## Karar bekleyen üç soru

PLAN.md 2.1 "`IRepository<T>` (Get/Query/Add/Remove) + `Repository<T>`" diyor. Bu satır
yazıldığında henüz hiçbir servis yoktu; şimdi kararı somut kullanım üzerinden vermek
gerekiyor. Üç ayrı soru var ve birbirinden bağımsızlar.

### Soru 1 — Generic `Repository<T>` gerçekten yazılsın mı?

`solid-dry-kiss` şunu söylüyor: *"bir soyutlama şu an var olan somut bir ihtiyacı
çözüyorsa ekle; 'ileride lazım olabilir' varsayımıyla ekleme."* Generic repository bu
kuralın klasik sınav sorusu.

**A — Generic taban + gerektiğinde özel repo (önerim).** `Repository<T>` ortak
`GetByIdAsync` / `AddAsync` / `Remove` gövdesini bir kez yazar; `ExerciseRepository`
gibi sınıflar ondan türeyip yalnızca kendi sorgularını ekler. Dokuz entity'nin en az
dördü için aynı üç metodu elle tekrar yazmak somut bir DRY ihlali olurdu — yani
soyutlama varsayımsal değil, bugün var olan bir tekrarı çözüyor.

**B — Sadece özel repository'ler, taban sınıf yok.** Her repo kendi metotlarını yazar.
En dürüst KISS yorumu; ama `GetByIdAsync` gövdesi dört-beş dosyada birebir tekrar eder.

**C — Repository katmanı hiç yok, servisler `DbContext`'i doğrudan kullanır.** EF Core
zaten Unit of Work + Repository. CLAUDE.md bunu açıkça yasaklıyor ("`DbContext`'e sadece
bu katman dokunur"), o yüzden bu seçenek kapalı — tamlık için yazıldı.

### Soru 2 — Repository dışarıya `IQueryable<T>` sızdırsın mı?

PLAN.md 2.1'de "Query" geçiyor, ama bunun ne anlama geldiği kritik.

**A — Hayır, sızdırmasın (önerim).** Repository somut metotlar döndürür
(`GetOpenSessionForTodayAsync`, `GetSetsForExerciseAsync`). Gerekçe: `IQueryable`
döndürmek EF Core'u servis katmanına sızdırır, CLAUDE.md'nin "DbContext'e sadece bu
katman dokunur" kuralını fiilen delerdi, ve sorgunun nerede materialize olduğu
belirsizleşir. Bedeli: her yeni sorgu için repository'ye metot eklemek gerekir — ki
CLAUDE.md zaten "tekrar eden LINQ sorguları repository metotlarına taşınır" diyor.

**B — Evet, `IQueryable` döndürsün.** Servis katmanı esnek sorgu kurabilir, filtreleme
ve sayfalama serbestleşir. Bedeli yukarıdaki sızıntı.

### Soru 3 — Unit of Work repository'leri sahiplensin mi?

**A — Hayır; repo'lar da UoW da ayrı ayrı inject edilir (önerim).** `IUnitOfWork` tek bir
iş yapar: `SaveChangesAsync()` ve gerektiğinde açık transaction. Servis, ihtiyaç duyduğu
repo'ları ve `IUnitOfWork`'ü ayrı ayrı constructor'dan alır. Interface Segregation'a uygun:
sadece set ekleyen bir servis, dokuz repo taşıyan bir nesneye bağımlı olmaz.

**B — `IUnitOfWork` bütün repo'ları property olarak taşır** (`uow.Exercises`, `uow.Sessions`…).
Tek bağımlılık, transaction sınırı görünür. Bedeli: her servis kullanmadığı sekiz repo'ya da
bağımlı hale gelir — Interface Segregation ihlali ve test kurulumunu ağırlaştırır.

---

## Önerilen tasarım (A + A + A)

```
src/Grind.Api/Repositories/
├─ IRepository.cs            IRepository<T> — GetByIdAsync, AddAsync, Remove
├─ Repository.cs             Repository<T> — ortak gövde, DbContext'i tutar
├─ IUserRepository.cs        GetByUsernameAsync, UsernameExistsAsync
├─ UserRepository.cs
├─ IExerciseRepository.cs    kullanıcı + global görünür egzersizler, isim çakışması
├─ ExerciseRepository.cs
├─ IWorkoutSessionRepository.cs   bugüne ait açık session (TR yerel gün sınırı)
├─ WorkoutSessionRepository.cs
├─ ISetEntryRepository.cs    egzersiz bazında kronolojik setler (PR motoru için)
└─ SetEntryRepository.cs

src/Grind.Api/Data/
├─ IUnitOfWork.cs            SaveChangesAsync + BeginTransactionAsync
└─ UnitOfWork.cs
```

Bu fazda yalnızca **dört** özel repository yazılır (PLAN.md 2.2). Kalan beş entity için
generic taban yeterli; gerçek bir sorgu ihtiyacı doğunca kendi repo'sunu alır.

**Transaction:** CLAUDE.md'nin kuralı — anlamlı her iş operasyonu tek bir
`SaveChangesAsync()` altında toplanır, EF bunu zaten atomik yapar; açık transaction
yalnızca birden fazla `SaveChangesAsync` gerektiren senaryolarda. `IUnitOfWork` bu yüzden
`BeginTransactionAsync`'i sunar ama kullanımı istisnadır, kural değil.

**Sahiplik kontrolü bu katmanda YAPILMAZ.** Repository "bu kullanıcının erişebildiği
egzersizler" gibi sorgular sunar, ama yetkilendirme kararını servis verir. CLAUDE.md
sahiplik kontrolünü servis metodlarına bağlıyor; repo'ya gömmek kuralı iki yere dağıtırdı.

**Test:** repository'ler gerçek PostgreSQL'e karşı test edilir (Faz 1'de kurulan
altyapıyla). In-memory sağlayıcı kullanılmaz — `NULLS NOT DISTINCT`, CHECK kısıtları ve
`citext`-benzeri davranışlar orada yoktur ve testi yalancı yeşile çevirir.

---

## Neden burada durdum

`solid-dry-kiss` ve brainstorming skill'i, implementasyondan önce tasarım onayı istiyor —
ve Faz 2 tam olarak "yanlış soyutlama" riskinin en yüksek olduğu katman. Generic repository
kararı yanlış verilirse Faz 4-12'nin tamamı onun üzerine inşa edilir ve geri almak pahalıdır.

Üç sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını
yazıp görev görev ilerleyeceğim.
