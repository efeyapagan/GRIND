namespace Grind.Api.Models.Entities;

/// <summary>
/// Profil fotoğrafı (#280), veritabanında. <see cref="User"/>'dan ayrı tablo: her kullanıcı sorgusunda
/// (ör. kimlikli her istekteki pasiflik kontrolü) resim baytları taşınmasın. Kullanıcı başına en fazla
/// bir satır (<see cref="UserId"/> benzersiz); yeni yükleme eskisinin yerine geçer.
/// </summary>
public class UserAvatar
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public byte[] Content { get; set; } = null!;

    /// <summary>Dosyanın imzasından belirlenir, istemcinin beyanından değil.</summary>
    public string ContentType { get; set; } = null!;

    /// <summary>Son yükleme anı (UTC); istemcide önbellek kırıcı ve <c>ETag</c> olarak kullanılır.</summary>
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
