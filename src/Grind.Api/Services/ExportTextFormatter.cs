using System.Globalization;
using System.Text;
using Grind.Api.Common.Records;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Api.Services;

/// <summary>
/// Export modelini bir yapay zeka ajanına yapıştırılabilir düz metne çevirir (Faz 11 spec Karar 6).
///
/// SAF: veritabanı, saat ve kültür bağımlılığı yok, aynı model her makinede aynı metni üretir. Metin
/// ayrı sorgulardan değil JSON modelinin KENDİSİNDEN türer, bu yüzden ikisi ayrışamaz (spec Karar 3).
/// Sıra modelden gelir (spec Karar 7); formatlayıcı yeniden sıralamaz.
/// </summary>
public static class ExportTextFormatter
{
    /// <summary>
    /// Sayılar kültürden bağımsız: tr-TR "152.340" yazar ve bir LLM bunu 152,34 diye okuyabilir.
    /// </summary>
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    /// <summary>
    /// <see cref="DayOfWeek"/> sırasıyla (Sunday = 0). Kültür verisinden okunmaz, çıktı ICU'suz bir
    /// ortamda da aynı kalır. LLM'ler tarihten haftanın gününü hesaplamakta güvenilmezdir.
    /// </summary>
    private static readonly string[] DayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    private static readonly string[] LegendLines =
    [
        "Saatler Türkiye yerel saatidir.",
        "Setler ağırlık×tekrar biçimindedir; ağırlıklar kg, 0 = ek yük yok (yalnızca vücut ağırlığı).",
        "Hacim = ağırlık × tekrar.",
        "RIR = yedekte kalan tekrar.",
        "[PR: ağırlık] = o egzersizde o ana kadarki en ağır set.",
        "[PR: tekrar] = aynı ağırlıkta o ana kadarki en çok tekrar.",
        "Süreyle ölçülen hareketlerin (plank gibi) setleri saniye olarak yazılır (\"45 sn\"); " +
        "[PR: süre] = o ana kadarki en uzun süre.",
        "Hareket adının başındaki sayı (\"1.\", \"2.\"...) o oturumda kaçıncı sırada yapıldığıdır; " +
        "sıra performansı etkiler (ör. günün ilk hareketinde daha güçlü olunur) -- karşılaştırma " +
        "yaparken dikkate alınmalıdır."
    ];

    /// <summary>
    /// Yalnızca <see cref="ExportTextOptions.MarkWarmups"/> açıkken eklenir (#444): kullanıcıya
    /// dönen export'ta bir "(ısınma)" işareti olmadığı için açıklaması da olmamalı.
    /// </summary>
    private const string WarmupLegend =
        "\"(ısınma)\" işaretli setler, hareketin başındaki daha hafif setlerdir (uygulamanın " +
        "tahmini, kullanıcının işareti değil) -- ilerleme ve hacim karşılaştırmasında çalışma " +
        "setleriyle bir tutulmamalıdır.";

    private const string EmptyRange = "Bu aralıkta kayıt yok.";

    public static string Format(ExportResponse export, ExportTextOptions? options = null)
    {
        options ??= ExportTextOptions.Default;

        var text = new StringBuilder();

        Line(text, "# GRIND antrenman verisi");
        Line(text, $"Aralık: {RangeText(export.From, export.To)}");
        Line(text, $"Oluşturulma: {LocalDateTimeText(export.GeneratedAt)} (TR)");
        Line(text);
        Line(text, "Açıklamalar:");
        foreach (var legend in LegendLines)
        {
            Line(text, $"- {legend}");
        }

        if (options.MarkWarmups)
        {
            Line(text, $"- {WarmupLegend}");
        }

        AppendSummary(text, export.Summary);
        AppendVolumeByExercise(text, export.Summary.VolumeByExercise);
        AppendRecords(text, export.AllTimeRecords);
        AppendOverreaching(text, export.Overreaching);
        AppendSessions(text, export.Sessions, options);
        AppendBodyWeights(text, export.BodyWeights);

        return text.ToString();
    }

