# Faz 8 — SetEntry + PR Motoru Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı set girebilsin; sistem her setin kişisel rekor olup olmadığını otomatik
tespit etsin; set/oturum silindiğinde veya düzeltildiğinde rekorlar doğru şekilde yeniden
hesaplansın; tüm zamanların rekorları tek uçtan okunabilsin.

**Architecture:** Saf, veritabanı bilmeyen bir `RecordTracker` tek karar noktasıdır — hem
"yeni set rekor mu" hem "tüm geçmişi yeniden tara" akışları onun `Apply` metodunu çağırır
(CLAUDE.md'nin DRY emri). `PersonalRecordService` bu çekirdeği veriye bağlar ve **asla**
`SaveChangesAsync` çağırmaz; commit sınırı her zaman çağıran serviste kalır, böylece
"set ekle + rekorları güncelle" tek bir unit of work olur. `WorkoutSessionService`'e
entity döndüren ve kaydetmeyen bir `GetOrOpenTodayAsync` seam'i eklenir, böylece set ekleme
akışı oturum açma mantığını kopyalamadan aynı commit'e katılır.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 10 (Npgsql), PostgreSQL 17 (Docker,
host port 5433), xUnit.

**Spec:** `docs/superpowers/specs/2026-09-10-setentry-pr-design.md` (onaylandı 2026-09-10,
dört sorunun da A seçeneği)

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur. Controller
  iş mantığı içermez, `if`/`try` taşımaz — hata çevirisi `GlobalExceptionHandler`'da.
- **IDOR:** `SetEntry` sahipliği `WorkoutSession.UserId` üzerinden gelir. Her sorgu
  `s.WorkoutSession.UserId == userId` yüklemini taşır. Başkasının kaydı → **404**, nötr
  mesajla (id söylenmez). `IRepository<T>.GetByIdAsync` sahiplik kontrolü YAPMAZ; kullanmak
  IDOR'dur.
- **Tek commit:** Bir iş operasyonu tek `SaveChangesAsync` altında toplanır.
  `PersonalRecordService`'in HİÇBİR metodu `SaveChangesAsync` çağırmaz.
- **DRY (CLAUDE.md açık emri):** rekor kararı tek bir fonksiyonda yaşar; ekleme ve yeniden
  hesaplama akışlarının ikisi de onu çağırır.
- **Rekor kuralları (spec Soru 1/A):**
  - `weight > önceki maksimum ağırlık` (veya hiç önceki yok) → `RecordType.Weight`
  - değilse, **o ağırlıkta önceki bir kayıt VARSA** ve `reps >` o kayıt → `RecordType.Reps`
  - değilse → `RecordType.None`. **Eşitlik rekor değildir.**
- **Arşiv (spec Soru 2/A):** arşivlenmiş egzersize YENİ set girilemez → `ValidationException`
  (400). Geçmiş setler okunmaya devam eder.
- **Fiil (spec Soru 3/A):** set düzeltmesi yalnızca `PATCH`. `PUT` YOK.
- **Okuma ucu (spec Soru 4/A):** `GET /api/sessions/{id}/sets`. Faz 7'nin `SessionResponse`
  DTO'suna DOKUNULMAZ.
- **Zaman:** `DateTime.UtcNow` doğrudan çağrılmaz — enjekte edilen `TimeProvider` kullanılır.
- **Migration YOK:** Bu faz hiçbir şema değişikliği içermez. `SetEntry` tablosu, CHECK
  constraint'leri ve index'i Faz 1'de oluşturuldu. `dotnet ef migrations add` ÇAĞRILMAZ.
- **Test:** Veritabanı isteyen testler `[Trait("Category", "Database")]` taşır ve
  transaction + rollback deseniyle yazılır. Test adları Türkçe, mevcut dosyalardaki gibi.
- **Commit mesajları** Türkçe, `feat(...)`/`test(...)`/`fix(...)` önekiyle, ASCII
  (mevcut git geçmişindeki gibi aksansız).

**İsimlendirme notu (incelemeciler için):** CLAUDE.md `PersonalRecordCalculator` ve
`RecalculateRecords(userId, exerciseId)` adlarını anıyor. Bu planda karşılıkları:
saf çekirdek `RecordTracker`, veriye bağlayan servis `PersonalRecordService`, metot
`RecalculateAsync(exerciseId, ...)` (kullanıcı `ICurrentUserService`'ten gelir — projedeki
her serviste olduğu gibi). Bu bir sapma değil, aynı yapının bu kod tabanındaki adlandırma
konvansiyonuna uydurulmuş hâli.

---

## Dosya Haritası

**Yeni:**
- `src/Grind.Api/Common/Records/RecordTracker.cs`
- `src/Grind.Api/Models/Dtos/Set/CreateSetRequest.cs`
- `src/Grind.Api/Models/Dtos/Set/PatchSetRequest.cs`
- `src/Grind.Api/Models/Dtos/Set/SetEntryResponse.cs`
- `src/Grind.Api/Models/Dtos/Record/ExerciseRecordResponse.cs`
- `src/Grind.Api/Services/IPersonalRecordService.cs`
- `src/Grind.Api/Services/PersonalRecordService.cs`
- `src/Grind.Api/Services/ISetEntryService.cs`
- `src/Grind.Api/Services/SetEntryService.cs`
- `src/Grind.Api/Controllers/SetsController.cs`
- `src/Grind.Api/Controllers/RecordsController.cs`
- `tests/Grind.Tests/Common/RecordTrackerTests.cs`
- `tests/Grind.Tests/Services/PersonalRecordServiceTests.cs`
- `tests/Grind.Tests/Services/SetEntryServiceTests.cs`
- `tests/Grind.Tests/Integration/SetEndpointsTests.cs`

**Değişen:**
- `src/Grind.Api/Repositories/ISetEntryRepository.cs` (+3 metot, +sıralama notu)
- `src/Grind.Api/Repositories/SetEntryRepository.cs`
- `src/Grind.Api/Services/IWorkoutSessionService.cs` (+seam)
- `src/Grind.Api/Services/WorkoutSessionService.cs` (seam + silmede yeniden hesap)
- `src/Grind.Api/Services/DependencyInjection.cs` (+2 kayıt)
- `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs`
- `tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs`
- `PLAN.md` (Faz 8 kutuları + devreden notlar)

**Beklenen test sayısı:** 310 → **382** (+72). Görev bazında: 10, 7, 10, 5, 17, 4, 19.
xUnit her `[InlineData]`'yı ayrı test sayar — Görev 7'deki 401 `[Theory]`'si 5 InlineData
taşıyor (5 test) + 14 `[Fact]` = 19.

---

## Görev 1: `RecordTracker` — saf rekor çekirdeği

**Files:**
- Create: `src/Grind.Api/Common/Records/RecordTracker.cs`
- Test: `tests/Grind.Tests/Common/RecordTrackerTests.cs`

**Interfaces:**
- Consumes: `Grind.Api.Models.Enums.RecordType` (None / Weight / Reps — zaten var)
- Produces: `Grind.Api.Common.Records.RecordTracker` — `public RecordType Apply(decimal weight, int reps)`

Bu görev veritabanına DOKUNMAZ. Tüm faz bu sınıfın doğruluğuna yaslanıyor; bu yüzden
testleri saf birim testi (DB yok, `[Trait]` yok) — hızlı ve kesin.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Common/RecordTrackerTests.cs`:

```csharp
using Grind.Api.Common.Records;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Common;

/// <summary>
/// Projenin kalbi. DB'siz, saf. Kurallar (spec Soru 1/A):
/// ağırlık rekoru = önceki maksimumu GEÇMEK (ya da hiç önceki olmaması);
/// tekrar rekoru = AYNI ağırlıkta önceki bir kaydı GEÇMEK — o ağırlıkta hiç
/// önceki yoksa rekor DEĞİLDİR; eşitlik hiçbir zaman rekor değildir.
/// </summary>
public class RecordTrackerTests
{
    [Fact]
    public void Ilk_set_agirlik_rekorudur()
    {
        var izleyici = new RecordTracker();

        Assert.Equal(RecordType.Weight, izleyici.Apply(100m, 8));
    }

