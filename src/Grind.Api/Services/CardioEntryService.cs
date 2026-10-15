using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Common.Validation;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class CardioEntryService(
    ICardioEntryRepository cardioRepository,
    IExerciseRepository exerciseRepository,
    IWorkoutSessionRepository sessionRepository,
    IWorkoutSessionService sessionService,
    ICardioRecordService recordService,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : ICardioEntryService
{
    private const string SessionNotFound = "Oturum bulunamadı.";
    private const string EntryNotFound = "Kardiyo kaydı bulunamadı.";
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";
    private const string FutureTime = "Kardiyo zamanı gelecekte olamaz.";

    public async Task<IReadOnlyList<CardioEntryResponse>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
    {
        // "Yok" ile "boş" ayrımı: başkasının antrenmanı 404, boş liste değil.
        _ = await sessionRepository.GetOwnedByIdAsync(sessionId, currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException(SessionNotFound);

        var entries = await cardioRepository.GetForSessionAsync(sessionId, currentUser.UserId, cancellationToken);
        return entries.Select(CardioMapping.ToResponse).ToList();
    }

    public async Task<CardioEntryResponse> StartAsync(
        long sessionId, StartCardioRequest request, CancellationToken cancellationToken = default)
    {
        var session = await sessionRepository.GetOwnedByIdAsync(sessionId, currentUser.UserId, cancellationToken)
                      ?? throw new NotFoundException(SessionNotFound);

        var sessionEntries = await cardioRepository.GetForSessionAsync(sessionId, currentUser.UserId, cancellationToken);

        // #174: yanıtı kaybolan istek tekrar gelirse ikinci kayıt açılmaz.
        if (request.ClientRequestId is { } anahtar && sessionEntries.FirstOrDefault(c => c.ClientRequestId == anahtar) is { } onceki)
        {
            return CardioMapping.ToResponse(onceki);
        }

        if (session.EndedAt is not null)
        {
            throw new ConflictException("Bitmiş antrenmanda kardiyo başlatılamaz.");
        }

        if (sessionEntries.Any(c => c.DurationSeconds is null))
        {
            throw new ConflictException("Bu antrenmanda akan bir kardiyo var; önce onu durdurun.");
        }

        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           request.ExerciseId!.Value, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        if (exercise.IsArchived)
        {
            throw new ValidationException("Arşivlenmiş bir egzersize kayıt girilemez. Önce egzersizi arşivden çıkarın.");
        }

        if (exercise.Measurement != ExerciseMeasurement.Cardio)
        {
            throw new ValidationException("Bu hareket kardiyo değil; set olarak girilir.");
        }

        CardioFieldRules.EnsureAllowed(CardioFieldCatalog.For(exercise.Id, exercise.Measurement), request);

        // Hareket listede yoksa sona girer (#62) — kardiyo kartı listenin bir parçasıdır, sürüklenerek taşınır.
        await sessionService.EnsureExerciseAsync(session, exercise.Id, cancellationToken);

        var entry = new CardioEntry
        {
            WorkoutSession = session,
            Exercise = exercise,
            StartedAt = ClientTimestamp.Resolve(request.ClientStartedAt, timeProvider, FutureTime),
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
            ClientRequestId = request.ClientRequestId
        };
        CardioFieldRules.Apply(entry, request);

        cardioRepository.Add(entry);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return CardioMapping.ToResponse(entry);
    }

    public async Task<CardioEntryResponse> StopAsync(
        long id, StopCardioRequest request, CancellationToken cancellationToken = default)
    {
        var entry = await OwnedOrThrowAsync(id, cancellationToken);

        // Zaten durmuşsa (kuyruktan tekrar gelen Durdur ya da antrenman bitince kapanmış) olduğu gibi döner.
        if (entry.DurationSeconds is not null)
        {
            return CardioMapping.ToResponse(entry);
        }

        CardioFieldRules.EnsureAllowed(CardioFieldCatalog.For(entry.ExerciseId, entry.Exercise.Measurement), request);

        var stoppedAt = ClientTimestamp.Resolve(request.ClientStoppedAt, timeProvider, FutureTime);
        entry.DurationSeconds = CardioDuration.Between(entry.StartedAt, stoppedAt);
        CardioFieldRules.Apply(entry, request);

        await recordService.RecalculateAsync(entry.ExerciseId, cancellationToken: cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return CardioMapping.ToResponse(entry);
    }

    public async Task<CardioEntryResponse> UpdateAsync(
        long id, UpdateCardioRequest request, CancellationToken cancellationToken = default)
    {
        var entry = await OwnedOrThrowAsync(id, cancellationToken);

        if (entry.DurationSeconds is null)
        {
            throw new ConflictException("Akan kardiyo düzeltilemez; önce durdurun.");
        }

        CardioFieldRules.EnsureAllowed(CardioFieldCatalog.For(entry.ExerciseId, entry.Exercise.Measurement), request);

        entry.DurationSeconds = request.DurationSeconds!.Value;
        CardioFieldRules.Apply(entry, request);

        await recordService.RecalculateAsync(entry.ExerciseId, cancellationToken: cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return CardioMapping.ToResponse(entry);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entry = await OwnedOrThrowAsync(id, cancellationToken);

        cardioRepository.Remove(entry);
        await recordService.RecalculateAsync(entry.ExerciseId, excludeEntryId: entry.Id, cancellationToken: cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<CardioEntry> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await cardioRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(EntryNotFound);
}
