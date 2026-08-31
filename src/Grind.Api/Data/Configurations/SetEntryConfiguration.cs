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
    }
}
