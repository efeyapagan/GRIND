using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Grind.Api.Common.Exceptions;
using Grind.Api.Services.Ai;
using Microsoft.Extensions.Logging.Abstractions;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// GEÇİCİ/test amaçlı sağlayıcı (issue #99), ağa ÇIKMADAN: sahte bir <c>HttpMessageHandler</c>
/// verilir. Desen <see cref="AnthropicAiInsightProviderTests"/> ile aynı.
/// </summary>
public class OpenRouterAiInsightProviderTests
{
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
        Provider = AiProviderKind.OpenRouter,
        ApiKey = "test-anahtari",
        Model = "nvidia/nemotron-3-super-120b-a12b:free",
        MaxTokens = 16000,
        TimeoutSeconds = 30,
        InputUsdPerMillionTokens = 0m,
        OutputUsdPerMillionTokens = 0m
    };

    private static (OpenRouterAiInsightProvider Provider, SahteHandler Handler) Kur(Func<HttpResponseMessage> yanit)
    {
        var handler = new SahteHandler(yanit);
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://openrouter.ai/api/v1/") };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Ayarlar.ApiKey);

        return (new OpenRouterAiInsightProvider(client, Ayarlar, NullLogger<OpenRouterAiInsightProvider>.Instance),
            handler);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static string Yanit(
        string? icerik, string finishReason = "stop", string model = "nvidia/nemotron-3-super-120b-a12b:free",
        long promptTokens = 1200, long completionTokens = 300, int totalTokens = 1500) => $$"""
        {
          "id": "gen-test",
          "model": "{{model}}",
          "choices": [
            { "message": { "role": "assistant", "content": {{(icerik is null ? "null" : JsonSerializer.Serialize(icerik))}} }, "finish_reason": "{{finishReason}}" }
          ],
          "usage": { "prompt_tokens": {{promptTokens}}, "completion_tokens": {{completionTokens}}, "total_tokens": {{totalTokens}} }
        }
        """;

    [Fact]
    public async Task Istek_dogru_ucta_bearer_ile_model_ve_mesajlarla_gider()
    {
        var (provider, handler) = Kur(() => Json(HttpStatusCode.OK, Yanit("yorum")));

        await provider.CompleteAsync("talimat", "veri");

        Assert.Equal(HttpMethod.Post, handler.Istek!.Method);
        Assert.EndsWith("/chat/completions", handler.Istek.RequestUri!.AbsolutePath);
        Assert.Equal("Bearer", handler.Istek.Headers.Authorization!.Scheme);
        Assert.Equal("test-anahtari", handler.Istek.Headers.Authorization.Parameter);

        var govde = JsonDocument.Parse(handler.Govde!).RootElement;
        Assert.Equal("nvidia/nemotron-3-super-120b-a12b:free", govde.GetProperty("model").GetString());
        Assert.Equal(16000, govde.GetProperty("max_tokens").GetInt32());
        var mesajlar = govde.GetProperty("messages").EnumerateArray().ToArray();
        Assert.Equal(2, mesajlar.Length);
        Assert.Equal("system", mesajlar[0].GetProperty("role").GetString());
        Assert.Equal("talimat", mesajlar[0].GetProperty("content").GetString());
        Assert.Equal("user", mesajlar[1].GetProperty("role").GetString());
        Assert.Equal("veri", mesajlar[1].GetProperty("content").GetString());
    }

    [Fact]
    public async Task Icerik_model_token_ve_maliyet_yanittan_okunur()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK,
            Yanit("Bench Press hacminde artış var.", model: "farkli-model:free",
                promptTokens: 1000, completionTokens: 500, totalTokens: 1500)));

        var sonuc = await provider.CompleteAsync("talimat", "veri");

        Assert.Equal("Bench Press hacminde artış var.", sonuc.Content);
        Assert.Equal("farkli-model:free", sonuc.Model);
        Assert.Equal(1500, sonuc.TokensUsed);
        Assert.Equal(0m, sonuc.EstimatedCostUsd);
    }

    [Fact]
    public async Task Bos_icerik_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Yanit("   ")));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(OpenRouterAiInsightProvider.NoAnswerMessage, hata.Message);
    }

    [Fact]
    public async Task Icerik_alani_null_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Yanit(null)));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(OpenRouterAiInsightProvider.NoAnswerMessage, hata.Message);
    }

    /// <summary>Sağlayıcının hata metni ("iç ayrıntı") istemciye ASLA ulaşmamalı; sabit mesaj döner.</summary>
    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Saglayici_hatasi_ic_ayrinti_sizdirmadan_503_verir(HttpStatusCode status)
    {
        var (provider, _) = Kur(() => Json(status, """{ "error": { "message": "iç ayrıntı" } }"""));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(OpenRouterAiInsightProvider.UnreachableMessage, hata.Message);
        Assert.DoesNotContain("iç ayrıntı", hata.Message);
    }

    [Fact]
    public async Task Bozuk_yanit_govdesi_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, """{ "id": "gen-test" }"""));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(OpenRouterAiInsightProvider.UnreachableMessage, hata.Message);
    }

    [Fact]
    public async Task Ag_hatasi_503_verir()
    {
        var (provider, _) = Kur(() => throw new HttpRequestException("bağlantı yok"));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(OpenRouterAiInsightProvider.UnreachableMessage, hata.Message);
    }
}
