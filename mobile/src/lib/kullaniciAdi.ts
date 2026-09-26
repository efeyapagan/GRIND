/**
 * Sunucunun `RegisterRequest.Username` / `UpdateProfileRequest.NewUsername` regex'iyle AYNI kural
 * (#342, #372); biri degisirse digeri de degismeli. Istemcide de uygulanir ki kullanici sifresini
 * bos yere yazip 400 yemesin ve bozuk bir ad icin uygunluk sorusu hic gitmesin.
 */
export const KULLANICI_ADI_KURALI = /^[a-zA-Z0-9_-]{3,50}$/;
