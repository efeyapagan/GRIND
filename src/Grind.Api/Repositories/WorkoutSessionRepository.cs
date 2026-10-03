using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WorkoutSessionRepository(AppDbContext context)
    : Repository<WorkoutSession>(context), IWorkoutSessionRepository
{
    public Task<WorkoutSession?> GetOpenSessionStartedAfterAsync(
        long userId,
        DateTime thresholdUtcInclusive,
        CancellationToken cancellationToken = default)
        => Set
            .Where(s => s.UserId == userId
                        && s.EndedAt == null
                        && s.StartedAt >= thresholdUtcInclusive)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default)
        // Yalnızca şablon adı için Include(Template) — koleksiyon Include'u yok, tek bir
        // LEFT JOIN'e mal olur, kartezyen patlama veya N+1 yaratmaz. `progress` listede
        // bilerek boş kalır (bkz. WorkoutSessionService.GetAllAsync yorumu).
        => await Set
            .Include(s => s.Template)
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    public Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set
            .Include(s => s.Template!)
                .ThenInclude(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
                    .ThenInclude(te => te.Exercise)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);

    public async Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        long? exerciseId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = FilterHistory(userId, fromUtcInclusive, toUtcExclusive, exerciseId);

        var totalCount = await query.CountAsync(cancellationToken);

        var sessions = await query
            // Yalnızca şablon adı için tek LEFT JOIN — koleksiyon Include'u yok (kartezyen
            // patlama olmasın); setler ayrı bir sorguda toplu çekilir (N+1 yok).
            .Include(s => s.Template)
            .OrderByDescending(s => s.StartedAt)
            .ThenByDescending(s => s.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (sessions, totalCount);
    }

    public async Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        // Önce anonim tipe projekte edip sonra record'a çevirmek bilinçli: aggregate'li bir
        // GroupBy/Select ifadesinde doğrudan record kurucusu kullanmak, EF'in sorguyu
        // çeviremediği durumda sessizce istemci tarafı değerlendirmeye kayma riski taşır.
        // #558: oturum HENÜZ BİTMEMİŞKEN (EndedAt == null) girilen bir set, kullanıcı antrenmanı
        // kaydetmeden önce takvim/seri sayısını şişiriyordu -- yalnızca SetEntries.Any() yetersizdi.
        var rows = await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .Where(s => s.EndedAt != null && s.SetEntries.Any())
            .Select(s => new
            {
                s.Id,
                s.StartedAt,
                SetCount = s.SetEntries.Count(),
                Volume = s.SetEntries.Sum(e => e.Weight * (e.Reps ?? 0))
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new SessionAggregate(r.Id, r.StartedAt, r.SetCount, r.Volume))
            .ToList();
    }

    public async Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(
        long userId, CancellationToken cancellationToken = default)
        // #558: aynı gerekçe -- açık bir oturumun seti seriyi/takvim gününü şişirmemeli.
        => await Set
            .Where(s => s.UserId == userId && s.EndedAt != null && s.SetEntries.Any())
            .Select(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkoutSession>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            // Yalnızca şablon adı için tek LEFT JOIN; setler ayrı sorguda toplu çekilir.
            .Include(s => s.Template)
            .OrderBy(s => s.StartedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<long, DateTime>> GetLastUsedAtByTemplateIdsAsync(
        long userId, IReadOnlyCollection<long> templateIds, CancellationToken cancellationToken = default)
    {
        if (templateIds.Count == 0)
            return new Dictionary<long, DateTime>();

        return await Set
            .Where(s => s.UserId == userId && s.TemplateId != null && templateIds.Contains(s.TemplateId.Value))
            .GroupBy(s => s.TemplateId!.Value)
            .Select(g => new { TemplateId = g.Key, LastUsedAt = g.Max(s => s.StartedAt) })
            .ToDictionaryAsync(x => x.TemplateId, x => x.LastUsedAt, cancellationToken);
    }

    /// <summary>
    /// Geçmiş listesinin ortak süzgeci: hem <c>/api/history</c> (kendi geçmişin) hem
    /// <c>GET /api/users/{username}/history</c> buradan geçer, bu yüzden kural TEK yerde durur.
    ///
    /// #436: geçmişte yalnızca BİTMİŞ ve EN AZ BİR SETİ olan oturumlar görünür.
    /// - Devam eden antrenman geçmişe girmez; kendi ucundan gelir ve bitirilince listede belirir.
    ///   Kayıp bir işlevsellik yok, oturum da silinmiyor.
    /// - Şablonla açılıp hiç set girilmeden bırakılmış oturum listeyi "0 set 0 kg" satırlarıyla
    ///   kirletiyordu.
    ///
    /// Bu, <c>HistorySessionResponse</c>'taki eski "setsiz oturum geçmişte YİNE görünür" kararını
    /// (geçmiş = oturum günlüğü) BİLEREK geçersiz kılar — kullanıcı kararı.
    ///
    /// DİKKAT: bugün mobilde oturum NOTU girilebilen bir ekran yok (`notes` yalnızca API'de), bu
    /// yüzden setsiz bir oturumda saklanacak bilgi de yok. Not arayüzü eklenirse bu süzgeç yeniden
    /// düşünülmeli: "setsiz ama notlu oturum veridir" (Faz 11 Karar 8).
    /// </summary>
    private IQueryable<WorkoutSession> FilterHistory(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, long? exerciseId)
    {
        var query = FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .Where(s => s.EndedAt != null && s.SetEntries.Any());

        if (exerciseId is { } id)
        {
            query = query.Where(s => s.SetEntries.Any(e => e.ExerciseId == id));
        }

        return query;
    }

    /// <summary>
    /// #418: BİRDEN FAZLA kullanıcının bir aralıktaki oturum toplamları, TEK sorguda -- arkadaş
    /// başına sorgu atmak (N+1) listeyi arkadaş sayısıyla çarpardı. Seti olmayan oturum elenir
    /// (tek kullanıcılı sürümle aynı kural). TR gününe gruplama çağıranın işidir.
    /// </summary>
    public async Task<IReadOnlyList<UserSessionAggregate>> GetSessionAggregatesForUsersAsync(
        IReadOnlyCollection<long> userIds,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        // Anonim tipe projekte edip sonra record'a çevirmek bilinçli: bkz. GetSessionAggregatesAsync.
        // #558: aynı gerekçe -- açık bir oturumun seti arkadaş karşılaştırmasını şişirmemeli.
        var rows = await Set
            .Where(s => userIds.Contains(s.UserId)
                        && s.StartedAt >= fromUtcInclusive
                        && s.StartedAt < toUtcExclusive
                        && s.EndedAt != null
                        && s.SetEntries.Any())
            .Select(s => new
            {
                s.UserId,
                s.StartedAt,
                SetCount = s.SetEntries.Count(),
                Volume = s.SetEntries.Sum(e => e.Weight * (e.Reps ?? 0)),
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new UserSessionAggregate(r.UserId, r.StartedAt, r.SetCount, r.Volume))
            .ToList();
    }

    private IQueryable<WorkoutSession> FilterByRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(s => s.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(s => s.StartedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(s => s.StartedAt < to);
        }

        return query;
    }

    public async Task<IReadOnlyList<TemplateSessionVolume>> GetTemplateSessionVolumesAsync(
        long userId,
        IReadOnlyCollection<long> templateIds,
        CancellationToken cancellationToken = default)
    {
        if (templateIds.Count == 0)
        {
            return [];
        }

        // Anonim tipe projekte edip sonra record'a çevirmek bilinçli: bkz. GetSessionAggregatesAsync.
        var rows = await Set
            .Where(s => s.UserId == userId
                        && s.TemplateId != null
                        && templateIds.Contains(s.TemplateId.Value)
                        && s.EndedAt != null
                        && s.SetEntries.Any())
            .Select(s => new
            {
                s.Id,
                TemplateId = s.TemplateId!.Value,
                s.StartedAt,
                Volume = s.SetEntries.Sum(e => e.Weight * (e.Reps ?? 0)),
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new TemplateSessionVolume(r.Id, r.TemplateId, r.StartedAt, r.Volume))
            .ToList();
    }
}
