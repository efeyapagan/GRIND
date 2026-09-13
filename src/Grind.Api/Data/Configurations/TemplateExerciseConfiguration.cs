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

        builder.Property(te => te.RestSeconds)
            .HasDefaultValue(TemplateExercise.DefaultRestSeconds)
            // Sentinel -1: EF varsayılan olarak CLR'nin 0'ını "değer verilmedi" sayar ve INSERT'te
            // kolon varsayılanına (90) bırakır. Oysa 0 "sayaç yok" demek. -1 CHECK yüzünden hiçbir
            // zaman geçerli olmadığı için güvenli bir "atanmadı" işaretidir.
            .HasSentinel(-1);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_TemplateExercise_PlannedSets_Positive", "\"PlannedSets\" > 0");
            t.HasCheckConstraint(
                "CK_TemplateExercise_RestSeconds_Range", "\"RestSeconds\" >= 0 AND \"RestSeconds\" <= 900");
        });
    }
}
