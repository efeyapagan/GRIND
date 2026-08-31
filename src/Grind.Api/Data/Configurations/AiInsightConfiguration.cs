using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Grind.Api.Data.Configurations;

public class AiInsightConfiguration : IEntityTypeConfiguration<AiInsight>
{
    public void Configure(EntityTypeBuilder<AiInsight> builder)
    {
        builder.Property(a => a.Kind).HasConversion(new EnumToStringConverter<AiInsightKind>()).HasMaxLength(20).IsRequired();
        builder.Property(a => a.Content).IsRequired();
        builder.Property(a => a.Model).HasMaxLength(100).IsRequired();
        builder.Property(a => a.EstimatedCostUsd).HasPrecision(10, 6);

        builder.HasOne(a => a.User)
            .WithMany(u => u.AiInsights)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.WorkoutSession)
            .WithMany(s => s.AiInsights)
            .HasForeignKey(a => a.WorkoutSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.SetEntry)
            .WithMany(s => s.AiInsights)
            .HasForeignKey(a => a.SetEntryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
