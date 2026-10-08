// expo-audio'nun native modulu Jest ortaminda (gercek native bridge yok) senkron olarak
// patliyor ("Cannot read properties of undefined (reading 'prototype')"). DinlenmeSayaci
// `useAudioPlayer`i HER render'da (dinlenme null olsa bile) cagirdigi icin bu, Antrenman
// ekranini acan HER teste (dolayli olarak) bulasiyordu -- sahte, no-op bir player yeterli.
// Gercek `useAudioPlayer` her render'da AYNI player'i doner; sahtesi de oyle (yeni nesne donseydi player'a
// bagli efektler her render'da yeniden kosardi -- #414).
const player = {
  play: () => {},
  pause: () => {},
  seekTo: async () => {},
  remove: () => {},
};

module.exports = {
  useAudioPlayer: () => player,
};
