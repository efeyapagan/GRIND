using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class FriendRequestService(
    IFriendRequestRepository requestRepository,
    IFollowRepository followRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFriendRequestService
{
    /// <summary>Aynı kişiye üst üste bu kadar ret sonrası yeni istek gönderilemez (kullanıcı kararı, #628).</summary>
    public const int RejectionLimit = 3;

    public async Task SendAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await OtherAsync(username, cancellationToken);
        var me = currentUser.UserId;

        if (await followRepository.GetAsync(me, target.Id, cancellationToken) is not null
            && await followRepository.GetAsync(target.Id, me, cancellationToken) is not null)
            return;
        if (await requestRepository.GetPendingAsync(me, target.Id, cancellationToken) is not null)
            return;
        if (await requestRepository.CountRejectedAsync(me, target.Id, cancellationToken) >= RejectionLimit)
            throw new ValidationException("Bu kişiye daha fazla arkadaşlık isteği gönderemezsin.");

        requestRepository.Add(new FriendRequest
        {
            RequesterId = me,
            TargetId = target.Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        });

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (ConflictException)
        {
            // Eşzamanlı çift istek: kısmi benzersiz indeks ikinciyi durdurur, sonuç yine "istek bekliyor".
        }
    }

    public async Task WithdrawAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await OtherAsync(username, cancellationToken);
        var request = await requestRepository.GetPendingAsync(currentUser.UserId, target.Id, cancellationToken);
        if (request is null)
            return;

        requestRepository.Remove(request);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AcceptAsync(string username, CancellationToken cancellationToken = default)
    {
        var requester = await OtherAsync(username, cancellationToken);
        var me = currentUser.UserId;
        _ = await IncomingOrThrowAsync(requester.Id, cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (await followRepository.GetAsync(requester.Id, me, cancellationToken) is null)
            followRepository.Add(new Follow { FollowerId = requester.Id, FolloweeId = me, CreatedAt = now });
        if (await followRepository.GetAsync(me, requester.Id, cancellationToken) is null)
            followRepository.Add(new Follow { FollowerId = me, FolloweeId = requester.Id, CreatedAt = now });

        // Çiftin TÜM satırları: karşı yöndeki bekleyen istek ve ret geçmişi de temizlenir (sayaç sıfırlanır).
        foreach (var request in await requestRepository.GetPairAsync(me, requester.Id, cancellationToken))
            requestRepository.Remove(request);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RejectAsync(string username, CancellationToken cancellationToken = default)
    {
        var requester = await OtherAsync(username, cancellationToken);
        var request = await IncomingOrThrowAsync(requester.Id, cancellationToken);
        request.RejectedAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> OtherAsync(string username, CancellationToken cancellationToken)
    {
        var other = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        if (other.Id == currentUser.UserId)
            throw new ValidationException("Kendine arkadaşlık isteği gönderemezsin.");
        return other;
    }

    private async Task<FriendRequest> IncomingOrThrowAsync(long requesterId, CancellationToken cancellationToken)
        => await requestRepository.GetPendingAsync(requesterId, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException("Arkadaşlık isteği bulunamadı.");
}
