// Training screen and training actions.
// Styles for this screen live in css/luxury.css.

window.SKACHKI_TRAINING = (function () {
  var PRIMARY_TRAINING_KEYS = ['speed', 'stamina', 'acceleration'];
  var selectedTrainingKey = 'speed';

  var TRAINING_META = {
    speed: {
      icon: '➤',
      short: 'Скорость',
      title: 'Скорость',
      hint: 'Максимальный темп на дистанции.'
    },
    stamina: {
      icon: '♡',
      short: 'Выносливость',
      title: 'Выносливость',
      hint: 'Стабильность ближе к финишу и длинные дистанции.'
    },
    acceleration: {
      icon: '⚡',
      short: 'Ускорение',
      title: 'Ускорение',
      hint: 'Старт, рывки, выход из поворотов и смена темпа.'
    }
  };

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function progressText(horse) {
    var horseTools = window.SKACHKI_HORSE || {};
    if (horseTools.trainingProgressText) return horseTools.trainingProgressText(horse);
    return 'Серия тренировок: ' + (horse.trainingStreakDays || 0) + ' дн.';
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
        note: 'Показатель уже находится на максимуме.'
      };
    }

    if (ratio < 0.62) {
      return {
        level: 'high',
        label: 'Высокая',
        gainMin: 4,
        gainMax: 6,
        cost: roundCost(baseCost),
        note: 'Лошадь ещё далека от природного предела — тренировка даёт лучший прирост.'
      };
    }

    if (ratio < 0.82) {
      return {
        level: 'medium',
        label: 'Средняя',
        gainMin: 2,
        gainMax: 4,
        cost: roundCost(baseCost * 1.25),
        note: 'Рост становится сложнее: эффективность средняя, стоимость выше базовой.'
      };
    }

    if (ratio < 1) {
      return {
        level: 'low',
        label: 'Низкая',
        gainMin: 1,
        gainMax: 2,
        cost: roundCost(baseCost * 1.75),
        note: 'Показатель близок к природному пределу — прирост слабее, тренировка дороже.'
      };
    }

    return {
      level: 'minimal',
      label: 'Минимальная',
      gainMin: 0,
      gainMax: 1,
      cost: roundCost(baseCost * 2.35),
      note: 'Дальше развивать можно, но прирост почти не гарантирован и стоит дорого.'
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

  function gainText(plan) {
    if (plan.gainMax <= 0) return '+0';
    if (plan.gainMin === plan.gainMax) return '+' + plan.gainMax;
    return '+' + plan.gainMin + '…' + plan.gainMax;
  }

  function trainButtonText(plan, hasCoins) {
    if (plan.current >= 100) return 'Максимум достигнут';
    if (!hasCoins) return 'Недостаточно монет';
    return 'Начать тренировку';
  }

  function sexSymbol(horse) {
    return horse.gender === 'mare' ? '♀' : '♂';
  }

  function sexClass(horse) {
    return horse.gender === 'mare' ? 'mare' : 'stallion';
  }

  function renderStars(horse) {
    var UI = horseUi();
    if (UI.starRating) return UI.starRating(horse);
    return '';
  }

  function renderPortrait(horse) {
    var UI = horseUi();
    if (UI.horsePortrait) return UI.horsePortrait(horse);
    return '<img src="./horse_icon.png" alt="horse">';
  }

  function renderTopHeader(horse) {
    var G = game();

    return '<section class="training-center-head">' +
      '<button class="training-back-btn" type="button" data-training-back>←</button>' +
      '<div class="training-center-title">Тренировочный центр</div>' +
      '<div class="training-center-emblem">♞</div>' +
      '<div class="training-profile">' +
        '<div class="training-portrait training-sex-' + sexClass(horse) + '">' +
          renderPortrait(horse) +
          '<span>' + sexSymbol(horse) + '</span>' +
        '</div>' +
        '<div class="training-profile-main">' +
          '<div class="training-horse-name">' +
            horse.name +
            ' <span class="training-sex-symbol training-sex-' + sexClass(horse) + '">' + sexSymbol(horse) + '</span>' +
          '</div>' +
          renderStars(horse) +
          '<div class="training-form-chip">Форма: <b>' + G.formLabel(horse.form) + '</b></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderStatusBar(horse) {
    var G = game();

    return '<section class="training-status-grid">' +
      '<div class="training-status-cell"><i>▦</i><span>Серия</span><b>' + (horse.trainingStreakDays || 0) + ' дн.</b></div>' +
      '<div class="training-status-cell"><i>◉</i><span>Монеты</span><b>' + G.state.coins + '</b></div>' +
      '<div class="training-status-cell"><i>▣</i><span>Тренировочный центр</span><b>Уровень ' + (G.state.stableLevel || 1) + '</b></div>' +
    '</section>';
  }

  function renderTabs(activeKey) {
    return '<div class="training-tabs">' + primaryTrainingTypes().map(function (type) {
      var meta = TRAINING_META[type.key] || {};
      var active = type.key === activeKey;

      return '<button class="training-tab ' + (active ? 'active' : '') + '" type="button" data-train-tab="' + type.key + '">' +
        '<i>' + (meta.icon || '●') + '</i>' +
        '<span>' + (meta.short || type.label) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function renderHero(horse, plan) {
    return renderTopHeader(horse) + renderStatusBar(horse) + renderTabs(plan.key);
  }

  function renderGauge(plan) {
    var markerLeft = plan.limitPercent;

    return '<div class="training-gauge-wrap training-eff-' + plan.level + '">' +
      '<div class="training-gauge-title">' + (TRAINING_META[plan.key].title || plan.type.label) + '</div>' +
      '<div class="training-gauge">' +
        '<div class="training-gauge-arc"></div>' +
        '<div class="training-gauge-needle" style="--needle-left:' + markerLeft + '%"></div>' +
        '<div class="training-gauge-value">' + plan.current + '</div>' +
        '<div class="training-gauge-label">Текущий уровень</div>' +
      '</div>' +
      '<div class="training-potential-track">' +
        '<span class="training-progress-fill" style="width:' + plan.progressPercent + '%"></span>' +
        '<span class="training-limit-marker" style="left:' + markerLeft + '%" title="Природный предел"></span>' +
      '</div>' +
      '<div class="training-zone-row">' +
        '<div><b>Далеко от предела</b><span>Высокая эффективность<br>Низкая стоимость</span></div>' +
        '<div><b>Средняя зона</b><span>Средняя эффективность<br>Средняя стоимость</span></div>' +
        '<div><b>Близко к пределу</b><span>Низкая эффективность<br>Высокая стоимость</span></div>' +
      '</div>' +
    '</div>';
  }

  function renderPlanStats(plan) {
    return '<div class="training-plan-grid">' +
      '<div class="training-plan-cell"><i>▥</i><span>Текущий уровень</span><b>' + plan.current + '</b></div>' +
      '<div class="training-plan-cell training-plan-eff training-eff-' + plan.level + '"><i>◎</i><span>Эффективность</span><b>' + plan.label + '</b></div>' +
      '<div class="training-plan-cell"><i>↗</i><span>Ожидаемый прирост</span><b>' + gainText(plan) + '</b></div>' +
      '<div class="training-plan-cell"><i>◉</i><span>Стоимость</span><b>' + plan.cost + ' 🪙</b></div>' +
    '</div>';
  }

  function renderTrainingPanel(horse, plan) {
    var G = game();
    var hasCoins = G.state.coins >= plan.cost;
    var disabled = plan.current >= 100 || !hasCoins;
    var meta = TRAINING_META[plan.key] || {};

    return '<section class="training-center-panel training-eff-' + plan.level + '">' +
      renderGauge(plan) +
      renderPlanStats(plan) +
      '<div class="training-info-note"><i>i</i><span>' + plan.note + '</span></div>' +
      '<button class="btn btn-gold training-start-btn" data-train-key="' + plan.key + '" type="button" ' + (disabled ? 'disabled' : '') + '>' +
        '<span>♞</span>' + trainButtonText(plan, hasCoins) +
      '</button>' +
      '<div class="training-bottom-note">' + (meta.hint || plan.type.desc || '') + ' ' + progressText(horse) + '</div>' +
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
    if (options) options.innerHTML = renderTrainingPanel(horse, plan);
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
    var resultText = gain > 0 ? ' +' + gain : ': без прироста';

    G.saveGame();
    G.showToast(horse.name + ': ' + type.label + resultText + (countedToday ? ' • серия +' : ''));
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
