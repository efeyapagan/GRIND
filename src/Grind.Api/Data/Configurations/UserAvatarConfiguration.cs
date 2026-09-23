using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class UserAvatarConfiguration : IEntityTypeConfiguration<UserAvatar>
{
    public void Configure(EntityTypeBuilder<UserAvatar> builder)
    {
        // Fotoğraf kullanıcının parçasıdır (composition): kullanıcısız anlamsız. Kullanıcı bugün
        // hard-delete edilmez; ileride bir purge yazılırsa fotoğraf onunla gider.
        builder.HasOne(a => a.User)
            .WithOne()
            .HasForeignKey<UserAvatar>(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.UserId).IsUnique();

        builder.Property(a => a.Content).IsRequired();
        builder.Property(a => a.ContentType).HasMaxLength(20).IsRequired();
    }
}
