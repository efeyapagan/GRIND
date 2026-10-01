using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Entities;
using Grind.Tests;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Integration;

/// <summary>
/// Arkadaş sıralaması uç testlerinin ortak kurulumu (#418, #420): kayıt, arkadaşlık, antrenman,
/// hedef, gizlilik. İki test sınıfı kullanır -- sınıfların AYRI olmasının sebebi kayıt ucunun hız
/// sınırı: her sınıfın kendi <see cref="GrindApiFactory"/>'si, yani kendi kayıt bütçesi
/// (<see cref="GrindApiFactory.RelaxedRateLimit"/>) vardır ve bu testler test başına 2-3 kullanıcı
/// kaydeder. Tek sınıfta toplanınca bütçe aşılıyor ve testler 429 ile düşüyordu.
/// </summary>
internal static class ArkadasTestVerisi
{
    public const string Password = "yeterince-uzun-sifre";
    public const string Yol = "/api/social/weekly";

    private static string UniqueUsername() => $"fw_{Guid.NewGuid():N}"[..20];

    public static async Task<(HttpClient Client, string Username, long Id)> KayitliAsync(GrindApiFactory factory)
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = username, Password = Password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        await using var db = TestDatabase.CreateContext();
        var id = await db.Users.Where(u => u.Username == username).Select(u => u.Id).SingleAsync();
        return (client, username, id);
    }

    /// <summary>Karşılıklı takip = arkadaşlık (#281); iki yönü de kurar.</summary>
    public static async Task ArkadasYapAsync(HttpClient birinci, string birinciAd, HttpClient ikinci, string ikinciAd)
    {
        (await birinci.PostAsync($"/api/users/{ikinciAd}/follow", null)).EnsureSuccessStatusCode();
        (await ikinci.PostAsync($"/api/users/{birinciAd}/follow", null)).EnsureSuccessStatusCode();
    }

    /// <summary>Verilen TR gününde, seti olan bir antrenman yazar (seti olmayan oturum sayılmaz).</summary>
    /// <summary>
    /// Verilen TR gününde, seti olan BİTMİŞ bir antrenman yazar (#558'den beri `EndedAt` dolu --
    /// bitmemiş/açık bir oturumun sayılmaması gerekir, bkz. <see cref="AcikOturumSetliYazAsync"/>).
    /// </summary>
    public static async Task AntrenmanYazAsync(long userId, DateOnly gun, decimal agirlik = 100m, int tekrar = 5)
    {
        await using var db = TestDatabase.CreateContext();
        var (baslangic, _) = TurkeyDay.RangeForLocalDate(gun);
        var oturum = new WorkoutSession { UserId = userId, StartedAt = baslangic.AddHours(10), EndedAt = baslangic.AddHours(10).AddMinutes(45) };
        db.Add(oturum);
        await db.SaveChangesAsync();
        db.Add(new SetEntry
        {
            WorkoutSessionId = oturum.Id,
            ExerciseId = 1,
            Weight = agirlik,
            Reps = tekrar,
            RecordType = RecordType.None,
            CreatedAt = oturum.StartedAt,
        });
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// #558: verilen TR gününde, seti olan ama HENÜZ BİTMEMİŞ (açık, `EndedAt == null`) bir antrenman
    /// yazar -- kullanıcı antrenmanı bitirmeden/kaydetmeden önceki anı simüle eder. Bu, hiçbir
    /// istatistiğe (takvim, seri, arkadaş karşılaştırması) yansımamalıdır.
    /// </summary>
    public static async Task AcikOturumSetliYazAsync(long userId, DateOnly gun, decimal agirlik = 100m, int tekrar = 5)
    {
        await using var db = TestDatabase.CreateContext();
        var (baslangic, _) = TurkeyDay.RangeForLocalDate(gun);
        var oturum = new WorkoutSession { UserId = userId, StartedAt = baslangic.AddHours(10) };
        db.Add(oturum);
        await db.SaveChangesAsync();
        db.Add(new SetEntry
        {
            WorkoutSessionId = oturum.Id,
            ExerciseId = 1,
            Weight = agirlik,
            Reps = tekrar,
            RecordType = RecordType.None,
            CreatedAt = oturum.StartedAt,
        });
        await db.SaveChangesAsync();
    }

    public static async Task HedefYazAsync(long userId, int? gun)
    {
        await using var db = TestDatabase.CreateContext();
        var kullanici = await db.Users.SingleAsync(u => u.Id == userId);
        kullanici.WeeklyTargetDays = gun;
        await db.SaveChangesAsync();
    }

    public static async Task GizlilikYazAsync(long userId, PrivacyLevel seviye)
    {
        await using var db = TestDatabase.CreateContext();
        var kullanici = await db.Users.SingleAsync(u => u.Id == userId);
        kullanici.PrivacyLevel = seviye;
        await db.SaveChangesAsync();
    }

    public static DateOnly Bugun() => TurkeyDay.LocalDateOf(DateTime.UtcNow);

    public static async Task<List<StandingResponse>> ListeleAsync(HttpClient client)
        => (await client.GetFromJsonAsync<List<StandingResponse>>(Yol))!;

    /// <summary>#420: dönem takvimden gelir -- aynı uç, iki ucu da dahil TR yerel günü aralığıyla.</summary>
    public static async Task<List<StandingResponse>> DonemdeListeleAsync(HttpClient client, DateOnly from, DateOnly to)
        => (await client.GetFromJsonAsync<List<StandingResponse>>(
            $"{Yol}?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}"))!;
}
