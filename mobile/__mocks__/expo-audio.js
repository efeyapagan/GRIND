// expo-audio'nun native modulu Jest ortaminda (gercek native bridge yok) senkron olarak
// patliyor ("Cannot read properties of undefined (reading 'prototype')"). DinlenmeSayaci
// `useAudioPlayer`i HER render'da (dinlenme null olsa bile) cagirdigi icin bu, Antrenman
// ekranini acan HER teste (dolayli olarak) bulasiyordu -- sahte, no-op bir player yeterli.
module.exports = {
  useAudioPlayer: () => ({
    play: () => {},
    pause: () => {},
    seekTo: async () => {},
    remove: () => {},
  }),
};
