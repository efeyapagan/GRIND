jest.mock('expo-constants', () => ({ __esModule: true, default: {} }));

import { apiTabanUrlBul } from './apiConfig';

describe('apiTabanUrlBul', () => {
  it('EXPO_PUBLIC_API_URL verilmisse Metro adresine bakmadan onu kullanir (tunelden calisma)', () => {
    expect(apiTabanUrlBul('https://ornek.trycloudflare.com/api', 'abc.exp.direct:80')).toBe(
      'https://ornek.trycloudflare.com/api',
    );
  });

  it('verilmemisse bugunku gibi Metro LAN adresinin host kismini 5098 portuyla kullanir', () => {
    expect(apiTabanUrlBul(undefined, '192.168.1.20:8081')).toBe('http://192.168.1.20:5098/api');
  });
});
