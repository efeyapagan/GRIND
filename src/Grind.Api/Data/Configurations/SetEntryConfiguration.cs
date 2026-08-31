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
        builder.Property(s => s.RecordType).HasConversion(new EnumToStringConverter<RecordType>()).HasMaxLength(20).IsRequired();

        builder.HasOne(s => s.WorkoutSession)
            .WithMany(w => w.SetEntries)
            .HasForeignKey(s => s.WorkoutSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Exercise)
            .WithMany(e => e.SetEntries)
            .HasForeignKey(s => s.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
