using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class ModelShapeTests
{
    [Fact]
    public void Model_tam_olarak_on_iki_entity_icerir()
    {
        var actual = TestModel.Model.GetEntityTypes()
            .Select(e => e.ClrType.Name)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        // SessionExercise: antrenmanin hareket listesi (#60/#62). Follow: takip sistemi (#281).
        // UserAvatar: profil fotografi (#280).
        string[] expected =
        [
            "AiInsight", "BodyWeightLog", "Exercise", "ExerciseMedia", "Follow", "SessionExercise", "SetEntry",
            "TemplateExercise", "User", "UserAvatar", "WorkoutSession", "WorkoutTemplate"
        ];

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Tum_primary_key_ler_long_tipindedir()
    {
        foreach (var entityType in TestModel.Model.GetEntityTypes())
        {
            var key = entityType.FindPrimaryKey();
            Assert.NotNull(key);
            var keyProperty = Assert.Single(key.Properties);
            Assert.Equal("Id", keyProperty.Name);
            Assert.Equal(typeof(long), keyProperty.ClrType);
        }
    }

    [Fact]
    public void SetEntry_uzerinde_UserId_alani_yoktur()
    {
        // Sahiplik WorkoutSession.UserId üzerinden türetilir; SetEntry'ye UserId
        // eklemek 3NF'i ihlal ederdi (spec §2).
        Assert.Null(TestModel.Entity<SetEntry>().FindProperty("UserId"));
    }
}
