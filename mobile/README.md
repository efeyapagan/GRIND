# GRIND mobil (Expo)

## Evde (aynı Wi-Fi)

```
npx expo start
```

API adresi Metro'nun LAN IP'sinden bulunur (`src/apiConfig.ts`), ek ayar gerekmez.

## Evden uzakta (tünel, #249)

`--tunnel` yalnızca Metro'yu açar; backend'e ayrı bir tünel gerekir. Bilgisayar açık kalmalı
(Docker/Postgres, backend, iki tünel, uyku kapalı).

1. Backend'i başlat (`http` profili, port 5098).
2. Backend tüneli — çıktıdaki `https://....trycloudflare.com` adresini al:
   ```
   cloudflared tunnel --url http://localhost:5098
   ```
3. Expo'yu o adresle başlat (PowerShell):
   ```
   $env:EXPO_PUBLIC_API_URL="https://....trycloudflare.com/api"; npx expo start --tunnel
   ```

Hızlı tünel adresi her `cloudflared` başlatışında değişir; 3. adımı yeni adresle tekrarla.
Adres paylaşılmamalı: bilen biri kayıt ucuna ulaşabilir.
