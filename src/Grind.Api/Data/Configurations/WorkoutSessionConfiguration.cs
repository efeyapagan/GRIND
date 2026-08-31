using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class WorkoutSessionConfiguration : IEntityTypeConfiguration<WorkoutSession>
{
    public void Configure(EntityTypeBuilder<WorkoutSession> builder)
    {
        builder.HasOne(s => s.User)
            .WithMany(u => u.WorkoutSessions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Template)
            .WithMany(t => t.WorkoutSessions)
            .HasForeignKey(s => s.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => new { s.UserId, s.StartedAt });

        builder.ToTable(t =>
            t.HasCheckConstraint(
                "CK_WorkoutSession_EndedAt_After_StartedAt",
                "\"EndedAt\" IS NULL OR \"EndedAt\" > \"StartedAt\""));
    }
}
