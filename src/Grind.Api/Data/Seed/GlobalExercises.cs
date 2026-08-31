using Grind.Api.Models.Enums;

namespace Grind.Api.Data.Seed;

/// <summary>
/// Varsayılan (global) egzersizler — <c>UserId = null</c>, herkeste görünür.
/// Anonim nesneler kullanılır: <c>HasData</c>, navigation property'leri dolu olan entity
/// örneklerini reddeder ve entity'lerimizde koleksiyonlar <c>= []</c> ile başlatılmıştır.
/// </summary>
public static class GlobalExercises
{
    public static readonly object[] All =
    [
        new { Id = 1L,  UserId = (long?)null, Name = "Bench Press",             Category = ExerciseCategory.Push, IsArchived = false },
        new { Id = 2L,  UserId = (long?)null, Name = "Incline Dumbbell Press",  Category = ExerciseCategory.Push, IsArchived = false },
        new { Id = 3L,  UserId = (long?)null, Name = "Overhead Press",          Category = ExerciseCategory.Push, IsArchived = false },
        new { Id = 4L,  UserId = (long?)null, Name = "Dips",                    Category = ExerciseCategory.Push, IsArchived = false },
        new { Id = 5L,  UserId = (long?)null, Name = "Triceps Pushdown",        Category = ExerciseCategory.Push, IsArchived = false },
        new { Id = 6L,  UserId = (long?)null, Name = "Pull-up",                 Category = ExerciseCategory.Pull, IsArchived = false },
        new { Id = 7L,  UserId = (long?)null, Name = "Barbell Row",             Category = ExerciseCategory.Pull, IsArchived = false },
        new { Id = 8L,  UserId = (long?)null, Name = "Lat Pulldown",            Category = ExerciseCategory.Pull, IsArchived = false },
        new { Id = 9L,  UserId = (long?)null, Name = "Barbell Curl",            Category = ExerciseCategory.Pull, IsArchived = false },
        new { Id = 10L, UserId = (long?)null, Name = "Face Pull",               Category = ExerciseCategory.Pull, IsArchived = false },
        new { Id = 11L, UserId = (long?)null, Name = "Squat",                   Category = ExerciseCategory.Legs, IsArchived = false },
        new { Id = 12L, UserId = (long?)null, Name = "Deadlift",                Category = ExerciseCategory.Legs, IsArchived = false },
        new { Id = 13L, UserId = (long?)null, Name = "Romanian Deadlift",       Category = ExerciseCategory.Legs, IsArchived = false },
        new { Id = 14L, UserId = (long?)null, Name = "Leg Press",               Category = ExerciseCategory.Legs, IsArchived = false },
        new { Id = 15L, UserId = (long?)null, Name = "Leg Curl",                Category = ExerciseCategory.Legs, IsArchived = false }
    ];
}
