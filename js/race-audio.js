// Race audio helpers.

window.SKACHKI_RACE_AUDIO = (function () {
  function game() { return window.SKACHKI_GAME; }

  function playTone(freq, duration, type, volume) {
    var G = game();
    try {
      if (!G.state.audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        G.state.audioCtx = new AudioContextClass();
      }
      var osc = G.state.audioCtx.createOscillator();
      var gain = G.state.audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq || 440;
      gain.gain.setValueAtTime(volume || 0.05, G.state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, G.state.audioCtx.currentTime + (duration || 0.08));
      osc.connect(gain);
      gain.connect(G.state.audioCtx.destination);
      osc.start();
      osc.stop(G.state.audioCtx.currentTime + (duration || 0.08));
    } catch (e) {}
  }

  function startHoofSound() {
    var G = game();
    stopHoofSound();
    G.state.hoofTimer = setInterval(function () {
      playTone(88 + Math.random() * 30, 0.034, 'triangle', 0.03);
    }, 205);
  }

  function stopHoofSound() {
    var G = game();
    if (G.state.hoofTimer) clearInterval(G.state.hoofTimer);
    G.state.hoofTimer = null;
  }

  function playFinish() {
    stopHoofSound();
    playTone(720, 0.08, 'sine', 0.07);
    setTimeout(function () { playTone(960, 0.09, 'sine', 0.07); }, 90);
  }

  return {
    playFinish: playFinish,
    playTone: playTone,
    startHoofSound: startHoofSound,
    stopHoofSound: stopHoofSound
  };
})();