    [Fact]
    public void Daha_agir_set_agirlik_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.Weight, izleyici.Apply(105m, 3));
    }

    [Fact]
    public void Ayni_agirlikta_daha_cok_tekrar_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.Reps, izleyici.Apply(100m, 10));
    }

    /// <summary>Eşitlik rekor değildir — CLAUDE.md 8.5'in açık şartı.</summary>
    [Fact]
    public void Ayni_agirlik_ayni_tekrar_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(100m, 8));
    }

    [Fact]
    public void Ayni_agirlikta_daha_az_tekrar_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(100m, 6));
    }

    /// <summary>
    /// Soru 1/A'nın MANŞETİ: 100 kg rekorundan sonra atılan 60 kg × 15'lik indirme seti
    /// rekor DEĞİLDİR — 60 kg'da karşılaştırılacak bir geçmiş yok. B seçeneği seçilmiş
    /// olsaydı bu Reps dönerdi; testin kırmızıya dönmesi kural değişikliğini yakalar.
    /// </summary>
    [Fact]
    public void Daha_hafif_agirlikta_ilk_set_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(60m, 15));
    }

    /// <summary>Ama o kovada bir kıyas noktası oluştuktan sonra geçmek rekordur.</summary>
    [Fact]
    public void Daha_hafif_agirlikta_ikinci_set_daha_cok_tekrarla_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);
        izleyici.Apply(60m, 15);

        Assert.Equal(RecordType.Reps, izleyici.Apply(60m, 18));
    }

    /// <summary>
    /// Weight = 0 geçerli (barfiks/dips). "Maksimum yok" durumu `default(decimal)` ile
    /// değil nullable ile temsil edilmeli — aksi halde ilk 0 kg'lık set "0 > 0 değil"
    /// diyerek rekor sayılmaz ve vücut ağırlığı hareketleri hiç rekor üretmez.
    /// </summary>
    [Fact]
    public void Sifir_kilo_gecerli_bir_agirlik_kovasidir()
    {
        var izleyici = new RecordTracker();

        Assert.Equal(RecordType.Weight, izleyici.Apply(0m, 20));
        Assert.Equal(RecordType.Reps, izleyici.Apply(0m, 25));
        Assert.Equal(RecordType.None, izleyici.Apply(0m, 25));
    }

    /// <summary>
    /// EF (6,2) ölçeğiyle döndüğü için DB'den gelen 100.00m ile testte yazılan 100.0m
    /// AYNI kovaya düşmeli. decimal.Equals/GetHashCode bunu garanti ediyor (ölçüldü);
    /// bu test o garantiyi koda bağlar — bir gün ağırlık double'a çevrilirse kırmızıya döner.
    /// </summary>
    [Fact]
    public void Ondalik_olcek_farki_ayni_agirlik_kovasina_duser()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100.0m, 8);

        Assert.Equal(RecordType.Reps, izleyici.Apply(100.00m, 9));
    }

    /// <summary>
    /// Gerçek bir antrenman serisi baştan sona. Tek tek kurallar doğru olup birleşimleri
    /// yanlış olabilir; bu test sıranın tamamını sabitler.
    /// </summary>
    [Fact]
    public void Gercek_bir_seri_bastan_sona_dogru_siniflanir()
    {
        var izleyici = new RecordTracker();

        var sonuclar = new[]
        {
            izleyici.Apply(60m, 12),   // ilk set        -> Weight
            izleyici.Apply(80m, 10),   // daha agir      -> Weight
            izleyici.Apply(80m, 10),   // esitlik        -> None
            izleyici.Apply(80m, 11),   // ayni agirlik + -> Reps
            izleyici.Apply(60m, 20),   // 60 kovasi var  -> Reps
            izleyici.Apply(100m, 1),   // yeni maksimum  -> Weight
            izleyici.Apply(90m, 5)     // 90 kovasi yeni -> None
        };

        Assert.Equal(
            new[]
            {
                RecordType.Weight, RecordType.Weight, RecordType.None, RecordType.Reps,
                RecordType.Reps, RecordType.Weight, RecordType.None
            },
            sonuclar);
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini/başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~RecordTrackerTests"`
Beklenen: derleme hatası — `RecordTracker` tipi yok.

- [ ] **Adım 3: `RecordTracker`'ı yaz**

`src/Grind.Api/Common/Records/RecordTracker.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Records;

/// <summary>
/// Kişisel rekor tespitinin TEK karar noktası. Veritabanı bilmez, zaman bilmez, kullanıcı
/// bilmez — yalnızca kendisine verilen setleri kronolojik sırada görür.
///
/// CLAUDE.md'nin DRY emri: "AddSet akışındaki 'bu set önceki en iyiyi geçiyor mu' kontrolü
/// ortak bir yardımcı fonksiyonda tutulup her iki akışta da (ekleme ve yeniden hesaplama)
/// aynı fonksiyon çağrılmalı." O fonksiyon <see cref="Apply"/>'dır. İkinci bir yerde
/// "&gt;" karşılaştırması yazmak bu kuralın ihlalidir.
///
/// Örnek durumu YÜRÜR: her <see cref="Apply"/> çağrısı hem sınıflandırır hem "yürüyen en
/// iyiler"i ilerletir. Bu yüzden bir örnek TEK bir (kullanıcı, egzersiz) serisi için
/// kullanılır ve yeniden kullanılmaz.
/// </summary>
public sealed class RecordTracker
{
    // Nullable, `0m` DEĞİL: Weight = 0 geçerli bir ağırlıktır (barfiks/dips). Sıfırla
    // başlatmak ilk 0 kg'lık seti "0 > 0 değil" diye rekor saymamaya yol açardı.
    private decimal? _maxWeight;

    // Ağırlık kovası -> o kovadaki en çok tekrar. decimal anahtar güvenli: 100.0m ile
    // 100.00m hem Equals hem GetHashCode bakımından aynı (ölçüldü) — EF'ten (6,2)
    // ölçeğiyle dönen değerler ayrı kovaya düşmez.
    private readonly Dictionary<decimal, int> _maxRepsByWeight = [];

    /// <summary>
    /// Bir seti sınıflandırır VE durumu ilerletir. Çağrı sırası kronolojik olmalıdır.
    /// </summary>
    public RecordType Apply(decimal weight, int reps)
    {
        var result = Classify(weight, reps);
        Observe(weight, reps);
        return result;
    }

    private RecordType Classify(decimal weight, int reps)
    {
        // Hiç önceki maksimum yoksa "çıtayı sen koydun" — ilk set her zaman ağırlık rekoru.
        if (_maxWeight is not { } maxWeight || weight > maxWeight)
        {
            return RecordType.Weight;
        }

        // DİKKAT (spec Soru 1/A): o ağırlıkta hiç önceki kayıt YOKSA rekor değildir.
        // TryGetValue'nun false dönmesi "geçilecek bir şey yok" demektir, "her şeyi geçtin"
        // demek DEĞİL — burada `out var best` yerine `best = 0` varsaymak, her indirme
        // setini sahte bir PR rozetiyle işaretlerdi.
        if (_maxRepsByWeight.TryGetValue(weight, out var bestReps) && reps > bestReps)
        {
            return RecordType.Reps;
        }

        return RecordType.None;
    }

    private void Observe(decimal weight, int reps)
    {
        if (_maxWeight is not { } maxWeight || weight > maxWeight)
        {
            _maxWeight = weight;
        }

        // Rekor OLMAYAN setler de kovayı besler: 60x15 rekor değildir ama sonraki 60x18'in
        // kıyas noktasıdır.
        if (!_maxRepsByWeight.TryGetValue(weight, out var bestReps) || reps > bestReps)
        {
            _maxRepsByWeight[weight] = reps;
        }
    }
}
```

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~RecordTrackerTests"`
Beklenen: 10 test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Common/Records/RecordTracker.cs tests/Grind.Tests/Common/RecordTrackerTests.cs
git commit -m "feat(records): rekor tespitinin saf cekirdegi RecordTracker"
```

---

## Görev 2: `ISetEntryRepository` eklemeleri + sıralama belirliliği

**Files:**
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs`
- Modify: `src/Grind.Api/Repositories/SetEntryRepository.cs`
- Test: `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` (mevcut dosyaya ekle)

**Interfaces:**
- Consumes: `Repository<SetEntry>` tabanı (`Set`, `Add`, `Remove`)
- Produces:
  - `Task<SetEntry?> GetOwnedByIdAsync(long id, long userId, CancellationToken ct = default)`
    — `Exercise` Include'lu
  - `Task<IReadOnlyList<SetEntry>> GetForSessionAsync(long sessionId, long userId, CancellationToken ct = default)`
    — `Exercise` Include'lu, kronolojik
  - `Task<IReadOnlyList<SetEntry>> GetRecordCarryingSetsAsync(long userId, CancellationToken ct = default)`
    — yalnızca `RecordType != None`, `Exercise` Include'lu
  - `GetForUserAndExerciseAsync` artık `ThenBy(s => s.Id)` ile **belirli** sıralı

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` dosyasının SONUNA, sınıfın
içine ekle. (Mevcut testlere ve varsa mevcut yardımcılara dokunma; aşağıdaki yardımcılar
dosyada zaten varsa yeniden tanımlama.)

```csharp
    // ---- Faz 8 eklemeleri ----

    /// <summary>
    /// Aynı `CreatedAt` taşıyan setler için sıralama BELİRLİ olmalı. Sahte saat kullanan
    /// servis testlerinde bütün setler aynı ana düşer; sıralama yalnızca CreatedAt'e
    /// dayanırsa PostgreSQL satırları herhangi bir sırada döndürebilir ve rekor sonucu
    /// sorgudan sorguya değişir. Tie-break: Id.
    /// </summary>
    [Fact]
    public async Task Ayni_anda_olusan_setler_id_sirasiyla_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        foreach (var reps in new[] { 8, 9, 10, 11, 12 })
        {
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = 100m, Reps = reps, RecordType = RecordType.None, CreatedAt = an
            });
        }
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var sets = await repository.GetForUserAndExerciseAsync(user.Id, exercise.Id);

        Assert.Equal([8, 9, 10, 11, 12], sets.Select(s => s.Reps));
        Assert.Equal(sets.Select(s => s.Id).Order(), sets.Select(s => s.Id));
    }

    [Fact]
    public async Task Baskasinin_seti_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        };
        context.AddRange(sahip, davetsiz, session, exercise, set);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(set.Id, davetsiz.Id));
    }

    [Fact]
    public async Task Kendi_seti_egzersiziyle_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var ad = $"Egzersiz {Guid.NewGuid():N}";
        var exercise = TestDatabase.NewExercise(user, ad);
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        };
        context.AddRange(user, session, exercise, set);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var bulunan = await repository.GetOwnedByIdAsync(set.Id, user.Id);

        Assert.NotNull(bulunan);
        // Yanıt DTO'su ExerciseName taşıyor; Include yoksa burada NullReferenceException olurdu.
        Assert.Equal(ad, bulunan.Exercise.Name);
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_bos_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, session, exercise, new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetForSessionAsync(session.Id, davetsiz.Id));
    }

    [Fact]
    public async Task Oturumun_setleri_kronolojik_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an.AddMinutes(10)
        });
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 6, RecordType = RecordType.None, CreatedAt = an
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var sets = await repository.GetForSessionAsync(session.Id, user.Id);

        Assert.Equal([6, 8], sets.Select(s => s.Reps));
    }

    [Fact]
    public async Task Yalnizca_rekor_tasiyan_setler_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = an.AddMinutes(1) });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 9, RecordType = RecordType.Reps, CreatedAt = an.AddMinutes(2) });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var rekorlar = await repository.GetRecordCarryingSetsAsync(user.Id);

        Assert.Equal(2, rekorlar.Count);
        Assert.DoesNotContain(rekorlar, s => s.RecordType == RecordType.None);
        Assert.All(rekorlar, s => Assert.NotNull(s.Exercise));
    }

    [Fact]
    public async Task Rekor_sorgusu_baskasinin_setlerini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, session, exercise, new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetRecordCarryingSetsAsync(davetsiz.Id));
    }
