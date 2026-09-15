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
        new { Id = 15L, UserId = (long?)null, Name = "Leg Curl",                Category = ExerciseCategory.Legs, IsArchived = false },

        // #49: çekirdek/stabilite ve tutuş hareketleri Other; kalça menteşesi ve glute hareketleri Legs.
        new { Id = 16L, UserId = (long?)null, Name = "45 Back Focused Extension",                      Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 17L, UserId = (long?)null, Name = "45 Dumbbell Back Focused Extension",             Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 18L, UserId = (long?)null, Name = "45 Dumbbell Glute Focused Extension",            Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 19L, UserId = (long?)null, Name = "45 Dumbbell Single Leg Glute Focused Extension", Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 20L, UserId = (long?)null, Name = "Ab Rollout",                                     Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 21L, UserId = (long?)null, Name = "Air Box Squat",                                  Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 22L, UserId = (long?)null, Name = "Air Squat",                                      Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 23L, UserId = (long?)null, Name = "Alternating Dumbbell Curl",                      Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 24L, UserId = (long?)null, Name = "Banded Push Up",                                 Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 25L, UserId = (long?)null, Name = "Barbell Ab Rollout",                             Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 26L, UserId = (long?)null, Name = "Barbell Box Squat",                              Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 27L, UserId = (long?)null, Name = "Barbell Floor Press",                            Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 28L, UserId = (long?)null, Name = "Barbell Front Squat",                            Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 29L, UserId = (long?)null, Name = "Barbell Glute Bridge",                           Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 30L, UserId = (long?)null, Name = "Barbell Good Morning",                           Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 31L, UserId = (long?)null, Name = "Barbell Hip Thrust",                             Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 32L, UserId = (long?)null, Name = "Barbell Hold",                                   Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 33L, UserId = (long?)null, Name = "Barbell Overhead Press",                         Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 34L, UserId = (long?)null, Name = "Barbell Overhead Squat",                         Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 35L, UserId = (long?)null, Name = "Cable Front Raise",                              Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 36L, UserId = (long?)null, Name = "Cable Glute Pullthrough",                        Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 37L, UserId = (long?)null, Name = "Cable High to Low Chop",                         Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 38L, UserId = (long?)null, Name = "Cable Hip Abduction",                            Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 39L, UserId = (long?)null, Name = "Cable Hip Adduction",                            Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 40L, UserId = (long?)null, Name = "Cable Kickback",                                 Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 41L, UserId = (long?)null, Name = "Cable Lateral Raise",                            Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 42L, UserId = (long?)null, Name = "Cable Low to High Chop",                         Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 43L, UserId = (long?)null, Name = "Cable Overhead Extension",                       Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 44L, UserId = (long?)null, Name = "Cable Pallof Hold",                              Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 45L, UserId = (long?)null, Name = "Machine Assisted Dips",                          Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 46L, UserId = (long?)null, Name = "Machine Assisted Pull Up",                       Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 47L, UserId = (long?)null, Name = "Machine Back Extension",                         Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 48L, UserId = (long?)null, Name = "Machine Glute Kickback",                         Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 49L, UserId = (long?)null, Name = "Machine Lateral Raise",                          Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 50L, UserId = (long?)null, Name = "Machine Overhead Press",                         Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 51L, UserId = (long?)null, Name = "Machine Pulldown",                               Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 52L, UserId = (long?)null, Name = "Machine Seated Hip Abduction",                   Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 53L, UserId = (long?)null, Name = "Machine Seated Hip Adduction",                   Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 54L, UserId = (long?)null, Name = "Med Ball Rotational Throw",                      Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 55L, UserId = (long?)null, Name = "Miniband Hip Abduction",                         Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 56L, UserId = (long?)null, Name = "Seated Cable Face Pull",                         Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 57L, UserId = (long?)null, Name = "Seated Cable Row",                               Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 58L, UserId = (long?)null, Name = "Seated Calf Raise",                              Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 59L, UserId = (long?)null, Name = "Seated Dumbbell Shoulder Press",                 Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 60L, UserId = (long?)null, Name = "Seated Leg Curl",                                Category = ExerciseCategory.Legs,  IsArchived = false },
        new { Id = 61L, UserId = (long?)null, Name = "Side Plank",                                     Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 62L, UserId = (long?)null, Name = "Side Plank Rotation",                            Category = ExerciseCategory.Other, IsArchived = false },
        new { Id = 63L, UserId = (long?)null, Name = "Single Arm Banded OHP",                          Category = ExerciseCategory.Push,  IsArchived = false },
        new { Id = 64L, UserId = (long?)null, Name = "Single Arm Banded Row",                          Category = ExerciseCategory.Pull,  IsArchived = false },
        new { Id = 65L, UserId = (long?)null, Name = "Single Arm Barbell Hold",                        Category = ExerciseCategory.Other, IsArchived = false }
    ];
}
