// Background music.
// Plays original licensed/local background music only on menu screens after first user interaction.

window.SKACHKI_MUSIC = (function () {
  var STORAGE_KEY = 'skachki_music_settings_v1';
  var MUSIC_SRC = './assets/audio/background-music.mp3';
  var MENU_SCREENS = ['stable', 'raceMenu', 'breed', 'rating', 'training', 'selection', 'breedResult'];
  var SCREEN_IDS = {
    stableScreen: 'stable',
    raceMenuScreen: 'raceMenu',
    breedScreen: 'breed',
    ratingScreen: 'rating',
    trainingScreen: 'training',
    selectionScreen: 'selection',
    breedResultScreen: 'breedResult',
    raceScreen: 'race'
  };
  var DEFAULT_SETTINGS = {
    enabled: true,
    volume: 0.35
  };

  var audio = null;
  var audioCtx = null;
  var sourceNode = null;
  var gainNode = null;
  var settings = loadSettings();
  var userUnlocked = false;
  var isBound = false;
  var currentScreen = 'stable';
  var observer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isMenuScreen(name) {
    return MENU_SCREENS.indexOf(name) >= 0;
  }

  function activeScreenName() {
    var active = document.querySelector('.screen.active');
    return active && SCREEN_IDS[active.id] ? SCREEN_IDS[active.id] : currentScreen;
  }

  function refreshActiveScreen() {
    var nextScreen = activeScreenName();
    if (nextScreen === currentScreen) return;
    currentScreen = nextScreen;
    syncPlayback();
  }

  function loadSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return Object.assign({}, DEFAULT_SETTINGS);
      return {
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : DEFAULT_SETTINGS.enabled,
        volume: clamp(Number(saved.volume), 0, 1)
      };
    } catch (error) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {}
  }

  function getAudio() {
    if (audio) return audio;

    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1;
    audio.addEventListener('error', updateControls);

    return audio;
  }

  function ensureAudioGraph() {
    var AudioContextClass;
    var track = getAudio();

    if (gainNode) {
      applyVolume();
      return true;
    }

    AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      track.volume = settings.volume;
      return false;
    }

    try {
      audioCtx = audioCtx || new AudioContextClass();
      sourceNode = sourceNode || audioCtx.createMediaElementSource(track);
      gainNode = audioCtx.createGain();
      sourceNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      applyVolume();
      return true;
    } catch (error) {
      gainNode = null;
      track.volume = settings.volume;
      return false;
    }
  }

  function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      return audioCtx.resume().catch(function () {});
    }
    return Promise.resolve();
  }

  function applyVolume() {
    var value = clamp(settings.volume, 0, 1);
    if (gainNode) gainNode.gain.setTargetAtTime(value, audioCtx.currentTime, 0.03);
    if (audio) audio.volume = gainNode ? 1 : value;
  }

  function shouldPlay() {
    return settings.enabled && userUnlocked && isMenuScreen(currentScreen);
  }

  function syncPlayback() {
    if (shouldPlay()) play();
    else pause();
    updateControls();
  }

  function play() {
    var track;
    if (!settings.enabled || !userUnlocked || !isMenuScreen(currentScreen)) return;

    track = getAudio();
    ensureAudioGraph();
    applyVolume();

    resumeAudioContext().then(function () {
      return track.play();
    }).then(updateControls).catch(updateControls);
  }

  function pause() {
    if (audio) audio.pause();
    updateControls();
  }

  function setEnabled(enabled) {
    settings.enabled = !!enabled;
    saveSettings();
    syncPlayback();
  }

  function setVolume(volume) {
    settings.volume = clamp(Number(volume) || 0, 0, 1);
    applyVolume();
    saveSettings();
    updateControls();
  }

  function setCurrentScreen(name) {
    currentScreen = name || activeScreenName() || 'stable';
    syncPlayback();
  }

  function toggle() {
    setEnabled(!settings.enabled);
  }

  function unlock() {
    if (userUnlocked) return;
    userUnlocked = true;
    currentScreen = activeScreenName();
    ensureAudioGraph();
    syncPlayback();
  }

  function statusText() {
    if (!settings.enabled) return 'Выключена';
    if (!isMenuScreen(currentScreen)) return 'Не играет во время гонки';
    if (!audio) return 'Готова к запуску';
    if (audio.error) return 'Файл не найден';
    if (audio.paused) return userUnlocked ? 'На паузе' : 'Запустится после первого нажатия';
    return 'Играет';
  }

  function updateControls() {
    var toggleButton = document.getElementById('musicToggleBtn');
    var volumeInput = document.getElementById('musicVolumeInput');
    var volumeValue = document.getElementById('musicVolumeValue');
    var status = document.getElementById('musicStatusText');

    if (toggleButton) toggleButton.textContent = settings.enabled ? 'Выключить музыку' : 'Включить музыку';
    if (volumeInput) volumeInput.value = Math.round(settings.volume * 100);
    if (volumeValue) volumeValue.textContent = Math.round(settings.volume * 100) + '%';
    if (status) status.textContent = statusText();
  }

  function bindControls() {
    document.addEventListener('click', function (event) {
      var toggleButton = event.target.closest('#musicToggleBtn');
      if (!toggleButton) return;
      event.preventDefault();
      unlock();
      toggle();
    });

    document.addEventListener('input', function (event) {
      if (!event.target || event.target.id !== 'musicVolumeInput') return;
      setVolume(Number(event.target.value) / 100);
    });

    document.addEventListener('change', function (event) {
      if (!event.target || event.target.id !== 'musicVolumeInput') return;
      setVolume(Number(event.target.value) / 100);
    });
  }

  function bindUnlock() {
    var unlockOnce = function () { unlock(); };
    document.addEventListener('pointerdown', unlockOnce, { once: true });
    document.addEventListener('keydown', unlockOnce, { once: true });
  }

  function bindScreenObserver() {
    if (observer) return;
    observer = new MutationObserver(refreshActiveScreen);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    refreshActiveScreen();
  }

  function bind() {
    if (isBound) return;
    isBound = true;
    bindControls();
    bindUnlock();
    bindScreenObserver();
    updateControls();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  return {
    bind: bind,
    getSettings: function () { return Object.assign({}, settings); },
    pause: pause,
    play: play,
    setCurrentScreen: setCurrentScreen,
    setEnabled: setEnabled,
    setVolume: setVolume,
    updateControls: updateControls,
    MUSIC_SRC: MUSIC_SRC
  };
})();