```

Dosyanın başında eksikse şu `using`'leri ekle:
`using Grind.Api.Models.Entities;`, `using Grind.Api.Models.Enums;`,
`using Grind.Api.Repositories;`, `using Microsoft.EntityFrameworkCore;`.

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryRepositoryTests"`
Beklenen: derleme hatası — üç metot yok. (Sıralama testi tek başına derlenir ama
tie-break eklenmeden kararsızdır; Adım 3'ten sonra kalıcı yeşil olmalı.)

- [ ] **Adım 3: Repository'yi genişlet**

`src/Grind.Api/Repositories/ISetEntryRepository.cs` — mevcut üç metodu KORU, şunları ekle:

```csharp
    /// <summary>
    /// Başkasının setinde null döner (IDOR koruması). Sahiplik SetEntry'nin kendi
    /// sütununda değil, WorkoutSession.UserId üzerindedir. <c>Exercise</c> yüklenir —
    /// yanıt DTO'su egzersiz adını taşıyor.
    /// </summary>
    Task<SetEntry?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bir oturumun setleri, kronolojik. Başkasının oturumunda BOŞ döner — çağıran servis
    /// "yok" ile "boş" ayrımını yapmak için oturumun sahipliğini ayrıca doğrulamalıdır.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının rekor taşıyan (<c>RecordType != None</c>) tüm setleri, <c>Exercise</c>
    /// ile birlikte. Tüm zamanların rekorları özeti bunun üzerinden hesaplanır: bir set
    /// <c>None</c> ise tanımı gereği kendisinden önce ağırlıkça ve (aynı ağırlıkta)
    /// tekrarca en az onun kadar iyi bir set vardır — dolayısıyla hiçbir maksimum yalnızca
    /// <c>None</c> satırlarda yaşayamaz ve bu filtre bilgi kaybetmez.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetRecordCarryingSetsAsync(
        long userId, CancellationToken cancellationToken = default);
```

`GetForUserAndExerciseAsync`'in doc'una şu cümleyi ekle:
`/// Sıralama BELİRLİDİR: CreatedAt, eşitlikte Id — aynı ana düşen setlerde sonuç sorgudan sorguya değişmesin.`

`src/Grind.Api/Repositories/SetEntryRepository.cs` — `GetForUserAndExerciseAsync`'i
güncelle ve üç metodu ekle:

```csharp
    public async Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.ExerciseId == exerciseId && s.WorkoutSession.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            // Tie-break ZORUNLU: sahte saatle girilen setlerin CreatedAt'i aynıdır ve
            // PostgreSQL eşit anahtarlarda sıra garantisi vermez. Belirsiz sıra =
            // sorgudan sorguya değişen rekor sonucu.
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    public async Task<SetEntry?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .FirstOrDefaultAsync(
                s => s.Id == id && s.WorkoutSession.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<SetEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .Where(s => s.WorkoutSessionId == sessionId && s.WorkoutSession.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SetEntry>> GetRecordCarryingSetsAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .Where(s => s.WorkoutSession.UserId == userId && s.RecordType != RecordType.None)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);
```

`using Grind.Api.Models.Enums;` eklemeyi unutma.

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryRepositoryTests"`
Beklenen: mevcut testler + 7 yeni test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Repositories/ISetEntryRepository.cs src/Grind.Api/Repositories/SetEntryRepository.cs tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs
git commit -m "feat(data): set sorgulari - sahiplik, oturum listesi, rekor tasiyanlar"
```

---

## Görev 3: `PersonalRecordService` — çekirdeği veriye bağlar

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Record/ExerciseRecordResponse.cs`
- Create: `src/Grind.Api/Services/IPersonalRecordService.cs`
- Create: `src/Grind.Api/Services/PersonalRecordService.cs`
- Test: `tests/Grind.Tests/Services/PersonalRecordServiceTests.cs`

**Interfaces:**
- Consumes: `RecordTracker.Apply` (Görev 1); `ISetEntryRepository.GetForUserAndExerciseAsync`,
  `GetRecordCarryingSetsAsync` (Görev 2); `ICurrentUserService`
- Produces:
  - `record ExerciseRecordResponse(long ExerciseId, string ExerciseName, ExerciseCategory Category, decimal BestWeight, int BestWeightReps, DateTime BestWeightAt, int BestReps, decimal BestRepsWeight, DateTime BestRepsAt)`
  - `IPersonalRecordService`:
    - `Task<RecordType> EvaluateNewAsync(long exerciseId, decimal weight, int reps, CancellationToken ct = default)`
    - `Task RecalculateAsync(long exerciseId, long? excludeSetId = null, long? excludeSessionId = null, CancellationToken ct = default)`
    - `Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(CancellationToken ct = default)`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/PersonalRecordServiceTests.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Common.Security;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

/// <summary>
/// Rekor motorunun veriye bağlanan yüzü. Kritik sözleşme: HİÇBİR metot
/// SaveChangesAsync ÇAĞIRMAZ — commit sınırı çağıran serviste kalır ki
/// "set ekle + rekorları güncelle" tek bir unit of work olabilsin.
/// </summary>
[Trait("Category", "Database")]
public class PersonalRecordServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, WorkoutSession Session,
        Exercise Exercise, PersonalRecordService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var service = new PersonalRecordService(
            new SetEntryRepository(context), new StubCurrentUser(user.Id));

        return (context, user, session, exercise, service, transaction);
    }

    /// <summary>Setleri verilen sırayla, birer dakika arayla ekler.</summary>
    private static async Task<List<SetEntry>> SeedAsync(
        AppDbContext context, WorkoutSession session, Exercise exercise,
        params (decimal Weight, int Reps, RecordType Record)[] sets)
    {
        var eklenen = new List<SetEntry>();
        var dakika = 0;

        foreach (var (weight, reps, record) in sets)
        {
            var set = new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = weight, Reps = reps, RecordType = record,
                CreatedAt = An.AddMinutes(dakika++)
            };
            context.Add(set);
            eklenen.Add(set);
        }

        await context.SaveChangesAsync();
        return eklenen;
    }

    /// <summary>
    /// RecordType tarihsel bir anlık görüntüdür (CLAUDE.md). Yeni bir set değerlendirilirken
    /// geçmiş satırlar YENİDEN YAZILMAMALI — aksi halde "o an rekordu" bilgisi kaybolur.
    /// </summary>
    [Fact]
    public async Task Yeni_set_degerlendirilirken_gecmis_satirlar_yeniden_yazilmaz()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Bilerek YANLIŞ bir geçmiş: ikinci set aslında rekor değil ama Reps yazılmış.
            var setler = await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (100m, 6, RecordType.Reps));

            var sonuc = await service.EvaluateNewAsync(exercise.Id, 100m, 9);

            Assert.Equal(RecordType.Reps, sonuc);
            // Geçmişteki yanlış değer OLDUĞU GİBİ durmalı: EvaluateNewAsync düzeltmez.
            Assert.Equal(RecordType.Reps, setler[1].RecordType);
        }
    }

    [Fact]
    public async Task Ilk_set_agirlik_rekoru_olarak_degerlendirilir()
    {
        var (_, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.Equal(RecordType.Weight, await service.EvaluateNewAsync(exercise.Id, 60m, 12));
        }
    }

    /// <summary>Yeniden hesap, geçmişteki her satırı sıfırdan yazar.</summary>
    [Fact]
    public async Task Yeniden_hesap_tum_satirlari_bastan_yazar()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None), (80m, 11, RecordType.None));

            await service.RecalculateAsync(exercise.Id);

            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Weight, RecordType.Reps },
                setler.Select(s => s.RecordType));
        }
    }

    /// <summary>
    /// SÖZLEŞME: RecalculateAsync SaveChangesAsync ÇAĞIRMAZ. Değişiklikler change tracker'da
    /// bekler; commit'i çağıran yapar. Bu test o sözleşmeyi kırmızıyla korur — servis bir gün
    /// içeride kaydetmeye başlarsa "kaydedilmemiş değişiklik var" iddiası düşer.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_kaydetmez()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None));

            await service.RecalculateAsync(exercise.Id);

            Assert.True(context.ChangeTracker.HasChanges());
            Assert.Equal(2, context.ChangeTracker.Entries<SetEntry>()
                .Count(e => e.State == EntityState.Modified));
        }
    }

    /// <summary>
    /// Bir set silinmek üzere işaretlendiğinde satır DB'de HÂLÂ durur ve sorguda geri gelir
    /// (EF identity map onu tracked hâliyle döndürür). Hariç tutulmazsa yeniden hesap silinen
    /// seti saymaya devam eder ve sonraki set rekora TERFİ ETMEZ — sessiz bir yanlışlık.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_haric_tutulan_seti_saymaz()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (90m, 10, RecordType.None));

            await service.RecalculateAsync(exercise.Id, excludeSetId: setler[0].Id);

            // 100'lük set yokmuş gibi: 90x10 artık ilk set, yani ağırlık rekoru.
            Assert.Equal(RecordType.Weight, setler[1].RecordType);
        }
    }

    /// <summary>
    /// Oturum silmenin karşılığı: CASCADE henüz DB'ye gitmemişken o oturumun setleri
    /// yok sayılmalı.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_haric_tutulan_oturumu_saymaz()
    {
        var (context, user, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ikinciOturum = TestDatabase.NewSession(user);
            context.Add(ikinciOturum);
            await context.SaveChangesAsync();

            await SeedAsync(context, session, exercise, (100m, 8, RecordType.Weight));

            var ikinciSet = new SetEntry
            {
                WorkoutSession = ikinciOturum, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = An.AddHours(1)
            };
            context.Add(ikinciSet);
            await context.SaveChangesAsync();

            await service.RecalculateAsync(exercise.Id, excludeSessionId: session.Id);

            Assert.Equal(RecordType.Weight, ikinciSet.RecordType);
        }
    }

    [Fact]
    public async Task Yeniden_hesap_baskasinin_setlerine_dokunmaz()
    {
        var (context, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 500m, Reps = 1, RecordType = RecordType.None, CreatedAt = An
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await service.RecalculateAsync(exercise.Id);

            // Aynı egzersiz, başka kullanıcı: dokunulmamalı (IDOR ve veri karışması).
            Assert.Equal(RecordType.None, digerSet.RecordType);
        }
    }

    [Fact]
    public async Task Rekor_ozeti_en_iyi_agirligi_ve_tekrari_bildirir()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (60m, 20, RecordType.Weight), (100m, 9, RecordType.Reps));

            var ozet = await service.GetAllTimeAsync();
            var satir = Assert.Single(ozet, r => r.ExerciseId == exercise.Id);

            Assert.Equal(100m, satir.BestWeight);
            Assert.Equal(9, satir.BestWeightReps);      // 100 kg'daki en iyi tekrar
            Assert.Equal(20, satir.BestReps);
            Assert.Equal(60m, satir.BestRepsWeight);    // 20 tekrar 60 kg'da yapıldı
        }
    }

    /// <summary>
    /// İNVARYANT TESTİ: özet yalnızca RecordType != None satırlarını okuyor. Bu, ancak
    /// "hiçbir maksimum yalnızca None satırlarda yaşayamaz" doğruysa bilgi kaybetmez.
    /// Burada maksimumlar TÜM setlerden bağımsız olarak hesaplanıp özetle karşılaştırılıyor —
    /// filtre bir gün bilgi kaybetmeye başlarsa test kırmızıya döner.
    /// </summary>
    [Fact]
    public async Task Rekor_ozeti_tum_setlerden_hesaplanan_maksimumlarla_ayni()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None), (80m, 10, RecordType.None),
                (80m, 14, RecordType.None), (60m, 25, RecordType.None), (100m, 3, RecordType.None));

            await service.RecalculateAsync(exercise.Id);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var ozet = await service.GetAllTimeAsync();
            var satir = Assert.Single(ozet, r => r.ExerciseId == exercise.Id);

            Assert.Equal(setler.Max(s => s.Weight), satir.BestWeight);
            Assert.Equal(setler.Max(s => s.Reps), satir.BestReps);
        }
    }

    [Fact]
    public async Task Rekor_ozeti_seti_olmayan_egzersizi_listelemez()
    {
        var (_, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ozet = await service.GetAllTimeAsync();

            Assert.DoesNotContain(ozet, r => r.ExerciseId == exercise.Id);
        }
    }
}
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~PersonalRecordServiceTests"`
Beklenen: derleme hatası — `PersonalRecordService` yok.

