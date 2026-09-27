using Grind.Api.Models.Entities;
using Grind.Api.Services.Ai;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class AiInsightTranslationConfiguration : IEntityTypeConfiguration<AiInsightTranslation>
{
    public void Configure(EntityTypeBuilder<AiInsightTranslation> builder)
    {
        builder.ToTable("AiInsightTranslations");

        builder.Property(t => t.Language).HasMaxLength(InsightLanguages.MaxCodeLength).IsRequired();
        builder.Property(t => t.Content).IsRequired();

        // Çeviri yorumun parçasıdır (composition): yorum silinince arkada öksüz satır kalmaz.
        builder.HasOne(t => t.AiInsight)
            .WithMany(a => a.Translations)
            .HasForeignKey(t => t.AiInsightId)
            .OnDelete(DeleteBehavior.Cascade);

        // Bir yorumun bir dilde TEK metni olur.
        builder.HasIndex(t => new { t.AiInsightId, t.Language }).IsUnique();
    }
}
