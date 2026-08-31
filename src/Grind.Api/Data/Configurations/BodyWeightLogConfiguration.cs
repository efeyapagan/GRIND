using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class BodyWeightLogConfiguration : IEntityTypeConfiguration<BodyWeightLog>
{
    public void Configure(EntityTypeBuilder<BodyWeightLog> builder)
    {
        builder.Property(b => b.Weight).HasPrecision(6, 2);
    }
}
