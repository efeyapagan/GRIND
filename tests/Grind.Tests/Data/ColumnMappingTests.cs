using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class ColumnMappingTests
{
    [Fact]
    public void Tum_enum_property_leri_metne_donusturulur()
    {
        var enumProperties = TestModel.AllProperties()
            .Where(p => (Nullable.GetUnderlyingType(p.ClrType) ?? p.ClrType).IsEnum)
            .ToArray();

        Assert.Equal(6, enumProperties.Length);

        foreach (var property in enumProperties)
        {
            var converter = property.GetValueConverter();
            Assert.NotNull(converter);
            Assert.Equal(typeof(string), converter.ProviderClrType);
            Assert.Equal("character varying(20)", property.GetColumnType());
        }
    }

    [Fact]
    public void Tum_datetime_property_leri_timestamptz_olur()
    {
        var dateTimeProperties = TestModel.AllProperties()
            .Where(p => (Nullable.GetUnderlyingType(p.ClrType) ?? p.ClrType) == typeof(DateTime))
            .ToArray();

        Assert.NotEmpty(dateTimeProperties);

        foreach (var property in dateTimeProperties)
            Assert.Equal("timestamp with time zone", property.GetColumnType());
    }

    [Fact]
    public void Agirlik_sutunlari_numeric_6_2_dir()
    {
        Assert.Equal("numeric(6,2)", TestModel.Entity<SetEntry>().FindProperty("Weight")!.GetColumnType());
        Assert.Equal("numeric(6,2)", TestModel.Entity<BodyWeightLog>().FindProperty("Weight")!.GetColumnType());
    }

    [Fact]
    public void Maliyet_sutunu_numeric_10_6_dir()
    {
        // LLM maliyetleri 0.000042 USD mertebesinde; iki ondalık her şeyi sıfırlardı.
        Assert.Equal("numeric(10,6)", TestModel.Entity<AiInsight>().FindProperty("EstimatedCostUsd")!.GetColumnType());
    }

    [Theory]
    [InlineData(typeof(User), "Username", 50)]
    [InlineData(typeof(User), "PasswordHash", 100)]
    [InlineData(typeof(Exercise), "Name", 100)]
    [InlineData(typeof(WorkoutTemplate), "Name", 100)]
    [InlineData(typeof(ExerciseMedia), "Url", 500)]
    [InlineData(typeof(AiInsight), "Model", 100)]
    public void Metin_sutunlari_beklenen_uzunlukta(Type entityClrType, string propertyName, int expectedLength)
    {
        var property = TestModel.Entity(entityClrType).FindProperty(propertyName)!;
        Assert.Equal(expectedLength, property.GetMaxLength());
        Assert.False(property.IsNullable);
    }

    [Theory]
    [InlineData(typeof(WorkoutSession), "Notes")]
    [InlineData(typeof(AiInsight), "Content")]
    public void Serbest_metin_sutunlari_sinirsizdir(Type entityClrType, string propertyName)
    {
        var property = TestModel.Entity(entityClrType).FindProperty(propertyName)!;
        Assert.Null(property.GetMaxLength());
        Assert.Equal("text", property.GetColumnType());
    }

    /// <summary>
    /// Yorumun kapsadığı TR günleri (Faz 12 spec Karar 3). Gün bir TARİHTİR, an değil: timestamptz
    /// olsaydı saat dilimi dönüşümü günü kaydırabilirdi. Suggestion satırlarında boş kalır.
    /// </summary>
    [Theory]
    [InlineData("RangeFrom")]
    [InlineData("RangeTo")]
    public void Yorum_araligi_nullable_date_sutunudur(string propertyName)
    {
        var property = TestModel.Entity<AiInsight>().FindProperty(propertyName)!;

        Assert.NotNull(property);
        Assert.Equal("date", property.GetColumnType());
        Assert.True(property.IsNullable);
    }

    /// <summary>
    /// Kolon varsayılanı 90 (migration mevcut satırlara bunu yazar). Sentinel -1: EF, 0'ı "değer
    /// verilmedi" sayıp kolon varsayılanına bırakmasın — 0 "sayaç yok" demek (bkz. yapılandırma).
    /// </summary>
    [Fact]
    public void Dinlenme_suresi_varsayilani_90_ve_sifir_acikca_yazilir()
    {
        var property = TestModel.Entity<TemplateExercise>().FindProperty(nameof(TemplateExercise.RestSeconds))!;

        Assert.NotNull(property);
        Assert.Equal(90, TemplateExercise.DefaultRestSeconds);
        Assert.Equal(TemplateExercise.DefaultRestSeconds, (int)property.GetDefaultValue()!);
        Assert.Equal(-1, (int)property.Sentinel!);
        Assert.False(property.IsNullable);
    }
}
