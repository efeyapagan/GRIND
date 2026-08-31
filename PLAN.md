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
| 4 | Feature: Auth | ⏳ sırada |
| 5 | Feature: Exercise (+ ExerciseMedia) | ☐ |
| 6 | Feature: WorkoutTemplate | ☐ |
| 7 | Feature: WorkoutSession | ☐ |
| 8 | Feature: SetEntry + PR motoru | ☐ |
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
- [ ] 4.1 DTO: RegisterRequest, LoginRequest, AuthResponse
- [ ] 4.2 `IAuthService` / `AuthService`: username lowercase normalizasyonu, BCrypt hash,
      username çakışma kontrolü → 409
- [ ] 4.3 `AuthController`: POST /api/auth/register, POST /api/auth/login
- [ ] 4.4 Test: kayıt, aynı username reddi (case-insensitive), hatalı şifre, token içeriği

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

## Faz 5 — Feature: Exercise (+ ExerciseMedia)
- [ ] 5.1 DTO + service: listeleme (global + kendi, arşivliler hariç), oluşturma,
      güncelleme, arşivleme (soft delete)
- [ ] 5.2 Yetkilendirme: global egzersiz düzenlenemez/arşivlenemez; başkasının egzersizi
      görünmez (IDOR koruması)
- [ ] 5.3 Aynı isim çakışması kontrolü (kendi + global set içinde)
- [ ] 5.4 ExerciseMedia CRUD — sahiplik kuralını Exercise'tan miras alır
- [ ] 5.5 Test: IDOR senaryoları, isim çakışması, arşiv sonrası liste

## Faz 6 — Feature: WorkoutTemplate
- [ ] 6.1 Template CRUD + `TemplateExercise` (OrderIndex, PlannedSets)
- [ ] 6.2 Template'e eklenen her ExerciseId için erişilebilirlik doğrulaması
- [ ] 6.3 Silme: TemplateExercise CASCADE, Session.TemplateId SET NULL
- [ ] 6.4 Test

## Faz 7 — Feature: WorkoutSession
- [ ] 7.1 Session başlat (template'li / template'siz), bitir (`EndedAt`), not ekle
- [ ] 7.2 "Bugüne ait açık session" mantığı — `EndedAt IS NULL` **ve** `StartedAt`
      TR yerel saatiyle bugün; yoksa yeni session (unutulan session'a set düşmesin)
- [ ] 7.3 Session silme → CASCADE sonrası etkilenen distinct egzersizler için tek sefer
      `RecalculateRecords`
- [ ] 7.4 İlerleme hesabı: gerçek SetEntry sayısı vs `PlannedSets`
- [ ] 7.5 Test: gün sınırı (gece 23:00 / ertesi gün), açık session bulma

## Faz 8 — Feature: SetEntry + PR motoru  ⭐ (projenin kalbi)
- [ ] 8.1 `PersonalRecordCalculator`: ortak `Evaluate(...)` yardımcısı; `AddSet` akışı ve
      `RecalculateRecords(userId, exerciseId)` aynı fonksiyonu çağırır (DRY)
- [ ] 8.2 Set ekleme: açık session bul/oluştur → PR değerlendir → tek `SaveChangesAsync`
- [ ] 8.3 Set güncelleme/silme → gerekirse `RecalculateRecords`
- [ ] 8.4 "Tüm zamanların rekorları" özet endpoint'i (mevcut SetEntry'den sorgu)
- [ ] 8.5 Test (en kapsamlı): ilk set, ağırlık rekoru, aynı ağırlıkta tekrar rekoru,
      eşitlik (rekor değil), rekor taşıyan setin silinmesi → yeniden hesap doğruluğu

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
