// Training screen and training actions.

window.SKACHKI_TRAINING = (function () {
  var PRIMARY_TRAINING_KEYS = ['speed', 'stamina', 'acceleration'];

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

  function trainingLimit(horse) {
    return Math.max(50, Math.min(100, Math.round(Number(horse.potential) || 100)));
  }

  function primaryTrainingTypes() {
    var G = game();
    return (G.DATA.trainingTypes || []).filter(function (type) {
      return PRIMARY_TRAINING_KEYS.indexOf(type.key) !== -1;
    });
  }

  function trainingButtonText(current, limit, hasCoins) {
    if (current >= limit) return 'Предел достигнут';
    if (!hasCoins) return 'Недостаточно монет';
    return 'Прокачать +2–6';
  }

  function renderTrainingHero(horse, limit) {
    var G = game();
    var UI = horseUi();
    var card = UI.renderHorseCard
      ? UI.renderHorseCard(horse, { extraClass: 'training-horse-card', dataHorse: false, actions: false })
      : '<section class="summary-card"><div class="summary-title">' + horse.name + '</div></section>';

    return '<div class="training-hero-card-shell">' + card + '</div>' +
      '<section class="training-focus-panel">' +
        '<div class="training-focus-item"><span>Форма</span><b>' + G.formLabel(horse.form) + '</b></div>' +
        '<div class="training-focus-item"><span>Серия</span><b>' + (horse.trainingStreakDays || 0) + ' дн.</b></div>' +
        '<div class="training-focus-item"><span>Предел</span><b>' + limit + '</b></div>' +
      '</section>' +
      '<div class="training-progress-note">' + progressText(horse) + '</div>';
  }

  function openTraining(id) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    G.state.selectedTrainingHorseId = horse.id;

    var hero = G.byId('trainingHero');
    var options = G.byId('trainingScreenOptions');
    var limit = trainingLimit(horse);

    if (hero) hero.innerHTML = renderTrainingHero(horse, limit);

    if (options) {
      options.innerHTML = primaryTrainingTypes().map(function (type) {
        var current = Number(horse[type.key]) || 0;
        var cappedCurrent = Math.min(current, limit);
        var hasCoins = G.state.coins >= type.cost;
        var reachedLimit = current >= limit;
        var disabled = reachedLimit || !hasCoins;

        return '<div class="training-option-card training-primary-option">' +
          '<div class="option-top">' +
            '<div><div class="option-name">' + type.label + '</div><div class="option-desc">' + type.desc + '</div></div>' +
            '<div class="option-price">🪙 ' + type.cost + '</div>' +
          '</div>' +
          G.statBlock('Текущее значение', cappedCurrent, 'linear-gradient(90deg,#ffd44d,#eeb600)') +
          '<div class="training-limit-note">Предел развития: ' + limit + '</div>' +
          '<button class="btn ' + (disabled ? 'btn-dark' : 'btn-blue') + '" data-train-key="' + type.key + '" style="width:100%;margin-top:12px" ' + (disabled ? 'disabled' : '') + '>' + trainingButtonText(current, limit, hasCoins) + '</button>' +
        '</div>';
      }).join('');
    }

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
    var type = primaryTrainingTypes().find(function (t) { return t.key === key; });
    if (!horse || !type) return;

    if (G.state.coins < type.cost) return G.showToast('Недостаточно монет');

    var limit = trainingLimit(horse);
    var current = Number(horse[key]) || 0;
    if (current >= limit) return G.showToast('Показатель уже достиг потенциала');

    var gain = Math.min(G.randInt(2, 6), limit - current);
    horse[key] = Math.min(limit, current + gain);
    G.state.coins -= type.cost;

    var countedToday = updateTrainingForm(horse);

    G.saveGame();
    G.showToast(horse.name + ': ' + type.label + ' +' + gain + (countedToday ? ' • серия +' : ''));
    openTraining(horse.id);
  }

  function bind() {
    var G = game();
    var options = G.byId('trainingScreenOptions');
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
    bind: bind
  };
})();
