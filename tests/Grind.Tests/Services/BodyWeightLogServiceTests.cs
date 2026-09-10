using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class BodyWeightLogServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — gün sınırından güvenli uzaklıkta.</summary>
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, BodyWeightLogService Service,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var service = new BodyWeightLogService(
            new BodyWeightLogRepository(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id), new SahteSaat(An));

        return (context, user, service, transaction);
    }

    private static CreateBodyWeightRequest Yeni(decimal weight, DateTimeOffset? recordedAt = null) =>
        new() { Weight = weight, RecordedAt = recordedAt };

    // ---- Ekleme ----

    [Fact]
    public async Task Zaman_verilmezse_saatin_ani_kaydedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            Assert.Equal(An, eklenen.RecordedAt);
            Assert.Equal(82.4m, eklenen.Weight);
        }
    }

    /// <summary>
    /// Offset'li zaman (spec Karar 2) UTC'ye çevrilerek saklanır: TR 08:00 = UTC 05:00. DB'den
    /// okunarak doğrulanıyor — change tracker'daki nesneye bakmak yanlış bir yazımı gizlerdi.
    /// </summary>
    [Fact]
    public async Task Offsetli_zaman_UTCye_cevrilerek_saklanir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(
                Yeni(82.4m, new DateTimeOffset(2026, 3, 10, 8, 0, 0, TimeSpan.FromHours(3))));

            context.ChangeTracker.Clear();
            var satir = await context.Set<BodyWeightLog>().SingleAsync(b => b.Id == eklenen.Id);

            Assert.Equal(new DateTime(2026, 3, 10, 5, 0, 0, DateTimeKind.Utc), satir.RecordedAt);
        }
    }

    [Fact]
    public async Task Gelecek_zaman_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(82.4m, new DateTimeOffset(An.AddHours(1)))));
        }
    }

    /// <summary>
    /// Saat kayması toleransı (spec Karar 2): istemci saati birkaç dakika ileride diye "şimdi"yi
    /// gönderen bir tartı 400 almamalı.
    /// </summary>
    [Fact]
    public async Task Tolerans_icindeki_ileri_zaman_kabul_edilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m, new DateTimeOffset(An.AddMinutes(2))));

            Assert.Equal(An.AddMinutes(2), eklenen.RecordedAt);
        }
    }

    [Fact]
    public async Task Uc_ondalikli_kilo_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(Yeni(82.455m)));
        }
    }

    // ---- Listeleme ----

    [Fact]
    public async Task Liste_yeniden_eskiye_sayfalanir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(83.0m, new DateTimeOffset(An.AddDays(-2))));
            await service.CreateAsync(Yeni(82.5m, new DateTimeOffset(An.AddDays(-1))));
            var enYeni = await service.CreateAsync(Yeni(82.1m));

            var sayfa = await service.GetPageAsync(new PagedRangeQuery { PageSize = 2 });

            Assert.Equal(2, sayfa.Items.Count);
            Assert.Equal(enYeni.Id, sayfa.Items[0].Id);
            Assert.Equal(3, sayfa.TotalCount);
            Assert.Equal(2, sayfa.TotalPages);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ: UTC 9 Mart 21:30, TR'de 10 Mart 00:30'dur. "9 Mart" filtresi bu tartıyı
    /// YAKALAMAMALI, "10 Mart" yakalamalı. UTC gününe göre filtrelenseydi tersi olurdu.
    /// (Zaman bilerek sahte saatin — 10 Mart 17:00 UTC — GERİSİNDE seçildi: ileri bir zaman
    /// "gelecek" kuralına takılır ve test gün sınırını sınamadan 400 ile patlardı.)
    /// </summary>
    [Fact]
    public async Task Liste_TR_gunune_gore_filtrelenir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(82.4m,
                new DateTimeOffset(new DateTime(2026, 3, 9, 21, 30, 0, DateTimeKind.Utc))));

            var dokuzuncu = await service.GetPageAsync(new PagedRangeQuery
            {
                From = new DateOnly(2026, 3, 9), To = new DateOnly(2026, 3, 9)
            });
            var onuncu = await service.GetPageAsync(new PagedRangeQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });

            Assert.Empty(dokuzuncu.Items);
            Assert.Single(onuncu.Items);
        }
    }

    // ---- Düzeltme ----

    /// <summary>PATCH kısmi güncellemedir: gönderilmeyen alan KORUNUR (DB'den okunarak).</summary>
    [Fact]
    public async Task Tek_alan_duzeltilince_digeri_korunur()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var zaman = An.AddHours(-1);
            var eklenen = await service.CreateAsync(Yeni(82.4m, new DateTimeOffset(zaman)));

            await service.PatchAsync(eklenen.Id, new PatchBodyWeightRequest { Weight = 81.9m });

            context.ChangeTracker.Clear();
            var satir = await context.Set<BodyWeightLog>().SingleAsync(b => b.Id == eklenen.Id);

            Assert.Equal(81.9m, satir.Weight);
            Assert.Equal(zaman, satir.RecordedAt);
        }
    }

    [Fact]
    public async Task Bos_patch_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(eklenen.Id, new PatchBodyWeightRequest()));
        }
    }

    // ---- Silme ----

    [Fact]
    public async Task Silinen_kayit_artik_bulunamaz()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            await service.DeleteAsync(eklenen.Id);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(eklenen.Id));
        }
    }

    // ---- Sahiplik ----

    /// <summary>IDOR: başkasının kaydı HER FİİLDE 404 — varlığı doğrulanmaz.</summary>
    [Fact]
    public async Task Baskasinin_kaydi_okunamaz_duzeltilemez_silinemez()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerKayit = new BodyWeightLog { User = digerKullanici, Weight = 90m, RecordedAt = An };
            context.AddRange(digerKullanici, digerKayit);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerKayit.Id));
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.PatchAsync(digerKayit.Id, new PatchBodyWeightRequest { Weight = 1m }));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerKayit.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_kayitlari_listede_gorunmez()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.AddRange(digerKullanici,
                new BodyWeightLog { User = digerKullanici, Weight = 90m, RecordedAt = An });
            await context.SaveChangesAsync();

            var sayfa = await service.GetPageAsync(new PagedRangeQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
        }
    }
}
