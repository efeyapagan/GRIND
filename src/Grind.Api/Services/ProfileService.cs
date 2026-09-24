using Grind.Api.Common;
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class ProfileService(
    IUserRepository userRepository,
    IUserAvatarRepository avatarRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IProfileService
{
    public const int MaxDisplayNameLength = 50;
    public const int MinAge = 13;
    public const int MaxAge = 120;

    /// <summary>İstemci yüklemeden önce küçültür (ör. 256×256 JPEG); sunucu yine de sınır koyar.</summary>
    public const int MaxAvatarBytes = 256 * 1024;

    public async Task<ProfileResponse> GetAsync(CancellationToken cancellationToken = default)
        => await ResponseForAsync(await GetCurrentUserAsync(cancellationToken), cancellationToken);

    public async Task<ProfileResponse> UpdateAsync(
        UpdateProfileDetailsRequest request, CancellationToken cancellationToken = default)
    {
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        if (displayName?.Length > MaxDisplayNameLength)
            throw new ValidationException($"Görünen isim en fazla {MaxDisplayNameLength} karakter olabilir.");

        if (request.BirthDate is { } birthDate)
        {
            if (birthDate > Today())
                throw new ValidationException("Doğum tarihi gelecekte olamaz.");

            var age = AgeCalculator.AgeOn(birthDate, Today());
            if (age is < MinAge or > MaxAge)
                throw new ValidationException($"Yaş {MinAge} ile {MaxAge} arasında olmalı.");
        }

        var user = await GetCurrentUserAsync(cancellationToken);
        user.DisplayName = displayName;
        user.BirthDate = request.BirthDate;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ResponseForAsync(user, cancellationToken);
    }

    public async Task SetAvatarAsync(Stream content, CancellationToken cancellationToken = default)
    {
        var bytes = await ReadLimitedAsync(content, cancellationToken)
                    ?? throw new ValidationException($"Fotoğraf en fazla {MaxAvatarBytes / 1024} KB olabilir.");
        var contentType = DetectImageType(bytes)
                          ?? throw new ValidationException("Fotoğraf JPEG, PNG ya da WebP olmalı.");

        var avatar = await avatarRepository.GetByUserIdAsync(currentUser.UserId, cancellationToken);
        if (avatar is null)
        {
            avatar = new UserAvatar { UserId = currentUser.UserId };
            avatarRepository.Add(avatar);
        }

        avatar.Content = bytes;
        avatar.ContentType = contentType;
        avatar.UpdatedAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAvatarAsync(CancellationToken cancellationToken = default)
    {
        var avatar = await avatarRepository.GetByUserIdAsync(currentUser.UserId, cancellationToken);
        if (avatar is null)
            return;

        avatarRepository.Remove(avatar);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AvatarContent> GetAvatarAsync(string username, CancellationToken cancellationToken = default)
    {
        // Kullanıcı yok, pasif ya da fotoğrafsız: aynı 404 — pasifliği sızmaz.
        var avatar = await avatarRepository.GetByActiveUsernameAsync(
                         UsernameNormalizer.Normalize(username), cancellationToken)
                     ?? throw new NotFoundException("Profil fotoğrafı bulunamadı.");

        return new AvatarContent(avatar.Content, avatar.ContentType, AvatarVersion.Of(avatar.UpdatedAt));
    }

    private async Task<ProfileResponse> ResponseForAsync(User user, CancellationToken cancellationToken)
    {
        var avatarUpdatedAt = await avatarRepository.GetUpdatedAtAsync(user.Id, cancellationToken);

        return new ProfileResponse(
            user.Username,
            user.DisplayName,
            user.BirthDate,
            user.BirthDate is { } birthDate ? AgeCalculator.AgeOn(birthDate, Today()) : null,
            avatarUpdatedAt is not null,
            avatarUpdatedAt is { } updatedAt ? AvatarVersion.Of(updatedAt) : null,
            user.PrivacyLevel);
    }

    private async Task<User> GetCurrentUserAsync(CancellationToken cancellationToken)
        => await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
           ?? throw new UnauthorizedException("Oturum geçersiz.");

    /// <summary>Yaş TR yerel gününe göre: gece yarısından sonra TR'de doğum günü başlamışsa yaş dolmuştur.</summary>
    private DateOnly Today() => TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);

    /// <summary>En fazla <see cref="MaxAvatarBytes"/> okur; akış daha uzunsa <c>null</c> (tamamı belleğe alınmaz).</summary>
    private static async Task<byte[]?> ReadLimitedAsync(Stream content, CancellationToken cancellationToken)
    {
        var buffer = new byte[MaxAvatarBytes + 1];
        var total = 0;
        int read;
        while (total < buffer.Length
               && (read = await content.ReadAsync(buffer.AsMemory(total), cancellationToken)) > 0)
            total += read;

        return total > MaxAvatarBytes ? null : buffer[..total];
    }

    /// <summary>
    /// Türü dosyanın imzasından belirler: istemcinin beyan ettiği <c>Content-Type</c>'a güvenilmez, çünkü
    /// aynı baytlar diğer kullanıcılara bu türle sunulur.
    /// </summary>
    private static string? DetectImageType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
            return "image/jpeg";
        if (bytes.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
            return "image/png";
        if (bytes.Length >= 12 && bytes.StartsWith("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        return null;
    }
}
