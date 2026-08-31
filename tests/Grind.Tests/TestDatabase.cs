using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests;

/// <summary>
/// Çalışan bir PostgreSQL ister (docker compose up -d). Kimlik bilgileri
/// docker-compose.yml'deki geliştirme değerleridir — gizli bilgi değildir.
/// </summary>
internal static class TestDatabase
{
    public const string ConnectionString =
        "Host=localhost;Port=5433;Database=grind;Username=grind;Password=grind_dev_password";

    public static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);

    /// <summary>Her çağrıda benzersiz kullanıcı adı — testler birbirini etkilemesin.</summary>
    public static User NewUser() => new()
    {
        Username = $"test_{Guid.NewGuid():N}",
        PasswordHash = "not-a-real-hash",
        CreatedAt = DateTime.UtcNow
    };

    public static WorkoutSession NewSession(User user) =>
        new() { User = user, StartedAt = DateTime.UtcNow };

    /// <summary><paramref name="owner"/> null ise global egzersiz üretir.</summary>
    public static Exercise NewExercise(User? owner, string name) => new()
    {
        User = owner,
        Name = name,
        Category = ExerciseCategory.Other,
        IsArchived = false
    };
}
