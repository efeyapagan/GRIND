using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IBodyWeightLogRepository : IRepository<BodyWeightLog>
{
    /// <summary>
    /// Başkasının kaydında null (IDOR koruması — sahiplik doğrudan <c>UserId</c> üzerinde).
    /// İZLEMELİ döner: düzeltme ve silme bu nesneyi değiştirir.
    /// </summary>
    Task<BodyWeightLog?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sayfa ve toplam sayı BİRLİKTE, aynı filtreden (ayrı metotlar filtreyi iki yerde tekrarlar ve
    /// biri değişince diğeri sessizce ayrışır). Sıralama BELİRLİDİR: <c>RecordedAt</c> azalan,
    /// eşitlikte <c>Id</c> azalan. İzlemesiz (salt okuma). Null tarih uçları sınırsızdır.
    /// </summary>
    Task<(IReadOnlyList<BodyWeightLog> Items, int TotalCount)> GetPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Aralıktaki tüm tartılar, eskiden yeniye, izlemesiz. Karşılaştırma ucu bunları TR gününe göre
    /// bellekte gruplar — satır sayısı tartı sayısıyla sınırlı (günde birkaç).
    /// </summary>
    Task<IReadOnlyList<BodyWeightLog>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen TR gününde (issue #119: "art arda aynı gün, aynı boy/kilo") aynı kullanıcının
    /// aynı <paramref name="weight"/> ve <paramref name="heightCm"/> ile başka bir kaydı var mı.
    /// Diğer ölçüler (yağ oranı, bel/kalça çevresi) bu karşılaştırmaya DAHİL DEĞİLDİR.
    /// </summary>
    Task<bool> ExistsWithSameMeasurementAsync(
        long userId,
        DateTime dayFromUtcInclusive,
        DateTime dayToUtcExclusive,
        decimal weight,
        decimal heightCm,
        CancellationToken cancellationToken = default);
}
