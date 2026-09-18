// Jest icin basit, bellek-tabanli expo-secure-store sahte uygulamasi -- gercek native modul test
// ortaminda calismaz; session.ts'in read/write/clear akisini gercekci sekilde dogrulamak icin
// gercek bir anahtar-deger deposu gibi davranir (jest-expo'nun kendi otomatik mock'u kalicilik
// SAGLAMIYOR, her cagrida undefined donuyordu).
const depo = new Map();

module.exports = {
  async getItemAsync(anahtar) {
    return depo.has(anahtar) ? depo.get(anahtar) : null;
  },
  async setItemAsync(anahtar, deger) {
    depo.set(anahtar, deger);
  },
  async deleteItemAsync(anahtar) {
    depo.delete(anahtar);
  },
};
