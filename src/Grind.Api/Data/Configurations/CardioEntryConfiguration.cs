using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class CardioEntryConfiguration : IEntityTypeConfiguration<CardioEntry>
{
    public void Configure(EntityTypeBuilder<CardioEntry> builder)
    {
        builder.Property(c => c.SpeedKmh).HasPrecision(4, 1);
        builder.Property(c => c.InclinePercent).HasPrecision(4, 1);
        builder.Property(c => c.DistanceKm).HasPrecision(6, 3);

        builder.HasOne(c => c.WorkoutSession)
            .WithMany(w => w.CardioEntries)
            .HasForeignKey(c => c.WorkoutSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Exercise)
            .WithMany(e => e.CardioEntries)
            .HasForeignKey(c => c.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => new { c.ExerciseId, c.WorkoutSessionId });
        // Bir antrenmanda aynı anda tek akan kardiyo: ikinci Başlat 409'a çevrilir, yarışta veritabanı tutar.
        builder.HasIndex(c => c.WorkoutSessionId)
            .IsUnique()
            .HasFilter("\"DurationSeconds\" IS NULL")
            .HasDatabaseName("IX_CardioEntries_WorkoutSessionId_Running");
        builder.HasIndex(c => new { c.WorkoutSessionId, c.ClientRequestId })
            .IsUnique()
            .HasFilter("\"ClientRequestId\" IS NOT NULL");

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_CardioEntry_Duration_Positive", "\"DurationSeconds\" IS NULL OR \"DurationSeconds\" > 0"));
    }
}
