using System.Globalization;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>
/// Saf formatlayıcı: veritabanı ve sahte saat yok. Tüm anlar UTC verilir; TR = UTC+3 (Türkiye'de
/// yaz saati yok). Model modelden metne tek yönlüdür, JSON ile tutarlılığı ExportServiceTests sınar.
/// </summary>
public class ExportTextFormatterTests
{
    /// <summary>UTC 15:00 = TR 18:00, 10 Mart 2026 Salı.</summary>
    private static readonly DateTime An = new(2026, 3, 10, 15, 0, 0, DateTimeKind.Utc);

    private static ExportResponse Bos(DateOnly? from = null, DateOnly? to = null) => new(
        An, from, to, new ExportSummaryResponse(0, 0, 0, 0m, 0, 0, []), [], [], []);

    private static SetEntryResponse Set(
        long exerciseId, string name, decimal weight, int reps,
        RecordType recordType = RecordType.None, int? rir = null) =>
        new(0, 1, exerciseId, name, weight, reps, recordType, rir, An);

    private static HistorySessionResponse Oturum(
        DateTime startedAt, DateTime? endedAt, params SetEntryResponse[] sets) =>
        new(1, startedAt, endedAt, null, null, sets.Sum(s => s.Weight * s.Reps), sets.Length, sets);

    private static string Formatla(params HistorySessionResponse[] oturumlar) =>
        ExportTextFormatter.Format(Bos() with { Sessions = oturumlar });

    private static DateOnly? Gun(string? value) =>
        value is null ? null : DateOnly.Parse(value, CultureInfo.InvariantCulture);

    /// <summary>
    /// Biçimin tamamını sabitler (spec Karar 6'daki örnek). Bir boşluk, bir tire ya da bir satır
    /// sonu değişirse bu test kırmızıya döner. Değişiklik bilinçliyse spec'teki örnek de güncellenir.
    /// </summary>
    [Fact]
    public void Tam_ciktiyi_birebir_uretir()
    {
        var export = new ExportResponse(
            GeneratedAt: new DateTime(2026, 3, 31, 18, 15, 0, DateTimeKind.Utc),
            From: new DateOnly(2026, 3, 1),
            To: new DateOnly(2026, 3, 31),
            Summary: new ExportSummaryResponse(1, 1, 6, 2785m, 0, 1,
            [
                new ExerciseVolumeResponse(1, "Bench Press", 1625m, 3),
                new ExerciseVolumeResponse(2, "Overhead Press", 1160m, 3)
            ]),
            Sessions:
            [
                new HistorySessionResponse(41,
                    new DateTime(2026, 3, 2, 15, 30, 0, DateTimeKind.Utc),
                    new DateTime(2026, 3, 2, 16, 45, 0, DateTimeKind.Utc),
                    "Push Day A", "omuz sıkıştı", 2785m, 6,
                    [
                        Set(1, "Bench Press", 80m, 8),
                        Set(1, "Bench Press", 80m, 7, rir: 1),
                        Set(1, "Bench Press", 85m, 5, RecordType.Weight),
                        Set(2, "Overhead Press", 40m, 10),
                        Set(2, "Overhead Press", 40m, 10),
                        Set(2, "Overhead Press", 40m, 9)
                    ]),
                new HistorySessionResponse(42,
                    new DateTime(2026, 3, 4, 4, 10, 0, DateTimeKind.Utc), null, null, null, 0m, 0, [])
            ],
            BodyWeights:
            [
                new BodyWeightLogResponse(7, 82.40m, new DateTime(2026, 3, 1, 5, 10, 0, DateTimeKind.Utc))
            ],
            AllTimeRecords:
            [
                new ExerciseRecordResponse(1, "Bench Press", ExerciseCategory.Push,
                    100m, 3, new DateTime(2026, 2, 10, 15, 0, 0, DateTimeKind.Utc),
                    25, 60m, new DateTime(2026, 1, 5, 15, 0, 0, DateTimeKind.Utc))
            ]);

        // Kaynak dosyanın satır sonu (Windows'ta CRLF) beklenen metne sızmasın diye normalize edilir.
        var beklenen = """
            # GRIND antrenman verisi
            Aralık: 2026-03-01 – 2026-03-31 (TR yerel günü, iki uç dahil)
            Oluşturulma: 2026-03-31 21:15 (TR)

            Açıklamalar:
            - Saatler Türkiye yerel saatidir.
            - Setler ağırlık×tekrar biçimindedir; ağırlıklar kg, 0 = ek yük yok (yalnızca vücut ağırlığı).
            - Hacim = ağırlık × tekrar.
            - RIR = yedekte kalan tekrar.
            - [PR: ağırlık] = o egzersizde o ana kadarki en ağır set.
            - [PR: tekrar] = aynı ağırlıkta o ana kadarki en çok tekrar.

            ## Özet
            - Antrenman günü: 1
            - Oturum (en az bir seti olan): 1
            - Set: 6
            - Toplam hacim: 2785 kg
            - Seri (tüm geçmişten): mevcut 0 hafta, en uzun 1 hafta

            ## Egzersiz bazında hacim
            - Bench Press: 1625 kg (3 set)
            - Overhead Press: 1160 kg (3 set)

            ## Tüm zamanların rekorları (aralıktan bağımsız)
            - Bench Press (Push): en ağır 100×3 (2026-02-10) · en çok tekrar 60×25 (2026-01-05)

            ## Oturumlar
            ### 2026-03-02 Pzt 18:30–19:45 · Push Day A
            Not: omuz sıkıştı
            - Bench Press: 80×8, 80×7 (RIR 1), 85×5 [PR: ağırlık]
            - Overhead Press: 40×10, 40×10, 40×9
            Toplam: 6 set, 2785 kg

            ### 2026-03-04 Çar 07:10–(bitirilmedi)
            (Bu oturumda set girilmedi.)

            ## Vücut ağırlığı
            - 2026-03-01 Paz 08:10 — 82.4 kg
            """.ReplaceLineEndings("\n") + "\n";

        var metin = ExportTextFormatter.Format(export);

        Assert.Equal(beklenen, metin);
        // Satır sonu işletim sisteminden bağımsız: \r YOK, belge TEK bir \n ile biter.
        Assert.DoesNotContain("\r", metin);
        Assert.False(metin.EndsWith("\n\n", StringComparison.Ordinal));
    }

