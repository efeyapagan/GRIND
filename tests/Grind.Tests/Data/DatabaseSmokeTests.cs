using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

/// <summary>
/// Çalışan bir PostgreSQL ister (docker compose up -d). Kullanılan kimlik bilgileri
/// docker-compose.yml'deki geliştirme değerleridir — gizli bilgi değildir.
/// </summary>
[Trait("Category", "Database")]
public class DatabaseSmokeTests
{
    [Fact]
    public async Task Onbes_global_egzersiz_veritabaninda_mevcut()
    {
        await using var context = TestDatabase.CreateContext();

        var globals = await context.Exercises.Where(e => e.UserId == null).ToListAsync();

        Assert.Equal(15, globals.Count);
        Assert.Contains(globals, e => e.Name == "Bench Press");
    }

    [Fact]
    public async Task Sifir_kilo_set_kaydedilebilir()
    {
        // Barfiks: 0 kg. CHECK kısıtı ">= 0" olduğu için bu geçmelidir.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Users.Add(user);

        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);

        var entry = new SetEntry
        {
            WorkoutSession = session,
            ExerciseId = 6, // Pull-up
            Weight = 0m,
            Reps = 8,
            CreatedAt = DateTime.UtcNow
        };
        context.SetEntries.Add(entry);

        await context.SaveChangesAsync();
        Assert.True(entry.Id > 0);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Sifir_tekrarli_set_reddedilir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Users.Add(user);

        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);

        context.SetEntries.Add(new SetEntry
        {
            WorkoutSession = session,
            ExerciseId = 6,
            Weight = 0m,
            Reps = 0,
            CreatedAt = DateTime.UtcNow
        });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Kullanici_kayitlari_seed_id_leriyle_carpismaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Users.Add(user);

        var exercise = new Exercise
        {
            User = user,
            Name = "Cable Crossover",
            Category = ExerciseCategory.Push
        };
        context.Exercises.Add(exercise);

        await context.SaveChangesAsync();

        Assert.True(exercise.Id >= 1000, $"Beklenen >= 1000, gelen {exercise.Id}");
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Kind_utc_olmayan_zaman_damgasi_reddedilir()
    {
        // Spec §5 madde 11: bu davranışa güvenildiği için doğrulanır.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        user.CreatedAt = new DateTime(2026, 8, 31, 12, 0, 0, DateTimeKind.Unspecified);
        context.Users.Add(user);

        // Npgsql, timestamptz sütununa Kind != Utc bir DateTime yazma denemesini
        // ArgumentException ile reddeder — EF Core SaveChangesAsync bunu DbUpdateException'a
        // sarar, bu yüzden awaitteki Task'ten fırlayan tip DbUpdateException'dır ve asıl bulgu
        // (Npgsql'in attığı ArgumentException) InnerException'da durur. İkisi de deneysel
        // olarak doğrulandı (bkz. görev raporu) — yalnızca dış tipi değil, asıl bulguyu pinler.
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        Assert.IsType<ArgumentException>(exception.InnerException);
        await transaction.RollbackAsync();
    }
}
