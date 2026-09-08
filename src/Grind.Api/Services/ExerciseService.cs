using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Api.Services;

public class ExerciseService(
    IExerciseRepository exerciseRepository,
    IRepository<ExerciseMedia> mediaRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : IExerciseService
{
    /// <summary>
    /// TEK bir "bulunamadı" metni. Sahiplik hakkında hiçbir şey söylemez: "bu kayıt size ait
    /// değil" demek, 403 yerine 404 dönme kararını (Faz 3) tamamen geçersiz kılardı.
    /// </summary>
    private const string NotFound = "Egzersiz bulunamadı.";

    /// <summary>
    /// DİKKAT: <c>OwnershipGuard.EnsureOwnedBy</c>'nin üçüncü parametresi tam bir cümle değil,
    /// bir KAYNAK ADIDIR — guard mesajı kendisi "{ad} üzerinde değişiklik yapma izniniz yok."
    /// şeklinde kuruyor. Buraya cümle geçirmek bozuk bir metin üretir.
    /// </summary>
    private const string GlobalResourceName = "Varsayılan egzersiz";

    public async Task<IReadOnlyList<ExerciseResponse>> GetAllAsync(
        bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var exercises = await exerciseRepository.GetVisibleAsync(
            currentUser.UserId, includeArchived, cancellationToken);

        return exercises.Select(ToResponse).ToList();
    }

    public async Task<ExerciseResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await VisibleOrThrowAsync(id, includeMedia: true, cancellationToken));

    public async Task<ExerciseResponse> CreateAsync(
        CreateExerciseRequest request, CancellationToken cancellationToken = default)
    {
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: null, cancellationToken);

        var exercise = new Exercise
        {
            UserId = currentUser.UserId,
            Name = name,
            Category = request.Category!.Value,
            IsArchived = false
        };

        exerciseRepository.Add(exercise);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(exercise);
    }

    public async Task<ExerciseResponse> UpdateAsync(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(id, includeMedia: true, cancellationToken);
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: exercise.Id, cancellationToken);

        exercise.Name = name;
        exercise.Category = request.Category!.Value;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(exercise);
    }

    public Task ArchiveAsync(long id, CancellationToken cancellationToken = default)
        => SetArchivedAsync(id, isArchived: true, cancellationToken);

    public Task RestoreAsync(long id, CancellationToken cancellationToken = default)
        => SetArchivedAsync(id, isArchived: false, cancellationToken);

    public async Task<ExerciseMediaResponse> AddMediaAsync(
        long exerciseId, AddMediaRequest request, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(exerciseId, includeMedia: false, cancellationToken);

        var media = new ExerciseMedia
        {
            ExerciseId = exercise.Id,
            MediaType = request.MediaType!.Value,
            Url = request.Url.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        mediaRepository.Add(media);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(media);
    }

    public async Task RemoveMediaAsync(
        long exerciseId, long mediaId, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(exerciseId, includeMedia: true, cancellationToken);

        // Medyanın GERÇEKTEN bu egzersize ait olduğu doğrulanmalı: yalnızca mediaId ile
        // silmek, kullanıcının kendi egzersiz Id'siyle başkasının medyasını silmesine
        // izin verirdi (IDOR).
        var media = exercise.Media.FirstOrDefault(m => m.Id == mediaId)
                    ?? throw new NotFoundException(NotFound);

        mediaRepository.Remove(media);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetArchivedAsync(
        long id, bool isArchived, CancellationToken cancellationToken)
    {
        var exercise = await OwnedOrThrowAsync(id, includeMedia: false, cancellationToken);

        exercise.IsArchived = isArchived;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Görünür mü? Değilse 404 — başkasının kaydı da "yok" sayılır.</summary>
    private async Task<Exercise> VisibleOrThrowAsync(
        long id, bool includeMedia, CancellationToken cancellationToken)
        => await exerciseRepository.GetVisibleByIdAsync(
               id, currentUser.UserId, includeMedia, cancellationToken)
           ?? throw new NotFoundException(NotFound);

    /// <summary>
    /// Yazma yolları için: önce görünürlük (404), sonra sahiplik (403). Sıra önemli —
    /// görünürlük kontrolü başkasının kaydını zaten eleyeceği için buradaki 403 pratikte
    /// "bu global bir kayıt" anlamına gelir.
    /// </summary>
    private async Task<Exercise> OwnedOrThrowAsync(
        long id, bool includeMedia, CancellationToken cancellationToken)
    {
        var exercise = await VisibleOrThrowAsync(id, includeMedia, cancellationToken);
        OwnershipGuard.EnsureOwnedBy(exercise.UserId, currentUser.UserId, GlobalResourceName);
        return exercise;
    }

    private async Task EnsureNameFreeAsync(
        string trimmedName, long? excludeId, CancellationToken cancellationToken)
    {
        if (await exerciseRepository.NameExistsAsync(
                currentUser.UserId, trimmedName, excludeId, cancellationToken))
        {
            throw new ConflictException($"'{trimmedName}' adında bir egzersiziniz zaten var.");
        }
    }

    /// <summary>
    /// "  " (yalnızca boşluk) hem [Required]'i (yalnızca boş dizeyi eler) hem
    /// [StringLength(MinimumLength = 2)]'yi geçiyor; Trim'den sonra boş kalıyor. Bu yüzden
    /// isim ÖNCE trim'lenir, SONRA uzunluğu kontrol edilir — ve doğrulanan/saklanan değer
    /// hep bu trim'lenmiş hâl olur (Faz 5 Görev 3 incelemesinin bulduğu boşluk).
    /// </summary>
    private static string RequireTrimmedName(string name)
    {
        var trimmed = name.Trim();
        if (trimmed.Length < 2)
        {
            throw new ValidationException("Egzersiz adı 2-100 karakter olmalı.");
        }

        return trimmed;
    }

    private static ExerciseResponse ToResponse(Exercise exercise) => new(
        exercise.Id,
        exercise.Name,
        exercise.Category,
        exercise.IsArchived,
        IsGlobal: exercise.UserId is null,
        exercise.Media.Select(ToResponse).ToList());

    private static ExerciseMediaResponse ToResponse(ExerciseMedia media) =>
        new(media.Id, media.MediaType, media.Url, media.CreatedAt);
}
