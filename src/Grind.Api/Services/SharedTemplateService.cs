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
        var candidates = templates.Where(t => isSelf || IsVisible(t, target.PrivacyLevel)).ToList();

        // Tum sablonlarin butun egzersiz id'leri tek toplu sorguda cozulur (N+1 yerine).
        var allIds = candidates.SelectMany(t => t.TemplateExercises.Select(te => te.ExerciseId)).Distinct().ToList();
        var visibleIds = await VisibleExerciseIdsAsync(allIds, cancellationToken);

        return candidates.Select(t => TemplateMapper.ToSharedResponse(t, visibleIds)).ToList();
    }

    public async Task<SharedTemplateResponse> GetSharedTemplateDetailAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
    {
        var (template, _) = await VisibleOrThrowAsync(username, templateId, cancellationToken);
        var ids = template.TemplateExercises.Select(te => te.ExerciseId).ToList();
        var visibleIds = await VisibleExerciseIdsAsync(ids, cancellationToken);
        return TemplateMapper.ToSharedResponse(template, visibleIds);
    }

    public async Task<TemplateResponse> SaveTemplateAsync(
        string username, long templateId, CancellationToken cancellationToken = default)
    {
        var (source, target) = await VisibleOrThrowAsync(username, templateId, cancellationToken);

        var candidateIds = source.TemplateExercises.Select(te => te.ExerciseId).ToList();
        var visibleIds = await VisibleExerciseIdsAsync(candidateIds, cancellationToken);

        // Kaynağın ÖZEL veya ARŞİVLENMİŞ egzersizleri kopyalayana görünmez/kopyalanmaz --
        // ownership kuralı (CLAUDE.md Yetkilendirme Kuralı) ve `WorkoutTemplateService`'in yeni
        // seçim kuralıyla aynı ("arşivlenmiş bir egzersiz YENİ bir seçime giremez"; burada
        // kopya YENİ bir şablon olduğu için tüm satırlar "yeni seçim"dir). Bu satırlar sessizce
        // atlanır, uygun olanlar kalır -- liste ve detay yanıtlarıyla AYNI filtre
        // (`VisibleExerciseIdsAsync`), böylece izleyicinin gördüğü ile kaydettiği asla ayrışmaz.
        var kopyalanacaklar = source.TemplateExercises
            .Where(te => visibleIds.Contains(te.ExerciseId))
            .OrderBy(te => te.OrderIndex)
            .ToList();

        if (kopyalanacaklar.Count == 0 && source.TemplateExercises.Count > 0)
            throw new ValidationException("Bu şablonun hiçbir hareketi kaydedilemedi.");

        // Rota parametresindeki `username` degil, DB'den gelen guncel/dogru buyuk-kucuk harfli
        // `target.Username` kullanilir (#467 final review) -- rota harfleri farkli yazilmis olabilir.
        var name = await UniqueNameAsync(source.Name, target.Username, cancellationToken);

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

    private async Task<(WorkoutTemplate Template, User Target)> VisibleOrThrowAsync(
        string username, long templateId, CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var isSelf = target.Id == currentUser.UserId;
        if (!isSelf && !await friendshipService.AreFriendsAsync(currentUser.UserId, target.Id, cancellationToken))
            throw new NotFoundException(TemplateNotFound);

        var template = await templateRepository.GetOwnedByIdAsync(templateId, target.Id, cancellationToken);
        if (template is null || (!isSelf && !IsVisible(template, target.PrivacyLevel)))
            throw new NotFoundException(TemplateNotFound);

        return (template, target);
    }

    /// <summary>
    /// Verilen egzersiz id'lerinden İZLEYENE (viewer = `currentUser.UserId`) görünen (kendi veya
    /// global) VE arşivlenmemiş olanların id kümesi -- liste/detay okuması ve kopyalama TEK bu
    /// kümeye göre filtreler (#467 final review), böylece izleyicinin gördüğü ile kopyaladığı
    /// asla ayrışmaz. Arşivli olan da elenir: `WorkoutTemplateService.ReplaceExercisesAsync`
    /// "arşivlenmiş bir egzersiz YENİ bir seçime giremez" kuralıyla aynı -- kopya her zaman YENİ
    /// bir şablon olduğu için kaynaktaki her satır bu kopya için "yeni seçim"dir.
    /// </summary>
    private async Task<HashSet<long>> VisibleExerciseIdsAsync(
        IReadOnlyCollection<long> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
            return [];

        var visible = await exerciseRepository.GetVisibleByIdsAsync(ids, currentUser.UserId, cancellationToken);
        return visible.Where(e => !e.IsArchived).Select(e => e.Id).ToHashSet();
    }

    private async Task<string> UniqueNameAsync(string name, string sourceUsername, CancellationToken cancellationToken)
    {
        if (!await templateRepository.NameExistsAsync(currentUser.UserId, name, null, cancellationToken))
            return name;

        // WorkoutTemplate.Name varchar(100) (WorkoutTemplateConfiguration), Username varchar(50)
        // (UserConfiguration): "{ad} ({kullanıcı [sayaç]})" eki bu ikisi üst üste eklenince 100'ü
        // aşabilir. Ek KISALTILMAZ (kullanıcı adını yarım göstermek yanıltıcı olurdu) -- bunun
        // yerine TABAN (name) eke sığacak kadar kırpılır.
        const int MaxLen = 100;

        static string Aday(string ad, string sourceUsername, int? sayac, int maxLen)
        {
            var ek = sayac is null ? $" ({sourceUsername})" : $" ({sourceUsername} {sayac})";
            var tabanSiniri = Math.Max(0, maxLen - ek.Length);
            var taban = ad.Length > tabanSiniri ? ad[..tabanSiniri] : ad;
            return $"{taban}{ek}";
        }

        var aday = Aday(name, sourceUsername, null, MaxLen);
        var sayac = 2;
        while (await templateRepository.NameExistsAsync(currentUser.UserId, aday, null, cancellationToken))
        {
            aday = Aday(name, sourceUsername, sayac, MaxLen);
            sayac++;
        }
        return aday;
    }

    private static bool IsVisible(WorkoutTemplate template, PrivacyLevel ownerLevel) =>
        template.IsSharedOverride ?? ownerLevel != PrivacyLevel.Gizli;
}
