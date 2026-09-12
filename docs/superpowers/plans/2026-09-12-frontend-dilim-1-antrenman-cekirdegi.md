# Frontend Dilim 1 — Antrenman Çekirdeği Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telefondan kullanılabilen, kurulabilir bir React PWA'nın ilk dilimi: giriş/kayıt, bugünün
oturumu, set ekleme, PR rozetleri, geçmiş ve rekorlar. Backend'e tek satır dokunulmaz.

**Architecture:** Önce `web/` iskeleti (Vite + React + TS + PWA + test altyapısı + kendi CI
workflow'u). Sonra API katmanı: tipler Swagger'dan ÜRETİLİR, tek bir `request()` sarmalayıcısı
token'ı ekler ve iki farklı ProblemDetails şeklini tek tipe indirger, 401 oturumu düşürür. Ardından
kimlik ekranları ve korumalı yönlendirme. Sonra "Bugün" ekranı (dilimin kalbi), en son geçmiş ve
rekorlar. Sunucu durumu TanStack Query'de; ayrı bir global state kütüphanesi yok.

**Tech Stack:** Node 24, npm, Vite, React 19, TypeScript, React Router, TanStack Query,
`vite-plugin-pwa`, Vitest + React Testing Library + MSW, `openapi-typescript`.

**Spec:** `docs/superpowers/specs/2026-09-12-frontend-react-pwa-design.md`

---

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **GÖRSEL TASARIM YOK.** Palet, tipografi, ikon, gölge, animasyon, tasarım sistemi, UI kütüphanesi
  YASAK. Kullanıcı tasarımı bilerek erteledi. İzin verilen tek CSS: yerleşim (flex/grid), dokunma
  hedefi boyutu, güvenli alan boşlukları ve okunabilir varsayılan metin. Amaç: tasarım turu
  geldiğinde stilli bir yığınla boğuşmamak. Tarayıcı varsayılanları yeterlidir.
- **Backend'e DOKUNULMAZ.** Bu dilimde `src/Grind.Api` altında hiçbir değişiklik yok. Eksik bir uç
  fark edilirse DUR ve raporla.
- **Sunucudaki hesap istemcide tekrarlanmaz.** Hacim, PR tespiti, seri, ilerleme — hepsi API'den
  gelir. `recordType` alanına bakılır, PR yeniden hesaplanmaz.
- **Zaman `Europe/Istanbul` ile biçimlendirilir**, cihazın saat dilimiyle değil. API gün bazlı
  gruplamayı TR gününe göre yapıyor.
- **API tipleri elle yazılmaz**, `openapi-typescript` ile üretilir ve commit edilir.
- **Sır yok:** `VITE_*` değişkenleri bundle'a gömülür ve herkese açıktır. Frontend'de API adresi
  dışında yapılandırma tutulmaz.
- **Metinler Türkçe** (kullanıcıya görünen her şey), test adları Türkçe, kod yorumları Türkçe.
- **Erişilebilirlik tabanı:** her girdinin `<label>`'ı olur, butonlar gerçek `<button>`'dır, hata
  mesajları `role="alert"` ile duyurulur, klavye odağı görünür kalır (outline kaldırılmaz).
- **Telefon gereksinimleri:** dokunma hedefleri ≥ 44×44 px; ağırlık alanı `inputMode="decimal"`,
  tekrar alanı `inputMode="numeric"`; hiçbir işlev yalnızca hover'a bağlı olmaz;
  `viewport-fit=cover` + `env(safe-area-inset-bottom)`.
- **Test:** Vitest + React Testing Library + MSW. Testler gerçek davranışı sınar (kullanıcı ne
  görür/tıklar), iç uygulama detayını değil. MSW yanıtları üretilen tiplere uyar.
- **Node sürümü** `.nvmrc` ile sabit (24), CI `npm ci` kullanır.
- **Commit mesajları** Türkçe, `feat(web)`/`test(web)`/`chore(web)` önekli, ASCII karakterlerle. Her
  mesaj şu satırla biter:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### Backend'i çalıştırma (her görev için geçerli)

```bash
docker compose up -d                  # PostgreSQL (host portu 5433)
dotnet run --project src/Grind.Api    # varsayilan "http" profili → http://localhost:5098
```

**TUZAK:** `--launch-profile https` ile çalıştırma. O profilde `UseHttpsRedirection` gelen isteği
`https://localhost:7210`'a 307 ile yönlendirir; Vite proxy'si yönlendirmeyi takip etmez ve istek
tarayıcıda CORS/sertifika hatasına döner. Varsayılan `http` profili doğru olandır.

Swagger yalnızca Development'ta açıktır: `http://localhost:5098/swagger/v1/swagger.json`.

---

## Dosya Haritası

**Yeni (hepsi `web/` altında, aksi belirtilmedikçe):**
- `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`,
  `index.html`, `.nvmrc`, `.env.example`
- `src/main.tsx`, `src/App.tsx`, `src/routes.tsx`, `src/index.css`
- `src/api/schema.d.ts` (üretilir, commit edilir)
- `src/api/problem.ts`, `src/api/client.ts`, `src/api/queries.ts`
- `src/auth/session.ts`, `src/auth/AuthContext.tsx`, `src/auth/ProtectedRoute.tsx`
- `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/TodayPage.tsx`,
  `src/pages/HistoryPage.tsx`, `src/pages/RecordsPage.tsx`
- `src/components/AddSetForm.tsx`, `src/components/SetList.tsx`
- `src/lib/format.ts` (TR tarih/saat/sayı biçimleme)
- `src/test/setup.ts`, `src/test/msw.ts`, `*.test.tsx` dosyaları
- `.github/workflows/web.yml` (repo kökünde)

**Değişen:** yok (backend'e dokunulmaz). Son görevde `PLAN.md` ve `CLAUDE.md`.

---

### Task 1: `web/` iskeleti, test altyapısı ve CI

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/tsconfig.node.json`, `web/vite.config.ts`,
  `web/index.html`, `web/.nvmrc`, `web/.env.example`, `web/src/main.tsx`, `web/src/App.tsx`,
  `web/src/index.css`, `web/src/test/setup.ts`, `web/src/App.test.tsx`
- Create: `.github/workflows/web.yml`

**Interfaces:**
- Consumes: yok.
- Produces: çalışan `npm run dev` / `build` / `test` / `typecheck` / `api:types` betikleri; `/api`
  isteklerini `http://localhost:5098`'e ileten dev proxy; `web/**` yolunda tetiklenen ayrı CI.

- [ ] **Step 1: Projeyi kur**

```bash
cd web 2>/dev/null || mkdir web && cd web
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @tanstack/react-query
npm install -D vite-plugin-pwa vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  msw openapi-typescript
```

`web/.nvmrc` içeriği tek satır: `24`

- [ ] **Step 2: `vite.config.ts`'i yaz**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// API adresi ortamdan gelebilir; varsayilan, backend'in "http" profili.
// DIKKAT: https profiliyle calisirsa UseHttpsRedirection 307 doner ve proxy takip etmez.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5098';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ikonlar ve tema renkleri BILEREK yok: gorsel tasarim ayri bir adim (spec).
      manifest: {
        name: 'GRIND',
        short_name: 'GRIND',
        start_url: '/',
        display: 'standalone',
        lang: 'tr',
      },
      workbox: {
        // Uygulama kabugu onbellekten acilir. API yanitlari onbelleklenmez: bayat antrenman
        // verisi gostermek, veri gostermemekten daha kotu.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
});
```

`vite.config.ts` içindeki `test` bölümü için dosyanın başına
`/// <reference types="vitest" />` eklenir.

- [ ] **Step 3: `package.json` betikleri**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "api:types": "openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o src/api/schema.d.ts"
  }
}
```

- [ ] **Step 4: `index.html` ve temel CSS**

`index.html`'de viewport satırı BİREBİR şu olmalı (güvenli alan için `viewport-fit` şart):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

`src/index.css` YALNIZCA şunları içerir (renk/tipografi YOK):

```css
/* Gorsel tasarim ayri bir adim (spec). Burada yalnizca yerlesim, dokunma hedefi ve guvenli alan
   var; renk, tipografi ve suslemeler bilerek yok. */
