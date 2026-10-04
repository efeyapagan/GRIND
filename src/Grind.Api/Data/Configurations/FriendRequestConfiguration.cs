using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> builder)
    {
        // Kullanıcı hard-delete edilmez (Faz 13); Follow ile aynı gerekçe.
        builder.HasOne(r => r.Requester)
            .WithMany()
            .HasForeignKey(r => r.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Target)
            .WithMany()
            .HasForeignKey(r => r.TargetId)
            .OnDelete(DeleteBehavior.Restrict);

        // Çift başına tek BEKLEYEN istek; eşzamanlı çift dokunuşu DB yakalar. Reddedilenler süzgeç dışında.
        builder.HasIndex(r => new { r.RequesterId, r.TargetId })
            .IsUnique()
            .HasFilter("\"RejectedAt\" IS NULL");
        builder.HasIndex(r => r.TargetId);

        builder.ToTable(t => t.HasCheckConstraint("CK_FriendRequest_NotSelf", "\"RequesterId\" <> \"TargetId\""));
    }
}
