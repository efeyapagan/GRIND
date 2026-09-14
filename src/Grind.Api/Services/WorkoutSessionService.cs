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
    ISessionExerciseRepository sessionExerciseRepository,
    IExerciseRepository exerciseRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider,
    IPersonalRecordService recordService) : IWorkoutSessionService
{
    private const string SessionNotFound = "Oturum bulunamadı.";
    private const string OpenSessionNotFound = "Bugüne ait açık bir oturum yok.";

    /// <summary>Şablon için ayrı ve id İÇERMEYEN metin — id söylemek tarama imkânı verirdi.</summary>
    private const string TemplateNotFound = "Seçilen şablon bulunamadı.";

    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

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
        // eklemede çağıracak ve şablon grafiğini sürüklememeli. Yanıt için burada şablon
        // adını taşıyan sahiplik sorgusuyla yeniden okunuyor.
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
            Notes = notes,
            // #60/#62: şablonun hareketleri antrenmana KOPYALANIR (anlık görüntü). Şablon sonradan
            // değişse de başlamış antrenmanın listesi ve ilerlemesi değişmez. Oturumla aynı commit.
            SessionExercises = template is null
                ? []
                : template.TemplateExercises
                    .OrderBy(te => te.OrderIndex)
                    .Select(te => new SessionExercise
                    {
                        ExerciseId = te.ExerciseId,
                        OrderIndex = te.OrderIndex,
                        PlannedSets = te.PlannedSets,
                        RestSeconds = te.RestSeconds
                    })
                    .ToList()
        };

        sessionRepository.Add(session);
        // SaveChangesAsync BİLEREK YOK — bkz. arayüzdeki seam notu.
        return (session, true);
    }

    public async Task EnsureExerciseAsync(
        WorkoutSession session, long exerciseId, CancellationToken cancellationToken = default)
    {
        if (session.Id == 0)
        {
            // Henüz kaydedilmemiş (bu istekte açılan) oturum: listesi yalnızca bellekte.
            if (session.SessionExercises.All(se => se.ExerciseId != exerciseId))
            {
                sessionExerciseRepository.Add(
                    NewUnplanned(session, exerciseId, orderIndex: session.SessionExercises.Count));
            }

            return;
        }

        if (await sessionExerciseRepository.GetAsync(session.Id, exerciseId, cancellationToken) is null)
        {
            await AppendUnplannedAsync(session, exerciseId, cancellationToken);
        }
    }

    public async Task<SessionResponse> AddExerciseAsync(
        long id, AddSessionExerciseRequest request, CancellationToken cancellationToken = default)
    {
        // DataAnnotations [Required] MVC katmanında çalıştı; servis doğrudan çağrıldığında da aynı sözleşme.
        var exerciseId = request.ExerciseId!.Value;

        var session = await OpenOwnedOrThrowAsync(id, "Bitmiş bir antrenmana hareket eklenemez.", cancellationToken);

        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        if (exercise.IsArchived)
        {
            // Set eklemedeki kuralla aynı: arşivlenmiş egzersizi seçmek yeni bir seçimdir.
            throw new ValidationException(
                "Arşivlenmiş bir egzersiz antrenmana eklenemez. Önce egzersizi arşivden çıkarın.");
        }

        if (await sessionExerciseRepository.GetAsync(session.Id, exercise.Id, cancellationToken) is not null)
        {
            throw new ConflictException("Bu hareket antrenmanda zaten var.");
        }

        await AppendUnplannedAsync(session, exercise.Id, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task RemoveExerciseAsync(long id, long exerciseId, CancellationToken cancellationToken = default)
    {
        var session = await OpenOwnedOrThrowAsync(id, "Bitmiş bir antrenmandan hareket kaldırılamaz.", cancellationToken);

        var row = await sessionExerciseRepository.GetAsync(session.Id, exerciseId, cancellationToken)
                  ?? throw new NotFoundException("Hareket bu antrenmanda yok.");

        var sets = await setEntryRepository.GetForSessionAndExerciseAsync(session.Id, exerciseId, cancellationToken);

        sessionExerciseRepository.Remove(row);
        foreach (var set in sets)
        {
            setEntryRepository.Remove(set);
        }

        // excludeSessionId ZORUNLU: silinen setler commit'e kadar sorguda hâlâ görünür. Hesap tek
        // hareket üzerinden yapıldığı için yalnızca BU hareketin bu antrenmandaki setleri hariç kalır.
        await recordService.RecalculateAsync(
            exerciseId, excludeSessionId: session.Id, cancellationToken: cancellationToken);

        // TEK commit: liste satırı + setler + kalan setlerin rekorları.
        await unitOfWork.SaveChangesAsync(cancellationToken);
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
            // FindOpenTodayAsync yalın (Template Include'suz) döndüğü için burada şablon
            // adı için sahiplik sorgusuyla yeniden okunuyor.
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

        // TEK commit: oturumun silinmesi (SetEntry ve SessionExercise'ler CASCADE) + kalan setlerin rekorları.
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
    /// Hareket listesini değiştiren akışlar için: sahiplik ÖNCE (404), sonra bitmiş mi (409). Geçmiş
    /// antrenmanı düzenlemek kapsam dışı.
    /// </summary>
    private async Task<WorkoutSession> OpenOwnedOrThrowAsync(
        long id, string endedMessage, CancellationToken cancellationToken)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        return session.EndedAt is null ? session : throw new ConflictException(endedMessage);
    }

    /// <summary>Kaydedilmiş bir antrenmanın listesinin sonuna hedefsiz hareket ekler. Kaydetmez.</summary>
    private async Task AppendUnplannedAsync(
        WorkoutSession session, long exerciseId, CancellationToken cancellationToken)
    {
        var orderIndex = await sessionExerciseRepository.GetNextOrderIndexAsync(session.Id, cancellationToken);
        sessionExerciseRepository.Add(NewUnplanned(session, exerciseId, orderIndex));
    }

    private static SessionExercise NewUnplanned(WorkoutSession session, long exerciseId, int orderIndex) => new()
    {
        WorkoutSession = session,
        ExerciseId = exerciseId,
        OrderIndex = orderIndex,
        PlannedSets = null,
        RestSeconds = TemplateExercise.DefaultRestSeconds
    };

    /// <summary>
    /// Hedef vs gerçekleşen, antrenmanın KENDİ hareket listesinden (#60, #62) — şablondan değil. Liste
    /// boşsa (şablonsuz ve setsiz) sayım sorgusu hiç çalışmaz.
    /// </summary>
    private async Task<IReadOnlyList<SessionProgressResponse>> ProgressAsync(
        WorkoutSession session, CancellationToken cancellationToken)
    {
        var exercises = await sessionExerciseRepository.GetForSessionAsync(session.Id, cancellationToken);

        if (exercises.Count == 0)
        {
            return [];
        }

        var completed = await setEntryRepository.GetCompletedSetCountsAsync(session.Id, cancellationToken);

        return exercises
            .Select(se => new SessionProgressResponse(
                se.ExerciseId,
                se.Exercise.Name,
                se.PlannedSets,
                completed.GetValueOrDefault(se.ExerciseId),
                se.RestSeconds))
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
