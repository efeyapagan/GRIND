using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class WorkoutSessionService(
    IWorkoutSessionRepository sessionRepository,
    IWorkoutTemplateRepository templateRepository,
    ISetEntryRepository setEntryRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider,
    IPersonalRecordService recordService) : IWorkoutSessionService
{
    private const string SessionNotFound = "Oturum bulunamadı.";
    private const string OpenSessionNotFound = "Bugüne ait açık bir oturum yok.";

    /// <summary>Şablon için ayrı ve id İÇERMEYEN metin — id söylemek tarama imkânı verirdi.</summary>
    private const string TemplateNotFound = "Seçilen şablon bulunamadı.";

    public async Task<IReadOnlyList<SessionResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var sessions = await sessionRepository.GetAllAsync(currentUser.UserId, cancellationToken);

        // Liste ilerleme taşımaz: her satır için ayrı bir sayım sorgusu N+1 olurdu.
        return sessions.Select(s => ToResponse(s, [])).ToList();
    }

    public async Task<SessionResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<SessionResponse> GetOpenAsync(CancellationToken cancellationToken = default)
    {
        // FindOpenTodayAsync bilerek yalın (Template Include'suz) — Faz 8 bunu her set
        // eklemede çağıracak ve şablon grafiğini sürüklememeli. Yanıt için burada tam
        // grafiği taşıyan sahiplik sorgusuyla yeniden okunuyor.
        var found = await FindOpenTodayAsync(cancellationToken)
                    ?? throw new NotFoundException(OpenSessionNotFound);
        var session = await OwnedOrThrowAsync(found.Id, cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<(WorkoutSession Session, bool Created)> GetOrOpenTodayAsync(
        long? templateId, string? notes, CancellationToken cancellationToken = default)
    {
        var existing = await FindOpenTodayAsync(cancellationToken);

        if (existing is not null)
        {
            return (existing, false);
        }

        WorkoutTemplate? template = null;
        if (templateId is { } id)
        {
            // DİKKAT: miras alınan GetByIdAsync sahiplik kontrolü YAPMAZ; kullanmak IDOR olur.
            template = await templateRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
                ?? throw new NotFoundException(TemplateNotFound);
        }

        var session = new WorkoutSession
        {
            UserId = currentUser.UserId,
            TemplateId = templateId,
            // GetOwnedByIdAsync şablonu TemplateExercises+Exercise ile TAMAMEN Include'lu
            // döndürüyor; navigasyonu burada bağlamak, SaveChanges sonrası aynı grafiği
            // ikinci bir gidiş-dönüşle yeniden okumanın önüne geçer (bkz. Faz 7 fix notu).
            Template = template,
            StartedAt = timeProvider.GetUtcNow().UtcDateTime,
            Notes = notes
        };

        sessionRepository.Add(session);
        // SaveChangesAsync BİLEREK YOK — bkz. arayüzdeki seam notu.
        return (session, true);
    }

    public async Task<StartSessionResult> StartAsync(
        StartSessionRequest request, CancellationToken cancellationToken = default)
    {
        var (session, created) = await GetOrOpenTodayAsync(
            request.TemplateId, request.Notes, cancellationToken);

        if (!created)
        {
            // İdempotent: iki kez tıklanan "Antrenmana Başla" hata değil aynı oturum.
            // Gövdedeki şablon/not bilerek UYGULANMAZ — açık bir oturumu sessizce
            // değiştirmek, kullanıcının fark etmediği bir veri kaybı olurdu.
            // FindOpenTodayAsync yalın (Template Include'suz) döndüğü için burada tam
            // grafik için sahiplik sorgusuyla yeniden okunuyor.
            var reloaded = await OwnedOrThrowAsync(session.Id, cancellationToken);
            return new StartSessionResult(
                ToResponse(reloaded, await ProgressAsync(reloaded, cancellationToken)), Created: false);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new StartSessionResult(
            ToResponse(session, await ProgressAsync(session, cancellationToken)), Created: true);
    }

    public async Task<SessionResponse> FinishAsync(
        long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        if (session.EndedAt is not null)
        {
            // Sessizce izin vermek EndedAt'i ileri kaydırır ve gerçek bitiş zamanını kaybettirir.
            throw new ConflictException("Bu oturum zaten bitirilmiş.");
        }

        session.EndedAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<SessionResponse> UpdateNotesAsync(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        session.Notes = request.Notes;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        // Etkilenen egzersizler SİLMEDEN ÖNCE toplanır — sonra öğrenmenin yolu kalmaz.
        // Distinct liste: her egzersiz için BİR KEZ yeniden hesap (CLAUDE.md: her set için
        // ayrı ayrı DEĞİL — performans ve DRY).
        var affectedExerciseIds = await setEntryRepository.GetDistinctExerciseIdsForSessionAsync(
            id, cancellationToken);

        sessionRepository.Remove(session);

        foreach (var exerciseId in affectedExerciseIds)
        {
            // excludeSessionId ZORUNLU: CASCADE henüz veritabanına gitmedi, bu oturumun
            // setleri sorguda hâlâ geri geliyor. Hariç tutulmazsa silinen setler hesaba
            // katılır ve kalan setler rekora terfi etmez.
            await recordService.RecalculateAsync(
                exerciseId, excludeSessionId: id, cancellationToken: cancellationToken);
        }

        // TEK commit: oturumun silinmesi (SetEntry'ler CASCADE) + kalan setlerin rekorları.
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// "Bugüne ait açık oturum": <c>EndedAt IS NULL</c> YETMEZ, <c>StartedAt</c> TR yerel
    /// gününde de olmalı. Aksi halde kapatılmayı unutulan dünkü oturum bugünün setlerini
    /// yutar ve onlar dünkü tarihe yazılır (CLAUDE.md). Eski oturum zorla kapatılmaz.
    /// </summary>
    private Task<WorkoutSession?> FindOpenTodayAsync(CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) = TurkeyDay.RangeFor(timeProvider.GetUtcNow().UtcDateTime);

        return sessionRepository.GetOpenSessionStartedBetweenAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);
    }

    private async Task<WorkoutSession> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await sessionRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(SessionNotFound);

    /// <summary>
    /// Hedef vs gerçekleşen. Şablonsuz oturumda karşılaştıracak hedef olmadığı için boş döner
    /// ve sayım sorgusu hiç çalışmaz. DİKKAT: guard <c>TemplateId is null</c> üzerinden yapılır,
    /// <c>Template is null</c> ÜZERİNDEN DEĞİL — ikincisi "şablonu yok" ile "şablon navigasyonu
    /// Include edilmedi" durumlarını birbirine karıştırır ve çağıran, Include'suz bir sorgudan
    /// (ör. eskiden <see cref="GetOpenAsync"/>) geldiğinde sessizce yanlış (boş) ilerleme üretirdi.
    /// </summary>
    private async Task<IReadOnlyList<SessionProgressResponse>> ProgressAsync(
        WorkoutSession session, CancellationToken cancellationToken)
    {
        if (session.TemplateId is null)
        {
            return [];
        }

        if (session.Template is null)
        {
            // Çağıran bu session'ı Template Include'suz bir sorgudan getirmiş demektir —
            // bu bir "şablon yok" durumu değil, bir programlama hatası. Sessizce [] dönmek
            // tam da bu fix dalgasının kapattığı hatayı yeniden açardı.
            throw new InvalidOperationException(
                $"WorkoutSession {session.Id} bir TemplateId ({session.TemplateId}) taşıyor ama " +
                "Template navigasyonu yüklenmemiş. Çağıran taraf oturumu Include(Template) ile getirmeli.");
        }

        var completed = await setEntryRepository.GetCompletedSetCountsAsync(session.Id, cancellationToken);

        return session.Template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new SessionProgressResponse(
                te.ExerciseId,
                te.Exercise.Name,
                te.PlannedSets,
                completed.GetValueOrDefault(te.ExerciseId)))
            .ToList();
    }

    private static SessionResponse ToResponse(
        WorkoutSession session, IReadOnlyList<SessionProgressResponse> progress) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        IsOpen: session.EndedAt is null,
        session.TemplateId,
        session.Template?.Name,
        session.Notes,
        progress);
}