    /// <summary>
    /// AYIRT EDİCİ: tr-TR kültürü 82,5 ve 12.340,5 yazar. İkincisi bir LLM için belirsizdir (spec
    /// Karar 6). Çıktı çalışma ortamının kültüründen bağımsız olmalı.
    /// </summary>
    [Fact]
    public void Sayilar_turkce_kulturde_de_nokta_ile_yazilir()
    {
        var onceki = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("tr-TR");
        try
        {
            var metin = ExportTextFormatter.Format(Bos() with
            {
                Summary = new ExportSummaryResponse(1, 1, 1, 12340.5m, 0, 0, []),
                Sessions = [Oturum(An, null, Set(1, "Bench", 82.5m, 8))]
            });

            Assert.Contains("- Toplam hacim: 12340.5 kg\n", metin);
            Assert.Contains("- Bench: 82.5×8\n", metin);
            Assert.DoesNotContain("82,5", metin);
        }
        finally
        {
            CultureInfo.CurrentCulture = onceki;
        }
    }

    /// <summary>
    /// Veritabanı numeric(6,2) döner: 80 kg "80.00" ölçeğiyle gelir. "80.00×8" gürültüdür, ama iki
    /// ondalıklı gerçek bir değer kırpılmamalı.
    /// </summary>
    [Theory]
    [InlineData("80", "80×8")]
    [InlineData("80.00", "80×8")]
    [InlineData("82.50", "82.5×8")]
    [InlineData("82.25", "82.25×8")]
    [InlineData("0", "0×8")]
    public void Agirlik_gereksiz_ondalik_olmadan_yazilir(string agirlik, string beklenen)
    {
        var metin = Formatla(Oturum(An, null,
            Set(1, "Barfiks", decimal.Parse(agirlik, CultureInfo.InvariantCulture), 8)));

        Assert.Contains($"- Barfiks: {beklenen}\n", metin);
    }

    [Fact]
    public void Setler_egzersiz_bazinda_ilk_gorunme_sirasiyla_gruplanir()
    {
        var metin = Formatla(Oturum(An, null,
            Set(2, "Squat", 100m, 5),
            Set(1, "Bench", 60m, 10),
            Set(2, "Squat", 100m, 4),
            Set(1, "Bench", 60m, 9)));

        Assert.Contains("- Squat: 100×5, 100×4\n", metin);
        Assert.Contains("- Bench: 60×10, 60×9\n", metin);
        // Squat oturumda ilk görünen egzersiz: önce o yazılır (id sırası değil, görünme sırası).
        Assert.True(
            metin.IndexOf("- Squat:", StringComparison.Ordinal)
            < metin.IndexOf("- Bench:", StringComparison.Ordinal));
    }

    /// <summary>RIR 0 geçerli bir değerdir ("tükenişe kadar"); null ile karıştırılıp atlanmamalı.</summary>
    [Fact]
    public void RIR_ve_rekor_ekleri_yazilir()
    {
        var metin = Formatla(Oturum(An, null,
            Set(1, "Bench", 80m, 8, RecordType.Weight, rir: 2),
            Set(1, "Bench", 80m, 9, RecordType.Reps),
            Set(1, "Bench", 80m, 7, rir: 0)));

        Assert.Contains("- Bench: 80×8 (RIR 2) [PR: ağırlık], 80×9 [PR: tekrar], 80×7 (RIR 0)\n", metin);
    }