* { box-sizing: border-box; }
body { margin: 0; padding: 0 1rem env(safe-area-inset-bottom) 1rem; }
button, input, select { min-height: 44px; font: inherit; }
button { min-width: 44px; }
form { display: flex; flex-direction: column; gap: 0.75rem; max-width: 32rem; }
ul { padding-left: 1.25rem; }
```

- [ ] **Step 5: Test altyapısı ve duman testi**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`src/App.tsx` şimdilik yalnızca bir başlık döndürür (yönlendirme Task 3'te gelir):

```tsx
export default function App() {
  return <h1>GRIND</h1>;
}
```

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('uygulama basligi gorunur', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'GRIND' })).toBeInTheDocument();
});
```

- [ ] **Step 6: Doğrula**

```bash
cd web && npm run typecheck && npm run test && npm run build
```
Expected: üçü de hatasız; `web/dist/` oluşur (gitignore'da, commit edilmez).

- [ ] **Step 7: Frontend CI workflow'u**

`.github/workflows/web.yml`:

```yaml
name: Web CI

on:
  pull_request:
    branches: [master, dev]
    paths: ['web/**', '.github/workflows/web.yml']
  push:
    branches: [master, dev]
    paths: ['web/**', '.github/workflows/web.yml']

# DIKKAT: grup adi .NET CI'inkinden (ci-...) FARKLI olmali; ayni grup ayni branch'te
# birbirlerini iptal eder.
concurrency:
  group: web-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-test:
    name: Derle ve test et
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web

    steps:
      - name: Depoyu al
        uses: actions/checkout@v4

      - name: Node kur
        uses: actions/setup-node@v4
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Bagimliliklari kur
        run: npm ci

      - name: Tip kontrolu
        run: npm run typecheck

      - name: Testler
        run: npm run test

      - name: Derle
        run: npm run build
```

- [ ] **Step 8: Commit**

```bash
git add web .github/workflows/web.yml
git commit -m "feat(web): vite react ts iskeleti, pwa ve test altyapisi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: API katmanı — üretilen tipler, `request()`, ProblemDetails, oturum

**Files:**
- Create: `web/src/api/schema.d.ts` (üretilir), `web/src/api/problem.ts`, `web/src/api/client.ts`,
  `web/src/auth/session.ts`, `web/src/lib/format.ts`
- Create: `web/src/api/problem.test.ts`, `web/src/api/client.test.ts`,
  `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: Task 1'in iskeleti.
- Produces:
  - `parseProblem(status: number, body: unknown): ApiError` → `{ status, detail, fieldErrors }`
  - `class ApiError extends Error { status: number; detail: string; fieldErrors: Record<string, string[]> }`
  - `request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T>`
  - `setUnauthorizedHandler(fn: () => void): void`
  - `session.read() / session.write(token, expiresAtUtc, username) / session.clear() / session.isValid()`
  - `formatTrDate(iso) / formatTrTime(iso) / formatWeight(n)`

- [ ] **Step 1: Tipleri üret**

Backend çalışırken (`http` profili):

```bash
cd web && npm run api:types
```
Expected: `src/api/schema.d.ts` oluşur ve commit edilir. Üretilemezse DUR ve raporla — elle tip
yazma.

- [ ] **Step 2: Başarısız testleri yaz**

`src/api/problem.test.ts` — iki gövde şeklini de kapsamalı:

```ts
import { parseProblem } from './problem';

test('alan bazli dogrulama hatasi alanlara ayrilir', () => {
  const hata = parseProblem(400, {
    title: 'One or more validation errors occurred.',
    status: 400,
    errors: { Password: ['Şifre en az 8 karakter olmalı.'] },
  });

  expect(hata.status).toBe(400);
  expect(hata.fieldErrors.Password).toEqual(['Şifre en az 8 karakter olmalı.']);
});

test('is kurali hatasi detail alanindan okunur', () => {
  const hata = parseProblem(400, {
    title: 'Geçersiz istek',
    status: 400,
    detail: 'Bu aralıkta yorumlanacak kayıt yok.',
  });

  expect(hata.detail).toBe('Bu aralıkta yorumlanacak kayıt yok.');
  expect(hata.fieldErrors).toEqual({});
});

test('govdesiz yanit icin anlasilir bir mesaj uretilir', () => {
  const hata = parseProblem(503, null);

  expect(hata.status).toBe(503);
  expect(hata.detail.length).toBeGreaterThan(0);
});
```

`src/api/client.test.ts` — `fetch` taklit edilerek:
- token varsa `Authorization: Bearer ...` başlığı eklenir,
- 401 gelince kayıtlı "oturumu düşür" işleyicisi çağrılır ve `ApiError` fırlatılır,
- 204 yanıtta gövde ayrıştırılmaya çalışılmaz (JSON parse hatası vermez).

`src/lib/format.test.ts`:
- `formatTrDate('2026-03-10T21:30:00Z')` → `'11.03.2026'` (UTC 21:30 = TR 00:30, ERTESİ GÜN — bu
  test cihazın saat dilimine bağlı olmamalı),
- `formatWeight(82.5)` → `'82,5'`, `formatWeight(80)` → `'80'`.

- [ ] **Step 3: Testlerin başarısız olduğunu doğrula**

Run: `cd web && npm run test`
Expected: FAIL — modüller yok.

- [ ] **Step 4: `problem.ts`**

```ts
/**
 * Backend iki farkli RFC 7807 govdesi donuyor (Faz 5'te bilerek kabul edilmis bir durum):
 * DataAnnotations hatasi alan bazli `errors` tasir, servisin firlattigi is kurali hatasi ise
 * yalnizca `detail`. Ikisini burada TEK bir ic tipe indirgiyoruz ki her cagri yerinde ayri ayri
 * ele alinmasin — ikinci sekli unutmak, kullaniciya bos bir hata gostermenin en kisa yolu.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

const VARSAYILAN_MESAJ = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

export function parseProblem(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const govde = body as { detail?: unknown; title?: unknown; errors?: unknown };
    const fieldErrors =
      govde.errors && typeof govde.errors === 'object'
        ? (govde.errors as Record<string, string[]>)
        : {};
    const detail =
      typeof govde.detail === 'string' && govde.detail.length > 0
        ? govde.detail
        : typeof govde.title === 'string' && govde.title.length > 0
          ? govde.title
          : VARSAYILAN_MESAJ;

    return new ApiError(status, detail, fieldErrors);
  }

  return new ApiError(status, VARSAYILAN_MESAJ);
}
```

- [ ] **Step 5: `session.ts` ve `client.ts`**

`session.ts` — token `localStorage`'da (spec Karar 5); `isValid()` `expiresAtUtc` geçmişse false
döner, böylece süresi dolmuş token'la gereksiz 401 turu atılmaz.

`client.ts` gereksinimleri:
- Taban yol `/api` (dev'de Vite proxy'ler, üretimde aynı origin varsayılır).
- `auth` varsayılan `true`: token varsa `Authorization: Bearer <token>`.
- `Content-Type: application/json` yalnızca gövde varken.
- Yanıt `ok` değilse gövdeyi JSON olarak okumayı dener, `parseProblem` ile `ApiError` fırlatır.
- **401 ⇒ önce kayıtlı işleyici çağrılır (oturumu düşür), sonra `ApiError` fırlatılır.** 401 artık
  "token süresi doldu" ya da "hesap pasifleştirildi" (Faz 13) anlamına gelebilir; ikisinin de cevabı
  aynı.
- 204 ve boş gövde: `undefined` döner, JSON ayrıştırılmaz.

- [ ] **Step 6: Testleri çalıştır ve commit**

```bash
cd web && npm run typecheck && npm run test
git add web
git commit -m "feat(web): api istemcisi, problem details ayristirma ve oturum deposu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Kimlik ekranları ve korumalı yönlendirme

**Files:**
- Create: `web/src/auth/AuthContext.tsx`, `web/src/auth/ProtectedRoute.tsx`,
  `web/src/routes.tsx`, `web/src/pages/LoginPage.tsx`, `web/src/pages/RegisterPage.tsx`
- Create: `web/src/test/msw.ts`, `web/src/pages/LoginPage.test.tsx`,
  `web/src/pages/RegisterPage.test.tsx`
- Modify: `web/src/main.tsx`, `web/src/App.tsx`

**Interfaces:**
- Consumes: `request`, `session`, `ApiError` (Task 2).
- Produces: `useAuth()` → `{ username, isAuthenticated, login(), register(), logout() }`;
  `/login`, `/register`, korumalı `/`, `/history`, `/records`; `main.tsx`'te `QueryClientProvider`
  + `AuthProvider` + `RouterProvider`.

- [ ] **Step 1: MSW altyapısı + başarısız testler**

`src/test/msw.ts` bir `setupServer` kurar; testler yanıtları test içinde tanımlar. Yanıt gövdeleri
`schema.d.ts` tiplerine uymalı (`AuthResponse`: `token`, `expiresAtUtc`, `username`).

`LoginPage.test.tsx`:
- başarılı giriş: token saklanır ve `/`'a yönlendirilir,
- 401: **nötr** mesaj gösterilir (`Kullanıcı adı veya şifre hatalı.`) ve alanlar temizlenmez,
- boş alanlarla gönderim: sunucuya istek GİTMEZ, alan hatası gösterilir.

`RegisterPage.test.tsx`:
- kullanıcı adı deseni (`^[a-zA-Z0-9_-]{3,50}$`) istemcide doğrulanır,
- 72 BAYTI aşan şifre istemcide reddedilir (çok baytlı karakterle sınanır: 72 adet `ğ` = 144 bayt),
- 409 (`kullanıcı adı alınmış`) sunucu mesajıyla gösterilir.

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

Run: `cd web && npm run test`

- [ ] **Step 3: Uygula**

- `AuthContext`: `session`'dan okur, `login`/`register` `request()` çağırır ve `session.write` yapar,
  `logout` temizler. `client.setUnauthorizedHandler`'a `logout` bağlanır — 401 gelen HER istek
  oturumu düşürür.
- `ProtectedRoute`: `isAuthenticated` false ise `/login`'e `replace` ile yönlendirir.
- İstemci doğrulaması sunucu kurallarını AYNEN yansıtır ama sunucunun cevabı belirleyicidir:
  kullanıcı adı `^[a-zA-Z0-9_-]{3,50}$`, şifre en az 8 karakter ve en fazla 72 BAYT
  (`new TextEncoder().encode(sifre).length`).
- Hata gösterimi: `fieldErrors` varsa ilgili alanın altına, yoksa formun üstüne `role="alert"` ile.

- [ ] **Step 4: Doğrula ve commit**

```bash
cd web && npm run typecheck && npm run test
git add web
git commit -m "feat(web): giris ve kayit ekranlari, korumali yonlendirme" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: "Bugün" ekranı — dilimin kalbi

**Files:**
- Create: `web/src/api/queries.ts`, `web/src/pages/TodayPage.tsx`,
  `web/src/components/AddSetForm.tsx`, `web/src/components/SetList.tsx`
- Create: `web/src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `request`, `useAuth`, `formatTrTime`, `formatWeight`.
- Produces: `useOpenSession()`, `useExercises()`, `useSessionSets(sessionId)`, `useAddSet()`,
  `useFinishSession()`.

**API davranışları (uyulmazsa hata üretir):**

| Davranış | Sonuç |
|---|---|
| `GET /api/sessions/open` açık oturum yoksa **404** döner | 404 hata DEĞİL, "bugün henüz antrenman yok" boş durumudur. `useOpenSession` 404'ü `null`'a çevirir ve React Query'de `retry: false` kullanır. |
| `POST /api/sets` oturum id'si ALMAZ; sunucu bugünün açık oturumunu bulur/açar | Boş durumda "oturum başlat" düğmesi GEREKMEZ: ilk set eklendiğinde oturum kendiliğinden açılır. Boş durumun birincil eylemi doğrudan set eklemektir. |
| Yanıttaki `sessionId` seti hangi oturuma düştüğünü söyler | Set ekledikten sonra `open` ve `sets` sorguları invalidate edilir. |
| `recordType` `"None" \| "Weight" \| "Reps"` | Rozet doğrudan bundan çizilir: `Weight` → "ağırlık rekoru", `Reps` → "tekrar rekoru". PR YENİDEN HESAPLANMAZ. |
| Ağırlık 0 geçerlidir (barfiks/dips), en fazla 2 ondalık | "0 olamaz" gibi bir istemci kuralı yazma. |
| `GET /api/exercises` arşivlileri varsayılan olarak getirmez | Ek parametre gerekmez. |

- [ ] **Step 1: Başarısız testleri yaz** (`TodayPage.test.tsx`, MSW ile)

- açık oturum yokken (404) boş durum görünür ve set ekleme formu YİNE DE kullanılabilir,
- set eklenince listede görünür ve `POST /api/sets` gövdesi `{ exerciseId, weight, reps }` taşır,
- `recordType: "Weight"` dönen set için rekor rozeti görünür, `"None"` için görünmez,
- ağırlık `0` ile set eklenebilir,
- "Antrenmanı bitir" `POST /api/sessions/{id}/finish` çağırır ve oturum kapanınca düğme kaybolur,
- sunucu 400 dönerse (`detail`) kullanıcıya o mesaj gösterilir ve form içeriği KAYBOLMAZ.

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

- [ ] **Step 3: Uygula**

- `TodayPage`: açık oturum varsa başlangıç saati (TR) ve setleri; yoksa boş durum metni.
- `AddSetForm`: egzersiz seçimi (`<select>`, isme göre sıralı gelir), ağırlık
  (`inputMode="decimal"`, `,` ve `.` kabul edilir, sunucuya nokta ile gider), tekrar
  (`inputMode="numeric"`), opsiyonel RIR. Gönderimden sonra egzersiz seçimi KORUNUR, ağırlık/tekrar
  korunur (arka arkaya aynı seti girmek en sık akış), odak ağırlık alanına döner.
- `SetList`: setler egzersize göre gruplanır, grup içinde kronolojik; her satır
  `ağırlık × tekrar`, varsa RIR ve rekor rozeti.
- Mutasyon sonrası `invalidateQueries`: açık oturum, oturumun setleri, rekorlar.

- [ ] **Step 4: Doğrula ve commit**

```bash
cd web && npm run typecheck && npm run test
git add web
git commit -m "feat(web): bugun ekrani, set ekleme ve rekor rozetleri" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Geçmiş ve rekorlar

**Files:**
- Create: `web/src/pages/HistoryPage.tsx`, `web/src/pages/RecordsPage.tsx`
- Create: `web/src/pages/HistoryPage.test.tsx`, `web/src/pages/RecordsPage.test.tsx`
- Modify: `web/src/api/queries.ts`, `web/src/routes.tsx` (gezinme bağlantıları)

**Interfaces:**
- Consumes: `request`, biçimleyiciler.
- Produces: `useHistory(page)`, `useRecords()`.

**API davranışları:**

| Davranış | Sonuç |
|---|---|
| `GET /api/history` sayfalı zarf döner: `items`, `page`, `pageSize`, `totalCount`, `totalPages` | Sayfalama bu zarftan sürülür; toplam sayı istemcide hesaplanmaz. |
| Geçmişteki oturum `sets` dizisini İÇİNDE taşır | Setler için ayrı istek atma. |
| Seti olmayan oturum geçmişte `setCount = 0` ile GÖRÜNÜR (takvim/istatistikte görünmez) | Bunu "hata" sanıp gizleme; oturum bir günlüktür. |
| `GET /api/records` kullanıcının tüm setlerini okur | Polling yok; yalnızca set eklenince invalidate edilir. |

- [ ] **Step 1: Başarısız testleri yaz**
- geçmiş listesi oturumları yeniden eskiye gösterir, her satırda TR tarihi, set sayısı ve hacim,
- sonraki sayfaya geçilebilir (`totalPages > 1` iken),
- hiç oturum yoksa boş durum metni görünür,
- rekorlar listesi egzersiz başına en ağır set ve en çok tekrarı ayrı ayrı gösterir.

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

- [ ] **Step 3: Uygula** — sade listeler; grafik, filtre ve sonsuz kaydırma YOK (sonraki dilim).

- [ ] **Step 4: Doğrula ve commit**

```bash
cd web && npm run typecheck && npm run test && npm run build
git add web
git commit -m "feat(web): gecmis ve rekorlar ekranlari" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6 (kontrolcü): Dokümantasyon

Final tüm-branch incelemesinden ve düzeltmelerinden SONRA yapılır.

- [ ] **Step 1:** Test sayısını komutla belirle (`cd web && npm run test`), backend sayısıyla
      KARIŞTIRMA — PLAN.md'de "backend N / frontend M" diye ayrı yaz.
- [ ] **Step 2:** `PLAN.md`'ye "Frontend Dilim 1" bölümü: ne yapıldı, hangi ekranlar, test sayısı,
      ve devreden notlar (çevrimdışı yazma, CORS/dağıtım, görsel tasarım, sonraki dilimler).
- [ ] **Step 3:** `CLAUDE.md`: frontend klasör yapısı ve "sunucudaki hesabı istemcide tekrarlama"
      kuralı zaten var; dilim 1'in bittiğini ve neyin kapsam dışı kaldığını not düş.
- [ ] **Step 4:** Commit:

```bash
git add PLAN.md CLAUDE.md
git commit -m "docs: frontend dilim 1 tamamlandi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:** Karar 1-2 → Task 1; Karar 3-6 → Task 2; Karar 5 (401/oturum) → Task 2+3;
  Karar 7 (TR saat) → Task 2 (`format.ts`); Karar 8 (ilk dilim ekranları) → Task 3-5; Karar 9
  (telefon gereksinimleri) → Global Constraints + Task 1 CSS + Task 4 form davranışı; Karar 10
  (çevrimdışı) → Task 1 workbox ayarı; Karar 11 (proxy) → Task 1; Karar 12 (test) → her görev.
- **İsim tutarlılığı:** `request`, `ApiError`, `parseProblem`, `session`, `useAuth`,
  `useOpenSession` adları Task 2-5 boyunca aynı.
- **Dosya çakışması:** `queries.ts` Task 4'te oluşturulup Task 5'te genişletiliyor (sıralı);
  `routes.tsx` Task 3'te oluşturulup Task 5'te bağlantı ekleniyor. Başka çakışma yok.
- **Bilinen riskler:** (1) `npm run api:types` çalışan bir backend ister — Task 2 Step 1 bunu
  söylüyor ve üretilemezse durmayı emrediyor. (2) `vite-plugin-pwa`'nın service worker'ı test
  ortamında karışıklık çıkarırsa testlerde devre dışı bırakılır, üretim yapılandırması değişmez.
  (3) Görsel tasarım yasağı en kolay ihlal edilen kural: inceleyici bunu açıkça kontrol etmeli.
