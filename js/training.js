// Training screen and training actions.
// Styles for this screen live in css/luxury.css.

window.SKACHKI_TRAINING = (function () {
  var PRIMARY_TRAINING_KEYS = ['speed', 'stamina', 'acceleration'];
  var selectedTrainingKey = 'speed';

  var TRAINING_META = {
    speed: {
      short: 'Скорость',
      title: 'Скорость',
      hint: 'Максимальный темп на дистанции.'
    },
    stamina: {
      short: 'Выносливость',
      title: 'Выносливость',
      hint: 'Стабильность ближе к финишу.'
    },
    acceleration: {
      short: 'Ускорение',
      title: 'Ускорение',
      hint: 'Старт, рывки и смена темпа.'
    }
  };

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function icon(name) {
    var paths = {
      back: '<path d="M15 6l-6 6 6 6"/><path d="M9 12h12"/>',
      coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M9.5 10h5"/><path d="M9.5 14h5"/>',
      streak: '<path d="M12 3v5"/><path d="M7 7l3 3"/><path d="M17 7l-3 3"/><path d="M5 14c2 4 5 6 7 6s5-2 7-6"/>',
      center: '<path d="M4 19h16"/><path d="M6 19V9l6-4 6 4v10"/><path d="M10 19v-6h4v6"/>',
      speed: '<path d="M4 15c4-6 10-8 16-8"/><path d="M16 5l4 2-3 4"/><path d="M5 18h10"/>',
      stamina: '<path d="M12 21s7-4 7-11V5l-7-3-7 3v5c0 7 7 11 7 11z"/><path d="M8.5 12h2l1.2-3 2 6 1-3h1.8"/>',
      acceleration: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
      gain: '<path d="M5 16l5-5 3 3 6-7"/><path d="M15 7h4v4"/>',
      efficiency: '<circle cx="12" cy="12" r="8"/><path d="M12 12l5-4"/><path d="M8 16h8"/>',
      horse: '<path d="M8 19c2-5 1-9 5-12 4 2 6 5 5 9"/><path d="M11 8c-2 1-3 3-3 5"/><path d="M14 6l2-3 2 4"/>'
    };

    return '<svg class="training-svg-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.horse) + '</svg>';
  }

  function naturalLimit(horse) {
    return Math.max(45, Math.min(100, Math.round(Number(horse.potential) || 70)));
  }

  function primaryTrainingTypes() {
    var G = game();
    return (G.DATA.trainingTypes || []).filter(function (type) {
      return PRIMARY_TRAINING_KEYS.indexOf(type.key) !== -1;
    });
  }

  function getTrainingType(key) {
    return primaryTrainingTypes().find(function (type) { return type.key === key; }) || primaryTrainingTypes()[0];
  }

  function normalizeSelectedKey() {
    if (PRIMARY_TRAINING_KEYS.indexOf(selectedTrainingKey) === -1) selectedTrainingKey = 'speed';
    if (!getTrainingType(selectedTrainingKey)) {
      selectedTrainingKey = primaryTrainingTypes()[0] ? primaryTrainingTypes()[0].key : 'speed';
    }
    return selectedTrainingKey;
  }

  function roundCost(value) {
    return Math.max(5, Math.ceil(value / 5) * 5);
  }

  function efficiencyPlan(current, limit, baseCost) {
    var ratio = limit > 0 ? current / limit : 1;

    if (current >= 100) {
      return {
        level: 'max',
        label: 'Максимум',
        gainMin: 0,
        gainMax: 0,
        cost: 0,
        note: 'Показатель уже на максимуме.'
      };
    }

    if (ratio < 0.62) {
      return {
        level: 'high',
        label: 'Высокая',
        gainMin: 4,
        gainMax: 6,
        cost: roundCost(baseCost),
        note: 'Далеко от предела: прирост выше, цена базовая.'
      };
    }

    if (ratio < 0.82) {
      return {
        level: 'medium',
        label: 'Средняя',
        gainMin: 2,
        gainMax: 4,
        cost: roundCost(baseCost * 1.25),
        note: 'Средняя зона: прирост ниже, цена чуть выше.'
      };
    }

    if (ratio < 1) {
      return {
        level: 'low',
        label: 'Низкая',
        gainMin: 1,
        gainMax: 2,
        cost: roundCost(baseCost * 1.75),
        note: 'Близко к пределу: тренировка дороже и слабее.'
      };
    }

    return {
      level: 'minimal',
      label: 'Минимальная',
      gainMin: 0,
      gainMax: 1,
      cost: roundCost(baseCost * 2.35),
      note: 'Выше природного предела: редкий прирост и высокая цена.'
    };
  }

  function trainingPlan(horse, type) {
    var current = Math.max(0, Math.min(100, Math.round(Number(horse[type.key]) || 0)));
    var limit = naturalLimit(horse);
    var plan = efficiencyPlan(current, limit, Number(type.cost) || 20);

    plan.current = current;
    plan.limit = limit;
    plan.key = type.key;
    plan.type = type;
    plan.progressPercent = Math.max(0, Math.min(100, current));
    plan.limitPercent = Math.max(4, Math.min(96, limit));

    return plan;
  }

  function progressText(horse) {
    var horseTools = window.SKACHKI_HORSE || {};
    if (horseTools.trainingProgressText) return horseTools.trainingProgressText(horse);
    return 'Серия: ' + (horse.trainingStreakDays || 0) + ' дн.';
  }

  function gainText(plan) {
    if (plan.gainMax <= 0) return '+0';
    if (plan.gainMin === plan.gainMax) return '+' + plan.gainMax;
    return '+' + plan.gainMin + '…' + plan.gainMax;
  }

  function trainButtonText(plan, hasCoins) {
    if (plan.current >= 100) return 'Максимум достигнут';
    if (!hasCoins) return 'Недостаточно монет';
    return 'Тренировать';
  }

  function sexSymbol(horse) {
    return horse.gender === 'mare' ? '♀' : '♂';
  }

  function sexClass(horse) {
    return horse.gender === 'mare' ? 'mare' : 'stallion';
  }

  function renderStars(horse) {
    var UI = horseUi();
    return UI.starRating ? UI.starRating(horse) : '';
  }

  function renderPortrait(horse) {
    var UI = horseUi();
    return UI.horsePortrait ? UI.horsePortrait(horse) : '<img src="./horse_icon.png" alt="horse">';
  }

  function renderTopline(coins) {
    return '<div class="training-topline">' +
      '<button class="training-back-btn" type="button" data-training-back>' + icon('back') + '</button>' +
      '<div class="training-title">Тренировочный центр</div>' +
      '<div class="training-coin-pill">' + icon('coin') + '<b>' + coins + '</b></div>' +
    '</div>';
  }

  function renderProfile(horse) {
    var G = game();

    return '<section class="training-profile-card">' +
      '<div class="training-portrait">' +
        renderPortrait(horse) +
        '<span class="training-sex-badge training-sex-' + sexClass(horse) + '">' + sexSymbol(horse) + '</span>' +
      '</div>' +
      '<div class="training-profile-main">' +
        '<div class="training-horse-name">' + horse.name + '</div>' +
        renderStars(horse) +
        '<div class="training-form-chip">Форма <b>' + G.formLabel(horse.form) + '</b></div>' +
      '</div>' +
    '</section>';
  }

  function renderStatusBar(horse, plan) {
    var G = game();

    return '<section class="training-status-grid">' +
      '<div class="training-status-cell"><i>' + icon('streak') + '</i><span>Серия</span><b>' + (horse.trainingStreakDays || 0) + ' дн.</b></div>' +
      '<div class="training-status-cell"><i>' + icon('efficiency') + '</i><span>Эффект</span><b>' + plan.label + '</b></div>' +
      '<div class="training-status-cell"><i>' + icon('center') + '</i><span>Центр</span><b>Ур. ' + (G.state.stableLevel || 1) + '</b></div>' +
    '</section>';
  }

  function renderTabs(activeKey) {
    return '<div class="training-tabs">' + primaryTrainingTypes().map(function (type) {
      var active = type.key === activeKey;
      var meta = TRAINING_META[type.key] || {};

      return '<button class="training-tab ' + (active ? 'active' : '') + '" type="button" data-train-tab="' + type.key + '">' +
        icon(type.key) +
        '<span>' + (meta.short || type.label) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function renderHero(horse, plan) {
    var G = game();
    return renderTopline(G.state.coins) + renderProfile(horse) + renderStatusBar(horse, plan) + renderTabs(plan.key);
  }

  function renderGauge(plan) {
    return '<div class="training-gauge-title">' + (TRAINING_META[plan.key].title || plan.type.label) + '</div>' +
      '<div class="training-gauge">' +
        '<div class="training-gauge-arc"></div>' +
        '<div class="training-gauge-needle" style="--needle-left:' + plan.limitPercent + '%"></div>' +
        '<div class="training-gauge-value">' + plan.current + '</div>' +
        '<div class="training-gauge-label">Текущий уровень</div>' +
      '</div>' +
      '<div class="training-potential-track">' +
        '<span class="training-progress-fill" style="width:' + plan.progressPercent + '%"></span>' +
        '<span class="training-limit-marker" style="left:' + plan.limitPercent + '%" title="Природный предел"></span>' +
      '</div>';
  }

  function renderTrainingPanel(plan) {
    var G = game();
    var hasCoins = G.state.coins >= plan.cost;
    var disabled = plan.current >= 100 || !hasCoins;

    return '<section class="training-center-panel training-eff-' + plan.level + '">' +
      renderGauge(plan) +
      '<div class="training-summary-row">' +
        '<div class="training-summary-cell"><i>' + icon('gain') + '</i><span>Прирост</span><b>' + gainText(plan) + '</b></div>' +
        '<div class="training-summary-cell"><i>' + icon('coin') + '</i><span>Стоимость</span><b>' + plan.cost + ' 🪙</b></div>' +
      '</div>' +
      '<div class="training-one-line-note">' + plan.note + '</div>' +
      '<button class="btn btn-gold training-start-btn" data-train-key="' + plan.key + '" type="button" ' + (disabled ? 'disabled' : '') + '>' +
        icon('horse') +
        '<span>' + trainButtonText(plan, hasCoins) + '</span>' +
      '</button>' +
    '</section>';
  }

  function renderTrainingScreen() {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(G.state.selectedTrainingHorseId); });
    if (!horse) return;

    var hero = G.byId('trainingHero');
    var options = G.byId('trainingScreenOptions');
    var key = normalizeSelectedKey();
    var type = getTrainingType(key);
    var plan = trainingPlan(horse, type);

    if (hero) hero.innerHTML = renderHero(horse, plan);
    if (options) options.innerHTML = renderTrainingPanel(plan);
  }

  function openTraining(id) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    G.state.selectedTrainingHorseId = horse.id;
    normalizeSelectedKey();
    renderTrainingScreen();
    G.showScreen('training');
  }

  function updateTrainingForm(horse) {
    var today = todayKey();
    if (horse.lastTrainingDate === today) return false;

    horse.trainingStreakDays = Number.isFinite(horse.trainingStreakDays) ? horse.trainingStreakDays + 1 : 1;
    horse.lastTrainingDate = today;

    if (horse.trainingStreakDays >= 7) horse.form = 'excellent';
    else if (horse.trainingStreakDays >= 3) horse.form = 'normal';
    else if (!horse.form) horse.form = 'normal';

    return true;
  }

  function performTraining(key) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(G.state.selectedTrainingHorseId); });
    var type = getTrainingType(key);
    if (!horse || !type) return;

    var plan = trainingPlan(horse, type);
    if (plan.current >= 100) return G.showToast('Показатель уже на максимуме');
    if (G.state.coins < plan.cost) return G.showToast('Недостаточно монет');

    var rawGain = G.randInt(plan.gainMin, plan.gainMax);
    var gain = Math.min(rawGain, 100 - plan.current);

    horse[key] = Math.min(100, plan.current + gain);
    G.state.coins -= plan.cost;

    var countedToday = updateTrainingForm(horse);
    G.saveGame();
    G.showToast(horse.name + ': ' + type.label + (gain > 0 ? ' +' + gain : ' без прироста') + (countedToday ? ' • серия +' : ''));
    renderTrainingScreen();
  }

  function bind() {
    var G = game();
    var options = G.byId('trainingScreenOptions');
    var hero = G.byId('trainingHero');

    if (hero) {
      hero.addEventListener('click', function (event) {
        var back = event.target.closest('[data-training-back]');
        var tab = event.target.closest('[data-train-tab]');

        if (back) {
          event.preventDefault();
          G.showScreen('stable');
          return;
        }

        if (tab) {
          selectedTrainingKey = tab.dataset.trainTab;
          renderTrainingScreen();
        }
      });
    }

    if (options) {
      options.addEventListener('click', function (event) {
        var button = event.target.closest('[data-train-key]');
        if (!button || button.disabled) return;
        performTraining(button.dataset.trainKey);
      });
    }

    var back = G.byId('trainingBackBtn');
    if (back) back.onclick = function () { G.showScreen('stable'); };
  }

  return {
    openTraining: openTraining,
    performTraining: performTraining,
    renderTrainingScreen: renderTrainingScreen,
    bind: bind
  };
})();
