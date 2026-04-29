// Stable rendering and horse details.

window.SKACHKI_STABLE = (function () {
  var selectedDetailsHorseId = null;

  function game() { return window.SKACHKI_GAME; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function genderLabel(horse) {
    var tools = horseTools();
    if (tools.genderLabel) return tools.genderLabel(horse.gender);
    return horse.gender === 'mare' ? 'Кобыла' : 'Жеребец';
  }

  function renderSummary() {
    var G = game();
    var UI = horseUi();
    var summaryGrid = G.byId('summaryGrid');
    if (!summaryGrid) return;

    summaryGrid.innerHTML =
      '<div class="stable-summary-mini"><span>Конюшня</span><b>' + (G.state.stableLevel || 1) + '</b></div>' +
      '<div class="stable-summary-mini"><span>Уровень</span>' + (UI.averageStars ? UI.averageStars() : '') + '</div>' +
      '<div class="stable-summary-mini stable-coins-mini"><span>Монеты</span><b>🪙 ' + G.state.coins + '</b></div>';
  }

  function renderStable() {
    var G = game();
    var UI = horseUi();
    var horseList = G.byId('horseList');

    renderSummary();

    var footer = document.querySelector('#stableScreen .footer-actions');
    if (footer) footer.style.display = '';
    if (!horseList || !UI.renderHorseCard) return;

    horseList.innerHTML = G.state.horses.map(function (horse) {
      return UI.renderHorseCard(horse, { actions: true });
    }).join('');
  }

  function renderMainMenu() {
    // Main menu was intentionally removed from the active navigation flow.
  }

  function openDetails(id) {
    var G = game();
    var UI = horseUi();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    selectedDetailsHorseId = horse.id;

    var modal = G.byId('horseModal');
    var title = G.byId('horseModalTitle');
    var body = G.byId('horseModalBody');
    if (!modal || !title || !body) return;

    title.textContent = horse.name;

    var overview = [
      ['Пол', genderLabel(horse)],
      ['Порода', horse.breed],
      ['Масть', horse.coat],
      ['Ранг', UI.horseRankLabel ? UI.horseRankLabel(horse) : 'Бронза'],
      ['Форма', G.formLabel(horse.form)],
      ['Карьера', ((horse.racesRun || 0) + (horse.practiceStarts || 0)) + '/' + horse.careerLimit],
      ['Потомство', horse.offspringCount + '/' + horse.offspringLimit],
      ['Потенциал', horse.potential]
    ];

    var stats = [
      ['Скорость', horse.speed],
      ['Выносливость', horse.stamina],
      ['Ускорение', horse.acceleration]
    ];

    body.innerHTML =
      '<div class="details-hero">' +
        '<div class="horse-avatar detail-horse-avatar">' + (UI.horsePortrait ? UI.horsePortrait(horse) : '') + '</div>' +
        '<div class="details-hero-main">' +
          '<div class="details-name-row"><div class="details-name">' + horse.name + '</div>' + (UI.starRating ? UI.starRating(horse) : '') + '</div>' +
          '<div class="horse-stat-line details-stat-line">' + (UI.horseStatLine ? UI.horseStatLine(horse) : '') + ' • Заработано ' + (horse.earnings || 0) + ' 🪙</div>' +
          '<div class="details-behavior">' + genderLabel(horse) + ' • ' + horse.temperament + ' — ' + G.behaviorLabel(horse.temperament) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-section-title">Состояние</div>' +
      '<div class="detail-grid">' + overview.map(function (p) {
        return '<div class="detail-box"><div class="label helpable" data-help="' + p[0] + '">' + p[0] + '</div><div class="value">' + p[1] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="detail-section-title">Основные показатели</div>' +
      '<div class="detail-grid">' + stats.map(function (p) {
        return '<div class="detail-box"><div class="label helpable" data-help="' + p[0] + '">' + p[0] + '</div><div class="value">' + p[1] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="detail-section-title">Качества</div>' + (UI.qualityGrid ? UI.qualityGrid(horse, false) : '') +
      '<div class="detail-section-title">Скрытые черты</div>' +
      '<div class="locked-traits"><div>🔒 ?</div><div>🔒 ?</div><div>🔒 ?</div></div>' +
      '<div class="details-behavior">Откроются по мере участия в заездах.</div>' +
      '<div id="paramHelpOverlay" class="param-help-overlay" aria-live="polite"></div>';

    var trainButton = G.byId('horseModalTrainBtn');
    if (trainButton) trainButton.dataset.id = horse.id;

    modal.classList.add('active');
  }

  function closeParamHelp() {
    var overlay = document.getElementById('paramHelpOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.innerHTML = '';
  }

  function showParamHelp(target) {
    var G = game();
    var overlay = document.getElementById('paramHelpOverlay');
    if (!overlay || !target) return;

    var key = target.dataset.help;
    overlay.innerHTML = '<button class="param-help-close" type="button" aria-label="Закрыть">×</button><b>' + key + '</b><span>' + ((G.DATA.parameterHelp || {})[key] || 'Описание появится позже.') + '</span>';
    overlay.classList.add('active');
  }

  function bind() {
    var G = game();
    var horseList = G.byId('horseList');
    if (horseList) {
      horseList.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;
        if (button.dataset.action === 'train' && window.SKACHKI_TRAINING) {
          window.SKACHKI_TRAINING.openTraining(button.dataset.id);
        }
        if (button.dataset.action === 'details') openDetails(button.dataset.id);
      });
    }

    var closeHorse = G.byId('closeHorseBtn');
    if (closeHorse) closeHorse.onclick = function () {
      closeParamHelp();
      selectedDetailsHorseId = null;
      G.byId('horseModal').classList.remove('active');
    };

    var trainButton = G.byId('horseModalTrainBtn');
    if (trainButton) {
      trainButton.onclick = function () {
        var id = this.dataset.id || selectedDetailsHorseId;
        if (!id || !window.SKACHKI_TRAINING) return;
        closeParamHelp();
        G.byId('horseModal').classList.remove('active');
        window.SKACHKI_TRAINING.openTraining(id);
      };
    }

    document.addEventListener('click', function (event) {
      var close = event.target.closest('.param-help-close');
      if (close) {
        closeParamHelp();
        return;
      }

      var help = event.target.closest('#horseModal .helpable');
      if (!help) return;
      event.preventDefault();
      showParamHelp(help);
    }, true);
  }

  return {
    renderMainMenu: renderMainMenu,
    renderStable: renderStable,
    openDetails: openDetails,
    bind: bind
  };
})();
