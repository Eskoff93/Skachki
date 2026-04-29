// Race selection menu.

window.SKACHKI_RACE_MENU = (function () {
  function game() { return window.SKACHKI_GAME; }

  function renderRaceMenu() {
    var G = game();
    var el = G.byId('raceMenuScroll');
    if (!el) return;

    var raceTypes = G.DATA.raceTypes || [];
    if (!raceTypes.length) {
      raceTypes = [{
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

    if (!G.state.selectedPlayerHorseId && G.state.horses[0]) {
      G.state.selectedPlayerHorseId = String(G.state.horses[0].id);
    }

    el.innerHTML =
      '<section class="selection-summary">' +
        '<div><div class="summary-title">Доступные заезды</div><div class="summary-desc">Выберите уровень гонки и одну свою лошадь.</div></div>' +
        '<div class="selection-count"><span>🪙</span><small>' + G.state.coins + '</small></div>' +
      '</section>' +
      '<div class="section-label">Тип гонки</div>' +
      raceTypes.map(renderRaceCard).join('') +
      '<div class="section-label">Ваша лошадь</div>' +
      G.state.horses.filter(function (horse) { return horse.status !== 'archived'; }).map(renderPlayerHorseCard).join('');

    var button = G.byId('raceMenuStartBtn');
    var type = getRaceType();
    if (button && type) {
      button.textContent = type.fee === 0 ? 'Начать заезд • бесплатно' : 'Начать заезд • взнос ' + type.fee + ' 🪙';
    }
  }

  function getRaceType() {
    var G = game();
    var raceTypes = G.DATA.raceTypes || [];
    return raceTypes.find(function (race) { return race.id === G.state.selectedRaceTypeId; }) || raceTypes[0];
  }

  function renderRaceCard(race) {
    var G = game();
    return '<div class="race-card ' + (race.id === G.state.selectedRaceTypeId ? 'selected' : '') + '" data-race="' + race.id + '">' +
      '<div class="race-top">' +
        '<div><div class="race-title">' + race.name + '</div><div class="race-desc">' + race.desc + '</div></div>' +
        '<div class="race-fee">' + race.fee + ' 🪙</div>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + race.level + '</b><span>Сложность</span></div>' +
        '<div class="race-box"><b>' + race.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + race.prizeMin + '–' + race.prizeMax + '</b><span>Приз</span></div>' +
      '</div>' +
    '</div>';
  }

  function renderPlayerHorseCard(horse) {
    var G = game();
    var selected = String(horse.id) === String(G.state.selectedPlayerHorseId);
    return '<div class="my-horse-card ' + (selected ? 'selected' : '') + '" data-horse="' + horse.id + '">' +
      '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
      '<div class="my-horse-info">' +
        '<div class="my-horse-name">' + horse.name + (selected ? ' <span class="player-badge">Выбрана</span>' : '') + '</div>' +
        '<div class="select-badges">' +
          '<span class="mini-tag">Класс ' + G.horseClass(horse) + '</span>' +
          '<span class="mini-tag">Форма ' + G.formLabel(horse.form) + '</span>' +
          '<span class="mini-tag">Карьера ' + horse.racesRun + '/' + horse.careerLimit + '</span>' +
        '</div>' +
        '<div class="my-horse-note">' + G.behaviorLabel(horse.temperament) + '</div>' +
      '</div>' +
    '</div>';
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
    if (back) back.onclick = function () { G.showScreen('menu'); };
    if (start) start.onclick = startRace;
  }

  return {
    renderRaceMenu: renderRaceMenu,
    getRaceType: getRaceType,
    startRace: startRace,
    bind: bind
  };
})();
