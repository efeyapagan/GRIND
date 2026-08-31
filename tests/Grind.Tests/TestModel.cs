using Grind.Api.Data;
using Microsoft.EntityFrameworkCore;
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
        return context.Model;
    });

    public static IModel Model => Lazy.Value;

    public static IEntityType Entity<T>() => Entity(typeof(T));

    public static IEntityType Entity(Type clrType) =>
        Model.FindEntityType(clrType)
        ?? throw new InvalidOperationException($"'{clrType.Name}' modelde bulunamadı.");

    public static IEnumerable<IProperty> AllProperties() =>
        Model.GetEntityTypes().SelectMany(e => e.GetProperties());
}
