// Race audio helpers.
// Uses small generated WebAudio tones for MVP: hoof rhythm, start, events and finish.

window.SKACHKI_RACE_AUDIO = (function () {
  var unlockBound = false;
  var muted = false;

  function game() { return window.SKACHKI_GAME; }

  function audioContext() {
    var G = game();
    var AudioContextClass;
    if (!G || !G.state) return null;

    try {
      if (!G.state.audioCtx) {
        AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        G.state.audioCtx = new AudioContextClass();
      }
      return G.state.audioCtx;
    } catch (e) {
      return null;
    }
  }

  function unlockAudio() {
    var ctx = audioContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return true;
    } catch (e) {
      return false;
    }
  }

  function bindUnlock() {
    if (unlockBound) return;
    unlockBound = true;

    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (eventName) {
      document.addEventListener(eventName, unlockAudio, { capture: true, passive: true });
    });
  }

  function isMuted() {
    return !!muted;
  }

  function setMuted(value) {
    muted = !!value;
    if (muted) stopHoofSound();
    else unlockAudio();
    return muted;
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  function playTone(freq, duration, type, volume, delay) {
    var ctx;
    var osc;
    var gain;
    var startAt;

    if (muted) return;
    ctx = audioContext();
    if (!ctx) return;
    unlockAudio();

    try {
      startAt = ctx.currentTime + (delay || 0);
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq || 440, startAt);
      gain.gain.setValueAtTime(volume || 0.05, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + (duration || 0.08));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + (duration || 0.08));
    } catch (e) {}
  }

  function playHoofBeat() {
    var base = 72 + Math.random() * 22;
    playTone(base, 0.045, 'triangle', 0.075, 0);
    playTone(base * 1.42, 0.032, 'square', 0.034, 0.055);
  }

  function startHoofSound() {
    var G = game();
    if (!G || !G.state || muted) return;

    bindUnlock();
    unlockAudio();
    stopHoofSound();
    playStart();

    G.state.hoofTimer = setInterval(playHoofBeat, 230);
  }

  function stopHoofSound() {
    var G = game();
    if (!G || !G.state) return;
    if (G.state.hoofTimer) clearInterval(G.state.hoofTimer);
    G.state.hoofTimer = null;
  }

  function playStart() {
    playTone(420, 0.07, 'sine', 0.055, 0);
    playTone(560, 0.07, 'sine', 0.055, 0.09);
  }

  function playBurst() {
    playTone(520, 0.055, 'triangle', 0.055, 0);
    playTone(780, 0.075, 'sine', 0.05, 0.055);
  }

  function playMistake() {
    playTone(180, 0.06, 'sawtooth', 0.045, 0);
    playTone(112, 0.08, 'triangle', 0.036, 0.06);
  }

  function playFinish() {
    stopHoofSound();
    playTone(720, 0.08, 'sine', 0.08, 0);
    playTone(960, 0.09, 'sine', 0.08, 0.09);
    playTone(1180, 0.12, 'triangle', 0.06, 0.19);
  }

  bindUnlock();

  return {
    bindUnlock: bindUnlock,
    isMuted: isMuted,
    playBurst: playBurst,
    playFinish: playFinish,
    playMistake: playMistake,
    playStart: playStart,
    playTone: playTone,
    setMuted: setMuted,
    startHoofSound: startHoofSound,
    stopHoofSound: stopHoofSound,
    toggleMuted: toggleMuted,
    unlockAudio: unlockAudio
  };
})();
