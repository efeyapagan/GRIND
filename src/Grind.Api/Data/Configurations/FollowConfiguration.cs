using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class FollowConfiguration : IEntityTypeConfiguration<Follow>
{
    public void Configure(EntityTypeBuilder<Follow> builder)
    {
        // Kullanıcı hard-delete edilmez (Faz 13 soft delete); kazara bir silme takip ilişkilerini
        // sessizce uçurmak yerine hata vermeli.
        builder.HasOne(f => f.Follower)
            .WithMany()
            .HasForeignKey(f => f.FollowerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.Followee)
            .WithMany()
            .HasForeignKey(f => f.FolloweeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Benzersiz çift, "takip edilenler" sorgusunu da (FollowerId önekli) karşılar; takipçi
        // listesi FolloweeId'den okunduğu için onun ayrı indeksi var.
        builder.HasIndex(f => new { f.FollowerId, f.FolloweeId }).IsUnique();
        builder.HasIndex(f => f.FolloweeId);

        builder.ToTable(t => t.HasCheckConstraint("CK_Follow_NotSelf", "\"FollowerId\" <> \"FolloweeId\""));
    }
}
