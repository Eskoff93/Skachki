// Race selection menu.

window.SKACHKI_RACE_MENU = (function () {
  function game() { return window.SKACHKI_GAME; }

  function activeHorses() {
    var G = game();
    return G.state.horses.filter(function (horse) {
      return horse.status !== 'archived';
    });
  }

  function renderRaceMenu() {
    var G = game();
    var el = G.byId('raceMenuScroll');
    if (!el) return;

    var raceTypes = getRaceTypes();
    var horses = activeHorses();

    if (!G.state.selectedPlayerHorseId && horses[0]) {
      G.state.selectedPlayerHorseId = String(horses[0].id);
    }

    el.innerHTML =
      renderRaceSummary(raceTypes, horses) +
      '<div class="section-label">Тип гонки</div>' +
      raceTypes.map(renderRaceCard).join('') +
      '<div class="section-label">Ваша лошадь</div>' +
      horses.map(renderPlayerHorseCard).join('');

    updateStartButton();
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

  function renderRaceSummary(raceTypes, horses) {
    var G = game();
    return '<section class="selection-summary race-menu-summary">' +
      '<div>' +
        '<div class="summary-title">Гонки</div>' +
        '<div class="summary-desc">Выберите заезд, оцените приз и выставьте подходящую лошадь.</div>' +
      '</div>' +
      '<div class="selection-count"><span>🪙</span><small>' + G.state.coins + '</small></div>' +
      '<div class="race-menu-mini-stats">' +
        '<div class="chip-box"><div class="value">' + raceTypes.length + '</div><div class="label">Заездов</div></div>' +
        '<div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div>' +
        '<div class="chip-box"><div class="value">' + (G.state.selectedRaceTypeId ? '✓' : '—') + '</div><div class="label">Выбор</div></div>' +
      '</div>' +
    '</section>';
  }

  function getRaceType() {
    var G = game();
    var raceTypes = getRaceTypes();
    return raceTypes.find(function (race) { return race.id === G.state.selectedRaceTypeId; }) || raceTypes[0];
  }

  function raceFeeLabel(race) {
    return race.fee === 0 ? 'Бесплатно' : race.fee + ' 🪙';
  }

  function raceRewardLabel(race) {
    return race.prizeMin + '–' + race.prizeMax + ' 🪙';
  }

  function renderRaceCard(race) {
    var G = game();
    var selected = race.id === G.state.selectedRaceTypeId;
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
        '<span class="mini-tag">Класс: ' + race.classOffset + '</span>' +
        (selected ? '<span class="player-badge">Выбран</span>' : '') +
      '</div>' +
    '</button>';
  }

  function horseShortName(horse) {
    return String(horse.name || 'Л').trim().slice(0, 1).toUpperCase();
  }

  function horseRecord(horse) {
    return 'Гонки ' + (horse.racesRun || 0) + '/' + horse.careerLimit + ' • Победы ' + (horse.wins || 0) + ' • Призы ' + (horse.podiums || 0);
  }

  function renderHorseMark(horse, selected) {
    var gender = horse.gender === 'mare' ? '♀' : '♂';
    return '<div class="horse-avatar race-horse-mark ' + (selected ? 'selected' : '') + '">' +
      '<div class="race-horse-letter">' + horseShortName(horse) + '</div>' +
      '<div class="race-horse-symbol">' + gender + '</div>' +
    '</div>';
  }

  function renderPlayerHorseCard(horse) {
    var G = game();
    var selected = String(horse.id) === String(G.state.selectedPlayerHorseId);
    return '<button class="my-horse-card premium-race-horse-card ' + (selected ? 'selected' : '') + '" data-horse="' + horse.id + '" type="button">' +
      renderHorseMark(horse, selected) +
      '<div class="my-horse-info">' +
        '<div class="my-horse-name">' + horse.name + (selected ? ' <span class="player-badge">Выбрана</span>' : '') + '</div>' +
        '<div class="select-badges">' +
          '<span class="mini-tag">Класс ' + G.horseClass(horse) + '</span>' +
          '<span class="mini-tag">Форма ' + G.formLabel(horse.form) + '</span>' +
          '<span class="mini-tag">' + horseRecord(horse) + '</span>' +
        '</div>' +
        '<div class="my-horse-note">' + G.behaviorLabel(horse.temperament) + '</div>' +
      '</div>' +
    '</button>';
  }

  function updateStartButton() {
    var G = game();
    var button = G.byId('raceMenuStartBtn');
    var type = getRaceType();
    var player = G.state.horses.find(function (horse) {
      return String(horse.id) === String(G.state.selectedPlayerHorseId);
    });

    if (!button || !type) return;

    if (!player) {
      button.textContent = 'Выберите лошадь';
      button.disabled = true;
      return;
    }

    button.disabled = false;
    button.textContent = type.fee === 0 ? 'Начать заезд • бесплатно' : 'Начать заезд • взнос ' + type.fee + ' 🪙';
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

  function startRace() {
    var G = game();
    var raceType = getRaceType();
    var player = G.state.horses.find(function (horse) { return String(horse.id) === String(G.state.selectedPlayerHorseId); });

    if (!raceType) return G.showToast('Заезд не найден');
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

  function bind() {
    var G = game();
    var scroll = G.byId('raceMenuScroll');
    if (scroll) {
      scroll.addEventListener('click', function (event) {
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
    if (back) back.onclick = function () { G.showScreen('stable'); };
    if (start) start.onclick = startRace;
  }

  return {
    renderRaceMenu: renderRaceMenu,
    getRaceType: getRaceType,
    startRace: startRace,
    bind: bind
  };
})();
