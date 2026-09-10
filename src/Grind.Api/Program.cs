using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Services;
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

// Saat bir bağımlılık: servisler DateTime.UtcNow çağırmaz, bunu enjekte alır.
// Gün sınırı testleri ancak sahte bir sağlayıcıyla deterministik olabiliyor.
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddApplicationServices();
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
app.MapControllers();

app.Run();

// WebApplicationFactory<Program> (bkz. tests/Grind.Tests/Integration) Program sınıfının
// erişilebilir olmasını ister; top-level statements bunu üretmez, elle eklenmesi gerekir.
public partial class Program { }