    [Fact]
    public void Baska_TR_gunune_tasan_bitis_gun_farkiyla_yazilir()
    {
        var baslangic = new DateTime(2026, 3, 10, 20, 30, 0, DateTimeKind.Utc);   // TR 23:30, Salı

        var metin = Formatla(
            Oturum(baslangic, baslangic.AddMinutes(45)),                 // TR 00:15, ertesi gün
            Oturum(baslangic, baslangic.AddDays(2).AddMinutes(45)));     // unutulup günler sonra kapatılmış

        Assert.Contains("### 2026-03-10 Sal 23:30–00:15 (+1 gün)\n", metin);
        Assert.Contains("### 2026-03-10 Sal 23:30–00:15 (+3 gün)\n", metin);
    }

    /// <summary>UTC 21:30 = TR ertesi gün 00:30. UTC gününe göre yazılsaydı 10 Mart Salı görünürdü.</summary>
    [Fact]
    public void Gece_yarisindan_sonra_baslayan_oturum_TR_gunuyle_yazilir()
    {
        var metin = Formatla(Oturum(new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), null));

        Assert.Contains("### 2026-03-11 Çar 00:30–(bitirilmedi)\n", metin);
    }

    [Fact]
    public void Bos_export_bolum_mesajlarini_yazar()
    {
        var metin = ExportTextFormatter.Format(Bos());

        Assert.Contains("- Toplam hacim: 0 kg\n", metin);
        Assert.Contains("## Egzersiz bazında hacim\nBu aralıkta kayıt yok.\n", metin);
        Assert.Contains("## Tüm zamanların rekorları (aralıktan bağımsız)\nHenüz kayıt yok.\n", metin);
        Assert.Contains("## Oturumlar\nBu aralıkta kayıt yok.\n", metin);
        Assert.Contains("## Vücut ağırlığı\nBu aralıkta kayıt yok.\n", metin);
    }

    [Theory]
    [InlineData(null, null, "Aralık: tüm geçmiş")]
    [InlineData("2026-03-01", null, "Aralık: 2026-03-01 ve sonrası")]
    [InlineData(null, "2026-03-31", "Aralık: 2026-03-31 ve öncesi")]
    [InlineData("2026-03-01", "2026-03-31", "Aralık: 2026-03-01 – 2026-03-31 (TR yerel günü, iki uç dahil)")]
    public void Aralik_basligi_verilen_uclara_gore_yazilir(string? from, string? to, string beklenen)
    {
        var metin = ExportTextFormatter.Format(Bos(Gun(from), Gun(to)));

        Assert.Contains($"\n{beklenen}\n", metin);
    }

    /// <summary>
    /// Kullanıcı metni tek satıra iner: aksi halde "## ..." ile başlayan bir not satırı belgenin
    /// başlık yapısını bozabilirdi.
    /// </summary>
    [Fact]
    public void Nottaki_satir_sonlari_bosluga_cevrilir()
    {
        var oturum = Oturum(An, null) with { Notes = "omuz\r\nsıkıştı\nyine" };

        var metin = Formatla(oturum);

        Assert.Contains("\nNot: omuz sıkıştı yine\n", metin);
    }

    /// <summary>
    /// AYIRT EDİCİ: egzersiz/şablon adı gibi kullanıcı metinleri de not gibi tek satıra
    /// indirilmeli — aksi halde bir egzersiz adı "\n## Sahte" ile belgeye sahte bir başlık
    /// enjekte edebilir.
    /// </summary>
    [Fact]
    public void Kullanici_metinleri_tek_satira_indirilir()
    {
        const string zararli = "Bench\n## Sahte";

        var export = Bos() with
        {
            Summary = new ExportSummaryResponse(1, 1, 1, 80m, 0, 0,
                [new ExerciseVolumeResponse(1, zararli, 80m, 1)]),
            Sessions =
            [
                new HistorySessionResponse(1, An, null, zararli, null, 80m, 1,
                    [Set(1, zararli, 80m, 8)])
            ],
            AllTimeRecords =
            [
                new ExerciseRecordResponse(1, zararli, ExerciseCategory.Push,
                    80m, 8, An, 8, 80m, An)
            ]
        };

        var metin = ExportTextFormatter.Format(export);

        Assert.DoesNotContain("\n## Sahte", metin);
        Assert.Contains("- Bench ## Sahte: 80×8\n", metin);
    }
}
