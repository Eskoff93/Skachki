// Balance test race mode.
// Isolated developer tool: no rewards, no career usage, no stable persistence.

window.SKACHKI_BALANCE_TEST = (function () {
  var HORSE_PRESETS = [
    { id: 'weak', label: 'Слабая', speed: 28, stamina: 28, acceleration: 28, form: 'normal' },
    { id: 'medium', label: 'Средняя', speed: 45, stamina: 45, acceleration: 45, form: 'normal' },
    { id: 'strong', label: 'Сильная', speed: 62, stamina: 62, acceleration: 62, form: 'normal' },
    { id: 'top', label: 'Топовая', speed: 82, stamina: 82, acceleration: 82, form: 'excellent' },
    { id: 'sprinter', label: 'Скорость+', speed: 78, stamina: 32, acceleration: 72, form: 'normal' },
    { id: 'stayer', label: 'Выносливость+', speed: 42, stamina: 82, acceleration: 38, form: 'normal' }
  ];

  var config = createDefaultConfig();
  var originalStartClick = null;
  var originalBackClick = null;

  function game() { return window.SKACHKI_GAME; }

  function createDefaultHorse(index) {
    return {
      name: 'Тест ' + (index + 1),
      speed: 50,
      stamina: 50,
      acceleration: 50,
      form: 'normal'
    };
  }

  function createDefaultConfig() {
    return {
      distance: 200,
      horseCount: 4,
      pureCoreOnly: false,
      horses: [
        createDefaultHorse(0),
        createDefaultHorse(1),
        createDefaultHorse(2),
        createDefaultHorse(3)
      ]
    };
  }

  function clamp(value, min, max) {
    var G = game();
    if (G && G.clamp) return G.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function clampStat(value) {
    return clamp(Math.round(Number(value) || 1), 1, 100);
  }

  function escapeAttribute(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syncHorseCount() {
    var count = clamp(Math.round(Number(config.horseCount) || 4), 2, 8);
    config.horseCount = count;

    while (config.horses.length < count) {
      config.horses.push(createDefaultHorse(config.horses.length));
    }

    if (config.horses.length > count) {
      config.horses = config.horses.slice(0, count);
    }
  }

  function formLabel(form) {
    if (config.pureCoreOnly) return 'Форма выкл.';
    if (form === 'excellent') return 'Отличная';
    if (form === 'bad') return 'Плохая';
    return 'Нормальная';
  }

  function renderDistanceButton(distance) {
    var active = Number(config.distance) === distance;
    return '<button class="race-box" data-balance-distance="' + distance + '" type="button" style="color:#fff;border-color:' + (active ? 'rgba(255,210,93,.72)' : 'rgba(255,255,255,.08)') + ';">' +
      '<b>' + distance + ' м</b><span>' + (active ? 'Выбрано' : 'Выбрать') + '</span>' +
    '</button>';
  }

  function renderNumberInput(index, field, label, value) {
    return '<div class="race-box" style="padding:8px;text-align:left;">' +
      '<span style="display:block;margin-bottom:5px;">' + label + '</span>' +
      '<input class="select" data-balance-field="' + field + '" data-index="' + index + '" type="number" min="1" max="100" value="' + value + '" style="min-height:38px;padding:0 8px;text-align:center;" />' +
    '</div>';
  }

  function renderPresetButtons(index) {
    return '<div class="balance-preset-row" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;">' +
      HORSE_PRESETS.map(function (preset) {
        return '<button class="mini-tag" data-balance-preset="' + preset.id + '" data-index="' + index + '" type="button" style="border:1px solid rgba(255,255,255,.1);">' + preset.label + '</button>';
      }).join('') +
    '</div>';
  }

  function renderPureToggle() {
    var active = !!config.pureCoreOnly;
    return '<button class="race-card premium-race-card" data-balance-pure-toggle type="button" style="padding:12px;margin:10px 0 12px;text-align:left;border-color:' + (active ? 'rgba(123,216,255,.78)' : 'rgba(255,255,255,.08)') + ';">' +
      '<div class="race-top" style="align-items:center;margin-bottom:6px;">' +
        '<div>' +
          '<div class="race-title" style="font-size:16px;margin:0;">Чистый тест параметров</div>' +
          '<div class="race-desc" style="font-size:12px;line-height:1.35;">' + (active
            ? 'Включено: работают только скорость, выносливость и ускорение.'
            : 'Отключает форму, события, AI, рывки, случайность и влияние дорожек.') + '</div>' +
        '</div>' +
        '<span class="mini-tag" style="border-color:' + (active ? 'rgba(123,216,255,.7)' : 'rgba(255,255,255,.12)') + ';">' + (active ? 'ВКЛ' : 'ВЫКЛ') + '</span>' +
      '</div>' +
    '</button>';
  }

  function renderHorseRow(horse, index) {
    return '<section class="race-card premium-race-card" style="padding:12px;margin-bottom:10px;">' +
      '<div class="race-top" style="align-items:center;margin-bottom:10px;">' +
        '<div class="race-title" style="font-size:16px;margin:0;">Лошадь ' + (index + 1) + '</div>' +
        '<span class="mini-tag">' + formLabel(horse.form) + '</span>' +
      '</div>' +
      '<label class="select-label">Имя</label>' +
      '<input class="select" data-balance-field="name" data-index="' + index + '" value="' + escapeAttribute(horse.name) + '" maxlength="18" />' +
      renderPresetButtons(index) +
      '<div class="race-grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">' +
        renderNumberInput(index, 'speed', 'Скорость', horse.speed) +
        renderNumberInput(index, 'stamina', 'Выносливость', horse.stamina) +
        renderNumberInput(index, 'acceleration', 'Ускорение', horse.acceleration) +
      '</div>' +
      '<label class="select-label">Форма</label>' +
      '<select class="select" data-balance-field="form" data-index="' + index + '" ' + (config.pureCoreOnly ? 'disabled' : '') + '>' +
        '<option value="excellent" ' + (horse.form === 'excellent' ? 'selected' : '') + '>Отличная 95–100%</option>' +
        '<option value="normal" ' + (horse.form === 'normal' ? 'selected' : '') + '>Нормальная 80–100%</option>' +
        '<option value="bad" ' + (horse.form === 'bad' ? 'selected' : '') + '>Плохая 70–90%</option>' +
      '</select>' +
    '</section>';
  }

  function renderCard() {
    return '<button class="race-card premium-race-card" data-balance-test-open type="button">' +
      '<div class="race-top">' +
        '<div>' +
          '<div class="select-badges race-badges" style="margin:0 0 8px;">' +
            '<span class="mini-tag">Тест</span>' +
            '<span class="mini-tag">Без наград</span>' +
          '</div>' +
          '<div class="race-title">Баланс-тест</div>' +
          '<div class="race-desc">Выбор дистанции, тестовых лошадей и готовых пресетов для проверки физики гонки.</div>' +
        '</div>' +
        '<div class="race-fee">Dev</div>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>150–500 м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>2–8</b><span>Лошади</span></div>' +
        '<div class="race-box"><b>Pure</b><span>Режим</span></div>' +
      '</div>' +
    '</button>';
  }

  function renderSetup() {
    syncHorseCount();

    return '<section class="selection-summary race-menu-summary" style="padding:12px 14px;margin-bottom:10px;">' +
      '<div>' +
        '<div class="summary-title" style="font-size:20px;line-height:1.05;">Баланс-тест</div>' +
        '<div class="summary-desc" style="font-size:12px;line-height:1.35;margin-top:4px;">Не тратит карьеру, не даёт монеты и не сохраняет тестовых лошадей.</div>' +
      '</div>' +
      '<button class="breed-change-btn" type="button" data-balance-test-back>Назад</button>' +
    '</section>' +
    renderPureToggle() +
    '<div class="section-label">Дистанция</div>' +
    '<div class="race-grid" style="margin-bottom:12px;">' + [150, 200, 300, 500].map(renderDistanceButton).join('') + '</div>' +
    '<label class="select-label">Своя дистанция, м</label>' +
    '<input class="select" data-balance-custom-distance type="number" min="50" max="2000" value="' + config.distance + '" />' +
    '<label class="select-label">Количество лошадей</label>' +
    '<select class="select" data-balance-count>' + [2, 3, 4, 5, 6, 7, 8].map(function (count) {
      return '<option value="' + count + '" ' + (count === config.horseCount ? 'selected' : '') + '>' + count + '</option>';
    }).join('') + '</select>' +
    '<div class="section-label">Тестовые лошади</div>' +
    config.horses.map(renderHorseRow).join('');
  }

  function shouldInjectCard(scroll) {
    return scroll &&
      scroll.querySelector('[data-race]') &&
      !scroll.querySelector('[data-horse]') &&
      !scroll.querySelector('[data-balance-test-open]');
  }

  function injectCard() {
    var G = game();
    var scroll = G && G.byId ? G.byId('raceMenuScroll') : null;
    var firstRace = scroll ? scroll.querySelector('[data-race]') : null;
    var wrapper;

    if (!shouldInjectCard(scroll) || !firstRace) return;
    wrapper = document.createElement('div');
    wrapper.innerHTML = renderCard();
    firstRace.parentNode.insertBefore(wrapper.firstChild, firstRace);
  }

  function setPrimaryButtonForTest() {
    var G = game();
    var start = G && G.byId ? G.byId('raceMenuStartBtn') : null;
    var back = G && G.byId ? G.byId('raceMenuBackBtn') : null;

    if (start && originalStartClick === null) originalStartClick = start.onclick;
    if (back && originalBackClick === null) originalBackClick = back.onclick;

    if (start) {
      start.disabled = false;
      start.textContent = 'Запустить баланс-тест';
      start.onclick = startBalanceTest;
    }

    if (back) back.onclick = closeSetup;
  }

  function restoreRaceMenu() {
    var G = game();
    var start = G && G.byId ? G.byId('raceMenuStartBtn') : null;
    var back = G && G.byId ? G.byId('raceMenuBackBtn') : null;

    if (start && originalStartClick) start.onclick = originalStartClick;
    if (back && originalBackClick) back.onclick = originalBackClick;
    originalStartClick = null;
    originalBackClick = null;

    if (window.SKACHKI_RACE_MENU && window.SKACHKI_RACE_MENU.openRaceMenu) {
      window.SKACHKI_RACE_MENU.openRaceMenu();
    }
  }

  function openSetup() {
    var G = game();
    var scroll = G && G.byId ? G.byId('raceMenuScroll') : null;
    if (!scroll) return;

    scroll.innerHTML = renderSetup();
    setPrimaryButtonForTest();
  }

  function closeSetup() {
    restoreRaceMenu();
  }

  function updateConfigFromInput(input) {
    var index = Number(input.dataset.index);
    var field = input.dataset.balanceField;
    var horse;

    if (!Number.isFinite(index) || !field) return;
    horse = config.horses[index];
    if (!horse) return;

    if (field === 'name') horse.name = String(input.value || '').slice(0, 18);
    else if (field === 'form') horse.form = input.value || 'normal';
    else horse[field] = clampStat(input.value);
  }

  function applyPreset(index, presetId) {
    var preset = HORSE_PRESETS.find(function (item) { return item.id === presetId; });
    var horse = config.horses[index];
    if (!preset || !horse) return;

    horse.speed = preset.speed;
    horse.stamina = preset.stamina;
    horse.acceleration = preset.acceleration;
    horse.form = preset.form || 'normal';
    horse.name = preset.label + ' ' + (index + 1);
    openSetup();
  }

  function createTestHorse(horseConfig, index) {
    var G = game();
    var horse = {
      id: 'balance_' + Date.now() + '_' + index,
      name: String(horseConfig.name || ('Тест ' + (index + 1))).slice(0, 18),
      gender: index % 2 === 0 ? 'stallion' : 'mare',
      breed: 'Английская',
      coat: ['Гнедая', 'Вороная', 'Рыжая', 'Серая', 'Буланая', 'Соловая'][index % 6],
      speed: clampStat(horseConfig.speed),
      stamina: clampStat(horseConfig.stamina),
      acceleration: clampStat(horseConfig.acceleration),
      agility: 60,
      power: 60,
      intelligence: 60,
      hiddenQualities: { strength: 8, agility: 8, instinct: 8 },
      potential: 100,
      temperament: 'Смелая',
      form: config.pureCoreOnly ? 'pure' : horseConfig.form || 'normal',
      rating: 0,
      racesRun: 0,
      wins: 0,
      podiums: 0,
      earnings: 0,
      careerLimit: 99,
      offspringCount: 0,
      offspringLimit: 0,
      status: 'active',
      isBalanceTestHorse: true
    };

    if (index === 0) horse.isPlayer = true;
    return G && G.normalizeHorse ? G.normalizeHorse(horse) : horse;
  }

  function startBalanceTest() {
    var G = game();
    if (!G) return;

    syncHorseCount();
    config.distance = clamp(Math.round(Number(config.distance) || 200), 50, 2000);

    G.state.activeRaceType = {
      id: 'balance_test',
      name: config.pureCoreOnly ? 'Баланс-тест: чистый' : 'Баланс-тест',
      level: 'Тест',
      fee: 0,
      prizeMin: 0,
      prizeMax: 0,
      distance: config.distance,
      opponents: config.horseCount - 1,
      isBalanceTest: true,
      pureBalanceTest: !!config.pureCoreOnly,
      desc: config.pureCoreOnly
        ? 'Чистый тест: только скорость, выносливость и ускорение.'
        : 'Изолированный тест физики без наград и статистики.'
    };

    G.state.currentRaceHorses = config.horses.map(createTestHorse);
    G.state.raceResults = [];
    G.showScreen('race');

    setTimeout(function () {
      if (window.SKACHKI_RACE_ENGINE) window.SKACHKI_RACE_ENGINE.createRaceGame();
    }, 50);
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var open = event.target.closest('[data-balance-test-open]');
      var back = event.target.closest('[data-balance-test-back]');
      var distance = event.target.closest('[data-balance-distance]');
      var preset = event.target.closest('[data-balance-preset]');
      var pureToggle = event.target.closest('[data-balance-pure-toggle]');

      if (open) {
        event.preventDefault();
        openSetup();
        return;
      }

      if (back) {
        event.preventDefault();
        closeSetup();
        return;
      }

      if (pureToggle) {
        event.preventDefault();
        config.pureCoreOnly = !config.pureCoreOnly;
        openSetup();
        return;
      }

      if (distance) {
        event.preventDefault();
        config.distance = Number(distance.dataset.balanceDistance) || 200;
        openSetup();
        return;
      }

      if (preset) {
        event.preventDefault();
        applyPreset(Number(preset.dataset.index), preset.dataset.balancePreset);
      }
    });

    document.addEventListener('input', function (event) {
      var input = event.target;
      if (input.matches('[data-balance-custom-distance]')) {
        config.distance = clamp(Math.round(Number(input.value) || 200), 50, 2000);
        return;
      }
      if (input.matches('[data-balance-field]')) updateConfigFromInput(input);
    });

    document.addEventListener('change', function (event) {
      var input = event.target;
      if (input.matches('[data-balance-count]')) {
        config.horseCount = Number(input.value) || 4;
        syncHorseCount();
        openSetup();
        return;
      }
      if (input.matches('[data-balance-field]')) updateConfigFromInput(input);
    });
  }

  function patchRaceMenuRender() {
    var menu = window.SKACHKI_RACE_MENU;
    var original;
    if (!menu || menu.__balanceTestPatched) return;

    original = menu.renderRaceMenu;
    if (typeof original !== 'function') return;

    menu.renderRaceMenu = function () {
      var result = original.apply(menu, arguments);
      injectCard();
      return result;
    };
    menu.__balanceTestPatched = true;
  }

  function init() {
    patchRaceMenuRender();
    bind();
    setTimeout(injectCard, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    injectCard: injectCard,
    openSetup: openSetup,
    startBalanceTest: startBalanceTest
  };
})();
