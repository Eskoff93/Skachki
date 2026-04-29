// Stable and main menu rendering.

window.SKACHKI_STABLE = (function () {
  var selectedDetailsHorseId = null;

  function game() { return window.SKACHKI_GAME; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }

  function genderLabel(horse) {
    var tools = horseTools();
    if (tools.genderLabel) return tools.genderLabel(horse.gender);
    return horse.gender === 'mare' ? 'Кобыла' : 'Жеребец';
  }

  function horseRank(horse) {
    var tools = horseTools();
    if (tools.horseRankFromRating) return tools.horseRankFromRating(horse.rating || 0);
    return 'bronze';
  }

  function horseRankLabel(horse) {
    var tools = horseTools();
    var rank = horseRank(horse);
    if (tools.horseRankLabel) return tools.horseRankLabel(rank);
    return rank;
  }

  function slug(value) {
    var map = {
      'Английская': 'english',
      'Арабская': 'arabian',
      'Ахалтекинская': 'akhal',
      'Квотерхорс': 'quarter',
      'Стандартбредная': 'standard',
      'Гнедая': 'bay',
      'Вороная': 'black',
      'Рыжая': 'chestnut',
      'Серая': 'gray',
      'Буланая': 'buckskin',
      'Соловая': 'palomino'
    };
    return map[value] || 'bay';
  }

  function breedShort(breed) {
    var map = {
      'Английская': 'АНГ',
      'Арабская': 'АРБ',
      'Ахалтекинская': 'АХЛ',
      'Квотерхорс': 'КВО',
      'Стандартбредная': 'СТБ'
    };
    return map[breed] || 'СКК';
  }

  function horsePortrait(horse) {
    var coat = slug(horse.coat);
    var breed = slug(horse.breed);
    return '<div class="breed-emblem breed-' + breed + '">' + breedShort(horse.breed) + '</div>' +
      '<svg class="horse-portrait-svg coat-' + coat + ' breed-' + breed + '" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="avatarBg' + horse.id + '" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#24445f"/><stop offset="1" stop-color="#06111f"/></radialGradient>' +
        '</defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#avatarBg' + horse.id + ')"/>' +
        '<path class="breed-mark" d="M22 86c17 10 38 13 63 7" fill="none" stroke-width="3" stroke-linecap="round" opacity=".28"/>' +
        '<path class="horse-shadow" d="M32 86c17-14 25-31 26-52 9-8 21-13 38-15-9 10-13 22-12 37 7 5 13 13 16 24-9-5-19-6-31-2 2 18-8 30-30 37-4-10-6-19-7-29Z"/>' +
        '<path class="horse-mane" d="M53 32c10-13 24-20 43-20-12 12-17 27-15 45-12-5-22-13-28-25Z"/>' +
        '<path class="horse-head" d="M31 87c18-20 26-40 27-62 14-11 29-16 45-14-11 10-16 23-15 40 11 4 20 13 25 27-13-6-25-6-37-1 2 22-14 35-45 39-4-9-5-18 0-29Z"/>' +
        '<path class="horse-highlight" d="M58 29c10-8 22-12 36-12-7 9-10 19-9 31-12-3-21-9-27-19Z"/>' +
        '<path class="horse-blaze" d="M75 23c2 12 0 24-5 36" fill="none" stroke-width="5" stroke-linecap="round" opacity=".42"/>' +
        '<circle cx="84" cy="48" r="3.2" fill="#07111d"/>' +
        '<path d="M64 75c10 7 22 8 34 4" fill="none" stroke="#2b1708" stroke-width="3" stroke-linecap="round" opacity=".45"/>' +
        '<path class="horse-neck-light" d="M42 99c19-5 35-14 48-27" fill="none" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
      '</svg>';
  }

  function starRating(horse) {
    var G = game();
    var cls = G.horseClass(horse);
    var rounded = Math.round(cls / 10) * 10;
    var percent = Math.max(0, Math.min(100, rounded));
    return '<div class="star-rating" title="Уровень"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function averageStars() {
    var G = game();
    var percent = Math.max(0, Math.min(100, Math.round(G.averageClass() / 10) * 10));
    return '<div class="star-rating stable-average-stars" title="Средний уровень"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function horseStatLine(horse) {
    return 'Гонки ' + (horse.racesRun || 0) + ' • Призы ' + (horse.podiums || 0) + ' • Победы ' + (horse.wins || 0);
  }

  function qualityBadge(key, value, compact) {
    var tools = horseTools();
    var rank = tools.hiddenRankFromValue ? tools.hiddenRankFromValue(value) : 'bronze';
    var rankLabel = tools.rankLabel ? tools.rankLabel(rank) : rank;
    var label = tools.hiddenQualityLabel ? tools.hiddenQualityLabel(key) : key;
    var icon = key === 'strength' ? '♞' : key === 'agility' ? '♘' : '◆';
    return '<div class="quality-badge quality-' + rank + (compact ? ' compact' : '') + '">' +
      '<div class="quality-icon">' + icon + '</div>' +
      '<div><div class="quality-name">' + label + '</div><div class="quality-rank">' + rankLabel + '</div></div>' +
    '</div>';
  }

  function qualityGrid(horse, compact) {
    var q = horse.hiddenQualities || {};
    return '<div class="quality-grid">' +
      qualityBadge('strength', q.strength, compact) +
      qualityBadge('agility', q.agility, compact) +
      qualityBadge('instinct', q.instinct, compact) +
    '</div>';
  }

  function renderSummary() {
    var G = game();
    var summaryGrid = G.byId('summaryGrid');
    if (summaryGrid) {
      summaryGrid.innerHTML =
        '<div class="stable-summary-mini"><span>Конюшня</span><b>' + (G.state.stableLevel || 1) + '</b></div>' +
        '<div class="stable-summary-mini"><span>Уровень</span>' + averageStars() + '</div>' +
        '<div class="stable-summary-mini stable-coins-mini"><span>Монеты</span><b>🪙 ' + G.state.coins + '</b></div>';
    }
  }

  function renderStable() {
    var G = game();
    renderSummary();

    var footer = document.querySelector('#stableScreen .footer-actions');
    if (footer) footer.style.display = '';

    var horseList = G.byId('horseList');
    if (!horseList) return;

    horseList.innerHTML = G.state.horses.map(function (horse) {
      var sexSymbol = horse.gender === 'mare' ? '♀' : '♂';
      var sexClass = horse.gender === 'mare' ? 'sex-mare' : 'sex-stallion';
      var rank = horseRank(horse);
      return '<article class="horse-card luxury-horse-card">' +
        '<div class="luxury-horse-top">' +
          '<div class="horse-medallion medallion-' + rank + ' ' + sexClass + '">' +
            '<div class="medallion-crest">♞</div>' +
            horsePortrait(horse) +
            '<div class="sex-badge ' + sexClass + '">' + sexSymbol + '</div>' +
            '<div class="rank-badge">' + horseRankLabel(horse) + '</div>' +
          '</div>' +
          '<div class="luxury-horse-info">' +
            '<div class="horse-name-row luxury-name-row">' +
              '<div class="horse-name-wrap"><div class="horse-name luxury-name">' + horse.name + '</div></div>' +
              starRating(horse) +
            '</div>' +
            '<div class="horse-stat-line luxury-record">' + horseStatLine(horse) + '</div>' +
            '<div class="luxury-meta-row">' +
              '<span>' + horse.breed + '</span>' +
              '<span>' + horse.coat + '</span>' +
              '<span>Карьера ' + ((horse.racesRun || 0) + (horse.practiceStarts || 0)) + '/' + horse.careerLimit + '</span>' +
              '<span>Потомство ' + horse.offspringCount + '/' + horse.offspringLimit + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="football-stats">' +
          '<div class="football-stat"><b>' + horse.speed + '</b><span>Скорость</span></div>' +
          '<div class="football-stat"><b>' + horse.stamina + '</b><span>Выносливость</span></div>' +
          '<div class="football-stat"><b>' + horse.acceleration + '</b><span>Ускорение</span></div>' +
        '</div>' +
        qualityGrid(horse, true) +
        '<div class="card-actions luxury-actions">' +
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
          '<div class="chip-box"><div class="value">' + (G.state.stableLevel || 1) + '</div><div class="label">Конюшня</div></div>' +
        '</div>' +
      '</section>' +
      menuTile('stable', '🐴', 'Конюшня', 'Ваши лошади и тренировки') +
      menuTile('races', '🏁', 'Гонки', 'Заезды, взносы и призы') +
      menuTile('breed', '🧬', 'Разведение', 'Новые потомки') +
      menuTile('rating', '🏆', 'Рейтинг', 'Скоро');
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

    var overview = [
      ['Пол', genderLabel(horse)],
      ['Порода', horse.breed],
      ['Масть', horse.coat],
      ['Ранг', horseRankLabel(horse)],
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
        '<div class="horse-avatar detail-horse-avatar">' + horsePortrait(horse) + '</div>' +
        '<div class="details-hero-main">' +
          '<div class="details-name-row"><div class="details-name">' + horse.name + '</div>' + starRating(horse) + '</div>' +
          '<div class="horse-stat-line details-stat-line">' + horseStatLine(horse) + ' • Заработано ' + (horse.earnings || 0) + ' 🪙</div>' +
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
      '<div class="detail-section-title">Качества</div>' + qualityGrid(horse, false) +
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
