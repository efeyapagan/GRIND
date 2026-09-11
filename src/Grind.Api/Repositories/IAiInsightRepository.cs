using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;

namespace Grind.Api.Repositories;

public interface IAiInsightRepository : IRepository<AiInsight>
{
    /// <summary>
    /// Başkasının kaydında null (IDOR — sahiplik doğrudan <c>UserId</c> üzerinde). İZLEMELİ döner:
    /// silme bu nesneyi kullanır.
    /// </summary>
    Task<AiInsight?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sayfa ve toplam sayı BİRLİKTE, aynı filtreden (ayrı metotlar filtreyi iki yerde tekrarlar ve biri
    /// değişince diğeri sessizce ayrışır). Sıra BELİRLİDİR: <c>CreatedAt</c> azalan, eşitlikte <c>Id</c>
    /// azalan. İzlemesiz. Null süzgeç uygulanmaz; verilenler VE'lenir ve sonuç HER ZAMAN kullanıcının
    /// kendi satırlarıyla sınırlıdır: başkasının oturum/set id'si boş sonuç verir (Faz 12 spec Karar 13).
    /// </summary>
    Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(
        long userId,
        AiInsightKind? kind,
        long? workoutSessionId,
        long? setEntryId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);
}
