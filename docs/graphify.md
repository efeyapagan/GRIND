# graphify ile GRIND kod tabanını keşfetme

GRIND'in bilgi grafiği `graphify-out/` altında repoda tutulur:

- `graphify-out/GRAPH_REPORT.md` — insan okuyabilir özet: en bağlantılı düğümler, beklenmeyen bağlantılar, önerilen sorular.
- `graphify-out/graph.html` — tarayıcıda açılan etkileşimli görünüm (5000'den büyük grafiklerde topluluk düzeyinde gösterilir).
- `graphify-out/graph.json` — ham grafik verisi; sorgu komutları bunu okur.

Grafik, `src/`, `mobile/`, `packages/`, `tests/` ve `docs/` klasörlerini kapsar. `web/` dondurulduğu için dahil değildir.

## Kurulum (yalnızca sorgulamak için)

Grafiği okumak için graphify kurmak gerekir; grafiği yeniden üretmek için de aynısı.

```bash
# uv önerilir (https://docs.astral.sh/uv/)
uv tool install graphifyy
# AI asistanına skill'i kaydet (Claude Code, Cursor, Codex, Gemini CLI vb.)
graphify install
```

Paket adı `graphifyy` (çift y); CLI komutu `graphify`. Resmi kaynak: https://github.com/Graphify-Labs/graphify

## Grafiği sorgulama

Repo kökünden:

```bash
graphify query "Antrenman başlatılınca şablon hangi servislerden geçer?"
graphify path "WorkoutSessionService" "SetEntry"
graphify explain "SablonVitrinKarti"
```

- `query` geniş bağlam için BFS yapar; bir zincir izlemek için `--dfs` ekleyin.
- Yanıtlar `source_location` bilgisini verir; bir olguyu kullanmadan önce kaynak dosyada doğrulayın.
- Grafik, AST ile çıkarılmış yapısal ilişkileri ve belgelerden çıkarılmış anlamsal ilişkileri içerir; bunları ayırt etmek için `EXTRACTED` / `INFERRED` / `AMBIGUOUS` etiketlerine bakın.

## Bilinen sınırlar

- Grafik bir anlık görüntüdür; kod değiştikçe eskir. Büyük değişikliklerden sonra yeniden üretin.
- Anlamsal çıkarımın bir kısmı eksik: bazı uzun plan dosyalarının sonraki bölümleri okunamadı.
- Topluluk etiketleri otomatik üretildi; `mobile/src grubu 1` gibi genel adlar anlamlı kategori değildir.
- Grafikte yaklaşık 1500 kenarın hedef düğümü yoktur (kapsam dışı tiplere yapılan referanslar). Bu, sorguların bazı ilişkileri kaçırabileceği anlamına gelir.

## Yeniden üretme

Yalnızca değişen dosyaları yeniden çıkarmak için:

```bash
graphify update
```

Tam yeniden üretim için graphify skill'ini (`/graphify`) kullanın. Bu işlem büyük bir `graph.json` diff'i üretir; grafiği ayrı bir commit'te güncelleyin.

## Repoya ne girer, ne girmez

- Commit'e girer: `graph.json`, `GRAPH_REPORT.md`, `graph.html`, `.graphify_labels.json`.
- Girmez (`.gitignore`): `graphify-out/cache/` (makineye özgü önbellek), `.graphify_python` ve `.graphify_root` (yerel kullanıcı yolları).
