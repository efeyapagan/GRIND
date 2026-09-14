# Katkı Rehberi — Dallanma ve PR Akışı

## Akış

İki kalıcı branch var: **`master`** ve **`dev`**.

```
master  ──●─────────────────────●──────────●──
           \                    ↑          ↑
            \            2. PR  │          │ geri-merge
 feature     ●───────────────────┤          │
              \                  │          │
               ↓ 1. PR           │          │
dev     ────────●────────────────┴──────────●──
```

0. **Önce GitHub'da bir issue açılır.** Branch adı issue numarasını taşır
   (`feature/<no>-kisa-ad`) ve PR'lar issue'ya bağlanır (`Refs #<no>`, master PR'ında `Closes #<no>`).
   Projede birden fazla kişi çalıştığı için iş, kod yazılmadan önce görünür olmalı.
1. Feature branch'i **`master`'dan** açılır.
2. İş bitince **`dev`'e PR** açılır. dev'de ayağa kaldırılıp test edilir.
3. Kabul edilirse **aynı branch'ten `master`'a ikinci PR** açılır.
4. Merge edildikten sonra **`master` `dev`'e geri-merge edilir** (aşağıda gerekçesi).

Her feature master'a tek tek terfi eder. Amaç bu: dev'e girmiş sorunlu bir iş
master'a hiç geçmez, ve onu geri almak için release'i bloklamak ya da dev'den
revert etmek gerekmez.

## Zorunlu kurallar

### Merge commit kullanılır — squash ve rebase kullanılmaz

Repo ayarlarında squash ve rebase merge **kapatılmıştır**. Sebep akışa özgü:
aynı branch iki kez (önce dev'e, sonra master'a) merge ediliyor. Squash edilseydi
aynı değişiklik iki branch'te farklı SHA'larla dururdu ve ikisi kalıcı olarak
ıraksayıp sürekli çakışma üretirdi. Merge commit'te aynı commit'ler her iki
branch'e de gider ve Git ikisini uzlaştırabilir.

### Feature branch ilk merge'den sonra silinmez

Repo ayarlarında "merge sonrası branch sil" **kapatılmıştır**. İkinci PR (master'a
olan) o branch'e ihtiyaç duyar.

### master'a her terfiden sonra master dev'e geri-merge edilir

```bash
git checkout dev && git pull
git merge --no-ff master
git push origin dev
```

**Bu adımı atlamak CI'ı sessizce devre dışı bırakır.** Bir kez yaşandı, kaydı burada
dursun:

Aynı feature dev'e ve master'a ayrı ayrı merge edilince, iki branch **aynı iki
ebeveynin iki kopya merge commit'ini** taşımaya başladı — ebeveynler birebir aynı,
ağaçlar birebir aynı, ama commit'ler farklı:

```
dev     34dced4  parents: 9e141c4 54626e2
master  f78f549  parents: 9e141c4 54626e2
```

Bu criss-cross topolojide iki merge base oluşuyor. Git yerelde ikisini birden
kullanıp temiz merge ediyor, ama GitHub tek bir merge base seçiyor ve o base'e göre
dosyalar "iki tarafta da yeni eklenmiş" görünüyor:

```
added in both
  our    .github/workflows/ci.yml
  their  .github/workflows/ci.yml
```

Sonuç: GitHub PR için merge commit üretemiyor (`mergeable: CONFLICTING`), merge ref
oluşmuyor, ve **`pull_request` workflow'u hiç tetiklenmiyor**. Kırmızı bile değil —
hiç yok. Bir PR'ın CI'ı kırmızıysa görürsün; hiç çalışmıyorsa "kontrol yok"
demektir ve fark etmesi çok daha zordur.

Geri-merge dev'i master'ı kapsar hale getirir, merge base tekilleşir, sorun ortadan
kalkar.

**Belirtiler:** PR'da hiç check görünmüyorsa, önce `gh pr view <n> --json mergeable`
bak. `CONFLICTING` ise sorun CI'da değil, topolojide.

## CI

Her PR'da ve `master`/`dev`'e her push'ta `.github/workflows/ci.yml` çalışır:

| Adım | Ne yapar |
|---|---|
| Derle | `dotnet build -c Release` |
| EF Core araçlarını geri yükle | `.config/dotnet-tools.json`'daki sabit sürüm |
| **Migration drift kontrolü** | Model ile son migration ayrıştıysa **durur** |
| Şemayı uygula | Migration'ları PostgreSQL 17 servis konteynerine uygular |
| Testleri çalıştır | Tüm testler, gerçek veritabanına karşı |

**Migration drift kontrolü** en kritik adım: CLAUDE.md Code-First'ü zorunlu kılıyor.
Bir `IEntityTypeConfiguration` sınıfını değiştirip migration üretmeyi unutursan model
ile şema sessizce ayrışır. Bu adım onu yakalar — drift yoksa exit 0, varsa exit 1.

Migration'lar **elle düzenlenmez**. Üretilen migration yanlışsa konfigürasyon sınıfı
düzeltilir, `dotnet ef migrations remove` ile silinir ve yeniden üretilir.

## Branch koruması

Şu an **yok**: private repo + GitHub Free planda kullanılamıyor
(`Upgrade to GitHub Pro or make this repository public`, HTTP 403). Yani master'a
doğrudan push edilebilir ve CI kırmızıyken merge edilebilir — akış disipline bağlı.

Repo public yapılırsa veya Pro alınırsa şunlar kurulmalı: master ve dev'e doğrudan
push yasak, merge için PR şart, `Derle ve test et` yeşil olmadan merge edilemez.
Bkz. Issue #2.

## Yerel geliştirme

```bash
docker compose up -d                        # PostgreSQL 17, host portu 5433
dotnet ef database update --project src/Grind.Api
dotnet test tests/Grind.Tests
```

Connection string ve JWT anahtarı `dotnet user-secrets` içinde durur, `appsettings.json`
yalnızca boş placeholder taşır — bunlar repoya commit edilmez.
