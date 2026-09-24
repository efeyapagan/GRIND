using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;

namespace Grind.Api.Services;

/// <summary>
/// Başkasının antrenman verisini SALT OKUMA (#282, #294'te gizlilik seviyesine göre genişledi) —
/// Yetkilendirme Kuralı'na kontrollü istisna (CLAUDE.md). Hedef aktif değilse ya da yoksa 404; aksi
/// hâlde kimlikli HERHANGİ bir kullanıcı görebilir — kapı artık arkadaşlık değil, hedefin kendi
/// <c>PrivacyLevel</c> tercihi: <c>Acik</c> tüm geçmiş, <c>Kisitli</c> yalnızca son 5 antrenman,
/// <c>Gizli</c> geçmişte boş liste döner (403 DEĞİL — bu bir yetki hatası değil, sahibinin tercihi).
/// Rekorlar üç seviyede de görünür. Hesap sahibi kendi verisini seviyeden bağımsız tam görür.
/// Paylaşılmayanlar: oturum notu, ölçüler, AI yorumları, export.
/// </summary>
public interface IPublicActivityService
{
    /// <summary><c>/api/history</c> ile aynı filtreler ve hesap; oturum notu hariç.</summary>
    Task<PagedResponse<FriendHistorySessionResponse>> GetHistoryAsync(
        string username, HistoryQuery query, CancellationToken cancellationToken = default);

    /// <summary><c>/api/records</c> ile aynı yanıt.</summary>
    Task<IReadOnlyList<ExerciseRecordResponse>> GetRecordsAsync(
        string username, CancellationToken cancellationToken = default);
}
