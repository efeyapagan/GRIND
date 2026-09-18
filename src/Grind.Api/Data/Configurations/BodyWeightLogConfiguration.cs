using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class BodyWeightLogConfiguration : IEntityTypeConfiguration<BodyWeightLog>
{
    public void Configure(EntityTypeBuilder<BodyWeightLog> builder)
    {
        // Ucu de Weight'le AYNI olcekte (6,2): WeightScale.EnsureAtMostTwoDecimals servis
        // katmaninda tum uc alan icin de kullaniliyor -- olcek uyusmazsa PostgreSQL doğrulanmış
        // bir degeri sessizce yuvarlar (WeightScale'in kendi onlemeye calistigi tam o hata).
        builder.Property(b => b.Weight).HasPrecision(6, 2);
        builder.Property(b => b.BodyFatPercent).HasPrecision(6, 2);
        builder.Property(b => b.WaistCm).HasPrecision(6, 2);

        builder.HasOne(b => b.User)
            .WithMany(u => u.BodyWeightLogs)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(b => new { b.UserId, b.RecordedAt });

        // NULL bir CHECK'i ihlal ETMEZ (Postgres NULL'u "bilinmiyor" sayar) -- bu yuzden ucu de
        // opsiyonel alan icin ayni kisit yeterli (issue #119: bir kayitta yalnizca bazi olcular
        // girilebilir).
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_BodyWeightLog_Weight_Positive", "\"Weight\" > 0");
            t.HasCheckConstraint("CK_BodyWeightLog_BodyFatPercent_Positive", "\"BodyFatPercent\" > 0");
            t.HasCheckConstraint("CK_BodyWeightLog_WaistCm_Positive", "\"WaistCm\" > 0");
        });
    }
}
