using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class DeleteBehaviorTests
{
    private static DeleteBehavior BehaviorOf<TDependent>(string foreignKeyPropertyName) =>
        TestModel.Entity<TDependent>()
            .GetForeignKeys()
            .Single(fk => fk.Properties.Any(p => p.Name == foreignKeyPropertyName))
            .DeleteBehavior;

    [Fact]
    public void Sablon_silinince_satirlari_de_silinir()
    {
        Assert.Equal(DeleteBehavior.Cascade, BehaviorOf<TemplateExercise>("WorkoutTemplateId"));
    }

    [Fact]
    public void Sablon_silinince_session_silinmez_referansi_bosalir()
    {
        Assert.Equal(DeleteBehavior.SetNull, BehaviorOf<WorkoutSession>("TemplateId"));
    }

    [Fact]
    public void Session_silinince_setleri_de_silinir()
    {
        Assert.Equal(DeleteBehavior.Cascade, BehaviorOf<SetEntry>("WorkoutSessionId"));
    }

    [Fact]
    public void Egzersiz_gecmis_kayitlari_tutuyorsa_silinemez()
    {
        // Exercise hard-delete edilmiyor (IsArchived kullanılıyor). Yine de kazara bir
        // silme denemesi sessizce geçmişi uçurmak yerine hata vermelidir.
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<SetEntry>("ExerciseId"));
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<TemplateExercise>("ExerciseId"));
    }

    [Fact]
    public void Egzersiz_silinince_medyasi_da_silinir()
    {
        Assert.Equal(DeleteBehavior.Cascade, BehaviorOf<ExerciseMedia>("ExerciseId"));
    }

    [Fact]
    public void Kullanicinin_ozel_egzersizi_global_egzersize_donusemez()
    {
        // EF'in nullable FK için varsayılanı SET NULL'dır. Öyle kalsaydı bir kullanıcı
        // silindiğinde özel egzersizleri UserId = null olur, yani HERKESE görünen global
        // egzersize dönüşürdü. Bu testin koruduğu şey budur.
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<Exercise>("UserId"));
    }

    [Fact]
    public void Kullaniciya_bagli_hicbir_kayit_cascade_ile_silinmez()
    {
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<WorkoutTemplate>("UserId"));
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<WorkoutSession>("UserId"));
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<BodyWeightLog>("UserId"));
        Assert.Equal(DeleteBehavior.Restrict, BehaviorOf<AiInsight>("UserId"));
    }

    [Fact]
    public void Ai_yorumu_kapsami_silinse_de_korunur()
    {
        // AiInsight aynı zamanda maliyet kaydıdır; session silindi diye harcama geçmişi
        // kaybolmamalı.
        Assert.Equal(DeleteBehavior.SetNull, BehaviorOf<AiInsight>("WorkoutSessionId"));
        Assert.Equal(DeleteBehavior.SetNull, BehaviorOf<AiInsight>("SetEntryId"));
    }
}
