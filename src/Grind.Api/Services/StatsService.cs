using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class StatsService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IStatsService
{
    public async Task<VolumeSummaryResponse<DailyVolumeResponse>> GetDailyVolumeAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var days = await DailyBucketsAsync(query, cancellationToken);

        var items = days
            .Select(d => new DailyVolumeResponse(d.Date, d.Volume, d.SetCount, d.SessionCount))
            .ToList();

        return new VolumeSummaryResponse<DailyVolumeResponse>(
            query.From, query.To, items.Sum(i => i.Volume), items);
    }

    public async Task<VolumeSummaryResponse<ExerciseVolumeResponse>> GetVolumeByExerciseAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var volumes = await setEntryRepository.GetVolumeByExerciseAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        var items = volumes
            .OrderByDescending(v => v.Volume)
            .ThenBy(v => v.ExerciseName)
            // İsim benzersizliği BUGÜNKÜ bir invariant, GARANTİ edilen bir kural değil (Faz 8'in
            // aynı dersi: ThenBy(Id) ile sıralamayı koşulsuz toplam hale getir).
            .ThenBy(v => v.ExerciseId)
            .Select(v => new ExerciseVolumeResponse(v.ExerciseId, v.ExerciseName, v.Volume, v.SetCount))
            .ToList();

        return new VolumeSummaryResponse<ExerciseVolumeResponse>(
            query.From, query.To, items.Sum(i => i.Volume), items);
    }

    public async Task<CalendarResponse> GetCalendarAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var days = await DailyBucketsAsync(query, cancellationToken);

        // Seriler ARALIKTAN BAĞIMSIZ: tüm geçmişteki antrenman günleri okunur (spec Karar 5).
        var starts = await sessionRepository.GetTrainedSessionStartsAsync(
            currentUser.UserId, cancellationToken);

        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var (current, longest) = StreakCalculator.Calculate(
            starts.Select(TurkeyDay.LocalDateOf), today);

        return new CalendarResponse(
            query.From,
            query.To,
            days.Select(d => new CalendarDayResponse(d.Date, d.SessionCount, d.SetCount, d.Volume)).ToList(),
            days.Count,
            current,
            longest);
    }

    /// <summary>
    /// Oturum toplamlarını TR günlerine yerleştirir. Gruplama BELLEKTE: gün sınırı politikası
    /// <see cref="TurkeyDay"/>'de yaşıyor ve SQL'de <c>AT TIME ZONE</c> ile ikinci bir kopyası
    /// yazılmıyor (spec Karar 6). Belleğe gelen satır sayısı OTURUM sayısıyla sınırlı — setler
    /// hiç taşınmıyor, toplamları SQL yapıyor.
    /// </summary>
    private async Task<IReadOnlyList<DayBucket>> DailyBucketsAsync(
        StatsRangeQuery query, CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var aggregates = await sessionRepository.GetSessionAggregatesAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        return aggregates
            .GroupBy(a => TurkeyDay.LocalDateOf(a.StartedAt))
            .Select(g => new DayBucket(
                g.Key, g.Sum(a => a.Volume), g.Sum(a => a.SetCount), g.Count()))
            .OrderBy(d => d.Date)
            .ToList();
    }

    private record DayBucket(DateOnly Date, decimal Volume, int SetCount, int SessionCount);
}
