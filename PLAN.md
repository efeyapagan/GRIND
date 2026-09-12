# GRIND — Backend Geliştirme Planı

> Yalnızca backend. Frontend'e bu plan bitene kadar başlanmayacak (CLAUDE.md kısıtı).
> Klasör yapısı CLAUDE.md'deki teknik katman düzenini izler (Controllers / Services /
> Repositories / Models / DTOs). Geliştirme **özellik özellik** ilerler: her feature
> entity'den endpoint'e kadar uçtan uca bitirilir, sonra bir sonrakine geçilir.

## Durum Özeti
| Faz | Başlık | Durum |
|---|---|---|
| 0 | Ortam ve iskelet | ✅ |
| 1 | Domain + Persistence | ✅ |
| 2 | Repository + Unit of Work | ✅ |
| 3 | Cross-cutting (hata, doğrulama, JWT, Swagger) | ✅ |
| 4 | Feature: Auth | ✅ |
| 5 | Feature: Exercise (+ ExerciseMedia) | ✅ |
| 6 | Feature: WorkoutTemplate | ✅ |
| 7 | Feature: WorkoutSession | ✅ |
| 8 | Feature: SetEntry + PR motoru | ✅ |
| 9 | Feature: Sorgular (geçmiş, takvim/streak, hacim) | ✅ |
| 10 | Feature: BodyWeightLog | ✅ |
| 11 | Feature: Export | ✅ |
| 12 | Feature: AiInsight altyapısı | ✅ |
| 13 | Feature: Hesap silme (soft delete) | ✅ |

---

## Faz 0 — Ortam ve İskelet
- [x] 0.1 .NET 10 SDK kuruldu (winget) — 10.0.400
- [x] 0.2 Docker Desktop kuruldu (4.88.1) — daemon başlatıldı (WSL2 önce kurulmalıydı, kurulum
      sonrası makine yeniden başlatıldı)
- [x] 0.3 `git init` + `.gitignore`
- [x] 0.4 `Grind.sln`, `src/Grind.Api` (webapi, controllers), `tests/Grind.Tests` (xunit)
- [x] 0.5 NuGet: Npgsql.EFCore.PostgreSQL 10.0.3, EFCore.Design, JwtBearer, BCrypt.Net-Next,
      Swashbuckle.AspNetCore 10.2.3 · test: EFCore.Sqlite + proje referansı
      _(Karar: FluentValidation ve FluentAssertions eklenmedi — DataAnnotations +
      `[ApiController]` otomatik 400'ü bu ölçekte yeterli, karmaşık kurallar zaten servis
      katmanında yaşayacak. KISS + gereksiz bağımlılık yok.)_
      _(Karar: `Microsoft.AspNetCore.OpenApi` csproj'den çıkarıldı — Swashbuckle zaten
      OpenAPI dokümanı üretiyor, iki üretici tutmak DRY ihlali olurdu.)_
- [x] 0.6 `docker-compose.yml` — postgres:17-alpine, healthcheck, named volume,
      host portu **5433** (yerelde kurulu bir Postgres varsa çakışmasın)
- [x] 0.7 Secrets `dotnet user-secrets`'e yazıldı (connection string + rastgele JWT key);
      `appsettings.json` sadece boş placeholder + JWT issuer/audience/expiry tutuyor
- [x] 0.8a `dotnet build` → 0 uyarı, 0 hata
- [x] 0.8b `docker compose up -d` ile DB ayağa kalkması — WSL2 kurulumu ve makine yeniden
      başlatmasının ardından Docker Desktop daemon'ı başlatıldı, `grind-db` konteyneri
      `0.0.0.0:5433->5432/tcp` ile ayakta

## Faz 1 — Domain + Persistence (Code-First)

> Tasarım kararları: [docs/superpowers/specs/2026-08-31-persistence-design.md](docs/superpowers/specs/2026-08-31-persistence-design.md)
> Sıra TDD'ye göre: model iddiaları önce test olarak yazılır (DB gerekmez), sonra karşılanır.

- [x] 1.1 Enum'lar: `ExerciseCategory`, `RecordType`, `MediaType`, `AiInsightKind`
- [x] 1.2 Entity'ler (anemik POCO, `long Id`, taban sınıf yok): User, Exercise,
      WorkoutTemplate, TemplateExercise, WorkoutSession, SetEntry, BodyWeightLog,
      ExerciseMedia, AiInsight
- [x] 1.3 Model testleri (kırmızı): silme davranışları, enum→text, DateTime→timestamptz,
      numeric(6,2), unique index'ler, seed sayısı, identity startValue — `AppDbContext.Model`
      üzerinden, bağlantı açmadan
- [x] 1.4 `AppDbContext` + `ApplyConfigurationsFromAssembly` (OnModelCreating tek satır)
- [x] 1.5 9 adet `IEntityTypeConfiguration<T>` — testleri yeşile çevirir:
      - enum'lar `HasConversion<string>()`
      - `User(Username)` unique · `Exercise(UserId, Name)` unique **NULLS NOT DISTINCT**
        (desteklenmiyorsa iki kısmi index)
      - silme: Template→TemplateExercise CASCADE, Session→SetEntry CASCADE,
        Template→Session.TemplateId SET NULL, Exercise→SetEntry/TemplateExercise RESTRICT,
        Exercise→Media CASCADE, **User→her şey RESTRICT**, AiInsight→Session/SetEntry SET NULL
      - CHECK: `Reps > 0`, `PlannedSets > 0`, `Rir >= 0`, `Weight >= 0` (0 = vücut ağırlığı),
        `EndedAt > StartedAt`
      - index: Session(UserId,StartedAt), SetEntry(ExerciseId,WorkoutSessionId),
        BodyWeightLog(UserId,RecordedAt), AiInsight(UserId,CreatedAt),
        TemplateExercise(TemplateId,OrderIndex)
- [x] 1.6 Seed: 15 global egzersiz `HasData` ile (Id 1–15, UserId = null) +
      `HasIdentityOptions(startValue: 1000)` — sequence çakışmasını önler
- [x] 1.7 İlk migration: `dotnet ef migrations add InitialCreate` (DB gerekmez)
- [x] 1.8 `dotnet ef database update` + psql doğrulaması (Docker gerekir) — tablolar, seed
      satırları, CHECK kısıtları; ayrıca Kind≠Utc DateTime yazma testi

## Faz 2 — Repository + Unit of Work
- [x] 2.1 `IRepository<T>` (Get/Query/Add/Remove) + `Repository<T>` temel implementasyon
- [x] 2.2 Yalnızca gerçek ihtiyaç olan özel repo'lar (KISS): `IExerciseRepository`,
      `IWorkoutSessionRepository`, `ISetEntryRepository`, `IUserRepository`
- [x] 2.3 `IUnitOfWork` — tek `SaveChangesAsync()`, gerektiğinde açık transaction
- [x] 2.4 DI kayıtları (`Program.cs` / `DependencyInjection` extension)

## Faz 3 — Cross-cutting
- [x] 3.1 Domain exception hiyerarşisi: `NotFoundException`, `ValidationException`,
      `ForbiddenException`, `ConflictException`
- [x] 3.2 Global exception handling middleware → RFC 7807 ProblemDetails, prod'da stack
      trace sızdırmaz, loglar (path + zaman + UserId)
- [x] 3.3 JWT üretimi/doğrulaması — token SADECE `UserId` + `Username` taşır
- [x] 3.4 `ICurrentUserService` — `HttpContext`'ten aktif kullanıcı
- [x] 3.5 Ortak sahiplik kontrolü yardımcısı (UserId == current || UserId == null) — DRY
- [x] 3.6 Doğrulama: DataAnnotations + `[ApiController]`'ın otomatik 400'ü (RFC 7807 uyumlu
      `ValidationProblemDetails` zaten üretiyor). **FluentValidation eklenmiyor** — Faz 0 kararı
      (satır 36) geçerli; buradaki eski satır onunla çelişiyordu. + Swagger (JWT bearer)
- [x] 3.7 `Grind.Api.Common.DependencyInjection.AddCrossCutting` — JWT/authn/authz,
      `ICurrentUserService`, global exception handler tek noktada DI'a kaydedildi;
      `Program.cs` pipeline'a bağlandı (`UseExceptionHandler` → `UseAuthentication` →
      `UseAuthorization`), Swagger'a Bearer güvenlik şeması eklendi

## Faz 4 — Feature: Auth
- [x] 4.1 DTO: RegisterRequest, LoginRequest, AuthResponse
- [x] 4.2 `IAuthService` / `AuthService`: username lowercase normalizasyonu, BCrypt hash,
      username çakışma kontrolü → 409
- [x] 4.3 `AuthController`: POST /api/auth/register, POST /api/auth/login
- [x] 4.4 Test: kayıt, aynı username reddi (case-insensitive), hatalı şifre, token içeriği

> **Faz 3'ten devreden notlar (Faz 4'te dikkat edilecek):**
> - `Grind.Api.Common.Exceptions.ValidationException`, `System.ComponentModel.DataAnnotations.ValidationException`
>   ile aynı kısa ada sahip. DTO'lara DataAnnotations `using`'i geldiğinde tam nitelikli ad ya da
>   `using ValidationException = Grind.Api.Common.Exceptions.ValidationException;` alias'ı gerekecek.
> - **404-over-403 kararını hiçbir tip veya test korumuyor.** `GlobalExceptionHandler`, 4xx'lerde
>   `exception.Message`'ı `detail` olarak Production'da da aynen yansıtıyor. Karar ancak her servis
>   NÖTR bir `NotFoundException` mesajı yazdığı sürece geçerli — `new NotFoundException("Bu egzersiz
>   size ait değil")` gibi bir mesaj, kararın kapattığı enumerasyon sızıntısını geri açar.
> - Kimlik SADECE `ICurrentUserService` üzerinden okunacak. `User.Identity.Name` artık dolu
>   (`NameClaimType = AppClaims.Username`) ama claim'lere elle uzanmak sahiplik kontrolünü atlamayı
>   kolaylaştırır.

