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

test('liste satiri eylemi yalnizca kendi listende, listeye gore', () => {
  expect(listeSatiriEylemi('friends', true)).toBe('arkadasliktanCikar');
  expect(listeSatiriEylemi('following', true)).toBe('takibiBirak');
  expect(listeSatiriEylemi('followers', true)).toBe('takipcidenCikar');
  expect(listeSatiriEylemi('followers', false)).toBeNull();
});
