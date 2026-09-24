using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;

namespace Grind.Api.Services;

/// <summary>
/// Arkadaşın antrenman verisini SALT OKUMA (#282) — Yetkilendirme Kuralı'na kontrollü istisna (CLAUDE.md).
/// Her metot önce aynı kontrolden geçer: hedef aktif değilse ya da yoksa 404, bakan kendisi ya da arkadaşı
/// (karşılıklı takip) değilse 403. Yetki her istekte veritabanından okunur; takipten çıkıldığı an erişim biter.
/// Paylaşılmayanlar: oturum notu, ölçüler, AI yorumları, export.
/// </summary>
public interface IFriendActivityService
{
    /// <summary><c>/api/history</c> ile aynı filtreler ve hesap; oturum notu hariç.</summary>
    Task<PagedResponse<FriendHistorySessionResponse>> GetHistoryAsync(
        string username, HistoryQuery query, CancellationToken cancellationToken = default);

    /// <summary><c>/api/records</c> ile aynı yanıt.</summary>
    Task<IReadOnlyList<ExerciseRecordResponse>> GetRecordsAsync(
        string username, CancellationToken cancellationToken = default);
}