> **Faz 4'ten devreden notlar (ileride dikkat edilecek):**
> - **Rate limiting bilerek yapılmadı (YAGNI, kişisel ölçek).** ASP.NET Core'un yerleşik rate
>   limiting middleware'i birkaç satırla eklenebilir. Uygulama internete açılırsa (tek kullanıcı
>   dışına çıkarsa) bu karar yeniden gözden geçirilmeli.
> - **`POST /api/auth/register`, kimlik doğrulaması istemeyen bir username-enumeration
>   oracle'ıdır.** Login bilerek sertleştirildi (nötr hata mesajı + kullanıcı bulunamasa da
>   çalışan sahte BCrypt doğrulaması, zamanlama farkını kapatmak için) ama register, "bu
>   kullanıcı adı alınmış mı?" sorusuna doğrudan 409 ile cevap veriyor — üstelik bu çakışma yolu
>   BCrypt'e hiç uğramadan kısa devre yapıyor (~2ms), başarılı kayıt ise hash'leme yüzünden
>   ~230ms sürüyor. Yani mesajı nötrleştirmek tek başına yeterli olmazdı, zamanlama farkı zaten
>   kayıtlı username'leri sayardı. Bu bir hata değil, kaydın doğası gereği bir sınır: bir kullanıcı
>   seçtiği adın alınıp alınmadığını bilmek ZORUNDA. Rate limiting eklenene kadar login'in
>   nötrlük garantisinin bilinen bir sınırı olarak not düşülüyor.
> - [x] **Faz 5 için: fallback authorization policy yok.** ~~`AddAuthorization()` şu an hiçbir
>   `FallbackPolicy` olmadan çağrılıyor ve `MapControllers()` de `RequireAuthorization()`
>   almıyor — yani ayrıca işaretlenmeyen her endpoint varsayılan olarak anonim erişime açık.
>   Faz 5'te unutulan bir `[Authorize]` bu yüzden "fail open" olur (varsayılan olarak kapalı
>   değil, açık kalır). Faz 5 başında `options.FallbackPolicy =
>   new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()` eklenmeli — bu hem
>   açığı kapatır hem de `AuthController`'daki `[AllowAnonymous]`'u (şu an fiilen no-op, çünkü
>   zaten karşılığında zorlayan bir fallback yok) gerçekten işlevsel hâle getirir.~~
>   **Faz 5'te karşılandı** (Görev 1): `AddCrossCutting` içine `options.FallbackPolicy`
>   eklendi (`src/Grind.Api/Common/DependencyInjection.cs`) — işaretlenmemiş her endpoint artık
>   varsayılan olarak kimlik doğrulaması ister.
> - **Faz 5 için: `GrindApiFactory` ortam değişkenlerini süreç genelinde bırakıyor.**
>   `Program.cs` `builder.Configuration`'ı `Build()`'den ÖNCE okuduğu için `WebApplicationFactory`'nin
>   `ConfigureAppConfiguration` hook'u çalışmıyor; fabrika bu yüzden `Jwt__Key` ve
>   `ConnectionStrings__Postgres`'i kurucusunda `Environment.SetEnvironmentVariable` ile kuruyor ve
>   hiç geri almıyor. Bugün bir yarış yok — yapılandırmayı okuyan tek test sınıfı o. Ama Faz 5
>   ikinci bir `WebApplicationFactory` tabanlı test sınıfı eklerse (ör. "anahtar yoksa host
>   ayağa kalkmamalı") aynı süreçte sızan bu değişkenlerle yarışır. O noktada `GrindApiFactory`'ye
>   bir `Dispose` override'ı eklenip değişkenler temizlenmeli.
> - **Entegrasyon testleri geliştirme veritabanına kalıcı satır yazıyor** (`itest_<guid>`
>   kullanıcıları). Username'ler benzersiz olduğu için tekrar çalıştırmayı bozmuyor, ama zamanla
>   birikiyor. Rahatsız olursa test sonunda silme ya da ayrı bir test veritabanı eklenebilir.

## Faz 5 — Feature: Exercise (+ ExerciseMedia)
- [x] 5.1 DTO + service: listeleme (global + kendi, arşivliler hariç), oluşturma,
      güncelleme, arşivleme (soft delete)
- [x] 5.2 Yetkilendirme: global egzersiz düzenlenemez/arşivlenemez; başkasının egzersizi
      görünmez (IDOR koruması)
- [x] 5.3 Aynı isim çakışması kontrolü (kendi + global set içinde)
- [x] 5.4 ExerciseMedia CRUD — sahiplik kuralını Exercise'tan miras alır
- [x] 5.5 Test: IDOR senaryoları, isim çakışması, arşiv sonrası liste; ayrıca
      `ExercisesController` + JSON `JsonStringEnumConverter` kaydı (enum tel üzerinde metin
      taşır, `[EnumDataType]` tanımsız sayı değerlerini durdurur) ve uçtan uca duman testi

> **Faz 5'ten devreden notlar (ileride dikkat edilecek):**
> - **Minimal-API endpoint'leri de fallback policy'yi miras alır.** İleride eklenecek bir
>   `/health` veya başka bir `MapGet` endpoint'i JWT talep edecek ve çalışması için açıkça
>   `.AllowAnonymous()` isteyecek. Bu unutulursa bir config hatası gibi değil, bir kesinti
>   (outage) gibi görünür.
> - **Fallback policy'nin ürettiği 401'de `detail`/`instance` yok**, `GlobalExceptionHandler`'ın
>   ürettiği 401'in aksine. Kozmetik; bilerek ertelendi.
> - **Aynı hata sınıfı için iki farklı 400 gövde şekli var.** DataAnnotations doğrulama hatası
>   alan bazlı bir `errors` nesnesi taşıyan `ValidationProblemDetails` döner; servisin fırlattığı
>   bir `ValidationException` ise sadece `detail` alanı olan düz bir `ProblemDetails` döner.
>   `body.errors.Name` okuyan bir istemci ikincisinde `undefined` alır. **Karar: şimdilik
>   kabul edildi, birleştirilmedi** — servis katmanındaki bir `ValidationException` her zaman
>   alan bazlı olmayan iş kurallarını da kapsıyor, ona alan bazlı bir sözleşme dayatmak
>   spekülatif olurdu. Gerçek bir istemci alan bazlı eşleme istediğinde yeniden ele alınmalı;
>   değişiklik `GlobalExceptionHandler`'da olur ve tüm fazları etkiler.
> - **Faz 6 (WorkoutTemplate) için:**
>   (a) [x] ~~`TemplateExercise` doğrulaması, `UserId == x || UserId == null` yüklemini satır
>   içinde yeniden yazmak yerine `ExerciseService`'in görünürlük desenini yeniden kullanmalı —
>   aksi halde ince bir farkla farklı bir IDOR kontrolü sızabilir.~~ **Faz 6'da karşılandı**:
>   `WorkoutTemplateService.ReplaceExercisesAsync`, aynı görünürlük yüklemini satır içinde
>   tekrar yazmak yerine `IExerciseRepository.GetVisibleByIdsAsync` üzerinden tek yerden çağırıyor.
>   (b) [x] ~~`GetVisibleByIdAsync` bilerek `IsArchived`'i yok sayıyor ki geçmiş kayıtlar
>   çözülebilir kalsın — bu yüzden template **oluşturma** arşivlenmiş egzersizleri AYRICA
>   reddetmeli, ama template **okuma** onları yine çözebilmeli.~~ **Faz 6'da karşılandı**:
>   `OwnedOrThrowAsync`/`ReloadAsync` (okuma) arşivlenmiş egzersizleri hâlâ çözüyor,
>   `ReplaceExercisesAsync` (yazma) arşivlenmiş bir egzersiz görürse `ValidationException` (400)
>   fırlatıyor.
>   (c) [x] ~~Toplu bir `GetVisibleByIdsAsync(ids, userId)` gerekecek, yoksa N egzersizli bir
>   şablon N ayrı gidiş-dönüşe mal olur.~~ **Faz 6'da karşılandı**: `GetVisibleByIdsAsync` eklendi,
>   `ReplaceExercisesAsync` şablondaki tüm egzersiz id'lerini tek sorguda doğruluyor.

## Faz 6 — Feature: WorkoutTemplate
- [x] 6.1 DTO + repository + `WorkoutTemplateService`: CRUD (`Create`/`Update`/`Patch`/`Delete`),
      `TemplateExercise` listesi TOPTAN değiştirilir (`ReplaceExercisesAsync`) — `OrderIndex`
      istemciden gelmez, dizideki konumdan türer; `PlannedSets` [1,50] aralığında
- [x] 6.2 Template'e eklenen her `ExerciseId` için erişilebilirlik doğrulaması:
      `ExerciseService`'in görünürlük deseni `IExerciseRepository.GetVisibleByIdsAsync` ile
      toplu olarak yeniden kullanıldı (N ayrı gidiş-dönüş yok); arşivlenmiş bir egzersiz
      şablona YAZILAMAZ ama var olan şablonlarda okunmaya devam eder; aynı egzersiz bir
      şablona iki kez eklenemez
- [x] 6.3 Silme: `TemplateExercise` CASCADE, `WorkoutSession.TemplateId` SET NULL (Faz 1'de DB
      seviyesinde konfigüre edilmişti). **Düzeltme (2026-09-08 fix dalgası):** bu satır
      önceden `Silinen_sablon_sonrasinda_404_verir`'i kanıt gösteriyordu — o test yalnızca
      204 → 404 akışını doğrular, `TemplateExercise` satırlarına veya
      `WorkoutSession.TemplateId`'ye hiç bakmaz. Gerçek kapsam `WorkoutTemplateServiceTests`
      içinde: `Silinen_sablonun_TemplateExercise_satirlari_da_gider` ve
      `Silinen_sablonun_oturumu_silinmez_TemplateId_null_olur`. Bu ikisi de fix dalgasında
      güçlendirildi: artık `service.DeleteAsync` yerine `ChangeTracker.Clear()` +
      `ExecuteDeleteAsync` kullanıyorlar, böylece EF'in aynı context'teki tracked child'lar
      için kendi client-side cascade'i devreye giremiyor — sonucu üretebilecek TEK mekanizma
      veritabanının kendi FK kuralı (CASCADE / SET NULL) kalıyor.
- [x] 6.4 Test: `TemplatesController` üzerinde 401 (`Tokensiz_listeleme_401_verir`), 201
      (`Olusturulan_sablon_listede_ve_detayda_gorunur`), 400 (`Gecersiz_plannedSets_400_verir`),
      404 (`Baska_kullanicinin_sablonu_404_verir`) ve PATCH'in listeyi koruduğu
      (`Patch_yalnizca_adi_degistirir_listeyi_korur`) doğrulanıyor + iç eleman doğrulaması için
      gerçek HTTP üzerinden bir test (`Gecersiz_plannedSets_400_verir` —
      `Validator.TryValidateObject` koleksiyon elemanlarına inmiyor, MVC'nin doğrulayıcısı
      iniyor; birim test bu farkı kanıtlayamaz). **Düzeltme (2026-09-08 fix dalgası):** bu
      satır önceden "409" ve "PUT'un listeyi TOPTAN değiştirdiği"nin de bu controller
      testlerinde kanıtlandığını iddia ediyordu — `TemplateEndpointsTests` o ikisini hiç
      içermiyordu. 409, yalnızca servis katmanında (`WorkoutTemplateServiceTests
      .Ayni_sablon_adi_farkli_harf_buyuklugunde_reddedilir`) ve artık DB seviyesinde de
      (`UnitOfWorkTests.SaveChangesAsync_sablon_adi_unique_ihlalinde_ConflictException_firlatir`)
      kanıtlanıyor. PUT'un listeyi farklı bir listeyle TOPTAN değiştirmesi de yalnızca servis
      katmanında (`Update_listeyi_toptan_degistirir`) kanıtlanıyor. Fix dalgasında
      `TemplateEndpointsTests`'e PUT için iki gerçek HTTP testi eklendi —
      `Put_exercises_atlanirsa_400_verir` (exercises alanı atlanırsa 400) ve
      `Put_bos_exercises_listesiyle_200_ve_bos_liste_doner` (açık boş liste 200 döner) — ama
      bunlar "atlama vs. boşaltma" ayrımını kanıtlıyor, "farklı bir listeyle TOPTAN değiştirme"yi
      değil. Toplam 258 test yeşil (252 → +6); 2026-09-08 fix dalgasıyla 263'e çıktı (+5: 2
      controller PUT testi, 2 servis arşiv testi, 1 DB-seviyeli unique testi). Ayrıca gerçek
      sunucuya karşı 10 senaryolu uçtan uca duman testi.

