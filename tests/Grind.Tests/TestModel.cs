using Grind.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Grind.Tests;

/// <summary>
/// Modeli bir kez kurar ve testlere sunar. Npgsql sağlayıcısı kullanılır ama
/// veritabanına HİÇ bağlanılmaz — EF Core modeli bağlantı açmadan oluşturur.
/// </summary>
internal static class TestModel
{
    private static readonly Lazy<IModel> Lazy = new(() =>
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=grind_model_only")
            .Options;
        using var context = new AppDbContext(options);

        // context.Model, sorgu çalıştırma için optimize edilmiş, "finalize edilmiş"
        // (runtime) modeli döner; bu model yalnızca sorgu motorunun ihtiyaç duyduğu
        // özellikleri taşır ve DDL'e özgü bazı sağlayıcı annotation'larını (örn. Npgsql'in
        // NULLS NOT DISTINCT ayarı) düşürür. Migration'ların gerçekte kullandığı model
        // "design-time model"dir (IDesignTimeModel) — index/kısıt testleri şemanın
        // GERÇEKTE ne üreteceğini bu modelden okumalı.
        return context.GetService<IDesignTimeModel>().Model;
    });

    public static IModel Model => Lazy.Value;

    public static IEntityType Entity<T>() => Entity(typeof(T));

    public static IEntityType Entity(Type clrType) =>
        Model.FindEntityType(clrType)
        ?? throw new InvalidOperationException($"'{clrType.Name}' modelde bulunamadı.");

    public static IEnumerable<IProperty> AllProperties() =>
        Model.GetEntityTypes().SelectMany(e => e.GetProperties());
}
