// Background music.
// Plays licensed local background music after the first user interaction and stores settings locally.

window.SKACHKI_MUSIC = (function () {
  var STORAGE_KEY = 'skachki_music_settings_v1';
  var MUSIC_SRC = './assets/audio/background-music.mp3';
  var DEFAULT_SETTINGS = {
    enabled: true,
    volume: 0.35
  };

  var audio = null;
  var settings = loadSettings();
  var userUnlocked = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    audio.volume = settings.volume;
    audio.addEventListener('error', function () {
      updateControls();
    });

    return audio;
  }

  function canPlay() {
    return !!(audio && audio.readyState >= 2);
  }

  function play() {
    var track;
    if (!settings.enabled || !userUnlocked) return;

    track = getAudio();
    track.volume = settings.volume;

    track.play().then(updateControls).catch(function () {
      updateControls();
    });
  }

  function pause() {
    if (audio) audio.pause();
    updateControls();
  }

  function setEnabled(enabled) {
    settings.enabled = !!enabled;
    saveSettings();
    if (settings.enabled) play();
    else pause();
    updateControls();
  }

  function setVolume(volume) {
    settings.volume = clamp(Number(volume) || 0, 0, 1);
    if (audio) audio.volume = settings.volume;
    saveSettings();
    updateControls();
  }

  function toggle() {
    setEnabled(!settings.enabled);
  }

  function unlock() {
    if (userUnlocked) return;
    userUnlocked = true;
    getAudio();
    play();
  }

  function statusText() {
    if (!settings.enabled) return 'Выключена';
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
  }

  function bindUnlock() {
    var unlockOnce = function () { unlock(); };
    document.addEventListener('pointerdown', unlockOnce, { once: true });
    document.addEventListener('keydown', unlockOnce, { once: true });
  }

  function bind() {
    bindControls();
    bindUnlock();
    updateControls();
  }

  return {
    bind: bind,
    getSettings: function () { return Object.assign({}, settings); },
    play: play,
    pause: pause,
    setEnabled: setEnabled,
    setVolume: setVolume,
    updateControls: updateControls,
    MUSIC_SRC: MUSIC_SRC
  };
})();
