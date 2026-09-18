using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class StatsService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    IBodyWeightLogRepository bodyWeightRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IStatsService
{
    public async Task<VolumeSummaryResponse<DailyVolumeResponse>> GetDailyVolumeAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var days = await DailyBucketsAsync(query, cancellationToken);

        var items = days
            .Select(ToDailyVolume)
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

        var trainedDays = starts.Select(TurkeyDay.LocalDateOf).ToList();
        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var (current, longest) = StreakCalculator.Calculate(trainedDays, today);

        // #97: hedef JWT'de değil, kullanıcının GÜNCEL kaydında (CLAUDE.md JWT kararı).
        var target = (await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken))?.WeeklyTargetDays;
        int? targetStreak = target is { } targetDays
            ? StreakCalculator.Calculate(trainedDays, today, targetDays).Current
            : null;

        return new CalendarResponse(
            query.From,
            query.To,
            days.Select(d => new CalendarDayResponse(d.Date, d.SessionCount, d.SetCount, d.Volume)).ToList(),
            days.Count,
            current,
            longest,
            StreakCalculator.TrainedDaysInWeekOf(trainedDays, today),
            target,
            targetStreak);
    }

    public async Task<BodyWeightTrendResponse> GetBodyWeightTrendAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        // Hacim serisi GetDailyVolumeAsync ile AYNI yoldan (DailyBucketsAsync + ToDailyVolume):
        // iki uç aynı günü asla farklı raporlamaz (spec Karar 3).
        var volume = (await DailyBucketsAsync(query, cancellationToken))
            .Select(ToDailyVolume)
            .ToList();

        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);
        var logs = await bodyWeightRepository.GetInRangeAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        // Gruplama bellekte, TurkeyDay üzerinden — gün sınırı kuralının SQL'de ikinci bir kopyası
        // yok (Faz 9 Karar 6). Satır sayısı tartı sayısıyla sınırlı.
        //
        // Weight nullable (issue #119: bir kayıt sadece yağ oranı/bel çevresi taşıyabilir) --
        // kilosu olmayan kayıtlar bu KİLO trendinden filtrelenir, aksi halde Average sessizce
        // onları yoksayar ama ReadingCount'a yine de sayar (yanlış "kaç ölçüm" izlenimi verir).
        var bodyWeight = logs
            .Where(l => l.Weight is not null)
            .GroupBy(l => TurkeyDay.LocalDateOf(l.RecordedAt))
            .Select(g => new DailyBodyWeightResponse(
                g.Key,
                // "Yarım yukarı": .NET'in varsayılanı banker's rounding'dir ve 82.405'i 82.40'a
                // indirir — kilo gösteriminde kullanıcıya tutarsız görünür (spec Karar 1).
                decimal.Round(g.Average(l => l.Weight!.Value), 2, MidpointRounding.AwayFromZero),
                g.Count()))
            .OrderBy(d => d.Date)
            .ToList();

        return new BodyWeightTrendResponse(query.From, query.To, bodyWeight, volume);
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

    private static DailyVolumeResponse ToDailyVolume(DayBucket day) =>
        new(day.Date, day.Volume, day.SetCount, day.SessionCount);

    private record DayBucket(DateOnly Date, decimal Volume, int SetCount, int SessionCount);
}
