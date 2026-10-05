using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class WeeklyTargetChangeConfiguration : IEntityTypeConfiguration<WeeklyTargetChange>
{
    public void Configure(EntityTypeBuilder<WeeklyTargetChange> builder)
    {
        builder.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.UserId, c.EffectiveFromWeek }).IsUnique();

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_WeeklyTargetChange_TargetDays_Range",
            "\"TargetDays\" IS NULL OR (\"TargetDays\" >= 1 AND \"TargetDays\" <= 7)"));
    }
}
