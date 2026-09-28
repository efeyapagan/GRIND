using Grind.Api.Common.Exceptions;
using Grind.Api.Data;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class SharedTemplateService(
    IUserRepository userRepository,
    IWorkoutTemplateRepository templateRepository,
    IExerciseRepository exerciseRepository,
    IFriendshipService friendshipService,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : ISharedTemplateService
{
    private const string TemplateNotFound = "Şablon bulunamadı.";

    public async Task<IReadOnlyList<SharedTemplateResponse>> GetSharedTemplatesAsync(
        string username, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var isSelf = target.Id == currentUser.UserId;
        if (!isSelf && !await friendshipService.AreFriendsAsync(currentUser.UserId, target.Id, cancellationToken))
            return [];

        var templates = await templateRepository.GetAllAsync(target.Id, cancellationToken);
        return templates
            .Where(t => isSelf || IsVisible(t, target.PrivacyLevel))
            .Select(TemplateMapper.ToSharedResponse)
            .ToList();
    }

    public async Task<SharedTemplateResponse> GetSharedTemplateDetailAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
        => TemplateMapper.ToSharedResponse(await VisibleOrThrowAsync(username, templateId, cancellationToken));

    public async Task<TemplateResponse> SaveTemplateAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
    {
        var source = await VisibleOrThrowAsync(username, templateId, cancellationToken);

        var candidateIds = source.TemplateExercises.Select(te => te.ExerciseId).ToList();
        var visible = candidateIds.Count == 0
            ? []
            : await exerciseRepository.GetVisibleByIdsAsync(candidateIds, currentUser.UserId, cancellationToken);
        var visibleIds = visible.Select(e => e.Id).ToHashSet();

        // Kaynağın ÖZEL egzersizleri kopyalayana görünmez -- ownership kuralı (CLAUDE.md
        // Yetkilendirme Kuralı). Bu satırlar sessizce atlanır, global/kendi egzersizler kalır.
        var kopyalanacaklar = source.TemplateExercises
            .Where(te => visibleIds.Contains(te.ExerciseId))
            .OrderBy(te => te.OrderIndex)
            .ToList();

        if (kopyalanacaklar.Count == 0 && source.TemplateExercises.Count > 0)
            throw new ValidationException("Bu şablonun hiçbir hareketi kaydedilemedi.");

        var name = await UniqueNameAsync(source.Name, username, cancellationToken);

        var kopya = new WorkoutTemplate
        {
            UserId = currentUser.UserId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            SavedFromUserId = source.UserId
        };

        for (var i = 0; i < kopyalanacaklar.Count; i++)
        {
            kopya.TemplateExercises.Add(new TemplateExercise
            {
                ExerciseId = kopyalanacaklar[i].ExerciseId,
                OrderIndex = i,
                PlannedSets = kopyalanacaklar[i].PlannedSets,
                RestSeconds = kopyalanacaklar[i].RestSeconds
            });
        }

        templateRepository.Add(kopya);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var yeniden = await templateRepository.GetOwnedByIdAsync(kopya.Id, currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException(TemplateNotFound);
        return TemplateMapper.ToResponse(yeniden, lastUsedAt: null);
    }

    private async Task<WorkoutTemplate> VisibleOrThrowAsync(
        string username, long templateId, CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var isSelf = target.Id == currentUser.UserId;
        if (!isSelf && !await friendshipService.AreFriendsAsync(currentUser.UserId, target.Id, cancellationToken))
            throw new NotFoundException(TemplateNotFound);

        var template = await templateRepository.GetOwnedByIdAsync(templateId, target.Id, cancellationToken);
        if (template is null || (!isSelf && !IsVisible(template, target.PrivacyLevel)))
            throw new NotFoundException(TemplateNotFound);

        return template;
    }

    private async Task<string> UniqueNameAsync(string name, string sourceUsername, CancellationToken cancellationToken)
    {
        if (!await templateRepository.NameExistsAsync(currentUser.UserId, name, null, cancellationToken))
            return name;

        var aday = $"{name} ({sourceUsername})";
        var sayac = 2;
        while (await templateRepository.NameExistsAsync(currentUser.UserId, aday, null, cancellationToken))
        {
            aday = $"{name} ({sourceUsername} {sayac})";
            sayac++;
        }
        return aday;
    }

    private static bool IsVisible(WorkoutTemplate template, PrivacyLevel ownerLevel) =>
        template.IsSharedOverride ?? ownerLevel != PrivacyLevel.Gizli;
}
