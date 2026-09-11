using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

public interface IWorkoutSessionRepository : IRepository<WorkoutSession>
{
    /// <summary>
    /// Kullanıcının verilen UTC aralığında başlamış ve hâlâ açık (EndedAt null) oturumu.
    /// Aralığı TR yerel gününden hesaplamak servisin işidir — saat dilimi politikası
    /// bu katmana ait değildir.
    /// </summary>
    Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(
        long userId,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>Kullanıcının tüm oturumları, yeniden eskiye.</summary>
    Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Başkasının oturumunda null döner (IDOR koruması). Şablonu ve şablonun egzersizlerini
    /// de yükler — ilerleme hesabı hedef set sayılarına ve egzersiz adlarına ihtiyaç duyuyor.
    /// </summary>
    Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Geçmiş sayfası ve toplam sayı BİRLİKTE. İkisi tek metotta çünkü aynı filtreden türerler:
    /// ayrı metotlar filtre ifadesini iki yerde tekrarlar ve biri değişince diğeri sessizce
    /// ayrışır (sayfa 1 satır gösterirken "2 sonuç" demek gibi).
    /// Sıralama BELİRLİDİR: StartedAt azalan, eşitlikte Id azalan.
    /// Null tarih uçları o yönde sınırsız demektir.
    /// </summary>
    Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        long? exerciseId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Oturum başına set sayısı ve hacim (ağırlık × tekrar), toplama SQL'de. En az bir seti
    /// OLMAYAN oturumlar sorguda elenir — seti olmayan oturum antrenman sayılmaz (spec Karar 3).
    /// TR gününe gruplama çağıranın işidir (bkz. TurkeyDay.LocalDateOf).
    /// </summary>
    Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// En az bir seti olan oturumların <c>StartedAt</c> değerleri, TÜM geçmişten — seri hesabı
    /// aralıktan bağımsızdır (spec Karar 5): "bu ay" filtresi 40 günlük seriyi kırmamalı.
    /// Yalnızca zaman damgası döner; hacim/set sayısı seri için gereksiz.
    /// </summary>
    Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Aralıkta başlamış TÜM oturumlar (sayfasız), şablonu ile birlikte, eskiden yeniye (StartedAt,
    /// eşitlikte Id). Seti OLMAYAN oturumlar DAHİL: export'un oturum listesi bir günlüktür (Faz 11
    /// spec Karar 8). İzlemesiz. Null tarih uçları sınırsızdır.
    /// </summary>
    Task<IReadOnlyList<WorkoutSession>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);
}
