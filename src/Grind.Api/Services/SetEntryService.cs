using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Progress;
using Grind.Api.Common.Rest;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
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
    private const string FutureSet = "Set zamanı gelecekte olamaz.";

    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<SetEntryResponse> CreateAsync(
        CreateSetRequest request, CancellationToken cancellationToken = default)
    {
        var exercise = await ValidatedExerciseAsync(request, cancellationToken);
        var weight = request.Weight ?? 0m;

        // Rekor kararı setin EKLENMESİNDEN ÖNCE verilir: geçmiş, kendisini içermemeli.
        var recordType = await recordService.EvaluateNewAsync(
            exercise.Id, exercise.Measurement, weight, request.Reps, request.DurationSeconds, cancellationToken);

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
            Reps = request.Reps,
            DurationSeconds = request.DurationSeconds,
            Rir = request.Rir,
            RecordType = recordType,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        };

        setEntryRepository.Add(set);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(set, cancellationToken);
    }

    public async Task<SetEntryResponse> CreateInSessionAsync(
        long sessionId, CreateSetRequest request, CancellationToken cancellationToken = default)
    {
        // Önce sahiplik: başkasının antrenmanı, gövde ne olursa olsun 404 (varlığı sızmaz).
        var session = await sessionRepository.GetOwnedByIdAsync(sessionId, currentUser.UserId, cancellationToken)
                      ?? throw new NotFoundException(SessionNotFound);

        var exercise = await ValidatedExerciseAsync(request, cancellationToken);
        var sessionSets = await setEntryRepository.GetForSessionAsync(sessionId, currentUser.UserId, cancellationToken);

        // #174: kuyruktan tekrar gelen istek (yanıtı kaybolmuş) seti iki kez yazmaz, ilk seti döner.
        if (request.ClientRequestId is { } anahtar && sessionSets.FirstOrDefault(s => s.ClientRequestId == anahtar) is { } onceki)
        {
            return await ToResponseAsync(onceki, cancellationToken);
        }

        DateTime createdAt;
        if (session.EndedAt is null)
        {
            // #174: AÇIK antrenmana kimliğiyle ekleme (çevrimdışı kuyruk) canlı ekleme gibidir: hareket listede
            // yoksa sona hedefsiz girer (#62), zaman cihazın gerçek zamanıdır -- geç gönderilen setin dinlenmesi
            // ve antrenmanın süresi bozulmasın.
            await sessionService.EnsureExerciseAsync(session, exercise.Id, cancellationToken);
            createdAt = ClientTimestamp.Resolve(request.ClientCreatedAt, timeProvider, FutureSet);
        }
        else
        {
            // Kapsam (#564): bitmiş antrenmanda yalnızca zaten seti olan hareket -- yeni hareket eklemek bitmiş
            // antrenmanın hareket listesini değiştirirdi (#62: liste yalnızca açık antrenmanda düzenlenir).
            var lastOfExercise = sessionSets.LastOrDefault(s => s.ExerciseId == exercise.Id)
                                 ?? throw new ValidationException("Bu antrenmanda bu hareketin seti yok.");
            // Rekor ve dinlenme CreatedAt sırasıyla hesaplanır: "şimdi" yazılsaydı geçmişe eklenen set en
            // yeni set sayılırdı. Hareketin son setinin hemen arkasına yerleşir (dinlenmesi ~0 görünür;
            // uydurma bir süreden iyidir).
            createdAt = lastOfExercise.CreatedAt.AddMilliseconds(1);
        }

        var set = new SetEntry
        {
            WorkoutSession = session,
            ExerciseId = exercise.Id,
            Weight = request.Weight ?? 0m,
            Reps = request.Reps,
            DurationSeconds = request.DurationSeconds,
            Rir = request.Rir,
            CreatedAt = createdAt,
            ClientRequestId = request.ClientRequestId
        };

        setEntryRepository.Add(set);

        // Geçmişe eklenen set SONRAKİ setlerin rekorunu değiştirebilir: hareket baştan taranır. Set henüz
        // veritabanında olmadığı için hesaba bekleyen set olarak katılır; tek commit.
        await recordService.RecalculateAsync(
            exercise.Id, pendingSet: set, cancellationToken: cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(set, cancellationToken);
    }

    /// <summary>
    /// İki ekleme yolunun (açık antrenman, #564 geçmiş antrenman) ortak doğrulaması: ağırlık/RIR ölçeği,
    /// egzersizin görünürlüğü ve arşivi, ölçüm tipine göre alanlar.
    /// </summary>
    private async Task<Exercise> ValidatedExerciseAsync(
        CreateSetRequest request, CancellationToken cancellationToken)
    {
        // DataAnnotations [Required]'ı MVC katmanında zaten çalıştı; burada değerleri
        // güvenle açıyoruz. Servis doğrudan (test) çağrıldığında da aynı sözleşme geçerli.
        var exerciseId = request.ExerciseId!.Value;

        if (request.Weight is { } requestedWeight)
        {
            WeightScale.EnsureAtMostTwoDecimals(requestedWeight);
        }

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

        // #346: hangi alanın zorunlu, hangisinin yasak olduğu hareketin ölçüm tipine bağlı. Ağırlıksız ve
        // süreli harekette ağırlık gönderilmezse 0'dır (ağırlıksız harekette "ek ağırlık").
        SetMeasurementRules.EnsureAllowed(
            exercise.Measurement, request.Weight, request.Reps, request.Rir, request.DurationSeconds);
        SetMeasurementRules.EnsureRequired(
            exercise.Measurement, request.Weight, request.Reps, request.DurationSeconds);

        return exercise;
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

        return HistoryMapping.ToSetResponses(
            sets, RestIntervalCalculator.ForSession(sets), ExercisePositionCalculator.ForSession(sets));
    }

    public async Task<SetEntryResponse> PatchAsync(
        long id, PatchSetRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Weight is null && request.Reps is null && request.Rir is null && request.DurationSeconds is null)
        {
            // Boş gövde DTO doğrulamasını geçer (tüm alanlar nullable). Sessizce 200 dönmek
            // çağıranın isteğinin uygulandığını sanmasına yol açardı.
            throw new ValidationException("En az bir alan gönderilmeli.");
        }

        var set = await OwnedOrThrowAsync(id, cancellationToken);

        // #346: düzeltme de hareketin ölçüm tipine uymalı (süreli sete tekrar, ağırlıksız sete RIR yazılmaz).
        SetMeasurementRules.EnsureAllowed(
            set.Exercise.Measurement, request.Weight, request.Reps, request.Rir, request.DurationSeconds);

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

        if (request.DurationSeconds is { } durationSeconds)
        {
            set.DurationSeconds = durationSeconds;
            // #346: hareket süreliye dönmeden önce "0 kg × n" girilmiş eski bir sete süre yazmak onu süreli
            // sete çevirir — bir set ya tekrar ya süre taşır (check constraint).
            set.Reps = null;
            set.Rir = null;
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

        return HistoryMapping.ToSetResponses(
                sessionSets, RestIntervalCalculator.ForSession(sessionSets), ExercisePositionCalculator.ForSession(sessionSets))
            .Single(s => s.Id == set.Id);
    }
}
