using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// <paramref name="IsOpen"/> türetilmiştir (<c>EndedAt is null</c>) — istemcinin null
/// kontrolü yazmasına gerek kalmasın.
/// <paramref name="Difficulty"/> null ise kullanıcı bitirirken zorluk seçmedi/atladı; oturum hâlâ
/// açıksa da null'dır (yalnızca <c>finish</c> gövdesinde belirlenir, sonradan değiştirilemez).
/// <paramref name="Progress"/> BOŞ LİSTE iki farklı durumda gelir ve bunlar istemci için
/// AYNI ŞEY DEĞİLDİR: (1) antrenmanın hareket listesi boş (şablonsuz ve setsiz); (2)
/// bu yanıt <c>GET /api/sessions</c> (liste) ucundan geliyor — N+1'den kaçınmak için liste
/// ucu şablonlu olsa bile ilerlemeyi HİÇ hesaplamaz, yalnızca <c>GET /api/sessions/{id}</c>
/// ve <c>GET /api/sessions/open</c> gerçek ilerlemeyi doldurur. İstemci ikisini
/// <c>templateId != null &amp;&amp; progress.Count == 0</c> ile ayırt edebilir: bu true ise
/// "şablonu var ama ilerleme bu uçta hesaplanmadı, detay/open ucuna sor" anlamına gelir.
/// </summary>
public record SessionResponse(
    long Id,
    DateTime StartedAt,
    DateTime? EndedAt,
    bool IsOpen,
    long? TemplateId,
    string? TemplateName,
    string? Notes,
    SessionDifficulty? Difficulty,
    IReadOnlyList<SessionProgressResponse> Progress);
