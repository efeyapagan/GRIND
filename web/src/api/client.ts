import { configureRequestClient } from '@grind/shared/api/client';
import { session } from '../auth/session';

// Dev'de Vite bu yolu proxy'ler (vite.config.ts), uretimde ayni origin varsayilir. Bu dosya
// `./client`'tan import eden HERKES (uygulama kodu ya da test) tarafindan yuklendigi an devreye
// girer -- ayri bir baslangic adimi gerekmez, bugunku davranisla birebir ayni.
configureRequestClient({ baseUrl: '/api', session });

export { request, setUnauthorizedHandler } from '@grind/shared/api/client';
