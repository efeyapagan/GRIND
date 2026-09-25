using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// <c>UserId</c> bilerek dışarı verilmiyor: istemcinin ihtiyacı olan tek şey kaydın
/// düzenlenebilir olup olmadığı, o da <see cref="IsGlobal"/> ile anlatılıyor. Ham sahip
/// kimliğini yayınlamak başka kullanıcıların Id'lerini sızdırma yolu açar.
/// </summary>
/// <param name="Media">
/// SADECE detay endpoint'inde (<c>GET /api/exercises/{id}</c>) doldurulur. Liste endpoint'i
/// (<c>GET /api/exercises</c>) sorguya bilerek <c>Include(e =&gt; e.Media)</c> eklemiyor —
/// bu yüzden listedeki her satırda bu alan hep boş dizi döner. Boş dizi burada "medyası yok"
/// DEĞİL, "bu uçta hiç yüklenmedi" anlamına gelir; gerçek medya listesi için detay endpoint'i
/// çağrılmalı.
/// </param>
/// <param name="AlternateName">
/// Aynı hareketin salonlarda farklı adlandırıldığı durumlar için ikinci bir arama adı (ör.
/// "Pec Deck" / "Chest Fly Machine"). Yalnızca global egzersizlerde seed veriyle set edilir —
/// Create/Update uçlarından yazılamaz (kapsam: #335).
/// </param>
public record ExerciseResponse(
    long Id,
    string Name,
    string? AlternateName,
    ExerciseCategory Category,
    bool IsArchived,
    bool IsGlobal,
    IReadOnlyList<ExerciseMediaResponse> Media);
