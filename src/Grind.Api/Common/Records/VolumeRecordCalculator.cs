using Grind.Api.Models.Projections;

namespace Grind.Api.Common.Records;

/// <summary>
/// Hacim rekoru (#598, kullanıcı kararı): bir antrenman, AYNI şablonun önceki antrenmanlarının en
/// yüksek toplam hacmini (ağırlık × tekrar) kesin olarak geçerse rekordur. İlk antrenman karşılaştıracak
/// bir öncekine sahip olmadığı için rekor sayılmaz; eşit hacim rekor değildir. Şablonsuz antrenmanlar
/// girdiye hiç gelmez (<see cref="TemplateSessionVolume.TemplateId"/> zorunlu).
/// </summary>
public static class VolumeRecordCalculator
{
    public static IReadOnlySet<long> RecordSessionIds(IEnumerable<TemplateSessionVolume> oturumlar)
    {
        var rekorlar = new HashSet<long>();

        foreach (var sablon in oturumlar.GroupBy(o => o.TemplateId))
        {
            decimal? enYuksek = null;
            foreach (var oturum in sablon.OrderBy(o => o.StartedAt).ThenBy(o => o.SessionId))
            {
                if (enYuksek is { } onceki && oturum.Volume > onceki)
                {
                    rekorlar.Add(oturum.SessionId);
                }

                enYuksek = Math.Max(enYuksek ?? oturum.Volume, oturum.Volume);
            }
        }

        return rekorlar;
    }
}
