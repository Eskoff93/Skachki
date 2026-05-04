// Race selection menu.

window.SKACHKI_RACE_MENU = (function () {
  var raceMenuStep = 'race';

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function activeHorses() {
    var G = game();
    return G.state.horses.filter(function (horse) {
      return horse.status !== 'archived' && !horse.isBalanceTestHorse;
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
      distance: 150,
      opponents: 3,
      botClassMin: 22,
      botClassMax: 35,
      botSpread: 4,
      botQualityMin: 1,
      botQualityMax: 8,
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

  function raceKindLabel(race) {
    if (race.id === 'rookie') return 'Практика';
    if (race.id === 'standard') return 'Обычный';
    if (race.id === 'strong') return 'Испытание';
    if (race.id === 'elite') return 'Элита';
    return 'Заезд';
  }

  function raceRiskLabel(race) {
    if (race.id === 'rookie') return 'Без риска';
    if (race.id === 'standard') return 'Умеренный';
    if (race.id === 'strong') return 'Высокий';
    if (race.id === 'elite') return 'Максимальный';
    return race.fee <= 0 ? 'Без риска' : 'Умеренный';
  }

  function classHint(race) {
    var min = Number(race.botClassMin) || 0;
    var max = Number(race.botClassMax) || min;
    return min + '–' + max;
  }

  function raceAdvice(race) {
    if (race.id === 'rookie') return 'Лучше для теста формы и поведения.';
    if (race.id === 'standard') return 'Хороший основной заезд для стабильного дохода.';
    if (race.id === 'strong') return 'Нужна сильная лошадь и хорошая форма.';
    if (race.id === 'elite') return 'Высокий риск: выпускать только лучших.';
    return race.desc || '';
  }

  function renderRaceStep(raceTypes, horses) {
    var G = game();
    return '<section class="selection-summary race-menu-summary" style="padding:12px 14px;margin-bottom:10px;">' +
      '<div>' +
        '<div class="summary-title" style="font-size:20px;line-height:1.05;">Скачки</div>' +
        '<div class="summary-desc" style="font-size:12px;line-height:1.25;margin-top:4px;">Выберите формат. Лошадь выберем следующим шагом.</div>' +
      '</div>' +
      '<div class="selection-count"><span>🪙</span><small>' + G.state.coins + '</small></div>' +
      '<div class="race-menu-mini-stats">' +
        '<div class="chip-box"><div class="value">' + raceTypes.length + '</div><div class="label">Заездов</div></div>' +
        '<div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div>' +
        '<div class="chip-box"><div class="value">20с</div><div class="label">Цель</div></div>' +
      '</div>' +
    '</section>' +
    '<div class="section-label" style="margin-top:8px;">Выберите заезд</div>' +
    raceTypes.map(renderRaceCard).join('');
  }

  function renderHorseStep(raceTypes, horses) {
    var raceType = getRaceType() || raceTypes[0];
    if (!raceType) return renderRaceStep(raceTypes, horses);

    return renderPinnedRace(raceType) +
      '<div class="section-label">Выберите лошадь</div>' +
      (horses.length ? horses.map(renderPlayerHorseCard).join('') : '<section class="summary-card"><div class="summary-title">Нет доступных лошадей</div><div class="summary-desc">В Конюшне нет активных лошадей для гонки.</div></section>');
  }

  function renderPinnedRace(race) {
    return '<section class="race-card premium-race-card selected pinned-race-card">' +
      '<div class="race-top">' +
        '<div>' +
          '<div class="race-title">' + race.name + '</div>' +
          '<div class="race-desc">' + raceAdvice(race) + '</div>' +
        '</div>' +
        '<button class="breed-change-btn" type="button" data-race-action="change-race">Изменить</button>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + raceKindLabel(race) + '</b><span>Формат</span></div>' +
        '<div class="race-box"><b>' + raceFeeLabel(race) + '</b><span>Взнос</span></div>' +
        '<div class="race-box"><b>' + raceRewardLabel(race) + '</b><span>Приз</span></div>' +
        '<div class="race-box"><b>' + race.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + race.opponents + '</b><span>Соперники</span></div>' +
        '<div class="race-box"><b>' + classHint(race) + '</b><span>Класс ботов</span></div>' +
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
    var canPay = G.state.coins >= race.fee;

    return '<button class="race-card premium-race-card ' + (selected ? 'selected' : '') + '" data-race="' + race.id + '" type="button">' +
      '<div class="race-top">' +
        '<div>' +
          '<div class="select-badges race-badges" style="margin:0 0 8px;">' +
            '<span class="mini-tag">' + raceKindLabel(race) + '</span>' +
            '<span class="mini-tag">Риск: ' + raceRiskLabel(race) + '</span>' +
          '</div>' +
          '<div class="race-title">' + race.name + '</div>' +
          '<div class="race-desc">' + raceAdvice(race) + '</div>' +
        '</div>' +
        '<div class="race-fee">' + raceFeeLabel(race) + '</div>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + race.level + '</b><span>Сложность</span></div>' +
        '<div class="race-box"><b>' + race.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + raceRewardLabel(race) + '</b><span>Приз</span></div>' +
        '<div class="race-box"><b>' + race.opponents + '</b><span>Соперники</span></div>' +
        '<div class="race-box"><b>' + classHint(race) + '</b><span>Класс ботов</span></div>' +
        '<div class="race-box"><b>' + (canPay ? 'Доступно' : 'Мало 🪙') + '</b><span>Статус</span></div>' +
      '</div>' +
    '</button>';
  }

  function applySelectedHorseStyle(card) {
    return card.replace(
      '<article class="',
      '<article style="border-color:rgba(255,210,93,.76)!important;box-shadow:0 0 0 1px rgba(255,210,93,.24) inset,0 18px 52px rgba(0,0,0,.46)!important;" class="'
    );
  }

  function renderPlayerHorseCard(horse) {
    var G = game();
    var selected = String(horse.id) === String(G.state.selectedPlayerHorseId);
    var UI = horseUi();
    var card;

    if (!UI.renderHorseCard) return '';

    card = UI.renderHorseCard(horse, {
      dataHorse: true,
      selected: selected,
      extraClass: 'race-horse-choice'
    });

    return selected ? applySelectedHorseStyle(card) : card;
  }

  function updatePrimaryButton() {
    var G = game();
    var button = G.byId('raceMenuStartBtn');
    if (!button) return;

    var raceType = getRaceType();
    var player = activeHorses().find(function (horse) {
      return String(horse.id) === String(G.state.selectedPlayerHorseId);
    });

    if (raceMenuStep === 'race') {
      button.disabled = !raceType;
      button.textContent = raceType ? 'Выбрать лошадь' : 'Выберите заезд';
      return;
    }

    if (!player) {
      button.disabled = true;
      button.textContent = 'Выберите лошадь';
      return;
    }

    if (raceType && G.state.coins < raceType.fee) {
      button.disabled = true;
      button.textContent = 'Нужно ' + raceType.fee + ' 🪙';
      return;
    }

    button.disabled = false;
    button.textContent = raceType && raceType.fee > 0
      ? 'Начать заезд • взнос ' + raceType.fee + ' 🪙'
      : 'Начать заезд • бесплатно';
  }

  function botQuality(race) {
    var G = game();
    var min = Number(race.botQualityMin) || 1;
    var max = Number(race.botQualityMax) || min;
    return G.clamp(G.randInt(min, max), 1, 20);
  }

  function createBotHorse(race, index) {
    var G = game();
    var botNames = G.DATA.botNames || ['Гром', 'Тайфун', 'Северный Ветер', 'Золотой Барс', 'Красный Шторм', 'Феникс'];
    var temperaments = G.DATA.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    var base = G.randInt(Number(race.botClassMin) || 25, Number(race.botClassMax) || 35);
    var spread = Number(race.botSpread) || 5;

    function stat() { return G.clamp(base + G.randInt(-spread, spread), 1, 100); }

    return {
      id: 'bot_' + Date.now() + '_' + index,
      name: botNames[index % botNames.length],
      speed: stat(),
      stamina: stat(),
      acceleration: stat(),
      hiddenQualities: {
        strength: botQuality(race),
        agility: botQuality(race),
        instinct: botQuality(race)
      },
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
    var player = activeHorses().find(function (horse) { return String(horse.id) === String(G.state.selectedPlayerHorseId); });

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
    for (var i = 0; i < raceType.opponents; i++) {
      G.state.currentRaceHorses.push(createBotHorse(raceType, i));
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
