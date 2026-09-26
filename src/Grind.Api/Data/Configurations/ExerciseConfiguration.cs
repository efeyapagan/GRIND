using Grind.Api.Data.Seed;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.Property(e => e.Name).HasMaxLength(100).IsRequired();
        builder.Property(e => e.AlternateName).HasMaxLength(100);
        builder.Property(e => e.Category).HasConversion(new EnumToStringConverter<ExerciseCategory>()).HasMaxLength(20).IsRequired();
        // #413: Category ile aynı desen — adıyla saklanır, yeni bir ekipman türü migration gerektirmez
        // ama var olan adı değiştirmek eski satırları okunamaz yapar. Nullable: null = bilinmiyor.
        builder.Property(e => e.Equipment).HasConversion(new EnumToStringConverter<ExerciseEquipment>()).HasMaxLength(20);

        builder.HasOne(e => e.User)
            .WithMany(u => u.Exercises)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => new { e.UserId, e.Name })
            .IsUnique()
            .AreNullsDistinct(false);

        builder.Property(e => e.Id)
            .UseIdentityByDefaultColumn()
            .HasIdentityOptions(startValue: 1000);

        builder.HasData(GlobalExercises.All);
    }
}
