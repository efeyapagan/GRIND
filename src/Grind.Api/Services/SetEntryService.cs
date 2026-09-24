using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Rest;
using Grind.Api.Common.Security;
using Grind.Api.Common.Validation;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class SetEntryService(
    ISetEntryRepository setEntryRepository,
    IExerciseRepository exerciseRepository,
    IWorkoutSessionRepository sessionRepository,
    IWorkoutSessionService sessionService,
    IPersonalRecordService recordService,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : ISetEntryService
{
    private const string SetNotFound = "Set bulunamadı.";
    private const string SessionNotFound = "Oturum bulunamadı.";

    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<SetEntryResponse> CreateAsync(
        CreateSetRequest request, CancellationToken cancellationToken = default)
    {
        // DataAnnotations [Required]'ı MVC katmanında zaten çalıştı; burada değerleri
        // güvenle açıyoruz. Servis doğrudan (test) çağrıldığında da aynı sözleşme geçerli.
        var exerciseId = request.ExerciseId!.Value;
        var weight = request.Weight!.Value;
        var reps = request.Reps!.Value;

        WeightScale.EnsureAtMostTwoDecimals(weight);

        if (request.Rir is { } rir)
        {
            RirScale.EnsureHalfStep(rir);
        }

        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        if (exercise.IsArchived)
        {
            // Yazarken katı (spec Soru 2/A): set girmek yeni bir seçimdir.
            throw new ValidationException(
                "Arşivlenmiş bir egzersize yeni set girilemez. Önce egzersizi arşivden çıkarın.");
        }

        // Rekor kararı setin EKLENMESİNDEN ÖNCE verilir: geçmiş, kendisini içermemeli.
        var recordType = await recordService.EvaluateNewAsync(
            exerciseId, weight, reps, cancellationToken);

        // Seam: kaydetmez. Oturum (gerekirse) ve set aşağıda TEK commit'te birlikte gider.
        // #262: client zaman damgası burada VERİLMEZ -- bu yol setin kendi CreatedAt'i ile açılır.
        var (session, _) = await sessionService.GetOrOpenTodayAsync(
            templateId: null, notes: null, cancellationToken: cancellationToken);

        // #62: hareket antrenmanın listesinde yoksa sona hedefsiz girer — "Plan dışı" diye ayrı bir
        // kavram kalmaz. Seam kaydetmez; liste satırı set ile aynı commit'te gider.
        await sessionService.EnsureExerciseAsync(session, exercise.Id, cancellationToken);

        var set = new SetEntry
        {
            WorkoutSession = session,
            ExerciseId = exercise.Id,
            Weight = weight,
            Reps = reps,
            Rir = request.Rir,
            RecordType = recordType,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        };

        setEntryRepository.Add(set);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(set, cancellationToken);
    }

    public async Task<IReadOnlyList<SetEntryResponse>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
    {
        // Repository başkasının oturumunda BOŞ döner; "yok" ile "boş"u ayırmak için
        // sahiplik burada ayrıca doğrulanıyor — aksi halde başkasının oturum id'si
        // 404 yerine boş liste alır ve varlığı doğrulanmış olurdu.
        _ = await sessionRepository.GetOwnedByIdAsync(sessionId, currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException(SessionNotFound);

        var sets = await setEntryRepository.GetForSessionAsync(
            sessionId, currentUser.UserId, cancellationToken);

        return HistoryMapping.ToSetResponses(sets, RestIntervalCalculator.ForSession(sets));
    }

    public async Task<SetEntryResponse> PatchAsync(
        long id, PatchSetRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Weight is null && request.Reps is null && request.Rir is null)
        {
            // Boş gövde DTO doğrulamasını geçer (tüm alanlar nullable). Sessizce 200 dönmek
            // çağıranın isteğinin uygulandığını sanmasına yol açardı.
            throw new ValidationException("En az bir alan gönderilmeli.");
        }

        var set = await OwnedOrThrowAsync(id, cancellationToken);

        if (request.Weight is { } weight)
        {
            WeightScale.EnsureAtMostTwoDecimals(weight);
            set.Weight = weight;
        }

        if (request.Reps is { } reps)
        {
            set.Reps = reps;
        }

        if (request.Rir is { } rir)
        {
            RirScale.EnsureHalfStep(rir);
            set.Rir = rir;
        }

        // HER ZAMAN yeniden hesapla: rekor TAŞIMAYAN bir setin ağırlığını yükseltmek onu
        // rekor yapabilir ve sonrasındaki her seti etkileyebilir. Koşullu davranmak yanlış olurdu.
        // Değiştirilen set change tracker'da Modified; sorgu onu güncel değerleriyle döndürür.
        await recordService.RecalculateAsync(
            set.ExerciseId, cancellationToken: cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(set, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var set = await OwnedOrThrowAsync(id, cancellationToken);
        var exerciseId = set.ExerciseId;

        setEntryRepository.Remove(set);

        // excludeSetId ZORUNLU: satır DB'de hâlâ duruyor (commit edilmedi) ve sorguda geri
        // gelir. CLAUDE.md yalnızca "rekor taşıyorsa" yeniden hesaplamayı şart koşuyor;
        // burada koşulsuz yapılıyor — daha fazlasını yapmak asla yanlış değil, ve koşulun
        // doğruluğu kuralların bugünkü hâline bağlı, kodda görünmeyen bir ispata dayanıyor.
        await recordService.RecalculateAsync(
            exerciseId, excludeSetId: id, cancellationToken: cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<SetEntry> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await setEntryRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(SetNotFound);

    /// <summary>
    /// Kaydedilmiş tek setin yanıtı. Dinlenme (#71) oturumdaki bir önceki sete bağlı olduğu için oturumun
    /// setleri okunur; liste ucuyla aynı eşleme kullanılır (DRY). Değiştirilmiş set change tracker'da olduğundan
    /// sorgu onu güncel değerleriyle döndürür.
    /// </summary>
    private async Task<SetEntryResponse> ToResponseAsync(SetEntry set, CancellationToken cancellationToken)
    {
        var sessionSets = await setEntryRepository.GetForSessionAsync(
            set.WorkoutSessionId, currentUser.UserId, cancellationToken);

        return HistoryMapping.ToSetResponses(sessionSets, RestIntervalCalculator.ForSession(sessionSets))
            .Single(s => s.Id == set.Id);
    }
}
