using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Username).HasMaxLength(50).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(100).IsRequired();
        builder.Property(u => u.DisplayName).HasMaxLength(50);

        // Uzunluk (20) projedeki diğer enum-metin kolonlarıyla aynı (bkz. WorkoutSessionConfiguration).
        builder.Property(u => u.PrivacyLevel)
            .HasConversion(new EnumToStringConverter<PrivacyLevel>())
            .HasMaxLength(20)
            .HasDefaultValue(PrivacyLevel.Kisitli)
            .IsRequired();

        builder.HasIndex(u => u.Username).IsUnique();

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_User_WeeklyTargetDays_Range",
            "\"WeeklyTargetDays\" IS NULL OR (\"WeeklyTargetDays\" >= 1 AND \"WeeklyTargetDays\" <= 7)"));
    }
}
