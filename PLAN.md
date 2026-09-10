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
| 9 | Feature: Sorgular (geçmiş, takvim/streak, hacim) | ☐ |
| 10 | Feature: BodyWeightLog | ☐ |
| 11 | Feature: Export | ☐ |
| 12 | Feature: AiInsight altyapısı | ☐ |
| 13 | Feature: Hesap silme | ☐ |

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
      silme sonrası 404 (Görev 4). Toplam 309 test yeşil (300 → +9). Ayrıca gerçek sunucuya
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
> 3. **Faz 9'a devredildi:** `TurkeyDay` `TimeZoneInfo`'ya dayanıyor. `Turkey` alanı
>    `static readonly` bir initializer olduğu için, çok ince bir container imajında saat
>    dilimi veritabanı (tzdata/ICU) yoksa çalışma anında düz bir `TimeZoneNotFoundException`
>    ALINMAZ — bu, o tipi ilk kullanan istek anında fırlayan bir `TypeInitializationException`
>    içine sarılır ve tip o andan sonra süreç ömrü boyunca kalıcı olarak bozuk kalır (her
>    sonraki oturum isteği de 500 döner). Dağıtım imajı seçilirken kontrol edilmeli. **Önerilen
>    şekil (Dockerfile yazılınca):** `Turkey` alanını (ya da eşdeğer bir `TimeZoneInfo.FindSystemTimeZoneById`
>    çağrısını) uygulama başlangıcında bir kez çözüp doğrulamak — tıpkı var olan `Jwt:Key`
>    kontrolü gibi — eksik tzdata'nın ilk isteği değil BOOT'u başarısız kılması için. Bugün
>    henüz bir Dockerfile olmadığından bu kontrol UYGULANMADI, sadece not düşüldü.
> 4. **Bilinçli davranış:** açık bir oturum varken `POST /api/sessions` gövdedeki
>    `templateId`/`notes` değerlerini UYGULAMAZ, var olan oturumu olduğu gibi döndürür — açık
>    bir oturumu sessizce değiştirmek fark edilmeyen bir veri kaybı olurdu.
> 5. **KAPANDI (Faz 8, Görev 5):** önerilen seam aynen uygulandı —
>    `IWorkoutSessionRepository`/`WorkoutSessionService`'e entity döndüren ve BİLEREK
>    `SaveChangesAsync` ÇAĞIRMAYAN bir `GetOrOpenTodayAsync(...)` eklendi;
>    `SetEntryService.CreateAsync` bu seam'i çağırıp oturumu (gerekirse) ve yeni
>    `SetEntry`'yi TEK `SaveChangesAsync` altında commit ediyor.

## Faz 8 — Feature: SetEntry + PR motoru  ⭐ (projenin kalbi)
- [x] 8.1 `RecordTracker` (CLAUDE.md'deki `PersonalRecordCalculator`'ın bu kod tabanındaki
      adı — bkz. Görev 1 isimlendirme notu): saf, veri erişimsiz çekirdek `Apply(...)`
      yardımcısı; ağırlık kovaları ondalık ölçek farklarına duyarsız (`0`/`0.0`/`0.00` aynı
      kova). `PersonalRecordService.EvaluateNewAsync` (ekleme akışı) ve `RecalculateAsync`
      (yeniden hesaplama akışı) İKİSİ DE aynı `Apply` fonksiyonunu çağırır (DRY) —
      `RecordTrackerTests` (10 test, saf fonksiyon, DB'siz).
- [x] 8.2 Set ekleme: `SetEntryService.CreateAsync` → `WorkoutSessionService
      .GetOrOpenTodayAsync` (Görev 5, yukarıdaki devreden not 5) ile bugüne ait açık oturumu
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
      (`RecordsController` → `PersonalRecordService.GetAllTimeAsync`), mevcut `SetEntry`'den
      bellekte gruplanarak sorgulanır, yeni veri gerektirmez; hiç seti olmayan egzersiz
      listede yer almaz.
- [x] 8.5 Test (en kapsamlı, 7 görev boyunca): saf çekirdek (`RecordTrackerTests`, 10),
      repository (`SetEntryRepositoryTests`, 12 — kronoloji, sahiplik, `GetOwnedByIdAsync`,
      distinct egzersiz idleri), servis (`PersonalRecordServiceTests` 10 +
      `SetEntryServiceTests` 19 — ilk set/ağırlık rekoru, aynı ağırlıkta tekrar rekoru,
      eşitlik rekor DEĞİL, arşivlenmiş egzersize red, IDOR, ortadaki setin düzeltilmesinin
      sonraki setleri yeniden hesaplaması, rekor taşıyan setin silinince sonrakinin terfi
      etmesi) ve uçtan uca (`SetEndpointsTests`, 19 — 401, 201 + ağırlık/tekrar rekoru,
      indirme seti rozet almaz, oturum listeleme + IDOR 404, PATCH ile yeniden hesap, DELETE
      ile terfi, `GET /api/records` özeti, arşiv 400, egzersiz bulunamadı 404, sıfır tekrar
      400, egzersiz alanı atlanınca 400, set eklenince Faz 7'nin ilerleme sayacının ilk kez
      gerçekten hareket etmesi, bu görevde +19). Toplam 382 test yeşil (309 → +73, Faz 8
      boyunca). `PUT` YOK (spec Soru 3/A) — yalnızca `PATCH`.

> **Faz 8'den devreden notlar (Faz 9'da dikkat edilecek):**
> 1. `PATCH /api/sets/{id}` ile `Rir` temizlenemiyor (`null` = "dokunma", `PatchSetRequest`
>    ile aynı sözleşme). Gerçek ihtiyaç çıkarsa ele alınacak.
> 2. Geçmişe dönük set girişi yok: `POST /api/sets` her zaman BUGÜNÜN açık oturumuna yazar.
> 3. `GET /api/records` gruplama işini bellekte yapıyor; kullanıcı başına rekor satırı sayısı
>    binlere çıkarsa SQL tarafına taşınmalı.

