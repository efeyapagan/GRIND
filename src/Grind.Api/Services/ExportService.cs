using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Export'u mevcut okuma yollarından BİRLEŞTİRİR, yeni hesap içermez (spec Karar 4): özet
/// <see cref="IStatsService"/>'ten, rekorlar <see cref="IPersonalRecordService"/>'ten, oturum şekli
/// geçmiş ucuyla paylaşılan <see cref="HistoryMapping"/>'den gelir. Böylece export, aynı veriyi
/// gösteren diğer uçlarla asla farklı sayı raporlamaz.
///
/// Sorgular SIRAYLA çalışır: aynı DbContext eşzamanlı sorgu kaldırmaz.
/// </summary>
public class ExportService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    IBodyWeightLogRepository bodyWeightRepository,
    IStatsService statsService,
    IPersonalRecordService personalRecordService,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IExportService
{
    public async Task<ExportResponse> GetAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        // Ters aralık HERHANGİ bir sorgudan önce 400 verir.
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);
        var userId = currentUser.UserId;

        var sessions = await sessionRepository.GetInRangeAsync(userId, fromUtc, toUtc, cancellationToken);

        // Setler oturum başına değil aralığın tamamı için TEK sorguda gelir. Filtre oturumun
        // StartedAt'ine baktığı için her setin oturumu yukarıdaki listede yer alır — AMA bu garanti
        // yalnızca tutarlı bir anlık görüntü (snapshot) için geçerlidir. İki sorgu ayrı ayrı, bir
        // transaction OLMADAN çalışır (bilerek — KISS, kişisel ölçekte gerek yok); iki sorgu arasında
        // yepyeni bir oturumda yazılan bir set, HistoryMapping'in GetValueOrDefault'u tarafından
        // sessizce elenip export'tan eksik kalabilir. Kabul edilebilir bir ihtimal.
        var sets = await setEntryRepository.GetInRangeAsync(userId, fromUtc, toUtc, cancellationToken);

        var calendar = await statsService.GetCalendarAsync(query, cancellationToken);
        var volumeByExercise = await statsService.GetVolumeByExerciseAsync(query, cancellationToken);
        var records = await personalRecordService.GetAllTimeAsync(cancellationToken);
        var bodyWeights = await bodyWeightRepository.GetInRangeAsync(userId, fromUtc, toUtc, cancellationToken);

        // Toplamlar takvimin günlerinden: GET /api/stats/calendar ve volume/daily ile aynı yol, aynı
        // "setsiz oturum sayılmaz" ve TR gün sınırı kuralı.
        var summary = new ExportSummaryResponse(
            calendar.TrainedDayCount,
            calendar.Days.Sum(d => d.SessionCount),
            calendar.Days.Sum(d => d.SetCount),
            calendar.Days.Sum(d => d.Volume),
            calendar.CurrentWeekStreak,
            calendar.LongestWeekStreak,
            volumeByExercise.Items);

        return new ExportResponse(
            timeProvider.GetUtcNow().UtcDateTime,
            query.From,
            query.To,
            summary,
            HistoryMapping.ToSessionResponses(sessions, sets),
            bodyWeights.Select(b => new BodyWeightLogResponse(
                b.Id, b.Weight, b.HeightCm, b.BodyFatPercent, b.WaistCm, b.HipCm, b.RecordedAt)).ToList(),
            records);
    }

    public async Task<string> GetTextAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
        => ExportTextFormatter.Format(await GetAsync(query, cancellationToken));
}
