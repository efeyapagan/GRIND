using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class MutedNotificationCategoryConfiguration : IEntityTypeConfiguration<MutedNotificationCategory>
{
    public void Configure(EntityTypeBuilder<MutedNotificationCategory> builder)
    {
        builder.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(m => m.Category)
            .HasConversion(new EnumToStringConverter<NotificationCategory>()).HasMaxLength(20).IsRequired();

        builder.HasIndex(m => new { m.UserId, m.Category }).IsUnique();
    }
}
