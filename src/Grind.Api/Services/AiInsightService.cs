using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services.Ai;

namespace Grind.Api.Services;

/// <summary>
/// Oku → sor → tek SaveChangesAsync (Faz 12 spec Karar 6). Bağlam Faz 11'in export metnidir; ikinci bir
/// "LLM'e özet" biçimi yazılmaz. <c>BeginTransaction</c> YOK: LLM beklenirken hiçbir transaction açık ve
/// hiçbir yazma bekliyor değildir — satır sağlayıcı döndükten SONRA eklenir.
/// </summary>
public class AiInsightService(
    IAiInsightRepository repository,
    IExportService exportService,
    IAiInsightProvider provider,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IAiInsightService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string InsightNotFound = "Yorum bulunamadı.";

    private const string NothingToInterpret = "Bu aralıkta yorumlanacak kayıt yok.";

    /// <summary>Haftalık üretim sınırı (issue #76) — maliyet kontrolü: her üretim gerçek para harcar.</summary>
    private const int MaxInsightsPerWindow = 2;

    /// <summary>
    /// SABİT (takvim haftası, ör. Pazartesi-Pazar) DEĞİL, KAYAN 7 gün. Sabit hafta sınırda (Pazar
    /// gece yarısı) art arda 4 üretime izin verirdi -- sınırın amacı (harcama kontrolü) tam da bunu
    /// engellemek.
    /// </summary>
    private static readonly TimeSpan RateLimitWindow = TimeSpan.FromDays(7);

    public async Task<AiInsightResponse> GenerateAsync(
        GenerateInsightRequest request, CancellationToken cancellationToken = default)
    {
        // Aralık hataları HİÇBİR IO'dan önce 400 verir.
        var (from, to) = AiInsightRange.Resolve(request.From, request.To, TurkeyDay.LocalDateOf(Now()));

        // Sinir kontrolu EN ONCE: export'u okumak (potansiyel olarak cok satir) ve ozellikle
        // ucretli saglayici cagrisi, kullanici zaten sinirdaysa hic yapilmamali.
        await EnsureWithinRateLimitAsync(cancellationToken);

        var export = await exportService.GetAsync(new StatsRangeQuery { From = from, To = to }, cancellationToken);

        // Rekorlar ve seriler aralıktan bağımsızdır (Faz 11 Karar 2) ve burada sayılmaz. Setsiz ama notlu bir
        // oturum veridir (Faz 11 Karar 8).
        if (export.Sessions.Count == 0 && export.BodyWeights.Count == 0)
        {
            throw new ValidationException(NothingToInterpret);
        }

        // Buradan sonrası ÜCRETLİ: isteğin belirteci değil None (spec Karar 7). İstemci koparsa parası
        // ödenmiş yanıt yine saklanır; iş, (MaxRetries + 1) × TimeoutSeconds ile sınırlıdır — dağıtılan
        // varsayılanlarla yaklaşık 6 dakika (bkz. Services/Ai/DependencyInjection.cs).
        var completion = await provider.CompleteAsync(
            AiInsightPrompt.Instructions, ExportTextFormatter.Format(export), CancellationToken.None);

        var insight = new AiInsight
        {
            UserId = currentUser.UserId,
            Kind = AiInsightKind.Insight,
            RangeFrom = from,
            RangeTo = to,
            Content = completion.Content,
            Model = completion.Model,
            TokensUsed = completion.TokensUsed,
            EstimatedCostUsd = completion.EstimatedCostUsd,
            CreatedAt = Now()
        };

        repository.Add(insight);
        await unitOfWork.SaveChangesAsync(CancellationToken.None);

        return ToResponse(insight);
    }

    public async Task<PagedResponse<AiInsightResponse>> GetPageAsync(
        AiInsightQuery query, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await repository.GetPageAsync(
            currentUser.UserId, query.Kind, query.WorkoutSessionId, query.SetEntryId,
            query.Skip(), query.PageSize, cancellationToken);

        return new PagedResponse<AiInsightResponse>(
            items.Select(ToResponse).ToList(), query.Page, query.PageSize, totalCount);
    }

    public async Task<AiInsightResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var insight = await OwnedOrThrowAsync(id, cancellationToken);

        repository.Remove(insight);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Kayan pencerede zaten <see cref="MaxInsightsPerWindow"/> yorum varsa <see cref="RateLimitExceededException"/>
    /// fırlatır. Mesaj, EN ESKİ üretimin pencereden ÇIKACAĞI anı (o an + <see cref="RateLimitWindow"/>) TR
    /// saatiyle söyler -- "tekrar dene" demek, kullanıcıyı hemen tekrar deneyip aynı hatayı almaya iter.
    /// </summary>
    private async Task EnsureWithinRateLimitAsync(CancellationToken cancellationToken)
    {
        var simdi = Now();
        var son = await repository.GetRecentInsightTimestampsAsync(
            currentUser.UserId, simdi - RateLimitWindow, cancellationToken);

        if (son.Count < MaxInsightsPerWindow)
        {
            return;
        }

        var tekrarDenenebilirTarih = son[0] + RateLimitWindow;
        var trTarih = TurkeyDay.ToLocal(tekrarDenenebilirTarih);
        throw new RateLimitExceededException(
            $"Bir haftada en fazla {MaxInsightsPerWindow} yorum alabilirsin. " +
            $"Sonraki hakkın {trTarih:dd.MM.yyyy HH:mm} tarihinde açılıyor.");
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    private async Task<AiInsight> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await repository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(InsightNotFound);

    private static AiInsightResponse ToResponse(AiInsight insight) => new(
        insight.Id,
        insight.Kind,
        insight.WorkoutSessionId,
        insight.SetEntryId,
        insight.RangeFrom,
        insight.RangeTo,
        insight.Content,
        insight.Model,
        insight.TokensUsed,
        insight.EstimatedCostUsd,
        insight.CreatedAt);
}
