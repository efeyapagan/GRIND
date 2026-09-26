using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Grind.Api.Data.Configurations;

public class WorkoutTemplateConfiguration : IEntityTypeConfiguration<WorkoutTemplate>
{
    public void Configure(EntityTypeBuilder<WorkoutTemplate> builder)
    {
        builder.Property(t => t.Name).HasMaxLength(100).IsRequired();

        builder.HasOne(t => t.User)
            .WithMany(u => u.WorkoutTemplates)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ExerciseConfiguration'daki (UserId, Name) unique index'in aynısı: bir kullanıcı
        // aynı isimde iki şablon oluşturamaz (uygulama katmanındaki ön-kontrolü DB seviyesinde
        // arkalar — bkz. UnitOfWork'ün 23505 -> ConflictException çevirisi). Kapsam kasıtlı
        // dar: index ham Name üzerinde, Exercise'daki gibi case-insensitive DEĞİL — yani aynı
        // ada farklı harf büyüklüğüyle ("Push Day" / "PUSH DAY") ikinci bir satır DB seviyesinde
        // engellenmez (yalnızca uygulama katmanındaki EnsureNameFreeAsync ön-kontrolüyle
        // yakalanır, o da bir yarış koşuluna açıktır). Bunun için işlevsel bir lower(Name)
        // index'i gerekirdi ki bu, CLAUDE.md'nin yasakladığı elle migration düzenlemesi
        // gerektirir (EF Core Fluent API'de HasIndex ifadeler üzerinde doğrudan
        // desteklenmiyor) — bilinçli bir sınır, kazara bir eksiklik değil.
        builder.HasIndex(t => new { t.UserId, t.Name }).IsUnique();

        // Liste sorgusunun sırası (#344): OrderIndex, Name. TemplateExercise'daki
        // (WorkoutTemplateId, OrderIndex) index'iyle aynı gerekçe.
        builder.HasIndex(t => new { t.UserId, t.OrderIndex });
    }
}
