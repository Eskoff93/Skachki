// Stable and main menu rendering.

window.SKACHKI_STABLE = (function () {
  var selectedDetailsHorseId = null;

  function game() { return window.SKACHKI_GAME; }

  function renderSummary() {
    var G = game();
    var coinsPill = G.byId('coinsPill');
    var summaryGrid = G.byId('summaryGrid');
    if (coinsPill) coinsPill.innerHTML = '🪙 ' + G.state.coins + '<small>Монеты</small>';
    if (summaryGrid) {
      summaryGrid.innerHTML =
        '<div class="chip-box"><div class="value">' + G.state.horses.length + '</div><div class="label">Лошадей</div></div>' +
        '<div class="chip-box"><div class="value">' + G.averageClass() + '</div><div class="label">Средний класс</div></div>' +
        '<div class="chip-box"><div class="value">' + G.state.coins + '</div><div class="label">Монеты</div></div>';
    }
  }

  function renderStable() {
    var G = game();
    renderSummary();

    var footer = document.querySelector('#stableScreen .footer-actions');
    if (footer) footer.style.display = 'none';

    var back = G.byId('resetBtn');
    if (back) {
      back.textContent = '←';
      back.id = 'stableBackMenuBtn';
    }

    var horseList = G.byId('horseList');
    if (!horseList) return;

    horseList.innerHTML = G.state.horses.map(function (horse, index) {
      return '<article class="horse-card">' +
        '<div class="horse-head">' +
          '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div class="horse-meta">' +
            '<div class="horse-name-row">' +
              '<div class="horse-name">' + horse.name + '</div>' +
              '<div class="horse-rank">#' + (index + 1) + '</div>' +
            '</div>' +
            '<div class="horse-tags">' +
              '<span class="mini-tag">Класс: ' + G.horseClass(horse) + '</span>' +
              '<span class="mini-tag">Форма: ' + G.formLabel(horse.form) + '</span>' +
              '<span class="mini-tag">Карьера: ' + horse.racesRun + '/' + horse.careerLimit + '</span>' +
              '<span class="mini-tag">Потенциал: ' + horse.potential + '</span>' +
              '<span class="mini-tag">Характер: ' + horse.temperament + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="power-grid">' +
          '<div class="power-box"><div class="num">' + horse.speed + '</div><div class="txt">Скорость</div></div>' +
          '<div class="power-box"><div class="num">' + horse.stamina + '</div><div class="txt">Выносливость</div></div>' +
          '<div class="power-box"><div class="num">' + horse.acceleration + '</div><div class="txt">Ускорение</div></div>' +
        '</div>' +
        '<div class="stats-grid">' +
          G.statBlock('Скорость', horse.speed, 'linear-gradient(90deg,#34d17a,#37c86e)') +
          G.statBlock('Выносливость', horse.stamina, 'linear-gradient(90deg,#42b3ff,#4b9ef7)') +
          G.statBlock('Ускорение', horse.acceleration, 'linear-gradient(90deg,#ffd44d,#eeb600)') +
          G.statBlock('Манёвренность', horse.agility, 'linear-gradient(90deg,#ffad67,#ff8441)') +
          G.statBlock('Сила', horse.power, 'linear-gradient(90deg,#9c8cff,#7e72f7)') +
          G.statBlock('Интеллект', horse.intelligence, 'linear-gradient(90deg,#ff89c1,#f24c92)') +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="btn btn-blue" data-action="train" data-id="' + horse.id + '">Тренировать</button>' +
          '<button class="btn btn-dark" data-action="details" data-id="' + horse.id + '">Подробнее</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderMainMenu() {
    var G = game();
    var el = G.byId('mainMenuScroll');
    if (!el) return;

    el.innerHTML =
      '<section class="main-menu-hero">' +
        '<div class="main-menu-title">СКАЧКИ</div>' +
        '<div class="main-menu-sub">Развивайте конюшню, выбирайте подходящий заезд и получайте награды.</div>' +
        '<div class="main-menu-stats">' +
          '<div class="chip-box"><div class="value">🪙 ' + G.state.coins + '</div><div class="label">Баланс</div></div>' +
          '<div class="chip-box"><div class="value">' + G.state.horses.length + '</div><div class="label">Лошадей</div></div>' +
          '<div class="chip-box"><div class="value">' + G.averageClass() + '</div><div class="label">Класс</div></div>' +
        '</div>' +
      '</section>' +
      menuTile('stable', '🐴', 'Конюшня', 'Ваши лошади и тренировки') +
      menuTile('races', '🏁', 'Гонки', 'Заезды, взносы и призы') +
      menuTile('breed', '🧬', 'Разведение', 'Новые потомки') +
      menuTile('rating', '🏆', 'Рейтинг', 'Скоро', true);
  }

  function menuTile(action, icon, title, desc, disabled) {
    return '<button class="menu-tile ' + (disabled ? 'disabled' : '') + '" data-menu="' + action + '">' +
      '<div class="menu-icon">' + icon + '</div>' +
      '<div><div class="menu-title">' + title + '</div><div class="menu-desc">' + desc + '</div></div>' +
    '</button>';
  }

  function openDetails(id) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    selectedDetailsHorseId = horse.id;

    var modal = G.byId('horseModal');
    var title = G.byId('horseModalTitle');
    var body = G.byId('horseModalBody');
    if (!modal || !title || !body) return;

    title.textContent = horse.name;

    var params = [
      ['Скорость', horse.speed],
      ['Выносливость', horse.stamina],
      ['Ускорение', horse.acceleration],
      ['Манёвренность', horse.agility],
      ['Сила', horse.power],
      ['Интеллект', horse.intelligence],
      ['Потенциал', horse.potential],
      ['Форма', G.formLabel(horse.form) + ' ×' + G.formMultiplier(horse.form)],
      ['Карьера', horse.racesRun + '/' + horse.careerLimit],
      ['Потомство', horse.offspringCount + '/' + horse.offspringLimit],
      ['Гонок', horse.racesRun],
      ['Побед', horse.wins],
      ['Призовых', horse.podiums],
      ['Заработано', horse.earnings],
      ['Характер', horse.temperament],
      ['Класс', G.horseClass(horse)]
    ];

    body.innerHTML =
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">' +
        '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
        '<div><div style="font-size:13px;color:var(--muted)">Характер</div>' +
        '<div style="font-size:18px;font-weight:900">' + horse.temperament + '</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-top:4px">' + G.behaviorLabel(horse.temperament) + '</div></div>' +
      '</div>' +
      '<div class="detail-grid">' + params.map(function (p) {
        return '<div class="detail-box"><div class="label helpable" data-help="' + p[0] + '">' + p[0] + '</div><div class="value">' + p[1] + '</div></div>';
      }).join('') + '</div>' +
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