    private static void AppendSummary(StringBuilder text, ExportSummaryResponse summary)
    {
        Section(text, "Özet");
        Line(text, Inv($"- Antrenman günü: {summary.TrainedDayCount}"));
        Line(text, Inv($"- Oturum (en az bir seti olan): {summary.SessionCount}"));
        Line(text, Inv($"- Set: {summary.SetCount}"));
        Line(text, Inv($"- Toplam hacim: {summary.TotalVolume:0.##} kg"));
        Line(text, Inv(
            $"- Seri (tüm geçmişten): mevcut {summary.CurrentWeekStreak} hafta, en uzun {summary.LongestWeekStreak} hafta"));
    }

    private static void AppendVolumeByExercise(
        StringBuilder text, IReadOnlyList<ExerciseVolumeResponse> volumes)
    {
        Section(text, "Egzersiz bazında hacim");

        if (volumes.Count == 0)
        {
            Line(text, EmptyRange);
            return;
        }

        foreach (var volume in volumes)
        {
            Line(text,
                Inv($"- {SingleLine(volume.ExerciseName)}: {volume.Volume:0.##} kg ({volume.SetCount} set)"));
        }
    }

    private static void AppendRecords(StringBuilder text, IReadOnlyList<ExerciseRecordResponse> records)
    {
        // Etiket, AI'ya rekoru aralıktaki bir sete bağlamaya çalışmamasını söyler (spec Karar 2).
        Section(text, "Tüm zamanların rekorları (aralıktan bağımsız)");

        if (records.Count == 0)
        {
            Line(text, "Henüz kayıt yok.");
            return;
        }

        foreach (var record in records)
        {
            var head = $"- {SingleLine(record.ExerciseName)} ({record.Category}): ";

            // #346: süreli harekette tek "en iyi" en uzun süredir; kilo ve tekrar anlamsız.
            if (record.BestDurationSeconds is { } seconds)
            {
                Line(text, head + $"en uzun {DurationText(seconds)} ({LocalDateText(record.BestWeightAt)})");
                continue;
            }

            Line(text, head +
                $"en ağır {SetText(record.BestWeight, record.BestWeightReps, null)} ({LocalDateText(record.BestWeightAt)}) · " +
                $"en çok tekrar {SetText(record.BestRepsWeight, record.BestReps, null)} ({LocalDateText(record.BestRepsAt)})");
        }
    }

    /// <summary>
    /// #176: aşırı yüklenme sinyali — yalnızca yanıyorsa. GRINDY yorumu bu metinle üretildiği için sinyali görür
    /// ve açıklar; ayrı bir AI akışı yoktur.
    /// </summary>
    private static void AppendOverreaching(StringBuilder text, OverreachingSignalResponse? signal)
    {
        if (signal is null)
        {
            return;
        }

        Section(text, "Aşırı yüklenme sinyali (bugüne göre, aralıktan bağımsız)");
        Line(text, "Son 14 günün en iyi tahmini 1RM'i önceki 28 güne göre en az %5 düştü ve efor arttı:");
        foreach (var drop in signal.Drops)
        {
            Line(text, Inv(
                $"- {SingleLine(drop.ExerciseName)}: tahmini 1RM {drop.PreviousBest:0.##} → {drop.RecentBest:0.##} kg (−{drop.DropPercent:0.#}%)"));
        }

        if (signal is { RirBefore: { } before, RirRecent: { } recent })
        {
            Line(text, Inv($"- Ortalama RIR: {before:0.#} → {recent:0.#}"));
        }

        if (signal.RatedSessions > 0)
        {
            // Ek yok: "{N}'ü" sayıya göre yanlış çekimlenirdi ("2'ü", "1'ü").
            Line(text, Inv($"- Zorluğu işaretli antrenman: {signal.RatedSessions}, Zor/Maksimal: {signal.HardSessions}"));
        }
    }

    private static void AppendSessions(
        StringBuilder text, IReadOnlyList<HistorySessionResponse> sessions, ExportTextOptions options)
    {
        Section(text, "Oturumlar");

        var gosterilecek = options.SkipEmptySessions
            ? sessions.Where(s => s.Sets.Count > 0 || !string.IsNullOrWhiteSpace(s.Notes)).ToList()
            : sessions;

        if (gosterilecek.Count == 0)
        {
            Line(text, EmptyRange);
            return;
        }

        for (var i = 0; i < gosterilecek.Count; i++)
        {
            if (i > 0)
            {
                Line(text);   // oturumlar arasında boş satır
            }

            AppendSession(text, gosterilecek[i], options);
        }
    }