## Faz 7 — Feature: WorkoutSession
- [x] 7.1 Session başlat (template'li / template'siz), bitir (`EndedAt`), not ekle —
      `SessionsController` (POST /api/sessions, POST /api/sessions/{id}/finish,
      PATCH /api/sessions/{id}); başlatma idempotent: bugüne ait açık oturum varsa
      onu **200** ile döndürür (gövdedeki `templateId`/`notes` UYGULANMAZ), yoksa yeni
      açar ve **201** döner (`StartSessionResult.Created`)
- [x] 7.2 "Bugüne ait açık session" mantığı — `EndedAt IS NULL` **ve** `StartedAt`
      TR yerel saatiyle bugün; yoksa yeni session (unutulan session'a set düşmesin) —
      `TurkeyDay` + repository metotları (Görev 1)
- [x] 7.3 Session silme → CASCADE sonrası etkilenen distinct egzersizler için tek sefer
      `RecalculateRecords` — **bugün yalnızca siliyor** (SetEntry üreten endpoint henüz
      yok); gerçek çağrı Faz 8'e devredildi, bkz. aşağıdaki devreden not
- [x] 7.4 İlerleme hesabı: gerçek SetEntry sayısı vs `PlannedSets` — `SessionProgressResponse`,
      yalnızca şablonlu oturumlarda dolu gelir
- [x] 7.5 Test: gün sınırı (gece 23:00 / ertesi gün), açık session bulma — repository ve
      servis testleri (Görev 1-3) + `SessionsController` üzerinde 401, 201→200 idempotent
      başlatma, zero-byte gövdeyle 201 (bkz. devreden not), `open` 200/404, bitirme 200→409,
      IDOR (başkasının oturumu 404, başkasının şablonuyla başlatma 404), not güncelleme,
      silme sonrası 404 (Görev 4). Toplam 309 test yeşil (300 → +9); Faz 8 öncesi fix
      dalgasıyla (`10c836f`, şablon Include eksikliği) 310'a çıktı (+1). Ayrıca gerçek sunucuya
      karşı 10 senaryolu uçtan uca duman testi (register → 401 → boş gövdeyle 201 → idempotent
      200 → open 200 → not PATCH 200 → açık oturumda şablon YOK SAYILIR (200) → finish 200 →
      tekrar finish 409 → finish sonrası şablonla başlatma 201 (`templateName` dolu,
      `progress` hedef seti gösteriyor) → başkasının şablonuyla başlatma 404 → silme 204 →
      sonrasında GET 404).

> **Faz 7'den devreden notlar (Faz 8'de dikkat edilecek):**
> 1. **KAPANDI (Faz 8, Görev 6):** `WorkoutSessionService.DeleteAsync` artık silmeden ÖNCE
>    `ISetEntryRepository.GetDistinctExerciseIdsForSessionAsync(sessionId)` ile etkilenen
>    egzersizleri alıp her biri için BİR KEZ `PersonalRecordService.RecalculateAsync`
>    çağırıyor (`excludeSessionId` ile silinmek üzere olan oturumun setleri sorgudan
>    hariç tutuluyor — CASCADE henüz veritabanına gitmediği için).
> 2. **CEVAPLANDI (Faz 8):** Arşivlenmiş bir egzersize YENİ `SetEntry` girilemez —
>    `SetEntryService.CreateAsync` bunu `ValidationException` (400) ile reddediyor
>    (`SetEntryServiceTests.Arsivlenmis_egzersize_set_girilemez`,
>    `SetEndpointsTests.Arsivlenmis_egzersize_set_400_verir`). Arşivlemeden önce girilen
>    setler okunmaya devam eder (`Arsivlemeden_once_girilen_setler_okunmaya_devam_eder`).
> 3. **Faz 10'a devredildi:** `TurkeyDay` `TimeZoneInfo`'ya dayanıyor. `Turkey` alanı
>    `static readonly` bir initializer olduğu için, çok ince bir container imajında saat
>    dilimi veritabanı (tzdata/ICU) yoksa çalışma anında düz bir `TimeZoneNotFoundException`
>    ALINMAZ — bu, o tipi ilk kullanan istek anında fırlayan bir `TypeInitializationException`
>    içine sarılır ve tip o andan sonra süreç ömrü boyunca kalıcı olarak bozuk kalır (her
>    sonraki oturum isteği de 500 döner). Dağıtım imajı seçilirken kontrol edilmeli. **Önerilen
>    şekil (Dockerfile yazılınca):** `Turkey` alanını (ya da eşdeğer bir `TimeZoneInfo.FindSystemTimeZoneById`
>    çağrısını) uygulama başlangıcında bir kez çözüp doğrulamak — tıpkı var olan `Jwt:Key`
>    kontrolü gibi — eksik tzdata'nın ilk isteği değil BOOT'u başarısız kılması için. Bugün
>    henüz bir Dockerfile olmadığından bu kontrol UYGULANMADI, sadece not düşüldü. Faz 9,
>    `TurkeyDay`'e iki yeni metot (`RangeForLocalDate`, `LocalDateOf`) ekleyip bunları geçmiş/
>    takvim/hacim uçlarının hepsinde kullanarak bu tipin kullanım yüzeyini artırdı — tzdata
>    eksikse artık daha fazla uç bundan etkilenir; kontrolün BOOT'a taşınması Faz 10'da hâlâ
>    bekliyor.
> 4. **Bilinçli davranış:** açık bir oturum varken `POST /api/sessions` gövdedeki
>    `templateId`/`notes` değerlerini UYGULAMAZ, var olan oturumu olduğu gibi döndürür — açık
>    bir oturumu sessizce değiştirmek fark edilmeyen bir veri kaybı olurdu.
> 5. **KAPANDI (Faz 8, Görev 4, `aa9c9ce`):** önerilen seam aynen uygulandı —
>    `IWorkoutSessionService`/`WorkoutSessionService`'e entity döndüren ve BİLEREK
>    `SaveChangesAsync` ÇAĞIRMAYAN bir `GetOrOpenTodayAsync(...)` eklendi (repository
>    değişmedi); `SetEntryService.CreateAsync` (Görev 5) bu seam'i çağırıp oturumu
>    (gerekirse) ve yeni `SetEntry`'yi TEK `SaveChangesAsync` altında commit ediyor.

