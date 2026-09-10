using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Common.Validation;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class BodyWeightLogService(
    IBodyWeightLogRepository repository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IBodyWeightLogService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string LogNotFound = "Tartı kaydı bulunamadı.";

    /// <summary>
    /// İstemci saati birkaç saniye/dakika ileride olabilir; "şimdi"yi gönderen bir tartı 400
    /// almamalı (spec Karar 2).
    /// </summary>
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    public async Task<BodyWeightLogResponse> CreateAsync(
        CreateBodyWeightRequest request, CancellationToken cancellationToken = default)
    {
        // [Required] MVC katmanında çalıştı; servis doğrudan çağrıldığında da aynı sözleşme.
        var weight = request.Weight!.Value;
        WeightScale.EnsureAtMostTwoDecimals(weight);

        var log = new BodyWeightLog
        {
            UserId = currentUser.UserId,
            Weight = weight,
            RecordedAt = request.RecordedAt is { } recordedAt ? ToUtcNotInFuture(recordedAt) : Now()
        };

        repository.Add(log);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(log);
    }

    public async Task<PagedResponse<BodyWeightLogResponse>> GetPageAsync(
        PagedRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var (items, totalCount) = await repository.GetPageAsync(
            currentUser.UserId, fromUtc, toUtc, query.Skip(), query.PageSize, cancellationToken);

        return new PagedResponse<BodyWeightLogResponse>(
            items.Select(ToResponse).ToList(), query.Page, query.PageSize, totalCount);
    }

    public async Task<BodyWeightLogResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task<BodyWeightLogResponse> PatchAsync(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Weight is null && request.RecordedAt is null)
        {
            // Boş gövde DTO doğrulamasını geçer (tüm alanlar nullable). Sessizce 200 dönmek
            // çağıranın isteğinin uygulandığını sanmasına yol açardı.
            throw new ValidationException("En az bir alan gönderilmeli.");
        }

        var log = await OwnedOrThrowAsync(id, cancellationToken);

        if (request.Weight is { } weight)
        {
            WeightScale.EnsureAtMostTwoDecimals(weight);
            log.Weight = weight;
        }

        if (request.RecordedAt is { } recordedAt)
        {
            log.RecordedAt = ToUtcNotInFuture(recordedAt);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(log);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var log = await OwnedOrThrowAsync(id, cancellationToken);

        repository.Remove(log);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    /// <summary>
    /// Offset'li zamanı UTC'ye çevirir (<c>UtcDateTime</c> Kind=Utc döner — Npgsql bunu ister) ve
    /// toleranstan fazla ileride olanı reddeder.
    /// </summary>
    private DateTime ToUtcNotInFuture(DateTimeOffset recordedAt)
    {
        var utc = recordedAt.UtcDateTime;

        if (utc > Now() + FutureTolerance)
        {
            throw new ValidationException("Tartı zamanı gelecekte olamaz.");
        }

        return utc;
    }

    private async Task<BodyWeightLog> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await repository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(LogNotFound);

    private static BodyWeightLogResponse ToResponse(BodyWeightLog log) =>
        new(log.Id, log.Weight, log.RecordedAt);
}
