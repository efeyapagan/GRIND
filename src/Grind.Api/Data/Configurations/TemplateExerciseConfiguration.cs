using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class TemplateExerciseConfiguration : IEntityTypeConfiguration<TemplateExercise>
{
    public void Configure(EntityTypeBuilder<TemplateExercise> builder)
    {
        builder.HasOne(te => te.WorkoutTemplate)
            .WithMany(t => t.TemplateExercises)
            .HasForeignKey(te => te.WorkoutTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(te => te.Exercise)
            .WithMany(e => e.TemplateExercises)
            .HasForeignKey(te => te.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(te => new { te.WorkoutTemplateId, te.OrderIndex });
    }
}