## Faz 9 — Feature: Sorgular
- [ ] 9.1 Antrenman geçmişi: tarih aralığı + egzersiz filtresi, sayfalama
- [ ] 9.2 Takvim/katılım: `StartedAt` UTC → TR yerel güne çevrilip gruplanır; toplam gün,
      streak (yeni tablo YOK)
- [ ] 9.3 Hacim: set / oturum / egzersiz bazında (Weight × Reps)
- [ ] 9.4 Test: gece yarısı sınırı, streak kopması

## Faz 10 — Feature: BodyWeightLog
- [ ] 10.1 CRUD + tarih aralığı sorgusu
- [ ] 10.2 Hacim/performansla aynı zaman ekseninde karşılaştırma endpoint'i

## Faz 11 — Feature: Export
- [ ] 11.1 Ham JSON export (tarih aralığı parametreli)
- [ ] 11.2 AI-özet formatı: okunabilir düz metin (yapıştırılabilir)
- [ ] 11.3 Formatlama mantığı servis katmanında, controller sadece dönüş yapar

## Faz 12 — Feature: AiInsight altyapısı
- [ ] 12.1 `AiInsight` CRUD/okuma; `Kind`, `WorkoutSessionId`, `SetEntryId` kapsamları
- [ ] 12.2 `IAiInsightProvider` soyutlaması + `NullProvider` (varsayılan kapalı)
- [ ] 12.3 Gerçek LLM çağrısı transaction DIŞINDA (CLAUDE.md uyarısı) — aktivasyon
      maliyet netleşince

## Faz 13 — Feature: Hesap silme
> Buraya konumlandırıldı çünkü kullanıcıya ait TÜM tablolar var olmadan doğru yazılamaz.
> Tüm FK'ler `User`'a RESTRICT olduğu için silme, DB cascade'ine bırakılmaz — Service
> katmanında bilinçli ve sıralı yapılır (bkz. persistence spec §3).
- [ ] 13.0 Soru: soft delete mi (hesap pasifleşir, veri durur) yoksa hard delete mi
      (veri tamamen silinir)? Faz başında sorulacak, varsayım yapılmayacak
- [ ] 13.1 Silme sırası tek transaction'da: SetEntry → WorkoutSession → TemplateExercise →
      WorkoutTemplate → ExerciseMedia → Exercise (yalnızca UserId = kullanıcı olanlar) →
      BodyWeightLog → AiInsight → User
- [ ] 13.2 Global egzersizlere (`UserId = null`) dokunulmadığının testi
- [ ] 13.3 Başka kullanıcının verisinin etkilenmediğinin testi
- [ ] 13.4 Endpoint: DELETE /api/auth/me (şifre teyidi ile)

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
