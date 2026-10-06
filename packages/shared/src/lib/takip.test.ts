import { describe, expect, test } from 'vitest';
import { arkadaslikDurumu, listeSatiriEylemi, takipMenusuAcilir } from './takip';

describe('arkadaslikDurumu (#628)', () => {
  test.each([
    [{ relation: 'Self', friendRequest: 'None', canSendFriendRequest: false }, null],
    [{ relation: 'Friends', friendRequest: 'None', canSendFriendRequest: true }, 'arkadas'],
    [{ relation: 'Following', friendRequest: 'Sent', canSendFriendRequest: true }, 'gonderildi'],
    [{ relation: 'FollowedBy', friendRequest: 'Received', canSendFriendRequest: true }, 'gelen'],
    [{ relation: 'None', friendRequest: 'None', canSendFriendRequest: false }, 'sinirDoldu'],
    [{ relation: 'None', friendRequest: 'None', canSendFriendRequest: true }, 'ekle'],
  ] as const)('%o -> %s', (profil, beklenen) => {
    expect(arkadaslikDurumu(profil)).toBe(beklenen);
  });

  // Gelen istek, ret sınırından önce gelir: sınır yalnızca BENİM göndermemi kısıtlar, kabul etmemi değil.
  test('gelen istek ret sinirina takilmaz', () => {
    expect(arkadaslikDurumu({ relation: 'None', friendRequest: 'Received', canSendFriendRequest: false })).toBe('gelen');
  });
});

test('takip menusu yalnizca takip ederken acilir', () => {
  expect(['Self', 'None', 'Following', 'FollowedBy', 'Friends'].filter((i) => takipMenusuAcilir(i as never)))
    .toEqual(['Following', 'Friends']);
});

// #646: ayni islem (onun takibini sil) listeye degil iliskiye gore adlanir -- arkadassa "Arkadasliktan cikar".
describe('listeSatiriEylemi (#628, #646)', () => {
  test.each([
    ['friends', true, 'Friends', 'arkadasliktanCikar'],
    ['following', true, 'Following', 'takibiBirak'],
    ['following', true, 'Friends', 'takibiBirak'],
    ['followers', true, 'Friends', 'arkadasliktanCikar'],
    ['followers', true, 'FollowedBy', 'takipcidenCikar'],
    ['friends', false, 'Friends', null],
    ['following', false, 'Following', null],
    ['followers', false, 'Friends', null],
    ['followers', false, 'FollowedBy', null],
  ] as const)('%s, kendi listem=%s, %s -> %s', (liste, kendiListem, iliski, beklenen) => {
    expect(listeSatiriEylemi(liste, kendiListem, iliski)).toBe(beklenen);
  });
});
