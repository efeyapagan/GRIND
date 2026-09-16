using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Username).HasMaxLength(50).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(100).IsRequired();

        builder.HasIndex(u => u.Username).IsUnique();

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_User_WeeklyTargetDays_Range",
            "\"WeeklyTargetDays\" IS NULL OR (\"WeeklyTargetDays\" >= 1 AND \"WeeklyTargetDays\" <= 7)"));
    }
}
