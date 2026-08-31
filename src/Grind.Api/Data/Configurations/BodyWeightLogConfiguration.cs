using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class BodyWeightLogConfiguration : IEntityTypeConfiguration<BodyWeightLog>
{
    public void Configure(EntityTypeBuilder<BodyWeightLog> builder)
    {
        builder.Property(b => b.Weight).HasPrecision(6, 2);

        builder.HasOne(b => b.User)
            .WithMany(u => u.BodyWeightLogs)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(b => new { b.UserId, b.RecordedAt });

        builder.ToTable(t =>
            t.HasCheckConstraint("CK_BodyWeightLog_Weight_Positive", "\"Weight\" > 0"));
    }
}