- [ ] **Adım 3: DTO'yu ve servisi yaz**

`src/Grind.Api/Models/Dtos/Record/ExerciseRecordResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Record;

/// <summary>
/// Bir egzersizin tüm zamanlar özeti. İki ayrı "en iyi" var çünkü tek bir sette
/// buluşmak zorunda değiller: en ağır set 100 kg × 3 iken en çok tekrar 60 kg × 25
/// olabilir — ikisini tek satıra sıkıştırmak bilgiyi kaybettirir.
/// </summary>
public record ExerciseRecordResponse(
    long ExerciseId,
    string ExerciseName,
    ExerciseCategory Category,
    decimal BestWeight,
    int BestWeightReps,
    DateTime BestWeightAt,
    int BestReps,
    decimal BestRepsWeight,
    DateTime BestRepsAt);
```

`src/Grind.Api/Services/IPersonalRecordService.cs`:

```csharp
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Enums;

namespace Grind.Api.Services;

/// <summary>
/// Kişisel rekor motoru. CLAUDE.md'deki <c>PersonalRecordCalculator</c>'ın bu kod
/// tabanındaki karşılığı; ortak karar noktası
/// <see cref="Grind.Api.Common.Records.RecordTracker.Apply"/>'dır.
///
/// SÖZLEŞME: hiçbir metot <c>SaveChangesAsync</c> ÇAĞIRMAZ. Commit sınırı çağıran
/// serviste kalır — böylece "set ekle + rekorları güncelle" ve "oturum sil + etkilenen
/// egzersizleri yeniden hesapla" TEK bir unit of work altında toplanabilir (CLAUDE.md).
/// </summary>
public interface IPersonalRecordService
{
    /// <summary>
    /// Henüz kaydedilmemiş bir setin rekor tipini hesaplar. Geçmiş satırlara DOKUNMAZ —
    /// <c>RecordType</c> tarihsel bir anlık görüntüdür, sonradan yeniden yazılmaz.
    /// </summary>
    Task<RecordType> EvaluateNewAsync(
        long exerciseId, decimal weight, int reps, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının bu egzersizdeki TÜM setlerini kronolojik sırayla yeniden tarar ve her
    /// satırın <c>RecordType</c>'ını sıfırdan yazar.
    /// </summary>
    /// <param name="excludeSetId">
    /// Silinmek üzere işaretlenmiş ama henüz commit edilmemiş set. EF identity map bu satırı
    /// sorguda hâlâ döndürür; hariç tutulmazsa yeniden hesap onu saymaya devam eder ve
    /// sonraki set rekora terfi etmez.
    /// </param>
    /// <param name="excludeSessionId">
    /// Silinmek üzere olan oturum. CASCADE veritabanına henüz gitmediği için o oturumun
    /// setleri de sorguda geri gelir. Aynı sebep, oturum ölçeğinde.
    /// </param>
    Task RecalculateAsync(
        long exerciseId,
        long? excludeSetId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tüm zamanların rekorları. Hiç seti olmayan egzersiz listede yer almaz.
    /// </summary>
    Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(
        CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/PersonalRecordService.cs`:

```csharp
using Grind.Api.Common.Records;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class PersonalRecordService(
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser) : IPersonalRecordService
{
    public async Task<RecordType> EvaluateNewAsync(
        long exerciseId, decimal weight, int reps, CancellationToken cancellationToken = default)
    {
        var history = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        var tracker = new RecordTracker();

        foreach (var set in history)
        {
            // Sonuç BİLEREK atılıyor: amaç yürüyen en iyileri kurmak, geçmişi düzeltmek değil.
            tracker.Apply(set.Weight, set.Reps);
        }

        return tracker.Apply(weight, reps);
    }

    public async Task RecalculateAsync(
        long exerciseId,
        long? excludeSetId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default)
    {
        var sets = await setEntryRepository.GetForUserAndExerciseAsync(
            currentUser.UserId, exerciseId, cancellationToken);

        var tracker = new RecordTracker();

        foreach (var set in sets)
        {
            if (set.Id == excludeSetId || set.WorkoutSessionId == excludeSessionId)
            {
                continue;
            }

            // Entity'ler tracked geliyor; atama onları Modified yapar. SaveChanges YOK.
            set.RecordType = tracker.Apply(set.Weight, set.Reps);
        }
    }

    public async Task<IReadOnlyList<ExerciseRecordResponse>> GetAllTimeAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await setEntryRepository.GetRecordCarryingSetsAsync(
            currentUser.UserId, cancellationToken);

        // Filtre SQL'de, gruplama bellekte: rekor taşıyan satırlar bir egzersizde onlarca
        // olur, binlerce değil. Karşılığında eşitlik kuralları (aynı ağırlıkta en çok tekrar,
        // sonra en erken tarih) tek satırda okunabilir kalıyor.
        return records
            .GroupBy(s => s.ExerciseId)
            .Select(BuildSummary)
            .OrderBy(r => r.ExerciseName)
            .ToList();
    }

    private static ExerciseRecordResponse BuildSummary(IGrouping<long, SetEntry> group)
    {
        var bestWeight = group
            .OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps)
            .ThenBy(s => s.CreatedAt).ThenBy(s => s.Id)
            .First();

        var bestReps = group
            .OrderByDescending(s => s.Reps).ThenByDescending(s => s.Weight)
            .ThenBy(s => s.CreatedAt).ThenBy(s => s.Id)
            .First();

        return new ExerciseRecordResponse(
            group.Key,
            bestWeight.Exercise.Name,
            bestWeight.Exercise.Category,
            bestWeight.Weight,
            bestWeight.Reps,
            bestWeight.CreatedAt,
            bestReps.Reps,
            bestReps.Weight,
            bestReps.CreatedAt);
    }
}
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~PersonalRecordServiceTests"`
Beklenen: 10 test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Record src/Grind.Api/Services/IPersonalRecordService.cs src/Grind.Api/Services/PersonalRecordService.cs tests/Grind.Tests/Services/PersonalRecordServiceTests.cs
git commit -m "feat(records): rekor motoru - degerlendirme, yeniden hesap, tum zamanlar ozeti"
```

---

## Görev 4: Oturum seam'i — `GetOrOpenTodayAsync`

**Files:**
- Modify: `src/Grind.Api/Services/IWorkoutSessionService.cs`
- Modify: `src/Grind.Api/Services/WorkoutSessionService.cs`
- Test: `tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs` (mevcut dosyaya ekle)

**Interfaces:**
- Produces: `Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(long? templateId, string? notes, CancellationToken ct = default)`

Faz 7'den devreden ZORUNLULUK #5. `StartAsync` bu seam üzerine yeniden kurulur — davranışı
DEĞİŞMEZ, mevcut Faz 7 oturum testlerinin tamamı regresyon ağıdır ve yeşil kalmalıdır.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs` sınıfının SONUNA ekle:

```csharp
    // ---- Faz 8: set ekleme akışının kullandığı seam ----

    /// <summary>
    /// Seam'in VAROLUŞ SEBEBİ: kaydetmez. Set ekleme akışı oturumu ve yeni seti TEK
    /// SaveChangesAsync altında commit edebilsin diye. Kaydetseydi, arada "hiç seti olmayan
    /// boş oturum" penceresi kalırdı (istemci tam o anda çökerse kalıcı olarak).
    /// </summary>
    [Fact]
    public async Task Seam_yeni_oturumu_kaydetmez()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.True(created);
            Assert.Equal(0, session.Id);   // henüz DB'ye gitmedi, Id atanmadı
            Assert.Equal(0, await context.Set<WorkoutSession>()
                .CountAsync(s => s.UserId == user.Id));
        }
    }

    [Fact]
    public async Task Seam_bugunun_acik_oturumunu_dondurur()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.False(created);
            Assert.Equal(acilan.Session.Id, session.Id);
        }
    }

    /// <summary>
    /// Gün sınırı seam'de de geçerli: dün 23:00'te açılıp kapatılmayan oturum bugünün
    /// setlerini YUTMAMALI. Bu tam olarak CLAUDE.md'nin "unutulan açık session" kararı.
    /// </summary>
    [Fact]
    public async Task Seam_dunden_kalan_acik_oturumu_kullanmaz()
    {
        // TR 10 Mart 23:00 = UTC 10 Mart 20:00
        var (_, _, service, saat, transaction) = await CreateAsync(
            new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var dunku = await service.StartAsync(new StartSessionRequest());

            // TR 11 Mart 00:30 = UTC 10 Mart 21:30 — ertesi TR günü.
            saat.UtcNow = new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc);

            var (session, created) = await service.GetOrOpenTodayAsync(null, null);

            Assert.True(created);
            Assert.NotEqual(dunku.Session.Id, session.Id);
        }
    }

    [Fact]
    public async Task Seam_baskasinin_sablonuyla_oturum_acmaz()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();
            var digerSablon = NewTemplate(digerKullanici);
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetOrOpenTodayAsync(digerSablon.Id, null));
        }
    }

    /// <summary>
    /// Seam ile açılıp commit edilen oturum, StartAsync tarafından "var olan" sayılmalı —
    /// yani iki akış AYNI "bugünün açık oturumu" tanımını paylaşıyor (DRY'ın gözlemlenebilir
    /// sonucu). Ayrı ayrı yazılsalardı bu test iki oturum görürdü.
    /// </summary>
    [Fact]
    public async Task Seam_ile_acilan_oturum_StartAsync_tarafindan_yeniden_acilmaz()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var (session, _) = await service.GetOrOpenTodayAsync(null, null);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.False(sonuc.Created);
            Assert.Equal(session.Id, sonuc.Session.Id);
        }
    }
```

Dosyanın başında eksikse ekle: `using Grind.Api.Models.Entities;`

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSessionServiceTests"`
Beklenen: derleme hatası — `GetOrOpenTodayAsync` yok.

- [ ] **Adım 3: Seam'i ekle ve `StartAsync`'i onun üzerine kur**

