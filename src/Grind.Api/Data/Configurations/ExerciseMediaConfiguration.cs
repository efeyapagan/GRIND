using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class ExerciseMediaConfiguration : IEntityTypeConfiguration<ExerciseMedia>
{
    public void Configure(EntityTypeBuilder<ExerciseMedia> builder)
    {
        builder.Property(m => m.MediaType).HasConversion(new EnumToStringConverter<MediaType>()).HasMaxLength(20).IsRequired();
        builder.Property(m => m.Url).HasMaxLength(500).IsRequired();

        builder.HasOne(m => m.Exercise)
            .WithMany(e => e.Media)
            .HasForeignKey(m => m.ExerciseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
