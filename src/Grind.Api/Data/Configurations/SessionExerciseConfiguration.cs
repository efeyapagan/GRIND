using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class SessionExerciseConfiguration : IEntityTypeConfiguration<SessionExercise>
{
    public void Configure(EntityTypeBuilder<SessionExercise> builder)
    {
        // Antrenmansiz anlamsiz (composition): antrenman silinince listesi de gider.
        builder.HasOne(se => se.WorkoutSession)
            .WithMany(s => s.SessionExercises)
            .HasForeignKey(se => se.WorkoutSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Egzersiz hard-delete edilmez (arsivlenir); gecmis referanslar korunur.
        builder.HasOne(se => se.Exercise)
            .WithMany(e => e.SessionExercises)
            .HasForeignKey(se => se.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ayni hareket bir antrenmanda iki kez olamaz. Servis de kontrol eder; bu son savunma hatti.
        builder.HasIndex(se => new { se.WorkoutSessionId, se.ExerciseId }).IsUnique();

        builder.Property(se => se.RestSeconds)
            .HasDefaultValue(TemplateExercise.DefaultRestSeconds)
            // TemplateExercise ile ayni sebep: 0 "sayac yok" demek, CLR varsayilani sayilmamali.
            .HasSentinel(-1);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "CK_SessionExercise_PlannedSets_Positive", "\"PlannedSets\" IS NULL OR \"PlannedSets\" > 0");
            t.HasCheckConstraint(
                "CK_SessionExercise_RestSeconds_Range", "\"RestSeconds\" >= 0 AND \"RestSeconds\" <= 900");
        });
    }
}
