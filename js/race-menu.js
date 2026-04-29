// Race selection menu.

window.SKACHKI_RACE_MENU = (function () {
  var raceMenuStep = 'race';

  function game() { return window.SKACHKI_GAME; }

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
          '<div class="race-desc">Выбранный заезд. Можно вернуться и поменять.</div>' +
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
        '<span class="mini-tag">Класс: ' + race.classOffset + '</span>' +
        (selected ? '<span class="player-badge">Выбран</span>' : '') +
      '</div>' +
    '</button>';
  }

  function horseRecord(horse) {
    return 'Гонки ' + (horse.racesRun || 0) + '/' + horse.careerLimit + ' • Победы ' + (horse.wins || 0) + ' • Призы ' + (horse.podiums || 0);
  }

  function horseRank(horse) {
    var tools = window.SKACHKI_HORSE || {};
    if (tools.horseRankFromRating) return tools.horseRankFromRating(horse.rating || 0);
    return 'bronze';
  }

  function horseRankLabel(horse) {
    var tools = window.SKACHKI_HORSE || {};
    var rank = horseRank(horse);
    if (tools.horseRankLabel) return tools.horseRankLabel(rank);
    return rank;
  }

  function renderStableLikeMedallion(horse) {
    var sexSymbol = horse.gender === 'mare' ? '♀' : '♂';
    var sexClass = horse.gender === 'mare' ? 'sex-mare' : 'sex-stallion';
    var rank = horseRank(horse);
    var safeId = String(horse.id || horse.name || 'horse').replace(/[^a-zA-Z0-9_-]/g, '');

    return '<div class="horse-medallion race-select-medallion medallion-' + rank + ' ' + sexClass + '">' +
      '<div class="medallion-crest">♞</div>' +
      '<svg class="horse-portrait-svg" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="raceAvatarBg' + safeId + '" cx="50%" cy="36%" r="74%"><stop offset="0" stop-color="#29415f"/><stop offset=".58" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient>' +
        '</defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#raceAvatarBg' + safeId + ')"/>' +
        '<text x="60" y="76" text-anchor="middle" font-size="54" font-weight="900" fill="#ffe6a2">♞</text>' +
      '</svg>' +
      '<div class="sex-badge ' + sexClass + '">' + sexSymbol + '</div>' +
      '<div class="rank-badge">' + horseRankLabel(horse) + '</div>' +
    '</div>';
  }

  function renderPlayerHorseCard(horse) {
    var G = game();
    var selected = String(horse.id) === String(G.state.selectedPlayerHorseId);
    return '<article class="horse-card luxury-horse-card race-horse-choice ' + (selected ? 'selected' : '') + '" data-horse="' + horse.id + '">' +
      '<div class="luxury-horse-top">' +
        renderStableLikeMedallion(horse) +
        '<div class="luxury-horse-info">' +
          '<div class="horse-name-row luxury-name-row">' +
            '<div class="horse-name-wrap"><div class="horse-name luxury-name">' + horse.name + '</div></div>' +
            (selected ? '<span class="player-badge">Выбрана</span>' : '') +
          '</div>' +
          '<div class="horse-stat-line luxury-record">' + horseRecord(horse) + '</div>' +
          '<div class="luxury-meta-row">' +
            '<span>Класс ' + G.horseClass(horse) + '</span>' +
            '<span>Форма ' + G.formLabel(horse.form) + '</span>' +
            '<span>' + G.behaviorLabel(horse.temperament) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="football-stats">' +
        '<div class="football-stat"><b>' + horse.speed + '</b><span>Скорость</span></div>' +
        '<div class="football-stat"><b>' + horse.stamina + '</b><span>Выносливость</span></div>' +
        '<div class="football-stat"><b>' + horse.acceleration + '</b><span>Ускорение</span></div>' +
      '</div>' +
    '</article>';
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
