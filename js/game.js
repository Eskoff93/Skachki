// Core game state and shared helpers.

window.SKACHKI_GAME = (function () {
  var DATA = window.SKACHKI_DATA || {};
  var HORSE = window.SKACHKI_HORSE || {};
  var STORE = window.SKACHKI_STATE || {};
  var UI = window.SKACHKI_UI || {};

  var state = {
    horses: [],
    coins: 250,
    selectedTrainingHorseId: null,
    selectedPlayerHorseId: null,
    selectedRaceTypeId: 'rookie',
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
    return Math.round((horse.speed + horse.stamina + horse.acceleration + horse.agility + horse.power + horse.intelligence) / 6);
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
    var payload = { horses: state.horses, coins: state.coins };
    if (STORE.save) return STORE.save(payload);
    try {
      localStorage.setItem('skachki_proto_toptrack_v2', JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function newGame() {
    var names = DATA.stableNames || ['Буран', 'Молния', 'Ветерок'];
    state.horses = names.map(createHorse);
    state.coins = 250;
    saveGame();
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
    saveGame();
  }

  function averageClass() {
    if (!state.horses.length) return 0;
    return Math.round(state.horses.reduce(function (sum, horse) {
      return sum + horseClass(horse);
    }, 0) / state.horses.length);
  }

  function addScreens() {
    if (!byId('mainMenuScreen')) {
      var main = document.createElement('div');
      main.id = 'mainMenuScreen';
      main.className = 'screen';
      main.innerHTML = '<div class="topbar"><div class="topbar-row"><div style="width:38px;flex:0 0 auto"></div><div class="topbar-title"><h1>ГЛАВНОЕ МЕНЮ</h1><p>Конюшня, гонки и развитие</p></div><button class="icon-btn" id="mainInfoBtn">i</button></div></div><div class="content-scroll" id="mainMenuScroll"></div>';
      document.body.insertBefore(main, document.body.firstChild);
    }

    if (!byId('raceMenuScreen')) {
      var raceMenu = document.createElement('div');
      raceMenu.id = 'raceMenuScreen';
      raceMenu.className = 'screen';
      raceMenu.innerHTML = '<div class="topbar"><div class="topbar-row"><button class="icon-btn" id="raceMenuBackBtn">←</button><div class="topbar-title"><h1>ГОНКИ</h1><p>Выберите заезд и свою лошадь</p></div><div style="width:38px;flex:0 0 auto"></div></div></div><div class="content-scroll" id="raceMenuScroll"></div><div class="race-start-panel"><button class="btn btn-gold" id="raceMenuStartBtn" style="width:100%">Начать заезд</button></div>';
      document.body.insertBefore(raceMenu, document.body.firstChild);
    }
  }

  function showScreen(name) {
    if (window.SKACHKI_RACE_ENGINE && name !== 'race') {
      window.SKACHKI_RACE_ENGINE.destroyRaceGame();
    }

    var map = {
      menu: 'mainMenuScreen',
      stable: 'stableScreen',
      training: 'trainingScreen',
      breed: 'breedScreen',
      race: 'raceScreen',
      raceMenu: 'raceMenuScreen'
    };

    if (UI.showScreenById) UI.showScreenById(map[name] || 'mainMenuScreen');
    else {
      Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (screen) {
        screen.classList.remove('active');
      });
      var target = byId(map[name] || 'mainMenuScreen');
      if (target) target.classList.add('active');
    }

    if (name === 'menu' && window.SKACHKI_STABLE) window.SKACHKI_STABLE.renderMainMenu();
    if (name === 'stable' && window.SKACHKI_STABLE) window.SKACHKI_STABLE.renderStable();
    if (name === 'raceMenu' && window.SKACHKI_RACE_MENU) window.SKACHKI_RACE_MENU.renderRaceMenu();
  }

  function statBlock(label, value, color) {
    return '<div><div class="stat-top"><span>' + label + '</span><b>' + Math.round(value) + '</b></div><div class="stat-bar"><span style="width:' + Math.min(100, value) + '%;background:' + color + '"></span></div></div>';
  }

  function bindCommonEvents() {
    document.addEventListener('click', function (event) {
      var tile = event.target.closest('[data-menu]');
      if (!tile) return;
      var action = tile.getAttribute('data-menu');
      if (action === 'stable') showScreen('stable');
      else if (action === 'races') showScreen('raceMenu');
      else if (action === 'breed' && window.SKACHKI_BREEDING) window.SKACHKI_BREEDING.openBreedScreen();
      else showToast('Скоро');
    });

    document.addEventListener('click', function (event) {
      if (event.target && event.target.id === 'stableBackMenuBtn') {
        event.preventDefault();
        showScreen('menu');
      }
    });

    var info = byId('infoBtn');
    var mainInfo = byId('mainInfoBtn');
    var closeInfo = byId('closeInfoBtn');
    var infoModal = byId('infoModal');
    if (info) info.onclick = function () { infoModal.classList.add('active'); };
    if (mainInfo) mainInfo.onclick = function () { infoModal.classList.add('active'); };
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
    showScreen('menu');
  }

  return {
    DATA: DATA,
    state: state,
    byId: byId,
    randInt: randInt,
    clamp: clamp,
    showToast: showToast,
    createHorse: createHorse,
    normalizeHorse: normalizeHorse,
    normalizeHorses: normalizeHorses,
    horseClass: horseClass,
    formLabel: formLabel,
    formMultiplier: formMultiplier,
    behaviorLabel: behaviorLabel,
    saveGame: saveGame,
    loadGame: loadGame,
    newGame: newGame,
    averageClass: averageClass,
    showScreen: showScreen,
    statBlock: statBlock,
    init: init
  };
})();
