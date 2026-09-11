using System.Net;
using System.Text;
using System.Text.Json;
using Anthropic;
using Grind.Api.Common.Exceptions;
using Grind.Api.Services.Ai;
using Microsoft.Extensions.Logging.Abstractions;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// Gerçek sağlayıcı, ağa ÇIKMADAN: SDK'nın <c>HttpClient</c>'ına sahte bir handler verilir. Böylece
/// serileştirme dahil SDK'nın tüm yolu sınanır (Faz 12 spec Karar 8).
/// </summary>
public class AnthropicAiInsightProviderTests
{
    /// <summary>Gönderilen isteği kaydeder, verilen yanıtı döner (ya da verilen hatayı fırlatır).</summary>
    private sealed class SahteHandler(Func<HttpResponseMessage> yanit) : HttpMessageHandler
    {
        public HttpRequestMessage? Istek { get; private set; }
        public string? Govde { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Istek = request;
            Govde = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return yanit();
        }
    }

    private static readonly AiSettings Ayarlar = new()
    {
        Provider = AiProviderKind.Anthropic,
        ApiKey = "test-anahtari",
        Model = "claude-opus-5",
        MaxTokens = 16000,
        TimeoutSeconds = 30,
        InputUsdPerMillionTokens = 5m,
        OutputUsdPerMillionTokens = 25m
    };

    private static (AnthropicAiInsightProvider Provider, SahteHandler Handler) Kur(Func<HttpResponseMessage> yanit)
    {
        var handler = new SahteHandler(yanit);
        var client = new AnthropicClient
        {
            ApiKey = Ayarlar.ApiKey,
            HttpClient = new HttpClient(handler),
            // Yeniden deneme yok: hata testleri geri çekilme (backoff) beklemesin.
            MaxRetries = 0
        };

        return (new AnthropicAiInsightProvider(client, Ayarlar, NullLogger<AnthropicAiInsightProvider>.Instance),
            handler);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static string Mesaj(
        string stopReason, string contentJson, string model = "claude-opus-5",
        long input = 1200, long output = 300) => $$"""
        {
          "id": "msg_test",
          "type": "message",
          "role": "assistant",
          "model": "{{model}}",
          "content": {{contentJson}},
          "stop_reason": "{{stopReason}}",
          "stop_sequence": null,
          "usage": { "input_tokens": {{input}}, "output_tokens": {{output}} }
        }
        """;

    [Fact]
    public async Task Istek_model_talimat_veri_ve_fallback_ile_messages_ucuna_gider()
    {
        var (provider, handler) = Kur(() => Json(HttpStatusCode.OK,
            Mesaj("end_turn", """[{ "type": "text", "text": "yorum" }]""")));

        await provider.CompleteAsync("talimat", "veri");

        Assert.Equal(HttpMethod.Post, handler.Istek!.Method);
        Assert.EndsWith("/v1/messages", handler.Istek.RequestUri!.AbsolutePath);
        Assert.Equal("test-anahtari", handler.Istek.Headers.GetValues("x-api-key").Single());
        Assert.Contains(AnthropicAiInsightProvider.FallbackBeta,
            string.Join(",", handler.Istek.Headers.GetValues("anthropic-beta")));

        var govde = JsonDocument.Parse(handler.Govde!).RootElement;
        Assert.Equal("claude-opus-5", govde.GetProperty("model").GetString());
        Assert.Equal(16000, govde.GetProperty("max_tokens").GetInt32());
        Assert.Equal("talimat", govde.GetProperty("system").GetString());
        Assert.Equal("default", govde.GetProperty("fallbacks").GetString());
        var mesaj = Assert.Single(govde.GetProperty("messages").EnumerateArray());
        Assert.Equal("user", mesaj.GetProperty("role").GetString());
        Assert.Equal("veri", mesaj.GetProperty("content").GetString());
    }

    /// <summary>
    /// Fallback'in yanıtladığı gerçekçi bir yanıt: düşünme bloğu ve fallback geçiş bloğu atlanır,
    /// metin blokları birleşir, model YANITTAN gelir (istenen değil, fiilen yanıtlayan — denetim doğrusu).
    /// </summary>
    [Fact]
    public async Task Metin_bloklari_birlesir_model_yanittan_gelir_token_ve_maliyet_hesaplanir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("end_turn", """
            [
              { "type": "thinking", "thinking": "", "signature": "imza" },
              { "type": "fallback", "from": { "model": "claude-opus-5" }, "to": { "model": "claude-opus-4-8" } },
              { "type": "text", "text": "Birinci bölüm. " },
              { "type": "text", "text": "İkinci bölüm." }
            ]
            """, model: "claude-opus-4-8", input: 1_000_000, output: 1_000_000)));

        var sonuc = await provider.CompleteAsync("talimat", "veri");

        Assert.Equal("Birinci bölüm. İkinci bölüm.", sonuc.Content);
        Assert.Equal("claude-opus-4-8", sonuc.Model);
        Assert.Equal(2_000_000, sonuc.TokensUsed);
        Assert.Equal(30m, sonuc.EstimatedCostUsd);
    }

    /// <summary>Kesilen yanıtın ücreti ödenmiştir; kesik bir yorum hiç yoktan iyidir (spec Karar 8).</summary>
    [Fact]
    public async Task Token_sinirinda_kesilen_yanit_dondurulur()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK,
            Mesaj("max_tokens", """[{ "type": "text", "text": "yarım kalan yorum" }]""")));

        var sonuc = await provider.CompleteAsync("talimat", "veri");

        Assert.Equal("yarım kalan yorum", sonuc.Content);
    }

    [Fact]
    public async Task Ret_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("refusal", "[]")));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.NoAnswerMessage, hata.Message);
    }

    [Fact]
    public async Task Bos_metin_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("end_turn",
            """[{ "type": "thinking", "thinking": "", "signature": "imza" }]""")));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => provider.CompleteAsync("talimat", "veri"));
    }

    /// <summary>Sağlayıcının hata metni ("iç ayrıntı") istemciye ASLA ulaşmamalı; sabit mesaj döner.</summary>
    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Saglayici_hatasi_ic_ayrinti_sizdirmadan_503_verir(HttpStatusCode status)
    {
        var (provider, _) = Kur(() => Json(status,
            """{ "type": "error", "error": { "type": "api_error", "message": "iç ayrıntı" } }"""));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.UnreachableMessage, hata.Message);
        Assert.DoesNotContain("iç ayrıntı", hata.Message);
    }

    /// <summary>
    /// 200 döner ama gövde zorunlu alanları taşımıyor: SDK yanıtı <c>BetaMessage</c>'a
    /// materyalize ederken (alan okunurken) patlar. Bu da bir SDK hatasıdır, istemciye
    /// asla çıplak sızmamalı (spec Karar 8/12).
    /// </summary>
    [Fact]
    public async Task Bozuk_yanit_govdesi_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, """{ "type": "message" }"""));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.UnreachableMessage, hata.Message);
    }

    [Fact]
    public async Task Ag_hatasi_503_verir()
    {
        var (provider, _) = Kur(() => throw new HttpRequestException("bağlantı yok"));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.UnreachableMessage, hata.Message);
    }

    [Fact]
    public async Task Kapali_saglayici_503_verir()
    {
        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => new NullAiInsightProvider().CompleteAsync("talimat", "veri"));

        Assert.Equal("AI yorumlama şu an kapalı.", hata.Message);
    }
}
