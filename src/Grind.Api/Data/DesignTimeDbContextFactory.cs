using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Grind.Api.Data;

/// <summary>
/// `dotnet ef` komutları için tasarım zamanı DbContext üretir.
/// Bu fabrika olmasaydı EF, Program.cs'i çalıştırıp tüm uygulama host'unu kurardı — ve
/// AddCrossCutting'in fail-fast Jwt:Key kontrolüne takılırdı. Migration üretmek/uygulamak
/// bir imzalama anahtarına ihtiyaç duymamalı: burada YALNIZCA connection string okunur.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets<DesignTimeDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Postgres tanımlı değil. Değeri user-secrets veya " +
                "ConnectionStrings__Postgres ortam değişkeninden verin.");
        }

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options);
    }
}
