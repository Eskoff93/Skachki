// Race selection menu.

window.SKACHKI_RACE_MENU = (function () {
  var raceMenuStep = 'race';

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function activeHorses() {
    var G = game();
    return G.state.horses.filter(function (horse) {
      return horse.status !== 'archived';
    });
  }

  function getRaceTypes() {
    var G = game();
    var raceTypes = G.DATA.raceTypes || [];
    if (raceTypes.length) return raceTypes;

    return [{
      id: 'rookie',
      name: 'Новичковый заезд',
      level: 'Низкая',
      fee: 0,
      prizeMin: 30,
      prizeMax: 60,
      distance: 1000,
      opponents: 3,
      classOffset: -12,
      desc: 'Бесплатный старт.'
    }];
  }

  function findRaceType(id) {
    return getRaceTypes().find(function (race) {
      return String(race.id) === String(id);
    }) || null;
  }

  function getRaceType() {
    var G = game();
    return findRaceType(G.state.selectedRaceTypeId);
  }

  function openRaceMenu() {
    var G = game();
    raceMenuStep = 'race';
    G.state.selectedRaceTypeId = null;
    G.state.selectedPlayerHorseId = null;
    G.showScreen('raceMenu');
  }

  function renderRaceMenu() {
    var G = game();
    var el = G.byId('raceMenuScroll');
    if (!el) return;

    var raceTypes = getRaceTypes();
    var horses = activeHorses();

    el.innerHTML = raceMenuStep === 'horse'
      ? renderHorseStep(raceTypes, horses)
      : renderRaceStep(raceTypes, horses);

    updatePrimaryButton();
  }

  function renderRaceStep(raceTypes, horses) {
    var G = game();
    return '<section class="selection-summary race-menu-summary">' +
      '<div>' +
        '<div class="summary-title">Гонки</div>' +
        '<div class="summary-desc">Сначала выберите тип заезда. Лошадь выберем следующим шагом.</div>' +
      '</div>' +
      '<div class="selection-count"><span>🪙</span><small>' + G.state.coins + '</small></div>' +
      '<div class="race-menu-mini-stats">' +
        '<div class="chip-box"><div class="value">' + raceTypes.length + '</div><div class="label">Заездов</div></div>' +
        '<div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div>' +
        '<div class="chip-box"><div class="value">' + (G.state.selectedRaceTypeId ? '✓' : '—') + '</div><div class="label">Заезд</div></div>' +
      '</div>' +
    '</section>' +
    '<div class="section-label">Выберите заезд</div>' +
    raceTypes.map(renderRaceCard).join('');
  }

  function renderHorseStep(raceTypes, horses) {
    var raceType = getRaceType() || raceTypes[0];
    if (!raceType) return renderRaceStep(raceTypes, horses);

    return renderPinnedRace(raceType) +
      '<div class="section-label">Выберите лошадь</div>' +
      horses.map(renderPlayerHorseCard).join('');
  }

  function renderPinnedRace(race) {
    return '<section class="race-card premium-race-card selected pinned-race-card">' +
      '<div class="race-top">' +
        '<div>' +
          '<div class="race-title">' + race.name + '</div>' +
          '<div class="race-desc">Текущий заезд. Можно вернуться и поменять.</div>' +
        '</div>' +
        '<button class="breed-change-btn" type="button" data-race-action="change-race">Изменить</button>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + raceFeeLabel(race) + '</b><span>Взнос</span></div>' +
        '<div class="race-box"><b>' + race.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + raceRewardLabel(race) + '</b><span>Приз</span></div>' +
      '</div>' +
    '</section>';
  }

  function raceFeeLabel(race) {
    return race.fee === 0 ? 'Бесплатно' : race.fee + ' 🪙';
  }

  function raceRewardLabel(race) {
    return race.prizeMin + '–' + race.prizeMax + ' 🪙';
  }

  function renderRaceCard(race) {
    var G = game();
    var selected = String(race.id) === String(G.state.selectedRaceTypeId);
    return '<button class="race-card premium-race-card ' + (selected ? 'selected' : '') + '" data-race="' + race.id + '" type="button">' +
      '<div class="race-top">' +
        '<div>' +
          '<div class="race-title">' + race.name + '</div>' +
          '<div class="race-desc">' + race.desc + '</div>' +
        '</div>' +
        '<div class="race-fee">' + raceFeeLabel(race) + '</div>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + race.level + '</b><span>Сложность</span></div>' +
        '<div class="race-box"><b>' + race.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + raceRewardLabel(race) + '</b><span>Приз</span></div>' +
      '</div>' +
      '<div class="select-badges race-badges">' +
        '<span class="mini-tag">Соперников: ' + race.opponents + '</span>' +
      '</div>' +
    '</button>';
  }

  function renderPlayerHorseCard(horse) {
    var G = game();
    var selected = String(horse.id) === String(G.state.selectedPlayerHorseId);
    var UI = horseUi();
    var card;

    if (!UI.renderHorseCard) return '';

    card = UI.renderHorseCard(horse, {
      dataHorse: true,
      selected: false,
      extraClass: 'race-horse-choice'
    });

    if (!selected) return card;

    return '<div data-horse="' + horse.id + '" class="race-horse-choice-frame" style="border:2px solid rgba(255,210,93,.76);border-radius:28px;padding:3px;margin-bottom:12px;box-shadow:0 0 0 1px rgba(255,210,93,.22) inset,0 0 28px rgba(255,210,93,.14);">' + card + '</div>';
  }

  function updatePrimaryButton() {
    var G = game();
    var button = G.byId('raceMenuStartBtn');
    if (!button) return;

    var raceType = getRaceType();
    var player = G.state.horses.find(function (horse) {
      return String(horse.id) === String(G.state.selectedPlayerHorseId);
    });

    if (raceMenuStep === 'race') {
      button.disabled = !raceType;
      button.textContent = raceType ? 'Выбрать лошадь' : 'Выберите заезд';
      return;
    }

    button.disabled = !player;
    if (!player) {
      button.textContent = 'Выберите лошадь';
      return;
    }

    button.textContent = raceType && raceType.fee > 0
      ? 'Начать заезд • взнос ' + raceType.fee + ' 🪙'
      : 'Начать заезд • бесплатно';
  }

  function createBotHorse(base, index) {
    var G = game();
    var botNames = G.DATA.botNames || ['Гром', 'Тайфун', 'Северный Ветер', 'Золотой Барс', 'Красный Шторм', 'Феникс'];
    var temperaments = G.DATA.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    function stat() { return G.clamp(base + G.randInt(-8, 8), 35, 100); }
    return {
      id: 'bot_' + Date.now() + '_' + index,
      name: botNames[index % botNames.length],
      speed: stat(),
      stamina: stat(),
      acceleration: stat(),
      agility: stat(),
      power: stat(),
      intelligence: stat(),
      potential: stat(),
      temperament: temperaments[G.randInt(0, temperaments.length - 1)],
      form: 'normal',
      racesRun: 0,
      careerLimit: 25,
      isBot: true
    };
  }

  function continueToHorseSelection() {
    var G = game();
    if (!getRaceType()) return G.showToast('Выберите заезд');
    raceMenuStep = 'horse';
    G.state.selectedPlayerHorseId = null;
    renderRaceMenu();
  }

  function startRace() {
    var G = game();
    var raceType = getRaceType();
    var player = G.state.horses.find(function (horse) { return String(horse.id) === String(G.state.selectedPlayerHorseId); });

    if (!raceType) return G.showToast('Выберите заезд');
    if (!player) return G.showToast('Выберите свою лошадь');
    if (player.status !== 'active') return G.showToast('Эта лошадь не может участвовать в гонках');
    if (G.state.coins < raceType.fee) return G.showToast('Недостаточно монет для взноса');

    G.state.coins -= raceType.fee;
    G.state.activeRaceType = raceType;

    var playerClone = JSON.parse(JSON.stringify(player));
    playerClone.name = 'Вы: ' + playerClone.name;
    playerClone.isPlayer = true;
    playerClone.playerHorseId = player.id;

    G.state.currentRaceHorses = [playerClone];
    var base = G.clamp(G.horseClass(player) + raceType.classOffset, 35, 100);
    for (var i = 0; i < raceType.opponents; i++) {
      G.state.currentRaceHorses.push(createBotHorse(base, i));
    }

    G.state.raceResults = [];
    G.saveGame();
    G.showScreen('race');

    setTimeout(function () {
      if (window.SKACHKI_RACE_ENGINE) window.SKACHKI_RACE_ENGINE.createRaceGame();
    }, 50);
  }

  function handlePrimaryAction() {
    if (raceMenuStep === 'race') return continueToHorseSelection();
    return startRace();
  }

  function bind() {
    var G = game();
    var scroll = G.byId('raceMenuScroll');
    if (scroll) {
      scroll.addEventListener('click', function (event) {
        var changeRace = event.target.closest('[data-race-action="change-race"]');
        if (changeRace) {
          raceMenuStep = 'race';
          G.state.selectedPlayerHorseId = null;
          renderRaceMenu();
          return;
        }

        var race = event.target.closest('[data-race]');
        if (race) {
          G.state.selectedRaceTypeId = race.dataset.race;
          renderRaceMenu();
          return;
        }

        var horse = event.target.closest('[data-horse]');
        if (horse) {
          G.state.selectedPlayerHorseId = horse.dataset.horse;
          renderRaceMenu();
        }
      });
    }

    var back = G.byId('raceMenuBackBtn');
    var start = G.byId('raceMenuStartBtn');
    if (back) back.onclick = function () {
      if (raceMenuStep === 'horse') {
        raceMenuStep = 'race';
        G.state.selectedPlayerHorseId = null;
        renderRaceMenu();
        return;
      }
      G.showScreen('stable');
    };
    if (start) start.onclick = handlePrimaryAction;
  }

  return {
    openRaceMenu: openRaceMenu,
    renderRaceMenu: renderRaceMenu,
    getRaceType: getRaceType,
    startRace: startRace,
    bind: bind
  };
})();