    private static void AppendSession(
        StringBuilder text, HistorySessionResponse session, ExportTextOptions options)
    {
        var header = $"### {SessionTimeText(session.StartedAt, session.EndedAt)}";
        Line(text, session.TemplateName is { } template ? $"{header} · {SingleLine(template)}" : header);

        if (!string.IsNullOrWhiteSpace(session.Notes))
        {
            Line(text, $"Not: {SingleLine(session.Notes)}");
        }

        if (session.Difficulty is { } difficulty)
        {
            Line(text, $"Zorluk: {DifficultyText(difficulty)}");
        }

        if (session.Sets.Count == 0)
        {
            Line(text, "(Bu oturumda set girilmedi.)");
            return;
        }

        // GroupBy anahtarları ilk görünme sırasıyla, elemanları kendi sırasıyla verir: egzersizler
        // oturumdaki ilk setlerinin sırasıyla, setler kronolojik yazılır. Pozisyon numarası (#230)
        // bu yüzden burada AYRICA hesaplanmaz -- `ExercisePosition` zaten aynı sırayı taşır.
        foreach (var exercise in session.Sets.GroupBy(s => s.ExerciseId))
        {
            var sets = exercise.ToList();
            var ilk = sets[0];

            // Isınma kuralı HAREKET bazlıdır: bir hareketin ısınması diğerini etkilemez (#444).
            var isinmaSayisi = options.MarkWarmups
                ? WarmupDetector.WarmupCount(sets.ConvertAll(s => s.Weight))
                : 0;

            Line(text,
                Inv($"- {ilk.ExercisePosition}. {SingleLine(ilk.ExerciseName)}: ") +
                $"{string.Join(", ", sets.Select((s, i) => SetWithMarks(s, isinma: i < isinmaSayisi)))}");
        }

        Line(text, Inv($"Toplam: {session.SetCount} set, {session.TotalVolume:0.##} kg"));
    }

    /// <summary>
    /// "Vücut ölçüleri" (issue #119 öncesi "Vücut ağırlığı"): bir kayıtta üç ölçünün (kilo, yağ
    /// oranı, bel çevresi) yalnızca bazıları dolu olabilir -- satır SADECE dolu olanları gösterir.
    /// </summary>
    private static void AppendBodyWeights(StringBuilder text, IReadOnlyList<BodyWeightLogResponse> logs)
    {
        Section(text, "Vücut ölçüleri");

        if (logs.Count == 0)
        {
            Line(text, EmptyRange);
            return;
        }

        foreach (var log in logs)
        {
            var local = TurkeyDay.ToLocal(log.RecordedAt);
            Line(text, Inv($"- {DayText(local)} {TimeText(local)} — {OlcuMetni(log)}"));
        }
    }

    private static string OlcuMetni(BodyWeightLogResponse log)
    {
        var parcalar = new List<string>();
        if (log.Weight is { } weight) parcalar.Add(Inv($"{weight:0.##} kg"));
        if (log.HeightCm is { } boy) parcalar.Add(Inv($"{boy:0.##} cm boy"));
        if (log.BodyFatPercent is { } yagOrani) parcalar.Add(Inv($"%{yagOrani:0.##} yağ"));
        if (log.WaistCm is { } bel) parcalar.Add(Inv($"{bel:0.##} cm bel"));
        if (log.HipCm is { } kalca) parcalar.Add(Inv($"{kalca:0.##} cm kalça"));
        return string.Join(", ", parcalar);
    }

    /// <summary>Sabit TR etiketi — enum adı (ör. "Hard") LLM'e İngilizce sızmasın.</summary>
    private static string DifficultyText(SessionDifficulty difficulty) => difficulty switch
    {
        SessionDifficulty.VeryEasy => "Çok kolay",
        SessionDifficulty.Easy => "Kolay",
        SessionDifficulty.Medium => "Orta",
        SessionDifficulty.Hard => "Zor",
        SessionDifficulty.Maximal => "Maksimal",
        _ => difficulty.ToString()
    };