`src/Grind.Api/Services/IWorkoutSessionService.cs` — `StartAsync`'in ÜSTÜNE ekle:

```csharp
    /// <summary>
    /// SERVİS-İÇİ SEAM — controller'dan ÇAĞRILMAZ (DTO değil entity döndürür).
    ///
    /// Bugüne (TR yerel günü) ait açık oturumu döndürür; yoksa yenisini oluşturup change
    /// tracker'a ekler ama <c>SaveChangesAsync</c> ÇAĞIRMAZ. Çağıran, kendi yazımıyla
    /// (ör. yeni bir <c>SetEntry</c>) birlikte TEK bir unit of work altında commit eder.
    ///
    /// Sebebi (Faz 7'den devreden zorunluluk): set ekleme akışının alternatifleri
    /// (a) <c>StartAsync</c>'i çağırmak — iki ayrı commit, arada seti olmayan boş oturum
    /// penceresi; (b) gün sınırı mantığını set servisinde tekrar yazmak — DRY ihlali.
    /// </summary>
    /// <returns><c>Created</c> true ise oturum YENİ oluşturuldu ve henüz Id'si yoktur.</returns>
    Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(
        long? templateId, string? notes, CancellationToken cancellationToken = default);
```

`using Grind.Api.Models.Entities;` eklemeyi unutma.

`src/Grind.Api/Services/WorkoutSessionService.cs` — mevcut `StartAsync`'i şu ikiliyle DEĞİŞTİR:

```csharp
    public async Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(
        long? templateId, string? notes, CancellationToken cancellationToken = default)
    {
        var existing = await FindOpenTodayAsync(cancellationToken);

        if (existing is not null)
        {
            return (existing, false);
        }

        WorkoutTemplate? template = null;
        if (templateId is { } id)
        {
            // DİKKAT: miras alınan GetByIdAsync sahiplik kontrolü YAPMAZ; kullanmak IDOR olur.
            template = await templateRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
                ?? throw new NotFoundException(TemplateNotFound);
        }

        var session = new WorkoutSession
        {
            UserId = currentUser.UserId,
            TemplateId = templateId,
            // GetOwnedByIdAsync şablonu TemplateExercises+Exercise ile TAMAMEN Include'lu
            // döndürüyor; navigasyonu burada bağlamak, SaveChanges sonrası aynı grafiği
            // ikinci bir gidiş-dönüşle yeniden okumanın önüne geçer (bkz. Faz 7 fix notu).
            Template = template,
            StartedAt = timeProvider.GetUtcNow().UtcDateTime,
            Notes = notes
        };

        sessionRepository.Add(session);
        // SaveChangesAsync BİLEREK YOK — bkz. arayüzdeki seam notu.
        return (session, true);
    }

    public async Task<StartSessionResult> StartAsync(
        StartSessionRequest request, CancellationToken cancellationToken = default)
    {
        var (session, created) = await GetOrOpenTodayAsync(
            request.TemplateId, request.Notes, cancellationToken);

        if (!created)
        {
            // İdempotent: iki kez tıklanan "Antrenmana Başla" hata değil aynı oturum.
            // Gövdedeki şablon/not bilerek UYGULANMAZ — açık bir oturumu sessizce
            // değiştirmek, kullanıcının fark etmediği bir veri kaybı olurdu.
            // FindOpenTodayAsync yalın (Template Include'suz) döndüğü için burada tam
            // grafik için sahiplik sorgusuyla yeniden okunuyor.
            var reloaded = await OwnedOrThrowAsync(session.Id, cancellationToken);
            return new StartSessionResult(
                ToResponse(reloaded, await ProgressAsync(reloaded, cancellationToken)), Created: false);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new StartSessionResult(
            ToResponse(session, await ProgressAsync(session, cancellationToken)), Created: true);
    }
```

- [ ] **Adım 4: Tüm oturum testlerini çalıştır (regresyon dahil)**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSession|FullyQualifiedName~SessionEndpoints"`
Beklenen: mevcut Faz 7 testlerinin TAMAMI + 5 yeni test PASS. Faz 7'den bir tek test bile
kırmızıya dönerse seam davranışı değiştirmiş demektir — düzelt, testi gevşetme.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Services/IWorkoutSessionService.cs src/Grind.Api/Services/WorkoutSessionService.cs tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs
git commit -m "feat(session): kaydetmeyen GetOrOpenTodayAsync seam'i, StartAsync onun uzerine kuruldu"
```

---

## Görev 5: `SetEntryService` — set ekleme, düzeltme, silme, listeleme

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Set/CreateSetRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Set/PatchSetRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Set/SetEntryResponse.cs`
- Create: `src/Grind.Api/Services/ISetEntryService.cs`
- Create: `src/Grind.Api/Services/SetEntryService.cs`
- Test: `tests/Grind.Tests/Services/SetEntryServiceTests.cs`

**Interfaces:**
- Consumes: `IPersonalRecordService` (Görev 3), `IWorkoutSessionService.GetOrOpenTodayAsync`
  (Görev 4), `ISetEntryRepository.GetOwnedByIdAsync`/`GetForSessionAsync` (Görev 2),
  `IExerciseRepository.GetVisibleByIdAsync`, `IWorkoutSessionRepository.GetOwnedByIdAsync`,
  `IUnitOfWork`, `ICurrentUserService`, `TimeProvider`
