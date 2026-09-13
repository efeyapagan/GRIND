using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Api.Services;

public class WorkoutTemplateService(
    IWorkoutTemplateRepository templateRepository,
    IExerciseRepository exerciseRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : IWorkoutTemplateService
{
    /// <summary>Şablon için TEK "bulunamadı" metni — sahiplik hakkında hiçbir şey söylemez.</summary>
    private const string TemplateNotFound = "Şablon bulunamadı.";

    /// <summary>
    /// Egzersiz için TEK metin ve BİLEREK id İÇERMEZ: "42 numaralı egzersiz sizin değil"
    /// demek, saldırgana id tarayarak hangi id'lerin dolu olduğunu haritalatır (Faz 3 kararı).
    /// </summary>
    private const string ExerciseNotFound = "Seçilen egzersizlerden biri bulunamadı.";

    public async Task<IReadOnlyList<TemplateResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var templates = await templateRepository.GetAllAsync(currentUser.UserId, cancellationToken);

        return templates.Select(ToResponse).ToList();
    }

    public async Task<TemplateResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task<TemplateResponse> CreateAsync(
        CreateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: null, cancellationToken);

        var template = new WorkoutTemplate
        {
            UserId = currentUser.UserId,
            Name = name,
            CreatedAt = DateTime.UtcNow
        };

        templateRepository.Add(template);
        // request.Exercises! : [ApiController] model doğrulaması bu action'dan ÖNCE çalışır;
        // [Required] alanı JSON'dan eksik veya null geldiğinde isteği zaten 400 ile reddeder,
        // bu satıra hiçbir zaman null ulaşmaz (bkz. CreateTemplateRequest.Exercises doc'u).
        await ReplaceExercisesAsync(template, request.Exercises!, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Yazdıktan sonra yeniden okunuyor: yanıt egzersizlerin adı/kategorisiyle dönüyor ve
        // o veri yeni eklenen satırlarda henüz yüklü değil.
        return ToResponse(await OwnedOrThrowAsync(template.Id, cancellationToken));
    }

    public async Task<TemplateResponse> UpdateAsync(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: template.Id, cancellationToken);

        template.Name = name;
        // request.Exercises! : bkz. CreateAsync'teki açıklama — [ApiController] bu action'a
        // hiçbir zaman null Exercises ile girmez.
        await ReplaceExercisesAsync(template, request.Exercises!, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Yazdıktan sonra yeniden okunuyor: bkz. CreateAsync'teki açıklama.
        return ToResponse(await OwnedOrThrowAsync(template.Id, cancellationToken));
    }

    public async Task<TemplateResponse> PatchAsync(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);

        // Boş gövde DTO doğrulamasını geçer (nullable alanlarda kural yok). Sessizce hiçbir
        // şey yapmamak, çağıranın 200 görüp isteğinin uygulandığını sanmasına yol açardı.
        if (request.Name is null && request.Exercises is null)
        {
            throw new ValidationException("Güncellenecek en az bir alan gönderilmeli.");
        }

        if (request.Name is not null)
        {
            var name = RequireTrimmedName(request.Name);
            await EnsureNameFreeAsync(name, excludeId: template.Id, cancellationToken);
            template.Name = name;
        }

        if (request.Exercises is not null)
        {
            await ReplaceExercisesAsync(template, request.Exercises, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Yazdıktan sonra yeniden okunuyor: bkz. CreateAsync'teki açıklama.
        return ToResponse(await OwnedOrThrowAsync(template.Id, cancellationToken));
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);

        // Gerçek silme. TemplateExercise satırları CASCADE ile, WorkoutSession.TemplateId
        // SET NULL ile hallolur — ikisi de Faz 1'de veritabanı seviyesinde konfigüre edildi.
        templateRepository.Remove(template);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Listeyi TOPTAN değiştirir: eski satırlar silinir, yenileri dizideki sırayla eklenir.
    /// Sıra istemciden gelmez — <c>OrderIndex</c> konumdan türer, böylece çakışan indeks,
    /// boşluk veya negatif değer oluşamaz.
    /// </summary>
    private async Task ReplaceExercisesAsync(
        WorkoutTemplate template,
        IReadOnlyList<TemplateExerciseRequest> requested,
        CancellationToken cancellationToken)
    {
        var ids = requested.Select(r => r.ExerciseId).ToList();

        if (ids.Count != ids.Distinct().Count())
        {
            throw new ValidationException("Aynı egzersiz şablona birden fazla kez eklenemez.");
        }

        // Toplu görünürlük sorgusu: N egzersiz için N gidiş-dönüş yapılmasın. Erişilemeyen
        // id'ler sonuçta hiç yer almadığı için sayı karşılaştırması tek adımda yeterli —
        // hangi id'nin eksik olduğunu ARAMIYORUZ, çünkü onu söylemek de sızıntı olurdu.
        var visible = await exerciseRepository.GetVisibleByIdsAsync(ids, currentUser.UserId, cancellationToken);

        if (visible.Count != ids.Count)
        {
            throw new NotFoundException(ExerciseNotFound);
        }

        // Yazarken katı: arşivlenmiş bir egzersiz YENİ bir seçime giremez. Okurken hoşgörülü
        // olduğumuz için (repository arşivlileri döndürüyor) bu kontrol BURADA olmak zorunda.
        // Ama liste toptan gönderildiği için (bu servisin tasarımı) zaten şablonda olan bir
        // satırı olduğu gibi korumak yeni bir seçim DEĞİLDİR — aksi halde sonradan arşivlenen
        // tek bir egzersiz şablonun listesini kalıcı olarak kilitler (bir yeniden sıralama
        // bile 400 döner). Kontrol yalnızca daha önce şablonda olmayan id'lere uygulanır.
        var existingIds = template.TemplateExercises.Select(te => te.ExerciseId).ToHashSet();

        if (visible.Any(e => e.IsArchived && !existingIds.Contains(e.Id)))
        {
            throw new ValidationException("Arşivlenmiş bir egzersiz şablona eklenemez.");
        }

        // Explicit Remove döngüsü YOK: TemplateExerciseConfiguration bu FK'yi
        // DeleteBehavior.Cascade ile konfigüre ediyor ve yüklü koleksiyondan çıkarılan
        // tracked dependent'lar EF tarafından zaten silinmek üzere işaretleniyor — ayrı bir
        // Remove çağrısı gereksiz tekrardı.
        template.TemplateExercises.Clear();

        for (var index = 0; index < requested.Count; index++)
        {
            template.TemplateExercises.Add(new TemplateExercise
            {
                ExerciseId = requested[index].ExerciseId,
                OrderIndex = index,
                PlannedSets = requested[index].PlannedSets,
                RestSeconds = requested[index].RestSeconds ?? TemplateExercise.DefaultRestSeconds
            });
        }
    }

    private async Task<WorkoutTemplate> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await templateRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(TemplateNotFound);

    private static string RequireTrimmedName(string name)
    {
        var trimmed = name.Trim();
        if (trimmed.Length < 2)
        {
            throw new ValidationException("Şablon adı 2-100 karakter olmalı.");
        }

        return trimmed;
    }

    private async Task EnsureNameFreeAsync(
        string name, long? excludeId, CancellationToken cancellationToken)
    {
        if (await templateRepository.NameExistsAsync(currentUser.UserId, name, excludeId, cancellationToken))
        {
            throw new ConflictException($"'{name}' adında bir şablonunuz zaten var.");
        }
    }

    private static TemplateResponse ToResponse(WorkoutTemplate template) => new(
        template.Id,
        template.Name,
        template.CreatedAt,
        template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new TemplateExerciseResponse(
                te.Id,
                te.ExerciseId,
                te.Exercise.Name,
                te.Exercise.Category,
                te.Exercise.IsArchived,
                te.OrderIndex,
                te.PlannedSets,
                te.RestSeconds))
            .ToList());
}
