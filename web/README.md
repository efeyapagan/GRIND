# GRIND — Web (Frontend)

React + Vite + TypeScript, kurulabilir PWA. Antrenman takip uygulamasının ilk frontend dilimi.

## Kurulum ve geliştirme

```
npm install
npm run dev
```

Backend'in **`http` profiliyle** (varsayılan, `https` değil) çalışıyor olması gerekir:

```
dotnet run --project src/Grind.Api
```

Uygulama `http://localhost:5098` adresinde dinler. `https` profili dev proxy'yi (`vite.config.ts`)
kırar: proxy 307 yönlendirmesini takip etmez.

## API tipleri

`src/api/schema.d.ts`, çalışan backend'in Swagger şemasından üretilir ve commit edilir:

```
npm run api:types
```

## Test, tip kontrolü, derleme

```
npm run test
npm run typecheck
npm run build
```