- Produces: `ISetEntryService` (4 metot), 3 DTO

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/SetEntryServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class SetEntryServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 20:00 (UTC 17:00) — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime VarsayilanAn => new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        SetEntryService Service, IWorkoutSessionService SessionService, SahteSaat Saat,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(VarsayilanAn);
        var currentUser = new StubCurrentUser(user.Id);
        var unitOfWork = new UnitOfWork(context);
        var setRepository = new SetEntryRepository(context);
        var sessionRepository = new WorkoutSessionRepository(context);

        var recordService = new PersonalRecordService(setRepository, currentUser);
        var sessionService = new WorkoutSessionService(
            sessionRepository, new WorkoutTemplateRepository(context), setRepository,
            unitOfWork, currentUser, saat);

        var service = new SetEntryService(
            setRepository, new ExerciseRepository(context), sessionRepository,
            sessionService, recordService, unitOfWork, currentUser, saat);

        return (context, user, exercise, service, sessionService, saat, transaction);
    }

    private static CreateSetRequest Yeni(long exerciseId, decimal weight, int reps) =>
        new() { ExerciseId = exerciseId, Weight = weight, Reps = reps };

    // ---- Ekleme ----

    [Fact]
    public async Task Ilk_set_agirlik_rekoru_olarak_kaydedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            Assert.Equal(RecordType.Weight, eklenen.RecordType);
            Assert.Equal(exercise.Name, eklenen.ExerciseName);
            Assert.True(eklenen.SessionId > 0);
        }
    }

    /// <summary>Açık oturum yoksa set ekleme onu kendisi açar (CLAUDE.md).</summary>
    [Fact]
    public async Task Acik_oturum_yoksa_set_ekleme_oturum_acar()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.Equal(0, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));

            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    /// <summary>İkinci set yeni bir oturum AÇMAZ — aynı açık oturuma düşer.</summary>
    [Fact]
    public async Task Ikinci_set_var_olan_acik_oturuma_duser()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 9));

            Assert.Equal(birinci.SessionId, ikinci.SessionId);
            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    [Fact]
    public async Task Ayni_agirlikta_daha_cok_tekrar_tekrar_rekoru_olarak_kaydedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 10));

            Assert.Equal(RecordType.Reps, ikinci.RecordType);
        }
    }

    /// <summary>Spec Soru 2/A: yazarken katı.</summary>
    [Fact]
    public async Task Arsivlenmis_egzersize_set_girilemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            exercise.IsArchived = true;
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(exercise.Id, 100m, 8)));
        }
    }

    /// <summary>Ama geçmiş setler okunmaya devam eder — okurken hoşgörülü.</summary>
    [Fact]
    public async Task Arsivlemeden_once_girilen_setler_okunmaya_devam_eder()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            exercise.IsArchived = true;
            await context.SaveChangesAsync();

            var setler = await service.GetForSessionAsync(eklenen.SessionId);

            Assert.Single(setler);
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizine_set_girilemez()
    {
        var (context, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Yeni(digerEgzersiz.Id, 100m, 8)));
        }
    }

    [Fact]
    public async Task Global_egzersize_set_girilebilir()
    {
        var (_, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Id 1 = seed edilmiş global "Bench Press".
            var eklenen = await service.CreateAsync(Yeni(1, 60m, 12));

            Assert.Equal(RecordType.Weight, eklenen.RecordType);
        }
    }

    /// <summary>
    /// Weight sütunu numeric(6,2). 100.555 gönderilirse PostgreSQL sessizce 100.56'ya
    /// yuvarlar — ve o an rekor kararı 100.555 üzerinden verilmiş olduğu için ağırlık
    /// kovası ile kaydedilen değer ayrışır. Bu yüzden reddediliyor, yuvarlanmıyor.
    /// </summary>
    [Fact]
    public async Task Ikiden_fazla_ondalikli_agirlik_reddedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(exercise.Id, 100.555m, 8)));
        }
    }

    // ---- Düzeltme ----

    [Fact]
    public async Task Bos_patch_reddedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(eklenen.Id, new PatchSetRequest()));
        }
    }

    /// <summary>
    /// LOAD-BEARING: ortadaki setin ağırlığını yükseltmek hem KENDİ rekor tipini hem
    /// SONRAKİLERİNKİNİ değiştirmeli. Yeniden hesap çağrılmazsa ilk iddia geçer, ikincisi
    /// kalır — bu yüzden ikisi birden kontrol ediliyor.
    /// </summary>
    [Fact]
    public async Task Ortadaki_setin_duzeltilmesi_sonraki_setleri_de_yeniden_hesaplar()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));                 // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 90m, 10));    // None (90 kovasi yeni)
            var ucuncu = await service.CreateAsync(Yeni(exercise.Id, 110m, 5));    // Weight

            Assert.Equal(RecordType.None, ikinci.RecordType);

            // İkinciyi 120'ye çıkar: kendisi Weight olur, ÜÇÜNCÜ artık 120'yi geçemez.
            await service.PatchAsync(ikinci.Id, new PatchSetRequest { Weight = 120m });

            // Clear ŞART: aksi halde iddialar DB'yi değil, change tracker'daki bellek
            // nesnelerini okur ve SaveChanges hiç çağrılmasa bile yeşil kalırdı.
            context.ChangeTracker.Clear();
            var setler = await new SetEntryRepository(context)
                .GetForUserAndExerciseAsync(user.Id, exercise.Id);

            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Weight, RecordType.None },
                setler.Select(s => s.RecordType));
            Assert.Equal(RecordType.None, setler.Single(s => s.Id == ucuncu.Id).RecordType);
        }
    }

    [Fact]
    public async Task Baskasinin_seti_duzeltilemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = VarsayilanAn
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.PatchAsync(digerSet.Id, new PatchSetRequest { Reps = 99 }));
        }
    }

    // ---- Silme ----

    /// <summary>
    /// LOAD-BEARING: rekor taşıyan set silininceki terfi. Yeniden hesap silinen seti hariç
    /// tutmazsa (EF identity map onu sorguda hâlâ döndürür) 90'lık set None kalır.
    /// </summary>
    [Fact]
    public async Task Rekor_tasiyan_set_silinince_sonraki_set_rekora_terfi_eder()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));   // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 90m, 10));    // None

            await service.DeleteAsync(birinci.Id);

            context.ChangeTracker.Clear();
            var kalan = await context.Set<SetEntry>().SingleAsync(s => s.Id == ikinci.Id);

            Assert.Equal(RecordType.Weight, kalan.RecordType);
        }
    }

    [Fact]
    public async Task Rekor_tasimayan_set_silinince_diger_rekorlar_bozulmaz()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));   // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));    // None
            var ucuncu = await service.CreateAsync(Yeni(exercise.Id, 100m, 9));    // Reps

            await service.DeleteAsync(ikinci.Id);

            context.ChangeTracker.Clear();
            var kalanlar = await context.Set<SetEntry>()
                .Where(s => s.ExerciseId == exercise.Id).OrderBy(s => s.Id).ToListAsync();

            Assert.Equal([birinci.Id, ucuncu.Id], kalanlar.Select(s => s.Id));
            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Reps },
                kalanlar.Select(s => s.RecordType));
        }
    }

    [Fact]
    public async Task Baskasinin_seti_silinemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = VarsayilanAn
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerSet.Id));
        }
    }

    // ---- Oturum setlerini okuma ----

    [Fact]
    public async Task Oturumun_setleri_kronolojik_doner()
    {
        var (_, _, exercise, service, _, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            saat.UtcNow = saat.UtcNow.AddMinutes(3);
            await service.CreateAsync(Yeni(exercise.Id, 100m, 9));

            var setler = await service.GetForSessionAsync(birinci.SessionId);

            Assert.Equal([8, 9], setler.Select(s => s.Reps));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_okunamaz()
    {
        var (context, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.AddRange(digerKullanici, digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetForSessionAsync(digerOturum.Id));
        }
    }
}
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryServiceTests"`
Beklenen: derleme hatası — `SetEntryService` ve DTO'lar yok.

- [ ] **Adım 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/Set/CreateSetRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// DİKKAT: alanlar nullable + [Required]. Non-nullable olsalardı gövdede HİÇ
/// gönderilmediklerinde sessizce varsayılana (0) bağlanırlardı — ve <c>Weight = 0</c>
/// bu domende GEÇERLİ bir değer olduğu için (barfiks/dips) hata hiç fark edilmezdi.
/// Faz 4'te aynı tuzak enum alanında gerçek veri kaybı üretmişti.
/// </summary>
public class CreateSetRequest
{
    [Required(ErrorMessage = "Egzersiz zorunlu.")]
    public long? ExerciseId { get; set; }

    [Required(ErrorMessage = "Ağırlık zorunlu.")]
    [Range(0, 9999.99, ErrorMessage = "Ağırlık 0 ile 9999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Required(ErrorMessage = "Tekrar sayısı zorunlu.")]
    [Range(1, 1000, ErrorMessage = "Tekrar 1 ile 1000 arasında olmalı.")]
    public int? Reps { get; set; }

    /// <summary>Reps in Reserve — opsiyonel.</summary>
    [Range(0, 100, ErrorMessage = "RIR 0 ile 100 arasında olmalı.")]
    public int? Rir { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Set/PatchSetRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// Kısmi güncelleme. <c>null</c> = "bu alana dokunma". <c>PUT</c> BİLEREK YOK: tam
/// değiştirme, gövdede gönderilmeyen <c>Rir</c>'i sessizce siler — aynı tuzak Faz 4 ve
/// Faz 6'da iki kez gerçek veri kaybı üretti (spec Soru 3/A).
/// Bedeli kabul edildi: <c>Rir</c>'i temizlemenin yolu yok.
/// </summary>
public class PatchSetRequest
{
    [Range(0, 9999.99, ErrorMessage = "Ağırlık 0 ile 9999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Range(1, 1000, ErrorMessage = "Tekrar 1 ile 1000 arasında olmalı.")]
    public int? Reps { get; set; }

    [Range(0, 100, ErrorMessage = "RIR 0 ile 100 arasında olmalı.")]
    public int? Rir { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Set/SetEntryResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// <c>SessionId</c> yanıtta yer alıyor çünkü set ekleme oturumu KENDİSİ açmış olabilir —
/// istemci hangi oturuma düştüğünü ancak buradan öğrenir.
/// </summary>
public record SetEntryResponse(
    long Id,
    long SessionId,
    long ExerciseId,
    string ExerciseName,
    decimal Weight,
    int Reps,
    RecordType RecordType,
    int? Rir,
    DateTime CreatedAt);
```

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/ISetEntryService.cs`:

```csharp
using Grind.Api.Models.Dtos.Set;

namespace Grind.Api.Services;

public interface ISetEntryService
{
    /// <summary>
    /// Bugüne ait açık oturumu bulur (yoksa açar) ve seti ona ekler; oturum ve set TEK
    /// SaveChangesAsync altında commit edilir. Arşivlenmiş egzersizde ValidationException,
    /// erişilemeyen egzersizde NotFoundException.
    /// </summary>
    Task<SetEntryResponse> CreateAsync(
        CreateSetRequest request, CancellationToken cancellationToken = default);

    /// <summary>Başkasının oturumunda NotFoundException (404).</summary>
    Task<IReadOnlyList<SetEntryResponse>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default);

    /// <summary>Düzeltir ve o egzersizin rekorlarını HER ZAMAN yeniden hesaplar.</summary>
    Task<SetEntryResponse> PatchAsync(
        long id, PatchSetRequest request, CancellationToken cancellationToken = default);

    /// <summary>Siler ve o egzersizin rekorlarını HER ZAMAN yeniden hesaplar.</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/SetEntryService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class SetEntryService(
    ISetEntryRepository setEntryRepository,
    IExerciseRepository exerciseRepository,
    IWorkoutSessionRepository sessionRepository,
    IWorkoutSessionService sessionService,
    IPersonalRecordService recordService,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : ISetEntryService
{
    private const string SetNotFound = "Set bulunamadı.";
    private const string SessionNotFound = "Oturum bulunamadı.";

    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<SetEntryResponse> CreateAsync(
        CreateSetRequest request, CancellationToken cancellationToken = default)
    {
        // DataAnnotations [Required]'ı MVC katmanında zaten çalıştı; burada değerleri
        // güvenle açıyoruz. Servis doğrudan (test) çağrıldığında da aynı sözleşme geçerli.
        var exerciseId = request.ExerciseId!.Value;
        var weight = request.Weight!.Value;
        var reps = request.Reps!.Value;

        EnsureWeightScale(weight);

        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        if (exercise.IsArchived)
        {
            // Yazarken katı (spec Soru 2/A): set girmek yeni bir seçimdir.
            throw new ValidationException(
                "Arşivlenmiş bir egzersize yeni set girilemez. Önce egzersizi arşivden çıkarın.");
        }

        // Rekor kararı setin EKLENMESİNDEN ÖNCE verilir: geçmiş, kendisini içermemeli.
        var recordType = await recordService.EvaluateNewAsync(
            exerciseId, weight, reps, cancellationToken);

        // Seam: kaydetmez. Oturum (gerekirse) ve set aşağıda TEK commit'te birlikte gider.
        var (session, _) = await sessionService.GetOrOpenTodayAsync(
            templateId: null, notes: null, cancellationToken);

        var set = new SetEntry
        {
            WorkoutSession = session,
            ExerciseId = exercise.Id,
            Weight = weight,
            Reps = reps,
            Rir = request.Rir,
            RecordType = recordType,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        };

        setEntryRepository.Add(set);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(set, exercise.Name);
    }

    public async Task<IReadOnlyList<SetEntryResponse>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
    {
        // Repository başkasının oturumunda BOŞ döner; "yok" ile "boş"u ayırmak için
        // sahiplik burada ayrıca doğrulanıyor — aksi halde başkasının oturum id'si
        // 404 yerine boş liste alır ve varlığı doğrulanmış olurdu.
        _ = await sessionRepository.GetOwnedByIdAsync(sessionId, currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException(SessionNotFound);

        var sets = await setEntryRepository.GetForSessionAsync(
            sessionId, currentUser.UserId, cancellationToken);

        return sets.Select(s => ToResponse(s, s.Exercise.Name)).ToList();
    }

    public async Task<SetEntryResponse> PatchAsync(
        long id, PatchSetRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Weight is null && request.Reps is null && request.Rir is null)
        {
            // Boş gövde DTO doğrulamasını geçer (tüm alanlar nullable). Sessizce 200 dönmek
            // çağıranın isteğinin uygulandığını sanmasına yol açardı.
            throw new ValidationException("En az bir alan gönderilmeli.");
        }

        var set = await OwnedOrThrowAsync(id, cancellationToken);

        if (request.Weight is { } weight)
        {
            EnsureWeightScale(weight);
            set.Weight = weight;
        }

        if (request.Reps is { } reps)
        {
            set.Reps = reps;
        }

        if (request.Rir is { } rir)
        {
            set.Rir = rir;
        }

        // HER ZAMAN yeniden hesapla: rekor TAŞIMAYAN bir setin ağırlığını yükseltmek onu
        // rekor yapabilir ve sonrasındaki her seti etkileyebilir. Koşullu davranmak yanlış olurdu.
        // Değiştirilen set change tracker'da Modified; sorgu onu güncel değerleriyle döndürür.
        await recordService.RecalculateAsync(
            set.ExerciseId, cancellationToken: cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(set, set.Exercise.Name);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var set = await OwnedOrThrowAsync(id, cancellationToken);
        var exerciseId = set.ExerciseId;

        setEntryRepository.Remove(set);

        // excludeSetId ZORUNLU: satır DB'de hâlâ duruyor (commit edilmedi) ve sorguda geri
        // gelir. CLAUDE.md yalnızca "rekor taşıyorsa" yeniden hesaplamayı şart koşuyor;
        // burada koşulsuz yapılıyor — daha fazlasını yapmak asla yanlış değil, ve koşulun
        // doğruluğu kuralların bugünkü hâline bağlı, kodda görünmeyen bir ispata dayanıyor.
        await recordService.RecalculateAsync(
            exerciseId, excludeSetId: id, cancellationToken: cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<SetEntry> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await setEntryRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(SetNotFound);

    /// <summary>
    /// Weight sütunu numeric(6,2): daha fazla ondalık PostgreSQL tarafından SESSİZCE
    /// yuvarlanır. Rekor kararı yuvarlanmamış değer üzerinden verildiği için ağırlık kovası
    /// ile saklanan değer ayrışırdı — bu yüzden yuvarlamak yerine reddediyoruz.
    /// </summary>
    private static void EnsureWeightScale(decimal weight)
    {
        if (decimal.Round(weight, 2) != weight)
        {
            throw new ValidationException("Ağırlık en fazla iki ondalık basamak taşıyabilir.");
        }
    }

    private static SetEntryResponse ToResponse(SetEntry set, string exerciseName) => new(
        set.Id,
        set.WorkoutSessionId,
        set.ExerciseId,
        exerciseName,
        set.Weight,
        set.Reps,
        set.RecordType,
        set.Rir,
        set.CreatedAt);
}
```

> **Uygulayıcıya not:** `CreateAsync`'in dönüşünde `set.WorkoutSessionId`, `SaveChangesAsync`
> sonrası EF tarafından doldurulur (navigasyon üzerinden bağlandı). `ToResponse` çağrısı
> kaydetmeden ÖNCE yapılırsa 0 döner — sırayı bozma.

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryServiceTests"`
Beklenen: 17 test PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Set src/Grind.Api/Services/ISetEntryService.cs src/Grind.Api/Services/SetEntryService.cs tests/Grind.Tests/Services/SetEntryServiceTests.cs
git commit -m "feat(sets): set ekleme, duzeltme, silme ve oturum listesi"
```

---

## Görev 6: Oturum silmede rekor yeniden hesabı

**Files:**
- Modify: `src/Grind.Api/Services/WorkoutSessionService.cs`
- Modify: `src/Grind.Api/Services/IWorkoutSessionService.cs` (doc'taki "FAZ 8 NOTU" kaldırılır)
- Test: `tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs` (ekle + `CreateAsync` yardımcısı)
- Modify: `tests/Grind.Tests/Services/SetEntryServiceTests.cs` (yalnızca `CreateAsync` yardımcısı —
  `WorkoutSessionService`'i o da kuruyor; yeni kurucu parametresi olmadan DERLENMEZ)

**Interfaces:**
- Consumes: `IPersonalRecordService.RecalculateAsync(..., excludeSessionId:)` (Görev 3),
  `ISetEntryRepository.GetDistinctExerciseIdsForSessionAsync` (Faz 2'den hazır)

Faz 7'den devreden ZORUNLULUK #1. Bugün `DeleteAsync` yalnızca siliyor; artık silinen
oturumun dokunduğu her egzersiz için BİR KEZ yeniden hesap yapılmalı.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs` sınıfının SONUNA ekle:

```csharp
    // ---- Faz 8: silme sonrası rekor yeniden hesabı ----

    /// <summary>
    /// Setleri elle kurar (SetEntryService'e bağımlı olmadan): iki oturum, aynı egzersiz.
    /// Birinci oturumdaki 100'lük rekor silinince, ikinci oturumdaki 90'lık set rekora
    /// terfi etmeli. Yeniden hesap hiç çağrılmazsa 90'lık set None kalır.
    /// </summary>
    [Fact]
    public async Task Oturum_silinince_etkilenen_egzersizin_rekorlari_yeniden_hesaplanir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var kalacak = TestDatabase.NewSession(user);
            context.AddRange(exercise, silinecek, kalacak);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            var agir = new SetEntry
            {
                WorkoutSession = silinecek, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
            };
            var hafif = new SetEntry
            {
                WorkoutSession = kalacak, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
            };
            context.AddRange(agir, hafif);
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            var kalan = await context.Set<SetEntry>().SingleAsync(s => s.Id == hafif.Id);

            Assert.Equal(RecordType.Weight, kalan.RecordType);
            Assert.Equal(0, await context.Set<SetEntry>().CountAsync(s => s.Id == agir.Id));
        }
    }

    /// <summary>
    /// İki farklı egzersize dokunan bir oturum silinince İKİSİ de yeniden hesaplanmalı —
    /// distinct liste üzerinden, her set için ayrı ayrı değil.
    /// </summary>
    [Fact]
    public async Task Oturum_silinince_dokundugu_her_egzersiz_yeniden_hesaplanir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinciEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var ikinciEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var kalacak = TestDatabase.NewSession(user);
            context.AddRange(birinciEgzersiz, ikinciEgzersiz, silinecek, kalacak);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            var kalanlar = new List<SetEntry>();

            foreach (var exercise in new[] { birinciEgzersiz, ikinciEgzersiz })
            {
                context.Add(new SetEntry
                {
                    WorkoutSession = silinecek, Exercise = exercise,
                    Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
                });
                var kalan = new SetEntry
                {
                    WorkoutSession = kalacak, Exercise = exercise,
                    Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
                };
                context.Add(kalan);
                kalanlar.Add(kalan);
            }
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            foreach (var kalan in kalanlar)
            {
                var guncel = await context.Set<SetEntry>().SingleAsync(s => s.Id == kalan.Id);
                Assert.Equal(RecordType.Weight, guncel.RecordType);
            }
        }
    }

    [Fact]
    public async Task Oturum_silinince_baskasinin_rekorlarina_dokunulmaz()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var silinecek = TestDatabase.NewSession(user);
            var digerKullanici = TestDatabase.NewUser();
            context.AddRange(exercise, silinecek, digerKullanici);
            await context.SaveChangesAsync();

            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
            context.Add(new SetEntry
            {
                WorkoutSession = silinecek, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an
            });
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = an.AddHours(1)
            };
            context.Add(digerSet);
            await context.SaveChangesAsync();

            await service.DeleteAsync(silinecek.Id);

            context.ChangeTracker.Clear();
            var guncel = await context.Set<SetEntry>().SingleAsync(s => s.Id == digerSet.Id);

            Assert.Equal(RecordType.None, guncel.RecordType);
        }
    }

    /// <summary>REGRESYON: setsiz oturum silme Faz 7'de çalışıyordu, çalışmaya devam etmeli.</summary>
    [Fact]
    public async Task Setsiz_oturum_silinebilir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            await service.DeleteAsync(acilan.Session.Id);

            Assert.Equal(0, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSessionServiceTests"`
Beklenen: derleme hatası (`PersonalRecordService` ctor'a girmedi) veya ilk üç test FAIL
(`RecordType.None` bekleniyor ama `Weight` geldi).

- [ ] **Adım 3: `DeleteAsync`'i bağla**

`src/Grind.Api/Services/WorkoutSessionService.cs` — kurucuya `IPersonalRecordService recordService`
ekle (parametre listesinin SONUNA, `TimeProvider timeProvider`'dan sonra) ve `DeleteAsync`'i
şununla DEĞİŞTİR:

```csharp
    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        // Etkilenen egzersizler SİLMEDEN ÖNCE toplanır — sonra öğrenmenin yolu kalmaz.
        // Distinct liste: her egzersiz için BİR KEZ yeniden hesap (CLAUDE.md: her set için
        // ayrı ayrı DEĞİL — performans ve DRY).
        var affectedExerciseIds = await setEntryRepository.GetDistinctExerciseIdsForSessionAsync(
            id, cancellationToken);

        sessionRepository.Remove(session);

        foreach (var exerciseId in affectedExerciseIds)
        {
            // excludeSessionId ZORUNLU: CASCADE henüz veritabanına gitmedi, bu oturumun
            // setleri sorguda hâlâ geri geliyor. Hariç tutulmazsa silinen setler hesaba
            // katılır ve kalan setler rekora terfi etmez.
            await recordService.RecalculateAsync(
                exerciseId, excludeSessionId: id, cancellationToken: cancellationToken);
        }

        // TEK commit: oturumun silinmesi (SetEntry'ler CASCADE) + kalan setlerin rekorları.
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
```

`IWorkoutSessionService.DeleteAsync`'in doc'undaki "FAZ 8 NOTU" paragrafını şununla değiştir:

```csharp
    /// <summary>
    /// Siler; bağlı SetEntry satırları CASCADE ile gider. Silinen oturumun dokunduğu her
    /// egzersiz için rekorlar BİR KEZ yeniden hesaplanır — aynı commit içinde.
    /// </summary>
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSession|FullyQualifiedName~SetEntry"`
Beklenen: hepsi PASS (4 yeni test dahil). Kurucuyu çağıran İKİ test yardımcısını da
güncelle — `WorkoutSessionServiceTests.CreateAsync` ve `SetEntryServiceTests.CreateAsync`:
`new PersonalRecordService(new SetEntryRepository(context), new StubCurrentUser(user.Id))`
(SetEntryServiceTests'te zaten var olan `recordService` değişkenini geçir, yenisini kurma).

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Services/WorkoutSessionService.cs src/Grind.Api/Services/IWorkoutSessionService.cs tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs tests/Grind.Tests/Services/SetEntryServiceTests.cs
git commit -m "feat(session): oturum silinince etkilenen egzersizlerin rekorlari yeniden hesaplanir"
```

---

## Görev 7: Controller'lar, DI ve uçtan uca testler

**Files:**
- Create: `src/Grind.Api/Controllers/SetsController.cs`
- Create: `src/Grind.Api/Controllers/RecordsController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Integration/SetEndpointsTests.cs`

**Interfaces:**
- Consumes: `ISetEntryService` (Görev 5), `IPersonalRecordService` (Görev 3)

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/SetEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class SetEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"se_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>Her testin kendine ait egzersizi olsun — rekorlar birbirine karışmasın.</summary>
    private static async Task<long> CreateExerciseAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        response.EnsureSuccessStatusCode();
        var olusan = await response.Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        return olusan!.Id;
    }

    private static Task<HttpResponseMessage> PostSetAsync(
        HttpClient client, long exerciseId, decimal weight, int reps) =>
        client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = weight, Reps = reps }, Json);

    [Theory]
    [InlineData("POST", "/api/sets")]
    [InlineData("GET", "/api/sessions/1/sets")]
    [InlineData("PATCH", "/api/sets/1")]
    [InlineData("DELETE", "/api/sets/1")]
    [InlineData("GET", "/api/records")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ilk_set_201_ve_agirlik_rekoru_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var response = await PostSetAsync(client, exerciseId, 100m, 8);
        var eklenen = await response.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(RecordType.Weight, eklenen!.RecordType);
        Assert.True(eklenen.SessionId > 0);
    }

    [Fact]
    public async Task Ayni_agirlikta_daha_cok_tekrar_tekrar_rekoru_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        await PostSetAsync(client, exerciseId, 100m, 8);
        var ikinci = await PostSetAsync(client, exerciseId, 100m, 10);
        var eklenen = await ikinci.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.Reps, eklenen!.RecordType);
    }

    /// <summary>Spec Soru 1/A: indirme seti rozet almaz.</summary>
    [Fact]
    public async Task Daha_hafif_agirliktaki_ilk_set_rekor_dondurmez()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        await PostSetAsync(client, exerciseId, 100m, 8);
        var indirme = await PostSetAsync(client, exerciseId, 60m, 15);
        var eklenen = await indirme.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.None, eklenen!.RecordType);
    }

    [Fact]
    public async Task Oturumun_setleri_listelenir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        await PostSetAsync(client, exerciseId, 100m, 9);

        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk!.SessionId}/sets", Json);

        Assert.Equal(2, setler!.Count);
        Assert.Equal([8, 9], setler.Select(s => s.Reps));
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        var set = await (await PostSetAsync(sahip, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/sessions/{set!.SessionId}/sets");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Patch_agirligi_duzeltir_ve_rekoru_yeniden_hesaplar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        var ikinci = await (await PostSetAsync(client, exerciseId, 90m, 10))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.None, ikinci!.RecordType);

        var response = await client.PatchAsJsonAsync(
            $"/api/sets/{ikinci.Id}", new PatchSetRequest { Weight = 120m }, Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk!.SessionId}/sets", Json);

        Assert.Equal(RecordType.Weight, setler!.Single(s => s.Id == ikinci.Id).RecordType);
        Assert.Equal(120m, setler.Single(s => s.Id == ikinci.Id).Weight);
    }

    [Fact]
    public async Task Rekor_tasiyan_set_silinince_sonraki_set_terfi_eder()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        var ikinci = await (await PostSetAsync(client, exerciseId, 90m, 10))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var silme = await client.DeleteAsync($"/api/sets/{ilk!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);

        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk.SessionId}/sets", Json);

        Assert.Equal(RecordType.Weight, Assert.Single(setler!).RecordType);
        Assert.Equal(ikinci!.Id, setler!.Single().Id);
    }

    [Fact]
    public async Task Baskasinin_seti_silinemez_404()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        var set = await (await PostSetAsync(sahip, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.DeleteAsync($"/api/sets/{set!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Rekor_ozeti_en_iyileri_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 60m, 12);
        await PostSetAsync(client, exerciseId, 60m, 25);

        var rekorlar = await client.GetFromJsonAsync<List<ExerciseRecordResponse>>("/api/records", Json);
        var satir = Assert.Single(rekorlar!, r => r.ExerciseId == exerciseId);

        Assert.Equal(100m, satir.BestWeight);
        Assert.Equal(25, satir.BestReps);
        Assert.Equal(60m, satir.BestRepsWeight);
    }

    [Fact]
    public async Task Arsivlenmis_egzersize_set_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        (await client.DeleteAsync($"/api/exercises/{exerciseId}")).EnsureSuccessStatusCode();

        var response = await PostSetAsync(client, exerciseId, 100m, 8);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Olmayan_egzersize_set_404_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await PostSetAsync(client, 999_999_999, 100m, 8);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Sifir_tekrar_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var response = await PostSetAsync(client, exerciseId, 100m, 0);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Egzersiz alanı HİÇ gönderilmezse 400 gelmeli. ExerciseId non-nullable olsaydı
    /// sessizce 0'a bağlanır ve "egzersiz bulunamadı" 404'ü dönerdi — yanlış hata.
    /// </summary>
    [Fact]
    public async Task Egzersiz_alani_atlanirsa_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/sets", new { weight = 100m, reps = 8 }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Faz 7'nin ilerleme sayacı bu faza kadar HER ZAMAN 0'dı (SetEntry üreten uç yoktu).
    /// Bu test onu ilk kez gerçekten hareket ettiriyor — sayaç bozuksa Faz 7 testleri
    /// bunu göremezdi.
    /// </summary>
    [Fact]
    public async Task Set_eklenince_oturum_ilerlemesi_artar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var sablon = await client.PostAsJsonAsync("/api/templates", new
        {
            name = $"Sablon {Guid.NewGuid():N}",
            exercises = new[] { new { exerciseId, plannedSets = 4 } }
        }, Json);
        sablon.EnsureSuccessStatusCode();
        var olusanSablon = await sablon.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var oturum = await client.PostAsJsonAsync("/api/sessions",
            new StartSessionRequest { TemplateId = olusanSablon!.Id }, Json);
        oturum.EnsureSuccessStatusCode();
        var acilan = await oturum.Content.ReadFromJsonAsync<SessionResponse>(Json);

        Assert.Equal(0, acilan!.Progress.Single().CompletedSets);

        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 100m, 9);

        var guncel = await client.GetFromJsonAsync<SessionResponse>(
            $"/api/sessions/{acilan.Id}", Json);

        Assert.Equal(2, guncel!.Progress.Single().CompletedSets);
        Assert.Equal(4, guncel.Progress.Single().PlannedSets);
    }
}
```

`using Grind.Api.Models.Dtos.Template;` da gerekiyor — dosyanın başına ekle.

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEndpointsTests"`
Beklenen: 401 testleri 404 ile FAIL (uçlar yok), geri kalanlar FAIL.

- [ ] **Adım 3: Controller'ları yaz**

`src/Grind.Api/Controllers/SetsController.cs`:

```csharp
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: rekor mantığı, oturum bulma/açma ve sahiplik servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/sets")]
public class SetsController(ISetEntryService setEntryService) : ControllerBase
{
    /// <summary>
    /// Set kaydeder. Oturum belirtilmez: servis bugüne ait açık oturumu bulur, yoksa açar
    /// (CLAUDE.md). Hangi oturuma düştüğü yanıttaki <c>sessionId</c>'dedir.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SetEntryResponse>> Create(
        CreateSetRequest request, CancellationToken cancellationToken)
    {
        var olusan = await setEntryService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetForSession),
            new { sessionId = olusan.SessionId }, olusan);
    }

    /// <summary>
    /// Bir oturumun setleri, kronolojik. Mutlak yol: kaynak olarak oturumun altında
    /// yaşıyor ama servisi bu controller'ın — Faz 7'nin SessionsController'ına
    /// dokunmamak için (spec Soru 4/A).
    /// </summary>
    [HttpGet("/api/sessions/{sessionId:long}/sets")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SetEntryResponse>>> GetForSession(
        long sessionId, CancellationToken cancellationToken)
        => Ok(await setEntryService.GetForSessionAsync(sessionId, cancellationToken));

    /// <summary>
    /// Kısmi düzeltme. PUT BİLEREK YOK: tam değiştirme, gövdede gönderilmeyen
    /// <c>rir</c>'i sessizce silerdi (spec Soru 3/A).
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SetEntryResponse>> Patch(
        long id, PatchSetRequest request, CancellationToken cancellationToken)
        => Ok(await setEntryService.PatchAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await setEntryService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
```

`src/Grind.Api/Controllers/RecordsController.cs`:

```csharp
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/records")]
public class RecordsController(IPersonalRecordService recordService) : ControllerBase
{
    /// <summary>
    /// Tüm zamanların rekorları. Yeni veri gerektirmez — mevcut SetEntry'den sorgulanır
    /// (CLAUDE.md). Hiç seti olmayan egzersiz listede yer almaz.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExerciseRecordResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await recordService.GetAllTimeAsync(cancellationToken));
}
```

`src/Grind.Api/Services/DependencyInjection.cs` — ekle:

```csharp
        services.AddScoped<IPersonalRecordService, PersonalRecordService>();
        services.AddScoped<ISetEntryService, SetEntryService>();
```

- [ ] **Adım 4: Tüm test paketini çalıştır**

Uygulama çalışıyorsa ÖNCE durdur (çalışan `Grind.Api.exe` build'i sessizce kilitler).

```bash
dotnet build -c Release --nologo
dotnet test tests/Grind.Tests
```

Beklenen: **382 test PASS**, 0 uyarı.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Controllers/SetsController.cs src/Grind.Api/Controllers/RecordsController.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Integration/SetEndpointsTests.cs
git commit -m "feat(api): set ve rekor uclari"
```

- [ ] **Adım 6: `PLAN.md`'yi güncelle**

Faz 8'in beş kutusunu işaretle, her satıra ne yapıldığını yaz (Faz 7'deki biçimin aynısı),
Faz 7'den devreden notların 1. ve 5. maddelerinin artık KAPANDIĞINI belirt, 2. maddenin
cevabını (arşivlenmiş egzersize set girilemez) kaydet, 3. maddeyi (tzdata dağıtım notu)
Faz 9'a devret. Yeni devreden notlar bölümü ekle:

- `PATCH` ile `Rir` temizlenemiyor (null = "dokunma"). Gerçek ihtiyaç çıkarsa ele alınacak.
- Geçmişe dönük set girişi yok: `POST /api/sets` her zaman BUGÜNÜN açık oturumuna yazar.
- `GET /api/records` gruplama işini bellekte yapıyor; kullanıcı başına rekor satırı sayısı
  binlere çıkarsa SQL tarafına taşınmalı.

```bash
git add PLAN.md
git commit -m "docs: Faz 8 tamamlandi, devreden notlar guncellendi"
```

---

## Self-Review Notları (plan yazarından)

Spec kapsaması kontrol edildi; her spec bölümünün karşılığı var:
- Rekor kuralları → Görev 1 (`RecordTracker`) + Görev 3 (veriye bağlama)
- DRY emri → tek `Apply` metodu, iki akış da onu çağırıyor (Görev 3)
- Arşiv kararı → Görev 5 (`CreateAsync` guard) + Görev 7 (400 testi)
- PATCH-only → Görev 5 DTO + Görev 7 controller
- `GET /api/sessions/{id}/sets` → Görev 5 servis + Görev 7 controller
- Seam (devreden #5) → Görev 4
- Oturum silmede yeniden hesap (devreden #1) → Görev 6
- Rekor özeti + invaryant → Görev 3

**Bilinçli olarak KAPSAM DIŞI:**
- Hacim hesabı (Weight × Reps) — Faz 9's 9.3.
- Tarih aralığı / egzersiz filtreli geçmiş sorgusu — Faz 9's 9.1.
- Geçmişe dönük set girişi (`POST /api/sessions/{id}/sets`) — YAGNI, spec'te gerekçesi var.
- Şema değişikliği / migration — bu fazda YOK.
