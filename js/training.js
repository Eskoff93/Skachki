// Training screen and training actions.

window.SKACHKI_TRAINING = (function () {
  function game() { return window.SKACHKI_GAME; }

  function openTraining(id) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    G.state.selectedTrainingHorseId = horse.id;

    var hero = G.byId('trainingHero');
    var options = G.byId('trainingScreenOptions');

    if (hero) {
      hero.innerHTML =
        '<div class="training-hero-head">' +
          '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="training-hero-title">' + horse.name + '</div>' +
            '<div class="training-hero-sub">Класс ' + G.horseClass(horse) + ' • Энергия ' + horse.energy + ' • Потенциал ' + horse.potential + '</div>' +
            '<span class="behavior-chip">Характер: ' + horse.temperament + ' • ' + G.behaviorLabel(horse.temperament) + '</span>' +
          '</div>' +
        '</div>';
    }

    if (options) {
      var trainingTypes = G.DATA.trainingTypes || [];
      options.innerHTML = trainingTypes.map(function (type) {
        var current = horse[type.key];
        var disabled = G.state.coins < type.cost || horse.energy < type.energy || current >= 100;
        return '<div class="training-option-card">' +
          '<div class="option-top">' +
            '<div><div class="option-name">' + type.label + '</div><div class="option-desc">' + type.desc + '</div></div>' +
            '<div class="option-price">🪙 ' + type.cost + ' • ⚡ ' + type.energy + '</div>' +
          '</div>' +
          G.statBlock('Текущее значение', current, 'linear-gradient(90deg,#ffd44d,#eeb600)') +
          '<button class="btn ' + (disabled ? 'btn-dark' : 'btn-blue') + '" data-train-key="' + type.key + '" style="width:100%;margin-top:12px" ' + (disabled ? 'disabled' : '') + '>' + (disabled ? 'Недоступно' : 'Прокачать +2–6') + '</button>' +
        '</div>';
      }).join('');
    }

    G.showScreen('training');
  }

  function performTraining(key) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(G.state.selectedTrainingHorseId); });
    var type = (G.DATA.trainingTypes || []).find(function (t) { return t.key === key; });
    if (!horse || !type) return;

    if (G.state.coins < type.cost) return G.showToast('Недостаточно монет');
    if (horse.energy < type.energy) return G.showToast('Недостаточно энергии');

    var gain = G.randInt(2, 6);
    horse[key] = Math.min(100, horse[key] + gain);
    horse.energy = Math.max(0, horse.energy - type.energy);
    horse.potential = Math.max(50, horse.potential - G.randInt(1, 2));
    G.state.coins -= type.cost;

    G.saveGame();
    G.showToast(horse.name + ': ' + type.label + ' +' + gain);
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
