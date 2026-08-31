using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;

namespace Grind.Tests.Common;

public class OwnershipGuardTests
{
    private const long Me = 42;
    private const long SomeoneElse = 99;

    [Fact]
    public void Global_kayit_herkese_gorunur()
    {
        Assert.True(OwnershipGuard.IsVisibleTo(null, Me));
        Assert.True(OwnershipGuard.IsVisibleTo(null, SomeoneElse));
    }

    [Fact]
    public void Kendi_kaydim_bana_gorunur()
    {
        Assert.True(OwnershipGuard.IsVisibleTo(Me, Me));
    }

    [Fact]
    public void Baskasinin_kaydi_bana_gorunmez()
    {
        Assert.False(OwnershipGuard.IsVisibleTo(SomeoneElse, Me));
    }

    [Fact]
    public void Global_kayit_kimsenin_MALI_degildir()
    {
        // Görünürlük ile sahiplik farkı: global egzersizi görebilirim ama değiştiremem.
        Assert.False(OwnershipGuard.IsOwnedBy(null, Me));
    }

    [Fact]
    public void Kendi_kaydim_benim_malimdir()
    {
        Assert.True(OwnershipGuard.IsOwnedBy(Me, Me));
    }

    [Fact]
    public void EnsureOwnedBy_kendi_kaydimda_gecer()
    {
        OwnershipGuard.EnsureOwnedBy(Me, Me, "Egzersiz");
    }

    [Fact]
    public void EnsureOwnedBy_global_kayitta_ForbiddenException_firlatir()
    {
        var exception = Assert.Throws<ForbiddenException>(
            () => OwnershipGuard.EnsureOwnedBy(null, Me, "Egzersiz"));

        Assert.Contains("Egzersiz", exception.Message);
    }

    [Fact]
    public void EnsureOwnedBy_baskasinin_kaydinda_ForbiddenException_firlatir()
    {
        Assert.Throws<ForbiddenException>(
            () => OwnershipGuard.EnsureOwnedBy(SomeoneElse, Me, "Egzersiz"));
    }
}