## Faz 8 — Feature: SetEntry + PR motoru  ⭐ (projenin kalbi)
- [x] 8.1 `RecordTracker` (CLAUDE.md'deki `PersonalRecordCalculator`'ın bu kod tabanındaki
      adı — bkz. Görev 1 isimlendirme notu): saf, veri erişimsiz çekirdek `Apply(...)`
      yardımcısı; ağırlık kovaları ondalık ölçek farklarına duyarsız (`0`/`0.0`/`0.00` aynı
      kova). `PersonalRecordService.EvaluateNewAsync` (ekleme akışı) ve `RecalculateAsync`
      (yeniden hesaplama akışı) İKİSİ DE aynı `Apply` fonksiyonunu çağırır (DRY) —
      `RecordTrackerTests` (10 test, saf fonksiyon, DB'siz).
- [x] 8.2 Set ekleme: `SetEntryService.CreateAsync` → `WorkoutSessionService
      .GetOrOpenTodayAsync` (Görev 4, yukarıdaki devreden not 5) ile bugüne ait açık oturumu
      bulur/açar → `RecordTracker.Apply` ile PR değerlendirir → oturum + yeni `SetEntry`
      TEK `SaveChangesAsync` altında commit edilir. Arşivlenmiş egzersize `ValidationException`
      (400), var olmayan/başkasının egzersizine `NotFoundException` (404).
- [x] 8.3 Set güncelleme/silme: `PatchAsync`/`DeleteAsync` düzeltme veya silmeden SONRA o
      egzersiz için HER ZAMAN `PersonalRecordService.RecalculateAsync` çağırır (yalnızca
      rekor taşıyan satır değişince değil — ortadaki bir setin düzeltilmesi sonraki setleri
      de etkileyebilir). `excludeSetId`/`excludeSessionId` parametreleri, commit edilmemiş
      silme sırasında EF identity map'in hâlâ döndürdüğü satırı/oturumu dışarıda tutar.
      `WorkoutSessionService.DeleteAsync` de aynı deseni kullanır (yukarıdaki devreden not 1).
- [x] 8.4 "Tüm zamanların rekorları" özet endpoint'i — `GET /api/records`
      (`RecordsController` → `PersonalRecordService.GetAllTimeAsync`), kullanıcının TÜM
      `SetEntry` satırları okunup bellekte egzersiz bazında gruplanır (yeni veri
      gerektirmez); hiç seti olmayan egzersiz listede yer almaz.
      > **Düzeltme (2026-09-10, final inceleme):** ilk uygulama yalnızca
      > `RecordType != None` satırlarını okuyordu ("hiçbir maksimum yalnızca None
      > satırlarda yaşayamaz" varsayımıyla) — bu YANLIŞ çıktı: 100 kg × 8'den sonra atılan
      > 60 kg × 15'lik bir indirme seti, 60 kg'da hiç geçmiş olmadığı için None kalır
      > (Soru 1/A) ama yine de tüm zamanların en çok tekrarını taşır. `GetAllForUserAsync`
      > artık TÜM setleri okuyor; `BuildSummary`'nin gruplama/eşitlik mantığı değişmedi.
- [x] 8.5 Test (en kapsamlı, 7 görev boyunca — final inceleme düzeltmesiyle güncel sayılar):
      saf çekirdek (`RecordTrackerTests`, 10), repository (`SetEntryRepositoryTests`, 11
      toplam / 7 Faz 8 eklemesi — kronoloji, sahiplik, `GetOwnedByIdAsync`, distinct egzersiz
      idleri, kullanıcının TÜM setlerinin dönmesi), servis (`PersonalRecordServiceTests` 11 +
      `SetEntryServiceTests` 17 — ilk set/ağırlık rekoru, aynı ağırlıkta tekrar rekoru,
      eşitlik rekor DEĞİL, arşivlenmiş egzersize red, IDOR, ortadaki setin düzeltilmesinin
      sonraki setleri yeniden hesaplaması, rekor taşıyan setin silinince sonrakinin terfi
      etmesi, rekor özetinin hafif ağırlıktaki ilk setin tekrarını kaçırmaması) ve uçtan uca
      (`SetEndpointsTests`, 20 — 401, 201 + ağırlık/tekrar rekoru, indirme seti rozet almaz,
      oturum listeleme + IDOR 404, PATCH ile yeniden hesap, DELETE ile terfi,
      `GET /api/records` özeti (+ hafif ağırlıktaki ilk setin tekrarını sayması), arşiv 400,
      egzersiz bulunamadı 404, sıfır tekrar 400, egzersiz alanı atlanınca 400, set eklenince
      Faz 7'nin ilerleme sayacının ilk kez gerçekten hareket etmesi). Ayrıca
      `WorkoutSessionServiceTests`'e Faz 8'de +9 eklendi (5 seam testi — Görev 4 — + 4 oturum
      silme/rekor yeniden hesabı testi — Görev 6). Toplam 384 test yeşil (310 → +74, Faz 8
      boyunca). `PUT` YOK (spec Soru 3/A) — yalnızca `PATCH`.

> **Faz 8'den devreden notlar (Faz 9'da dikkat edilecek):**
> 1. `PATCH /api/sets/{id}` ile `Rir` temizlenemiyor (`null` = "dokunma", `PatchSetRequest`
>    ile aynı sözleşme). Gerçek ihtiyaç çıkarsa ele alınacak.
> 2. Geçmişe dönük set girişi yok: `POST /api/sets` her zaman BUGÜNÜN açık oturumuna yazar.
> 3. `GET /api/records` gruplama işini bellekte yapıyor; final inceleme düzeltmesiyle artık
>    kullanıcının TÜM setlerini okuyor (yalnızca rekor taşıyanları değil — bkz. 8.4'teki
>    düzeltme notu). Kullanıcı başına set sayısı binlere çıkarsa gruplama SQL tarafına
>    (GROUP BY) taşınmalı. **Faz 9 notu:** bu "bellekte gruplama" uyarısı artık
>    `GET /api/history`, `GET /api/stats/volume/daily` ve `GET /api/stats/calendar` için de
>    geçerli — bkz. aşağıdaki Faz 9 devreden notları.
>
> Notlar 1 ve 2 hâlâ AÇIK: `Rir` temizleme ve geçmişe dönük set girişi Faz 9'un kapsamında
> değildi, ele alınmadı.

## Faz 9 — Feature: Sorgular
- [x] 9.1 Antrenman geçmişi: tarih aralığı + egzersiz filtresi, sayfalama — `LocalDayRange
      .Resolve` (Görev 1) TR günü aralığını UTC'ye çevirir (`from > to` → `ValidationException`
      → 400); `WorkoutSessionRepository.GetHistoryPageAsync` (Görev 3) sayfalı oturumları + aynı
      filtreden türeyen toplam sayıyı döner (`StartedAt` azalan, eşitlikte `Id` azalan, belirli
      sıra); `WorkoutHistoryService.GetAsync` (Görev 5) sayfanın TÜM setlerini
      `ISetEntryRepository.GetForSessionsAsync` (Görev 4) ile TEK seferde çekip oturum bazında
      gruplar (N+1 yok). `exerciseId` verilirse önce `IExerciseRepository.GetVisibleByIdAsync`
      ile sahiplik kontrolü yapılır (erişilemezse nötr mesajla 404); bulunursa oturumun
      `TotalVolume`/`SetCount` değerleri YALNIZCA o egzersizin setlerinden hesaplanır ve dönen
      `Sets` listesiyle birebir tutarlıdır (spec Karar 8). `GET /api/history`
      (`HistoryController`, Görev 7) `PagedResponse<HistorySessionResponse>` döner; setler için
      Faz 8'in `SetEntryResponse`'u yeniden kullanılır (DRY — ikinci bir set DTO'su yok).
- [x] 9.2 Takvim/katılım: `StartedAt` UTC → TR yerel güne çevrilip gruplanır; toplam gün,
      streak (yeni tablo YOK) — `StreakCalculator.Calculate` (Görev 2) saf, DB'siz çekirdek:
      bugün antrenman varsa bugünden, yoksa dünden geriye sayar (bugün antrenman yoksa mevcut
      seri KIRILMAZ, spec Karar 3); `WorkoutSessionRepository.GetTrainedSessionStartsAsync`
      (Görev 3) en az bir seti olan oturumların `StartedAt`'lerini TÜM geçmişten döner (seri
      hesabı aralıktan BAĞIMSIZ, spec Karar 5); `StatsService.GetCalendarAsync` (Görev 6) aynı
      `DailyBucketsAsync` yardımcısını (günlük hacimle paylaşılan, DRY) aralık için, ayrı bir
      tüm-geçmiş sorgusunu seri için kullanır. `GET /api/stats/calendar` (`StatsController`,
      Görev 7) `CalendarResponse` döner; seti olmayan oturum takvime/seriye HİÇ girmez.
- [x] 9.3 Hacim: set / oturum / egzersiz bazında (Weight × Reps) —
      `WorkoutSessionRepository.GetSessionAggregatesAsync` (Görev 3) oturum başına set sayısı +
      hacmi SQL'de toplar; `SetEntryRepository.GetVolumeByExerciseAsync` (Görev 4) egzersiz
      bazında SQL `GROUP BY` ile toplam hacim + set sayısı döner (filtre oturumun `StartedAt`'i
      üzerinden, setin `CreatedAt`'i DEĞİL — spec Karar 7). `StatsService
      .GetDailyVolumeAsync`/`GetVolumeByExerciseAsync` (Görev 6) bunları `VolumeSummaryResponse<T>`
      zarfına sarar — gün bazlı ve egzersiz bazlı ayrı satır tipleri (spec Karar 4, tek tipte
      yarısı null alan yok). Uçlar: `GET /api/stats/volume/daily`,
      `GET /api/stats/volume/by-exercise` (`StatsController`, Görev 7).
- [x] 9.4 Test: gece yarısı sınırı, streak kopması — saf çekirdek (`TurkeyDayTests` +6,
      `LocalDayRangeTests` 5, `StreakCalculatorTests` 9 — Görev 1-2, DB'siz), repository
      (`WorkoutSessionRepositoryTests` +9 — sayfalama/toplam sayı ayrışması, egzersiz filtresi +
      filtreli toplam tutarlılığı, sahiplik izolasyonu, seti olmayan oturumun toplamlara/seriye
      girmemesi; `SetEntryRepositoryTests` +7 — egzersiz hacmi gruplama, oturumun başlangıcına
      göre filtre, IDOR, çoklu oturumun setlerinin tek sorguda dönmesi, boş oturum kümesi — Görev
      3-4), servis (`WorkoutHistoryServiceTests` 11 — sayfalama, egzersiz filtresiyle IDOR (404),
      ters aralık (400), egzersiz filtresi + toplam tutarlılığı; `StatsServiceTests` 11 — gece
      yarısını aşan antrenmanın ertesi TR gününe yazılması, bugün antrenman yokken mevcut serinin
      korunması, seti olmayan oturumun takvime/hacme girmemesi — Görev 5-6) ve uçtan uca
      (`QueryEndpointsTests`, 13 — tokensiz istek 401 (4 uç), geçmiş oturumu setleriyle ve
      toplamıyla döndürme, IDOR (başkasının oturumları görünmez, başkasının egzersiziyle
      filtrelemek 404 verir), ters tarih aralığı 400, geçersiz sayfa boyutu 400, günlük hacim,
      egzersiz bazlı hacim, takvim + seri, verisi olmayan kullanıcının boş özet alması (404
      DEĞİL) — Görev 7). Toplam **455 test yeşil** (384 → +71, Faz 9 boyunca: Görev 1 +11, Görev
      2 +9, Görev 3 +9, Görev 4 +7, Görev 5 +11, Görev 6 +11, Görev 7 +13). Release build: 0
      uyarı, 0 hata.

> **Faz 9'dan devreden notlar (Faz 10'da dikkat edilecek):**
> 1. **Hâlâ AÇIK:** `GET /api/sessions` (Faz 7) hâlâ sayfalamasız — oturum sayısı büyürse
>    `PagedResponse` ile hizalanmalı. Faz 10'un yeni liste ucu (`GET /api/body-weights`) doğrudan
>    `PagedRangeQuery`/`PagedResponse`'u kullanıyor (Görev 1) — hizalama için hazır, denenmiş bir
>    desen artık var; sadece uygulanması bekleniyor.
> 2. Bellekte gruplamanın maliyet profili uçtan uca aynı değil: `GET /api/records`
>    kullanıcının TÜM `SetEntry` satırlarını okur (bkz. Faz 8.4 düzeltme notu); `GET /api/history`
>    yalnızca o SAYFANIN setlerini gruplar (sayfa boyutuyla sınırlı); takvim/günlük hacim uçları
>    ise SQL'in zaten oturum başına topladığı satırları (OTURUM sayısı kadar, set sayısı kadar
>    DEĞİL) belleğe alıp TR gününe göre gruplar. Üçü de aralık/veri büyüdükçe SQL'e taşınabilir
>    ama en acil olanı `GET /api/records`'tur — diğer ikisinin girdisi zaten önceden küçültülmüş.
>    Ayrıca `GET /api/stats/calendar`, seri (streak) ARALIKTAN BAĞIMSIZ olduğu için (spec Karar 5)
>    her çağrıda kullanıcının TÜM antrenman yapılmış oturumlarının `StartedAt`'ini okur — istenen
>    aralık ne kadar dar olursa olsun bu sorgu küçülmez.
> 3. Haftalık/aylık hacim gruplaması yok (üçüncü bir uç gerektirir); gerçek ihtiyaç çıkarsa
>    eklenir.

## Faz 10 — Feature: BodyWeightLog
- [x] 10.1 CRUD + tarih aralığı sorgusu — `WeightScale.EnsureAtMostTwoDecimals` (Görev 1, Faz 8'le
      paylaşılan ortak sınıf) sadece en fazla iki ondalık kuralını doğrular; 0,01-999,99 aralığı
      DTO'lardaki `[Range(0.01, 999.99)]` özniteliklerinde yaşar — `SetEntryService`'te 0 kg
      geçerli olduğu için (barfiks, dips) bu ikisi kasıtlı olarak ayrı. `PagedRangeQuery`
      (Görev 1, `Common`) `page`/`pageSize` üstüne `from`/`to` (TR günü, `DateOnly?`, `from > to`
      → 400) ekleyen genel bir sayfalı-aralık sözleşmesi — `HistoryQuery` (Faz 9, Görev 1'den
      sonra) zaten bundan türüyor, bu faz ikinci tüketicisi. `IBodyWeightLogRepository` (Görev 2): `GetOwnedByIdAsync` (sahiplik
      doğrudan `UserId` üzerinde, izlemeli — düzeltme/silme bu nesneyi değiştirir),
      `GetPageAsync` (sayfa + toplam sayı BİRLİKTE aynı filtreden, `RecordedAt` azalan/`Id` azalan
      belirli sıra, izlemesiz) ve `GetInRangeAsync` (karşılaştırma ucu için, izlemesiz).
      `BodyWeightLogService` (Görev 3): `CreateAsync` (`recordedAt` verilmezse `TimeProvider` ile
      şimdi, verilmişse UTC'ye çevrilip 5 dakikadan fazla ileriyse `ValidationException`),
      `PatchAsync` (en az bir alan zorunlu — boş gövde sessizce 200 dönmez), `DeleteAsync`.
      Uçlar `BodyWeightsController` (Görev 5): `POST`/`GET`/`GET {id}`/`PATCH {id}`/`DELETE {id}`,
      hepsi `api/body-weights` altında, ince (if/try yok).
- [x] 10.2 Hacim/performansla aynı zaman ekseninde karşılaştırma endpoint'i —
      `IStatsService.GetBodyWeightTrendAsync` (Görev 4) iki ayrı seri döner: hacim serisi
      `GetDailyVolumeAsync`'in AYNI `DailyBucketsAsync` yardımcısından gelir (spec Karar 3 — iki uç
      aynı günü asla farklı raporlamaz), kilo serisi `GetInRangeAsync`'in döndürdüğü tartıları
      `TurkeyDay.LocalDateOf` ile TR gününe göre bellekte gruplayıp `decimal.Round(...,
      MidpointRounding.AwayFromZero)` ile 2 ondalığa yuvarlar (spec Karar 1 — .NET'in varsayılan
      banker's rounding'i kilo gösteriminde kullanıcıya tutarsız görünürdü). `GET
      /api/stats/body-weight-trend` (`StatsController`, Görev 5) `BodyWeightTrendResponse` döner;
      tartı olmayan günde hacmi, antrenman olmayan günde kiloyu null bırakan birleşik bir satır
      YOK (Faz 9 Karar 4'te reddedilen desenin aynısı, burada da reddedildi).
- [x] 10.3 Test: saf/ortak parçalar (`WeightScaleTests` 4, `PagedRangeQueryTests` 3 — Görev 1),
      repository (`BodyWeightLogRepositoryTests` 9 — sahiplik/IDOR, sayfalama + toplam sayı
      ayrışması, aralık filtresi, izlemeli/izlemesiz ayrımı — Görev 2), servis
      (`BodyWeightLogServiceTests` 12 — ölçek doğrulaması, gelecek zaman reddi, `recordedAt`
      verilmezse `TimeProvider`'dan şimdi, boş PATCH gövdesi 400, IDOR — Görev 3),
      `StatsServiceTests`'e +7 (hacim serisinin `volume/daily` ile birebir aynı olması, günlük
      ortalamanın `AwayFromZero` yuvarlaması, tartı/antrenman olmayan günün ilgili seriye hiç
      girmemesi, boş aralık — Görev 4) ve uçtan uca (`BodyWeightEndpointsTests`, 15 — tokensiz
      istek 401 (6 uç), 201 + Location, liste zarfı yeniden-eskiye, PATCH ile kilo düzeltme +
      veritabanından okunan zamanın korunması, DELETE + 404, IDOR (başkasının kaydı her fiilde
      404), sıfır kilo 400, üç ondalıklı kilo 400, gelecek zaman 400, kilo/hacim karşılaştırmasının
      iki seride dönmesi — Görev 5). Toplam **507 test yeşil** (457 → +50, Faz 10 boyunca: Görev 1
      +7, Görev 2 +9, Görev 3 +12, Görev 4 +7, Görev 5 +15). Release build: 0 uyarı, 0 hata.
      Migration YOK (bu faz `BodyWeightLog` tablosunu Faz 1'in migration'ından zaten kullanıyor).

> **Faz 10'dan devreden notlar (Faz 11'de dikkat edilecek):**
> 1. Proje çapında `AsNoTracking` geçişi yapılmadı: bu fazın yeni okuma sorguları (`GetPageAsync`,
>    `GetInRangeAsync`) izlemesiz, ama Faz 5-9 okuma yolları (ör. `GET /api/history`,
>    `GET /api/records`) hâlâ izlemeli.
> 2. Offset'siz gönderilen `recordedAt`, serileştirici tarafından sunucunun yerel saat dilimiyle
>    yorumlanır (Docker'da genellikle UTC) — istemci offset göndermeli; ileride offset'siz
>    değerler reddedilebilir veya TR saati kabul edilebilir.
> 3. Haftalık/aylık kilo ortalaması yok (Faz 9'un haftalık hacim notuyla aynı gerekçe — üçüncü bir
>    uç gerektirir, gerçek ihtiyaç çıkarsa eklenir).

## Faz 11 — Feature: Export

> Tasarım kararları: [docs/superpowers/specs/2026-09-11-export-design.md](docs/superpowers/specs/2026-09-11-export-design.md)
> Uygulama planı: [docs/superpowers/plans/2026-09-11-faz-11-export.md](docs/superpowers/plans/2026-09-11-faz-11-export.md)

- [x] 11.1 Ham JSON export (tarih aralığı parametreli) — `GET /api/export/json?from&to`
      (`ExportController`, Görev 4) `ExportResponse` döner. İçeriği: aralıktaki oturumlar ve setleri
      (setsiz oturumlar dahil, çünkü liste bir günlüktür; spec Karar 8), tartılar, aralık özeti ve tüm
      zamanların rekorları. `from`/`to` opsiyonel (Soru 2/A): verilmezse tüm geçmiş döner. Parametre
      tipi Faz 9'un `StatsRangeQuery`'si. Rekorlar ve seriler aralıktan BAĞIMSIZ (spec Karar 2). Veri
      erişimi iki yeni izlemesiz aralık sorgusuyla yapılır (Görev 1):
      `IWorkoutSessionRepository.GetInRangeAsync` ve `ISetEntryRepository.GetInRangeAsync`. Setler
      oturumlarının `StartedAt`'ine göre filtrelenir. Bu filtre `GetVolumeByExerciseAsync` ile ortak
      `FilterBySessionRange` yardımcısında tek kopya halinde durur.
- [x] 11.2 AI-özet formatı: okunabilir düz metin (yapıştırılabilir) — `GET /api/export/text`,
      `text/plain; charset=utf-8` döner. `ExportTextFormatter.Format` (Görev 2) AYNI `ExportResponse`
      modelini formatlayan saf bir fonksiyondur. Bu yüzden JSON ile metin yapısal olarak ayrışamaz
      (spec Karar 3). Biçim kuralları:
      - Türkçe, Markdown başlıklı.
      - Sayılar `InvariantCulture` + `0.##`. Sebep: tr-TR biçimindeki "152.340"ı bir LLM 152,34
        okuyabilirdi.
      - Tarih ISO, saat TR; gün adları sabit bir diziden gelir.
      - Satır sonu her zaman `\n`.
      - Kullanıcı metinleri (not, egzersiz ve şablon adı) tek satıra iner.

      `TurkeyDay.ToLocal` saat dilimi dönüşümünün tek kopyası oldu; `RangeFor` ve `LocalDateOf`
      artık onu kullanıyor.
- [x] 11.3 Formatlama mantığı servis katmanında, controller sadece dönüş yapar — `ExportService`
      (Görev 3) export'u mevcut okuma yollarından BİRLEŞTİRİR ve yeni hesap içermez (spec Karar 4):
      - Özet `IStatsService.GetCalendarAsync` ve `GetVolumeByExerciseAsync`'ten gelir.
      - Rekorlar `IPersonalRecordService.GetAllTimeAsync`'ten gelir.
      - Oturum/set birleştirmesi, geçmiş ucuyla paylaşılan `HistoryMapping`'de yapılır
        (`WorkoutHistoryService`'ten taşındı).

      Controller ince, if/try içermez. Metin ucunda bilerek `[Produces]` yok (spec Karar 10), çünkü
      otomatik 400'ü 406'ya çevirirdi.
- [x] 11.4 Test:
      - **Saf çekirdek:** `TurkeyDayTests` +2 ve `ExportTextFormatterTests` 18. Kapsam: altın metin,
        tr-TR kültürü, ondalık kırpma, egzersiz bazında gruplama, RIR ve PR ekleri, ertesi TR gününe
        taşan bitiş, boş bölümler, aralık başlıkları, satır sonu düzleştirme.
      - **Repository:** `WorkoutSessionRepositoryTests` +3 ve `SetEntryRepositoryTests` +3. Kapsam:
        oturumun başlangıcına göre filtre, izlemesizlik, IDOR.
      - **Servis:** `ExportServiceTests` 10. Kapsam: özetin takvim ve egzersiz hacmi uçlarıyla birebir
        aynı olması, setsiz oturumun listede olup özette olmaması, rekorların aralıktan bağımsızlığı,
        IDOR, metnin formatlanmış model olması.
      - **Uçtan uca:** `ExportEndpointsTests` 9. Kapsam: 401, JSON şekli, text/plain ve UTF-8, ters
        aralıkta 400, bozuk tarihte 406 değil 400, `Accept: text/plain` ile gelen hatalı istekte
        `detail`'in korunması, IDOR.

      Toplam **554 test yeşil**. Başlangıç 509'du, çünkü Faz 10 sonrası `2fcb8a7` düzeltmesi 507'ye
      +2 ekledi. Faz 11 boyunca +45: Görev 1 +6, Görev 2 +19, Görev 3 +10, Görev 4 +8, final
      inceleme düzeltmesi +2. Release build: 0 uyarı, 0 hata. Migration YOK.

      **Final inceleme düzeltmesi (tüm uçları etkiler):** `GlobalExceptionHandler` Faz 3'ten beri bir
      boşluk taşıyordu. `Accept` başlığı JSON içermediğinde varsayılan ProblemDetails yazıcısı
      reddediyor ve servisin fırlattığı 4xx, `detail`'i olmayan genel bir gövdeye düşüyordu. Artık
      handler aynı ProblemDetails'i `application/problem+json` olarak kendisi yazıyor.

> **Faz 11'den devreden notlar (Faz 12'de dikkat edilecek):**
> 1. Tüm geçmiş export'u kullanıcının setlerini iki kez okur: bir kez oturum setleri için, bir kez
>    `GetAllTimeAsync`'in rekor özeti için. `GetAllTimeAsync` hâlâ izlemeli. Kişisel ölçekte önemsiz;
>    rekor özeti SQL'e taşındığında (Faz 8 devreden notu 3) kendiliğinden düzelir.
> 2. Export'un sorguları ayrı ifadeler olarak çalışır ve bilerek transaction içinde değildir (KISS).
>    İki sorgu arasında yepyeni bir oturuma girilen bir set export'ta görünmeyebilir.
> 3. Faz 12 (AiInsight) için, backend'in LLM'e göndereceği bağlamın hazır kaynağı
>    `IExportService.GetTextAsync`. Ayrı bir "LLM'e özet" formatı yazmak yerine bu kullanılmalı (DRY).
>    LLM çağrısı transaction DIŞINDA kalmalı (CLAUDE.md). Export zaten salt okuma, `SaveChangesAsync`
>    çağırmaz.
> 4. Faz 10'dan devreden notlar hâlâ AÇIK:
>    - Proje çapında `AsNoTracking` geçişi yapılmadı. Faz 11'in yeni sorguları izlemesiz, eski okuma
>      yolları hâlâ izlemeli.
>    - Offset'siz gönderilen `recordedAt` sorunu çözülmedi.
>    - Haftalık/aylık ortalama yok.

## Faz 12 — Feature: AiInsight altyapısı

> Tasarım kararları: [docs/superpowers/specs/2026-09-11-ai-insight-design.md](docs/superpowers/specs/2026-09-11-ai-insight-design.md)
> Uygulama planı: [docs/superpowers/plans/2026-09-11-faz-12-ai-insight.md](docs/superpowers/plans/2026-09-11-faz-12-ai-insight.md)

- [x] 12.1 `AiInsight` okuma/yönetimi; `Kind`, `WorkoutSessionId`, `SetEntryId` kapsamları —
      `POST /api/insights` (üret), `GET /api/insights` (süzgeçli, sayfalı), `GET /api/insights/{id}`,
      `DELETE /api/insights/{id}`; `InsightsController` ince (Görev 5). **Düzenleme ucu YOK** (spec
      Karar 2): yorum, modelin ne dediğinin kaydıdır; `Content`'i düzenlemek onu
      `Model`/`TokensUsed`/`EstimatedCostUsd`'den koparırdı. Elle ekleme de yok. Liste `kind`,
      `workoutSessionId` ve `setEntryId` ile süzülür — üretim bugün yalnızca `Insight` yazsa da
      okuma yolu Suggestion satırları için hazır (spec Karar 1). Sıra `CreatedAt`/`Id` azalan;
      sayfalama `PagedRangeQuery`'den çıkarılan ortak `PagedQuery` tabanıyla (Görev 1).
      Yorumun kapsadığı aralık satırda saklanır: `AiInsight.RangeFrom`/`RangeTo` (`date`, nullable,
      Görev 2 + migration `AiInsightAralikAlanlari`) — `CreatedAt` yetmez, bugün üretilen bir yorum
      geçen yılı kapsayabilir ve istemci aynı aralık için tekrar ücret ödemeden önce buna bakar.
- [x] 12.2 `IAiInsightProvider` soyutlaması + `NullAiInsightProvider` (varsayılan kapalı) —
      `Services/Ai/` altında (Görev 3). Varsayılan sağlayıcı `ServiceUnavailableException`
      (**503**, yeni eşleme Görev 1) fırlatır: "açıkça kullanılamıyor" der, sahte başarı ÜRETMEZ —
      sahte içerik kullanıcının ödemediği satırlar yazardı. Ne sorulacağı (`AiInsightPrompt`)
      servis katmanında, nasıl sorulacağı sağlayıcıda; fiyatı da sağlayıcı bilir
      (`AiCostCalculator`, 6 ondalık `AwayFromZero`), servis bilmez.
- [x] 12.3 Gerçek LLM çağrısı transaction DIŞINDA — `AnthropicAiInsightProvider` resmi Anthropic
      C# SDK'sı (`Anthropic` 12.47.0) ile yazıldı; sunucu tarafı fallback açık
      (`server-side-fallback-2026-07-01` + `fallbacks: "default"`), `Model` yanıtı fiilen üreten
      modelden alınır. **Aktivasyon yalnızca yapılandırmayla**, kod değişikliği istemez:
      `dotnet user-secrets set "Ai:Provider" "Anthropic"` + `Ai:ApiKey`. Eksik/geçersiz ayar
      açılışta (boot) reddedilir; tanınmayan sağlayıcı adı enum bağlamasında patlar.
      `AiInsightService.GenerateAsync` (Görev 4) sırası: aralığı çöz → Faz 11 export'unu oku →
      verisiz aralıkta 400 (LLM'e hiç gidilmez) → **sağlayıcı** → `Add` + TEK `SaveChangesAsync`.
      `BeginTransaction` yok; sağlayıcı çağrılırken bekleyen izlenmiş değişiklik de yok (test bunu
      davranışsal olarak sabitler). Ücretli adım ve onu izleyen kayıt `CancellationToken.None`
      kullanır (spec Karar 7): istemci koparsa parası ödenmiş yanıt çöpe gitmez.
      Aralık verilmezse son 30 gün, en fazla 366 gün (maliyet sınırı).
- [x] 12.4 Test:
      - **Saf çekirdek:** `AiInsightRangeTests` 7, `AiCostCalculatorTests` 3,
        `GlobalExceptionHandlerTests` +2 (503 eşlemesi ve mesajın Production'da görünmesi),
        `ColumnMappingTests` +2 (`date` + nullable).
      - **Sağlayıcı (ağa çıkmadan, sahte `HttpMessageHandler` ile gerçek SDK yolu):**
        `AnthropicAiInsightProviderTests` 11 — tel üzerindeki istek şekli (`/v1/messages`,
        `x-api-key`, fallback beta başlığı, `"fallbacks": "default"`), metin bloklarının
        birleşmesi ve düşünme/fallback bloklarının atlanması, ret, boş metin, kesik yanıtın
        saklanması, 4xx/5xx/ağ hatası ve **bozuk gövde** (200 ama eksik alan) → 503.
        `AiProviderRegistrationTests` 7 — varsayılan kapalı, açılışta fail-fast, enum bağlaması.
      - **Repository:** `AiInsightRepositoryTests` 7 (+1 `PersistenceRegistrationTests`) —
        sahiplik/IDOR, sıra ve toplam sayı, üç süzgeç, izlemeli/izlemesiz ayrımı, aralık
        alanlarının gidip gelmesi.
      - **Servis:** `AiInsightServiceTests` 11 — varsayılan 30 günlük aralık, aralık dışındaki
        verinin sayılmaması, yalnızca tartısı olan aralık, verisiz aralıkta sağlayıcının hiç
        çağrılmaması, sağlayıcı hatasında satır yazılmaması, çağrı anında bekleyen değişiklik
        olmaması, IDOR.
      - **Uçtan uca:** `AiInsightEndpointsTests` 14 — dört uçta 401, kapalı sağlayıcıda 503 +
        `detail`, 201 + `Location` + gövde, liste/getir/sil, sıfır baytlık gövde, verisiz aralık,
        çok uzun aralık, geçersiz `kind`, IDOR ve **maliyet güvencesi**: test host'u geliştiricinin
        user-secrets'ındaki ücretli sağlayıcıyı çözemez (`Ai__Provider` ortam değişkeniyle
        sabitlenir — final incelemenin tek bloklayıcı bulgusu buydu).

      Toplam **619 test yeşil** (554 → +65). Release build: 0 uyarı, 0 hata. Migration: bir tane
      (`AiInsightAralikAlanlari`, iki nullable `date` sütunu).

> **Faz 12'den devreden notlar (Faz 13'te dikkat edilecek):**
> 1. **Faz 13 için doğrudan:** `User → AiInsight` FK'si RESTRICT. Hesap silme sırası (13.1)
>    `AiInsight` satırlarını da silmek zorunda, yoksa `User` silinemez.
> 2. **Bilinçli olarak kapsam dışı:** set arası koçluk (Suggestion) motoru ve oturum/set kapsamlı
>    üretim; POST'ta kullanıcının kendi sorusu (saklanması için yeni sütun gerekirdi); akışlı
>    (streaming) yanıt ve prompt caching; günlük/aylık harcama sınırı ve rate limiting ("bu ay ne
>    harcadım" `EstimatedCostUsd` üzerinde bir SUM sorgusudur, yeni tablo gerektirmez); aynı aralık
>    için otomatik tekrar-üretim engeli (istemci listeye bakar); başka sağlayıcılar.
> 3. **Bilinen sınırlar (final incelemede kabul edildi):**
>    - Maliyet tahmini yapılandırılan modelin fiyatını kullanır; fallback farklı fiyatlı bir modelle
>      yanıtlarsa sapar (bugün Opus ailesi aynı fiyatta). Cache token'ları da yok sayılır — caching
>      kapsam dışı olduğu için bugün etkisiz.
>    - İptal edilemeyen pencere `(MaxRetries + 1) × TimeoutSeconds` ≈ 6 dakikadır (SDK'nın `Timeout`'u
>      deneme BAŞINA). Ücretli adım bilerek iptal edilmediği için bu süre boyunca istek ve scope'u
>      canlı kalır.
>    - SDK dışı bir hata (ör. `JsonException`, token toplamındaki `checked` taşması) 503 değil 500
>      döner. Geniş bir `catch` bunu düzeltirdi ama kendi kodumuzdaki gerçek hataları da 503'e çevirip
>      gizlerdi; Production'da 500'ün mesajı zaten maskeleniyor.
>    - Kapalı özelliğe gelen her istek `GlobalExceptionHandler` tarafından Error seviyesinde loglanır
>      (spec Karar 12 bunu kabul etti). Gürültü olursa `ServiceUnavailableException` için Warning
>      istisnası ucuz çözüm.
> 4. **Faz 10/11'den devreden notlar hâlâ AÇIK:** proje çapında `AsNoTracking` geçişi yapılmadı
>    (`GetAllTimeAsync` hâlâ izlemeli), offset'siz `recordedAt` sorunu duruyor, haftalık/aylık
>    ortalama yok.

## Faz 13 — Feature: Hesap silme
> Buraya konumlandırıldı çünkü kullanıcıya ait TÜM tablolar var olmadan doğru yazılamaz.
> Tüm FK'ler `User`'a RESTRICT olduğu için silme, DB cascade'ine bırakılmaz — Service
> katmanında bilinçli ve sıralı yapılır (bkz. persistence spec §3).
> Tasarım kararları: [docs/superpowers/specs/2026-09-12-hesap-pasiflestirme-design.md](docs/superpowers/specs/2026-09-12-hesap-pasiflestirme-design.md)
> Uygulama planı: [docs/superpowers/plans/2026-09-12-faz-13-hesap-pasiflestirme.md](docs/superpowers/plans/2026-09-12-faz-13-hesap-pasiflestirme.md)

- [x] 13.0 **CEVAP: soft delete.** Kullanıcı 2026-09-12'de kararı verdi: "verilerin kaybolmasını
      istemiyoruz". Hesap pasifleşir, veri durur. Bunun sonucu olarak aşağıdaki 13.1 (sıralı hard
      delete) UYGULANMADI — hiçbir satır silinmediği için `User`'a RESTRICT veren FK'ler bir sorun
      teşkil etmiyor. İkinci karar: **pasif hesabı doğru şifreyle giriş yapmak geri açar** (ayrı bir
      "reactivate" ucu yok — doğru şifreyle giriş zaten niyetin kendisi).
- [x] 13.1 Pasiflik damgası: `User.DeletedAt` (`DateOnly` değil, nullable `timestamptz`;
      `null` = aktif) + migration `HesapPasiflestirme` (Görev 1). Bool yerine damga, çünkü "ne
      zamandan beri pasif" bilgisini bedelsiz veriyor ve ileride bir purge gerekirse hazır veri.
      Yanına kimlikli her istekte kullanılacak ucuz sorgu: `IUserRepository.ExistsActiveAsync`
      (birincil anahtar üzerinde tek `EXISTS`, entity materyalize etmez).
      > **Eski 13.1 (sıralı hard delete) NOTA DÖNÜŞTÜ:** gerçek silme gerekirse (bkz. devreden
      > notlar) sıra şudur: SetEntry → WorkoutSession → TemplateExercise → WorkoutTemplate →
      > ExerciseMedia → Exercise (yalnızca `UserId` = kullanıcı olanlar) → BodyWeightLog →
      > AiInsight → User.
- [x] 13.2 Global egzersizlere (`UserId = null`) dokunulmadığının testi — `AuthServiceTests`
      içinde pasifleştirme öncesi/sonrası global egzersiz sayısı karşılaştırılıyor. Ayrıca
      kullanıcının kendi verisinin de durduğu hem servis testinde (egzersiz/oturum sayıları) hem
      uçtan uca sınanıyor.
- [x] 13.3 Başka kullanıcının verisinin etkilenmediğinin testi — iki kullanıcı kaydedilip biri
      pasifleştiriliyor, diğerinin `DeletedAt`'i null kalıyor.
- [x] 13.4 Endpoint: `DELETE /api/auth/me` (şifre teyidi ile) — `[Authorize]`, gövdede
      `DeleteAccountRequest`, başarı **204**; yanlış şifre 401, boş şifre 400 (Görev 4). Kimlik
      token'dan gelir, gövdeden id ALINMAZ. Servis (Görev 2) sırayı şöyle işletir: kullanıcıyı
      yükle → BCrypt doğrula → `DeletedAt = Now` (enjekte edilen `TimeProvider`) → tek
      `SaveChangesAsync`.
- [x] 13.5 **Pasif hesabın elindeki token anında geçersizleşir** (Görev 3) — `AddJwtBearer`'ın
      `OnTokenValidated` olayında, kimlikli her istekte `ExistsActiveAsync` okunur ve hesap pasifse
      `context.Fail(...)` çağrılır. Token ömrü 7 gün olduğu için bu kontrol olmasaydı
      pasifleştirme bir hafta boyunca etkisiz kalırdı. CLAUDE.md'nin kuralı burada birebir
      uygulanıyor: zamanla değişen bir öznitelik token'a gömülmez, güncel durum her istekte
      veritabanından okunur. `[AllowAnonymous]` uçları (register/login) token taşımadığı için bu
      yoldan geçmez — geri açma yolu kapanmaz. Yan fayda: `UserId` claim'i bozuk/eksik bir token
      artık `CurrentUserService` içinde 500 üretmek yerine temiz bir 401 alıyor.
- [x] 13.6 Login'in nötrlüğü korundu: kullanıcı yok, şifre yanlış ve hesap pasif — üçü de aynı
      401 mesajını alır ve BCrypt doğrulaması her dalda çalışır (Faz 4'ün zamanlama savunması).
      Pasiflik kontrolü şifre doğrulamasından SONRA gelir; önce gelseydi yanlış şifreyle bile
      hesabın pasif olduğu sızardı. Pasif hesabın kullanıcı adı REZERVE kalır: aynı adla kayıt 409
      alır ve mevcut şifre hash'i EZİLMEZ (hesap devralma yok) — test hash'in değişmediğini de
      doğruluyor.
- [x] 13.7 Test:
      - **Repository:** `UserRepositoryTests` +3 — aktif bulunur, pasif (satır DURUYOR) bulunmaz,
        olmayan id bulunmaz.
      - **Servis:** `AuthServiceTests` +7 — damga saatten yazılır ve veri silinmez, yanlış şifre
        reddedilir, pasif hesap doğru şifreyle geri açılır, yanlış şifreyle açılmaz (nötr mesaj +
        pasif kalır), pasif adla kayıt 409 ve hash korunur, başka kullanıcı etkilenmez, global
        egzersizler etkilenmez.
      - **DTO:** `AuthDtoValidationTests` +2 — 72 baytlık şifre kabul, 144 baytlık şifre reddedilir
        (BCrypt'in sessiz kesme davranışına karşı olan kural).
      - **Uçtan uca:** `AccountDeactivationTests` 7 — pasifleştirilen hesabın eski token'ı 401
        alır, pasif hesap giriş yapıp yeni token'la çalışabilir, **ölü token'ı hâlâ taşıyan istemci
        giriş yapabilir**, tokensiz silme 401, şifresiz gövde 400, yanlış şifre 401 (+ hesap açık
        kalır) ve tam tur: veri gir → 204 → token ölür → giriş geri açar → veri hâlâ orada.

      Toplam **638 test yeşil** (619 → +19). Release build: 0 uyarı, 0 hata. Migration: bir tane
      (`HesapPasiflestirme`, tek nullable `timestamptz` sütunu; mevcut satırlar `NULL` = aktif
      olarak geriye dönük uyumlu).

> **Faz 13'ten devreden notlar:**
> 1. **Gerçek silme (purge) YOK.** Uygulama kendi dışında gerçek kullanıcılara açılırsa KVKK/GDPR'ın
>    silinme hakkı devreye girer; o noktada yukarıdaki (eski 13.1) FK sırasına göre bir purge
>    yazılır. `DeletedAt` "ne zamandan beri pasif" filtresini şimdiden sağlıyor. DİKKAT: purge
>    yazılırsa `UsernameExistsAsync`, satır GERÇEKTEN silinene kadar `DeletedAt`'i yok saymaya devam
>    etmeli — yoksa purge ile ad rezervasyonu birbiriyle çelişir.
> 2. **Şifre sıfırlama yok** (projede e-posta yok). Pasif hesabın geri dönüşünün tek yolu doğru
>    şifreyle giriş; şifresini unutan kullanıcı için kendi kendine bir yol yok. Bu yeni bir
>    eksiklik değil, mevcut durumun pasif hesaba yansıması.
> 3. **Geri açma, süresi dolmamış ESKİ token'ları da diriltir** (durum bilgisi tutmayan JWT'nin
>    doğası; iptal listesi tutulmuyor). Hesabı geri açan zaten şifreyi bilen kişidir.
> 4. **`DELETE /api/auth/me` uygulamanın ilk token'la kimliklenmiş şifre oracle'ıdır.** Çalınmış bir
>    token artık şifre tahmini denemeye de yarar (BCrypt work factor 12 → ~220 ms/deneme).
>    Uygulamada hiçbir yerde rate limiting yok (`/api/auth/login` dahil), yani bu mevcut bir boşluğun
>    genişlemesi. Uygulama yazarı dışına açılırsa iki şifre doğrulayan uç birlikte rate-limit
>    edilmeli.
> 5. **Kimlik doğrulamanın artık veritabanına sert bağımlılığı var:** önceden token, Postgres
>    kapalıyken de doğrulanabiliyordu (istek sonra patlardı), şimdi 401 daha önce geliyor. Pratikte
>    fark etmez (her uç zaten DB'ye gidiyor) ama bir izleme probu farklı hata görür.
> 6. **Park edilen küçük bulgu:** `Common/DependencyInjection.cs`'teki yorum "repository ve logger
>    scoped" diyor; `ILoggerFactory` aslında singleton'dır (paylaşılan şey, istek anında
>    `RequestServices`'ten çözme deseni). Yorum yanlış, davranış doğru.
> 7. Faz 10-12'den devreden notlar hâlâ AÇIK: proje çapında `AsNoTracking` geçişi, offset'siz
>    `recordedAt`, haftalık/aylık ortalama, `GetAllTimeAsync`'in izlemeli olması.

---

## Backend planı tamamlandı

Faz 0-13 bitti. Sıradaki adım plandaki 8. madde: **frontend teknolojisi kararı** (React / React Native
/ PWA vb.). Ayrıca aşağıdaki "Gerçek Kullanımdan Gelen İstekler" hâlâ karara bağlanmayı bekliyor.

---

## Çalışma Kuralı
Her fazın sonunda: `dotnet build` + ilgili testler yeşil → kısa özet → onay → sonraki faz.
Bir fazda alınan mimari karar CLAUDE.md'ye not olarak eklenir.

## Gerçek Kullanımdan Gelen İstekler (Faz 5 sonrası, 2026-09-08)
Uygulama Swagger'dan elle denenirken çıkan geliştirme fikirleri. Henüz karara bağlanmadı.

- **Egzersiz arama (isim ile).** Kullanıcı gerçek hayatta id ile değil isimle arıyor.
  Düz `contains` araması ucuz. Asıl istenen "bunu mu demek istediniz?" (yazım hatasına
  toleranslı öneri) ise ayrı bir iş: PostgreSQL `pg_trgm` uzantısı + `similarity()`,
  yeni bir migration ve bir benzerlik eşiği kararı gerektirir.
  > Önce şuna karar verilmeli: arama sunucuda mı olmalı? Liste 15 global + kullanıcının
  > kendi egzersizleri, yani birkaç düzine satır. Arayüz listeyi bir kez çekip tarayıcıda
  > filtrelerse arama anında olur ve her tuş vuruşunda istek gitmez. Sunucu tarafı arama,
  > liste yüzlerce satıra çıktığında anlam kazanır.
- **Kategori filtresi** (`GET /api/exercises?category=Push`). Küçük iş: mevcut
  `GetVisibleAsync`'e bir parametre. Yukarıdaki soruyla aynı ödünleşmeye tabi.
- Not: Faz 5 tasarımında ikisi de bilerek YAGNI diye dışarıda bırakılmıştı. Gerçek
  kullanım aksini gösterdiği için yeniden değerlendiriliyor — YAGNI'nin amacı buydu.