    /// <summary>
    /// #266: uygulamadaki kaydırıcı durağıyla aynı yazım — 2 → "2", 2.5 → "2–3", 5 ve üstü → "4+"
    /// (eski kayıtlarda 5'ten büyük RIR olabilir). İstemci karşılığı: <c>packages/shared/src/lib/rir.ts</c>.
    /// </summary>
    private static string RirText(decimal rir)
    {
        if (rir >= 5)
        {
            return "4+";
        }

        var whole = decimal.Truncate(rir);
        return rir == whole ? Inv($"{whole:0}") : Inv($"{whole:0}–{whole + 1:0}");
    }

    private static string SetWithMarks(SetEntryResponse set, bool isinma = false)
    {
        var text = SetText(set.Weight, set.Reps, set.DurationSeconds);

        if (isinma)
        {
            text += " (ısınma)";
        }

        if (set.Rir is { } rir)
        {
            text += $" (RIR {RirText(rir)})";
        }

        return set.RecordType switch
        {
            RecordType.Weight => text + " [PR: ağırlık]",
            RecordType.Reps => text + " [PR: tekrar]",
            RecordType.Duration => text + " [PR: süre]",
            _ => text
        };
    }

    /// <summary>
    /// "2026-03-02 Pzt 18:30–19:45". Bitiş başka bir TR gününe düşerse "(+N gün)" eklenir. Gece
    /// yarısını aşan ya da unutulup günler sonra kapatılan bir oturum böyle görünür.
    /// </summary>
    private static string SessionTimeText(DateTime startedAtUtc, DateTime? endedAtUtc)
    {
        var start = TurkeyDay.ToLocal(startedAtUtc);
        var text = $"{DayText(start)} {TimeText(start)}–";

        if (endedAtUtc is not { } endUtc)
        {
            return text + "(bitirilmedi)";
        }

        var end = TurkeyDay.ToLocal(endUtc);
        var dayOffset = (end.Date - start.Date).Days;

        return dayOffset == 0
            ? text + TimeText(end)
            : text + TimeText(end) + Inv($" (+{dayOffset} gün)");
    }

    private static string RangeText(DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end)
        {
            return $"{DateText(start)} – {DateText(end)} (TR yerel günü, iki uç dahil)";
        }

        if (from is { } onlyStart)
        {
            return $"{DateText(onlyStart)} ve sonrası";
        }

        if (to is { } onlyEnd)
        {
            return $"{DateText(onlyEnd)} ve öncesi";
        }

        return "tüm geçmiş";
    }

    /// <summary>"60×8"; #346: süreli set "45 sn" (set ya tekrar ya süre taşır).</summary>
    private static string SetText(decimal weight, int? reps, int? durationSeconds) =>
        durationSeconds is { } seconds ? DurationText(seconds) : Inv($"{weight:0.##}×{reps}");

    private static string DurationText(int seconds) => Inv($"{seconds} sn");

    private static string DateText(DateOnly date) => date.ToString("yyyy-MM-dd", Invariant);

    private static string LocalDateText(DateTime utcInstant) => DateText(TurkeyDay.LocalDateOf(utcInstant));

    private static string DayText(DateTime local) =>
        $"{DateText(DateOnly.FromDateTime(local))} {DayNames[(int)local.DayOfWeek]}";

    private static string TimeText(DateTime local) => local.ToString("HH:mm", Invariant);

    private static string LocalDateTimeText(DateTime utcInstant)
    {
        var local = TurkeyDay.ToLocal(utcInstant);
        return $"{DateText(DateOnly.FromDateTime(local))} {TimeText(local)}";
    }

    /// <summary>
    /// Kullanıcının kendi girdiği HER metin (not, egzersiz adı, şablon adı, ...) buradan geçer:
    /// aksi halde içinde "\n## ..." taşıyan bir ad, belgeye sahte bir başlık enjekte edebilirdi.
    /// </summary>
    private static string SingleLine(string text) => text.ReplaceLineEndings(" ").Trim();

    private static void Section(StringBuilder text, string title)
    {
        Line(text);
        Line(text, $"## {title}");
    }

    /// <summary>Satır sonu HER ZAMAN \n: <c>Environment.NewLine</c> çıktıyı işletim sistemine bağlardı.</summary>
    private static void Line(StringBuilder text, string value = "") => text.Append(value).Append('\n');

    /// <summary>Sayı içeren her satır buradan geçer: çalışma ortamının kültürü çıktıyı değiştiremez.</summary>
    private static string Inv(FormattableString value) => value.ToString(Invariant);
}
