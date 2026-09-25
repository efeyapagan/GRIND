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

    /// <summary>İstemci saati gelecekte oldugunda gosterilen mesaj (spec Karar 2, tolerans #262'de paylasildi).</summary>
    private const string FutureTime = "Tartı zamanı gelecekte olamaz.";

    /// <summary>Aynı gün, aynı boy/kilo tekrarını engeller (issue #119, kullanıcı kararı).</summary>
    private const string DuplicateMeasurement = "Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.";

    public async Task<BodyWeightLogResponse> CreateAsync(
        CreateBodyWeightRequest request, CancellationToken cancellationToken = default)
    {
        // [Required] MVC katmanında çalıştı (Weight/HeightCm); servis doğrudan çağrıldığında da
        // aynı sözleşme.
        var weight = request.Weight!.Value;
        var heightCm = request.HeightCm!.Value;
        WeightScale.EnsureAtMostTwoDecimals(weight);
        WeightScale.EnsureAtMostTwoDecimals(heightCm);
        if (request.BodyFatPercent is { } bodyFatPercent)
        {
            WeightScale.EnsureAtMostTwoDecimals(bodyFatPercent);
        }
        if (request.WaistCm is { } waistCm)
        {
            WeightScale.EnsureAtMostTwoDecimals(waistCm);
        }
        if (request.HipCm is { } hipCm)
        {
            WeightScale.EnsureAtMostTwoDecimals(hipCm);
        }

        var recordedAt = ClientTimestamp.Resolve(request.RecordedAt, timeProvider, FutureTime);

        // Karşılaştırma SADECE boy+kilo üzerinden (issue #119): diğer ölçüler (yağ oranı, bel/kalça)
        // farklı olsa bile aynı gün aynı boy+kilo "zaten kayıtlı" sayılır.
        var (gunBaslangici, gunBitisi) = TurkeyDay.RangeFor(recordedAt);
        if (await repository.ExistsWithSameMeasurementAsync(
                currentUser.UserId, gunBaslangici, gunBitisi, weight, heightCm, cancellationToken))
        {
            throw new ConflictException(DuplicateMeasurement);
        }

        var log = new BodyWeightLog
        {
            UserId = currentUser.UserId,
            Weight = weight,
            HeightCm = heightCm,
            BodyFatPercent = request.BodyFatPercent,
            WaistCm = request.WaistCm,
            HipCm = request.HipCm,
            RecordedAt = recordedAt
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
        if (request.Weight is null && request.HeightCm is null && request.BodyFatPercent is null
            && request.WaistCm is null && request.HipCm is null && request.RecordedAt is null)
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

        if (request.HeightCm is { } heightCm)
        {
            WeightScale.EnsureAtMostTwoDecimals(heightCm);
            log.HeightCm = heightCm;
        }

        if (request.BodyFatPercent is { } bodyFatPercent)
        {
            WeightScale.EnsureAtMostTwoDecimals(bodyFatPercent);
            log.BodyFatPercent = bodyFatPercent;
        }

        if (request.WaistCm is { } waistCm)
        {
            WeightScale.EnsureAtMostTwoDecimals(waistCm);
            log.WaistCm = waistCm;
        }

        if (request.HipCm is { } hipCm)
        {
            WeightScale.EnsureAtMostTwoDecimals(hipCm);
            log.HipCm = hipCm;
        }

        if (request.RecordedAt is { } recordedAt)
        {
            log.RecordedAt = ClientTimestamp.Resolve(recordedAt, timeProvider, FutureTime);
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

    private async Task<BodyWeightLog> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await repository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(LogNotFound);

    private static BodyWeightLogResponse ToResponse(BodyWeightLog log) =>
        new(log.Id, log.Weight, log.HeightCm, log.BodyFatPercent, log.WaistCm, log.HipCm, log.RecordedAt);
}
