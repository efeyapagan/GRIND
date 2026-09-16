using System.Globalization;
using System.Threading.RateLimiting;
using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Services;
using Grind.Api.Services.Ai;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPersistence(
    builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres tanımlı değil."));

builder.Services.AddCrossCutting(
    builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt bölümü tanımlı değil."),
    builder.Environment);

// Saat bir bağımlılık olarak enjekte edilir ki gün sınırı (TR yerel günü) mantığı sahte
// bir TimeProvider ile deterministik test edilebilsin. Bunu kullananlar: WorkoutSessionService,
// SetEntryService (Faz 8), StatsService (Faz 9, streak/takvim "bugün"ü için),
// BodyWeightLogService (Faz 10, gelecek zaman reddi için), ExportService (Faz 11, export'un
// oluşturulma anı için) ve AiInsightService (Faz 12, varsayılan aralığın "bugün"ü ve yorumun
// oluşturulma anı için) — ExerciseService ve
// WorkoutTemplateService hâlâ CreatedAt'i doğrudan DateTime.UtcNow'dan damgalıyor (o alan için
// gün sınırı gibi test edilmesi gereken bir karar yok).
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddApplicationServices();

// AI sağlayıcısı (Faz 12): varsayılan KAPALI (None → 503). Aktivasyon yalnızca yapılandırmayla:
// Ai:Provider = Anthropic + Ai:ApiKey (user-secrets). Anthropic seçiliyse eksik ayar BOOT'u durdurur;
// tanınmayan bir sağlayıcı adı zaten Get<AiSettings>() bağlamasında patlar.
builder.Services.AddAiInsightProvider(
    builder.Configuration.GetSection("Ai").Get<AiSettings>() ?? new AiSettings());

// Kaba kuvvet / DoS koruması (issue #74): sabit pencere, IP bazlı, KUYRUKSUZ. Kuyruğa almak
// DoS'u kötüleştirir -- pahalı olan zaten BCrypt'in kendisi (work factor 12, deneme başına
// ~220ms CPU); fazlası ANINDA 429 ile reddedilir. Bölümleme mantığı (IP anahtarı dahil)
// AuthRateLimiterPartitions'ta -- ASP.NET Core pipeline'ı kurmadan birim testiyle sınanabilsin
// diye buradan BİLEREK ayrı, saf bir fonksiyon.
var rateLimitSettings =
    builder.Configuration.GetSection("RateLimiting").Get<AuthRateLimitSettings>() ?? new AuthRateLimitSettings();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(RateLimitPolicies.Login,
        httpContext => AuthRateLimiterPartitions.Login(httpContext, rateLimitSettings));

    options.AddPolicy(RateLimitPolicies.Register,
        httpContext => AuthRateLimiterPartitions.Register(httpContext, rateLimitSettings));

    // Govde YAZILMAZ: AddProblemDetails() + UseStatusCodePages() zaten boş govdeli her hata
    // durumunu (bu da dahil) tutarlı bir RFC 7807 govdesine cevirir -- GlobalExceptionHandler'in
    // urettigi diger hatalarla ayni sekil (DRY, iki ayri JSON yazma yolu yok). Burada SADECE
    // Retry-After eklenir, cunku o standart govdenin parcasi degil, bir HTTP basligidir.
    options.OnRejected = (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        return ValueTask.CompletedTask;
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enum'lar tel üzerinde METİN taşınır ("Push"), sayı değil. Varsayılan
        // System.Text.Json bir enum'u metinden OKUYAMAZ (deneyle doğrulandı: JsonException),
        // ve sayı göndermek hem okunmaz hem de veritabanındaki metin gösterimiyle
        // (EnumToStringConverter) tutarsız olurdu.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Login'den dönen token'ı buraya yapıştırın (başına 'Bearer ' yazmayın)."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document), new List<string>() }
    });
});

var app = builder.Build();

// Pipeline'ın başında: altındaki her şeyi sarar.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();

// WebApplicationFactory<Program> (bkz. tests/Grind.Tests/Integration) Program sınıfının
// erişilebilir olmasını ister; top-level statements bunu üretmez, elle eklenmesi gerekir.
public partial class Program { }
