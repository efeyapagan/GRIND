using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class SetEntryConfiguration : IEntityTypeConfiguration<SetEntry>
{
    public void Configure(EntityTypeBuilder<SetEntry> builder)
    {
        builder.Property(s => s.Weight).HasPrecision(6, 2);
        // #266: yarım adımlı (2.5 = "2–3 arası"). (4,1): #266 öncesi RIR 100'e kadar girilebiliyordu,
        // o kayıtlar dönüşümde taşmasın. Üst sınır (5) DTO'da; eski büyük değerler silinmez, "4+" görünür.
        builder.Property(s => s.Rir).HasPrecision(4, 1);
        builder.Property(s => s.RecordType).HasConversion(new EnumToStringConverter<RecordType>()).HasMaxLength(20).IsRequired();

        builder.HasOne(s => s.WorkoutSession)
            .WithMany(w => w.SetEntries)
            .HasForeignKey(s => s.WorkoutSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Exercise)
            .WithMany(e => e.SetEntries)
            .HasForeignKey(s => s.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.ExerciseId, s.WorkoutSessionId });

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_SetEntry_Weight_NonNegative", "\"Weight\" >= 0");
            t.HasCheckConstraint("CK_SetEntry_Reps_Positive", "\"Reps\" > 0");
            t.HasCheckConstraint("CK_SetEntry_Rir_NonNegative", "\"Rir\" IS NULL OR \"Rir\" >= 0");
        });
    }
}
