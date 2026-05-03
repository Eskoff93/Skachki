// Core game state and shared helpers.

window.SKACHKI_GAME = (function () {
  var DATA = window.SKACHKI_DATA || {};
  var HORSE = window.SKACHKI_HORSE || {};
  var STORE = window.SKACHKI_STATE || {};
  var UI = window.SKACHKI_UI || {};

  var state = {
    horses: [],
    coins: 250,
    stableLevel: 1,
    stableXp: 0,
    selectedTrainingHorseId: null,
    selectedPlayerHorseId: null,
    selectedRaceTypeId: null,
    currentRaceHorses: [],
    raceResults: [],
    activeRaceType: null,
    raceGame: null,
    audioCtx: null,
    hoofTimer: null
  };

  function byId(id) {
    return UI.byId ? UI.byId(id) : document.getElementById(id);
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    if (window.clampValue) return window.clampValue(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function showToast(message) {
    if (UI.showToast) return UI.showToast(message);
    var toast = byId('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('active');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove('active');
    }, 1800);
  }

  function normalizeHorse(horse) {
    if (HORSE.normalizeHorse) return HORSE.normalizeHorse(horse, randInt);
    if (!horse.form) horse.form = 'normal';
    if (!Number.isFinite(horse.trainingStreakDays)) horse.trainingStreakDays = 0;
    if (typeof horse.lastTrainingDate === 'undefined') horse.lastTrainingDate = null;
    if (!Number.isFinite(horse.careerLimit)) horse.careerLimit = randInt(15, 35);
    if (!Number.isFinite(horse.racesRun)) horse.racesRun = 0;
    if (!Number.isFinite(horse.wins)) horse.wins = 0;
    if (!Number.isFinite(horse.podiums)) horse.podiums = 0;
    if (!Number.isFinite(horse.earnings)) horse.earnings = 0;
    if (!Number.isFinite(horse.offspringLimit)) horse.offspringLimit = randInt(1, 5);
    if (!Number.isFinite(horse.offspringCount)) horse.offspringCount = 0;
    if (!horse.status) horse.status = 'active';
    if (typeof horse.energy !== 'undefined') delete horse.energy;
    return horse;
  }

  function normalizeHorses(horses) {
    if (HORSE.normalizeHorses) return HORSE.normalizeHorses(horses, randInt);
    if (!Array.isArray(horses)) return [];
    return horses.map(normalizeHorse);
  }

  function randomFrom(list) {
    return list[randInt(0, list.length - 1)];
  }

  function createStarterHorse(name) {
    var breeds = ['Английская', 'Арабская', 'Ахалтекинская', 'Квотерхорс', 'Стандартбредная'];
    var coats = ['Гнедая', 'Вороная', 'Рыжая', 'Серая', 'Буланая', 'Соловая'];
    var temperaments = DATA.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    var gender = randInt(0, 1) === 0 ? 'stallion' : 'mare';

    return normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      gender: gender,
      breed: randomFrom(breeds),
      coat: randomFrom(coats),
      speed: randInt(20, 30),
      stamina: randInt(20, 30),
      acceleration: randInt(20, 30),
      agility: randInt(18, 30),
      power: randInt(18, 30),
      intelligence: randInt(18, 30),
      hiddenQualities: {
        strength: randInt(1, 5),
        agility: randInt(1, 5),
        instinct: randInt(1, 5)
      },
      rating: 0,
      bestRank: 'bronze',
      demotionShield: 0,
      practiceStarts: 0,
      practiceBestPlace: null,
      potential: randInt(58, 70),
      temperament: randomFrom(temperaments),
      form: 'normal',
      trainingStreakDays: 0,
      lastTrainingDate: null,
      careerLimit: randInt(18, 30),
      racesRun: 0,
      wins: 0,
      podiums: 0,
      earnings: 0,
      offspringLimit: randInt(1, 3),
      offspringCount: 0,
      status: 'active'
    });
  }

  function createHorse(name) {
    if (HORSE.createHorse) return HORSE.createHorse(name, randInt);
    var temperaments = DATA.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    return normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      speed: randInt(54, 78),
      stamina: randInt(52, 76),
      acceleration: randInt(52, 78),
      agility: randInt(48, 74),
      power: randInt(48, 74),
      intelligence: randInt(50, 76),
      potential: randInt(84, 100),
      temperament: temperaments[randInt(0, temperaments.length - 1)]
    });
  }

  function horseClass(horse) {
    if (HORSE.horseClass) return HORSE.horseClass(horse);
    return Math.round(
      (Number(horse.speed) || 0) * 0.4 +
      (Number(horse.stamina) || 0) * 0.35 +
      (Number(horse.acceleration) || 0) * 0.25
    );
  }

  function formLabel(form) {
    if (HORSE.formLabel) return HORSE.formLabel(form);
    if (form === 'excellent') return 'Отличная';
    if (form === 'bad') return 'Плохая';
    return 'Нормальная';
  }

  function formMultiplier(form) {
    if (HORSE.formMultiplier) return HORSE.formMultiplier(form);
    if (form === 'excellent') return 1;
    if (form === 'bad') return 0.6;
    return 0.8;
  }

  function behaviorLabel(temperament) {
    if (HORSE.behaviorLabel) return HORSE.behaviorLabel(temperament);
    return 'обычный стиль гонки';
  }

  function saveGame() {
    var payload = { horses: state.horses, coins: state.coins, stableLevel: state.stableLevel, stableXp: state.stableXp };
    if (STORE.save) return STORE.save(payload);
    try {
      localStorage.setItem('skachki_proto_toptrack_v2', JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetTransientState() {
    state.selectedTrainingHorseId = null;
    state.selectedPlayerHorseId = null;
    state.selectedRaceTypeId = null;
    state.currentRaceHorses = [];
    state.raceResults = [];
    state.activeRaceType = null;
    state.raceGame = null;
    if (state.hoofTimer) clearInterval(state.hoofTimer);
    state.hoofTimer = null;
  }

  function newGame() {
    var names = DATA.stableNames || ['Буран', 'Молния', 'Ветерок'];
    resetTransientState();
    state.horses = names.map(createStarterHorse);
    state.coins = 250;
    state.stableLevel = 1;
    state.stableXp = 0;
    saveGame();
  }

  function resetProgress() {
    var confirmed = window.confirm('Удалить весь прогресс? Это действие нельзя отменить.');
    if (!confirmed) return;

    if (window.SKACHKI_RACE_ENGINE) window.SKACHKI_RACE_ENGINE.destroyRaceGame();
    if (STORE.reset) STORE.reset();
    else {
      try { localStorage.removeItem('skachki_proto_toptrack_v2'); } catch (e) {}
    }

    newGame();
    showScreen('stable');
    if (window.SKACHKI_STABLE) window.SKACHKI_STABLE.renderStable();
    showToast('Прогресс сброшен');
  }

  function loadGame() {
    var data = STORE.load ? STORE.load() : null;
    if (!data) {
      try {
        data = JSON.parse(localStorage.getItem('skachki_proto_toptrack_v2') || 'null');
      } catch (e) {
        data = null;
      }
    }
    if (!data || !Array.isArray(data.horses) || !data.horses.length) return newGame();
    state.horses = normalizeHorses(data.horses);
    state.coins = Number.isFinite(data.coins) ? data.coins : 250;
    state.stableLevel = Number.isFinite(data.stableLevel) ? data.stableLevel : 1;
    state.stableXp = Number.isFinite(data.stableXp) ? data.stableXp : 0;
    saveGame();
  }

  function averageClass() {
    if (!state.horses.length) return 0;
    return Math.round(state.horses.reduce(function (sum, horse) {
      return sum + horseClass(horse);
    }, 0) / state.horses.length);
  }

  function navigation() {
    return window.SKACHKI_NAVIGATION || {};
  }

  function addScreens() {
    var NAV = navigation();
    if (NAV.addScreens) NAV.addScreens();
  }

  function openRaceMenu() {
    var NAV = navigation();
    if (NAV.openRaceMenu) return NAV.openRaceMenu();
    showScreen('raceMenu');
  }

  function showScreen(name) {
    var NAV = navigation();
    if (NAV.showScreen) return NAV.showScreen(name);
  }

  function statBlock(label, value, color) {
    return '<div><div class="stat-top"><span>' + label + '</span><b>' + Math.round(value) + '</b></div><div class="stat-bar"><span style="width:' + Math.min(100, value) + '%;background:' + color + '"></span></div></div>';
  }

  function bindCommonEvents() {
    var NAV = navigation();
    if (NAV.bind) NAV.bind();

    document.addEventListener('click', function (event) {
      var resetButton = event.target.closest('#resetProgressBtn');
      if (!resetButton) return;
      event.preventDefault();
      event.stopPropagation();
      resetProgress();
    });

    var info = byId('infoBtn');
    var closeInfo = byId('closeInfoBtn');
    var infoModal = byId('infoModal');
    if (info) info.onclick = function () { infoModal.classList.add('active'); };
    if (closeInfo) closeInfo.onclick = function () { infoModal.classList.remove('active'); };
  }

  function init() {
    addScreens();
    loadGame();
    bindCommonEvents();
    if (window.SKACHKI_STABLE) window.SKACHKI_STABLE.bind();
    if (window.SKACHKI_TRAINING) window.SKACHKI_TRAINING.bind();
    if (window.SKACHKI_BREEDING) window.SKACHKI_BREEDING.bind();
    if (window.SKACHKI_RACE_MENU) window.SKACHKI_RACE_MENU.bind();
    if (window.SKACHKI_RACE_ENGINE) window.SKACHKI_RACE_ENGINE.bind();
    if (window.SKACHKI_RESULTS) window.SKACHKI_RESULTS.bind();
    showScreen('stable');
  }

  return {
    DATA: DATA,
    state: state,
    byId: byId,
    randInt: randInt,
    clamp: clamp,
    showToast: showToast,
    createHorse: createHorse,
    createStarterHorse: createStarterHorse,
    normalizeHorse: normalizeHorse,
    normalizeHorses: normalizeHorses,
    horseClass: horseClass,
    formLabel: formLabel,
    formMultiplier: formMultiplier,
    behaviorLabel: behaviorLabel,
    saveGame: saveGame,
    loadGame: loadGame,
    newGame: newGame,
    resetProgress: resetProgress,
    averageClass: averageClass,
    showScreen: showScreen,
    openRaceMenu: openRaceMenu,
    statBlock: statBlock,
    init: init
  };
})();
