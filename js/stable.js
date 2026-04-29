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

  function hashString(value) {
    var text = String(value || 'horse');
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function choice(seed, list) {
    return list[seed % list.length];
  }

  function horsePalette(coat) {
    var palettes = {
      bay: { base: '#96501f', mid: '#b86a2e', light: '#e1a15c', dark: '#341811', mane: '#121318', muzzle: '#8d7064', blaze: '#fff8ec' },
      black: { base: '#202024', mid: '#30343b', light: '#676d78', dark: '#08090c', mane: '#050609', muzzle: '#484047', blaze: '#f2f2ec' },
      chestnut: { base: '#b75b23', mid: '#cf7330', light: '#eda15b', dark: '#4f2010', mane: '#6c2e14', muzzle: '#9b6f5f', blaze: '#fff4e6' },
      gray: { base: '#bfc4c8', mid: '#d8dde0', light: '#f3f5f3', dark: '#626a70', mane: '#596168', muzzle: '#938b88', blaze: '#fefefe' },
      buckskin: { base: '#c99645', mid: '#d8aa55', light: '#f0cb7a', dark: '#5e3f17', mane: '#11100d', muzzle: '#947965', blaze: '#fff7df' },
      palomino: { base: '#d4ad54', mid: '#e5c56d', light: '#ffe6a4', dark: '#75571f', mane: '#eadbb8', muzzle: '#ad8870', blaze: '#fff8e8' }
    };
    return palettes[coat] || palettes.bay;
  }

  function breedProfile(breed) {
    var profiles = {
      english: { sx: 1, sy: 1, nx: 0, ny: 0, ear: 1, muzzle: 1, neck: 1 },
      arabian: { sx: 0.93, sy: 0.98, nx: -2, ny: -1, ear: 1.07, muzzle: 0.9, neck: 0.96 },
      akhal: { sx: 0.95, sy: 1.05, nx: 4, ny: -6, ear: 1.12, muzzle: 0.94, neck: 1.12 },
      quarter: { sx: 1.09, sy: 1.02, nx: -3, ny: 2, ear: 0.92, muzzle: 1.12, neck: 1.05 },
      standard: { sx: 1.02, sy: 0.98, nx: 2, ny: 1, ear: 0.98, muzzle: 1.02, neck: 1 }
    };
    return profiles[breed] || profiles.english;
  }

  function avatarGenes(horse) {
    var seed = hashString((horse.id || '') + '|' + (horse.name || '') + '|' + (horse.breed || '') + '|' + (horse.coat || ''));
    return {
      seed: seed,
      mane: seed % 3,
      blaze: (seed >> 3) % 4,
      shade: ((seed >> 7) % 100) / 100,
      tilt: ((seed >> 11) % 7) - 3,
      glow: 0.2 + (((seed >> 17) % 60) / 100)
    };
  }

  function manePath(type) {
    var paths = [
      'M62 22c21 8 33 28 31 52-1 14-7 25-18 35 5-22 1-39-12-51-11-10-14-23-1-36Z',
      'M58 20c17 6 31 22 37 44 7 26-2 48-24 64 2-18-3-35-15-51-10-13-12-31 2-57Z',
      'M65 21c20 12 34 31 35 55 1 23-10 41-32 55 8-24 4-43-12-58-15-13-18-31 9-52Z'
    ];
    return paths[type] || paths[0];
  }

  function blazePath(type) {
    var paths = [
      '',
      'M50 35c-6 11-9 23-8 37 1 13 5 24 12 34-5 2-10 0-15-4-6-16-7-31-4-45 3-10 8-18 15-22Z',
      'M53 32c-7 12-9 27-6 43 2 12 7 23 16 34-6 3-13 2-20-2-7-16-9-32-5-48 3-12 8-21 15-27Z',
      'M50 35c-6 8-8 18-6 28 2 8 6 15 12 21-5 2-11 1-16-2-5-11-6-22-3-32 3-7 7-12 13-15Z'
    ];
    return paths[type] || paths[0];
  }

  function horsePortrait(horse) {
    var coat = slug(horse.coat);
    var breed = slug(horse.breed);
    var palette = horsePalette(coat);
    var profile = breedProfile(breed);
    var genes = avatarGenes(horse);
    var uid = 'hp' + hashString(horse.id || horse.name);
    var blaze = blazePath(genes.blaze);
    var mane = manePath(genes.mane);
    var dapple = coat === 'gray'
      ? '<ellipse cx="67" cy="42" rx="2.2" ry="1.3" fill="#fff" opacity=".28"/><ellipse cx="73" cy="53" rx="1.7" ry="1" fill="#fff" opacity=".22"/><ellipse cx="59" cy="61" rx="1.8" ry="1.1" fill="#fff" opacity=".2"/>'
      : '';

    return '<div class="breed-emblem breed-' + breed + '">' + breedShort(horse.breed) + '</div>' +
      '<svg class="horse-portrait-svg generated-horse-avatar coat-' + coat + ' breed-' + breed + '" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="' + uid + 'Bg" cx="50%" cy="36%" r="72%"><stop offset="0" stop-color="#273c56"/><stop offset=".58" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient>' +
          '<linearGradient id="' + uid + 'Coat" x1="38" y1="24" x2="78" y2="103"><stop offset="0" stop-color="' + palette.light + '"/><stop offset=".46" stop-color="' + palette.base + '"/><stop offset="1" stop-color="' + palette.dark + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Face" x1="34" y1="30" x2="65" y2="96"><stop offset="0" stop-color="' + palette.light + '"/><stop offset="1" stop-color="' + palette.mid + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Mane" x1="58" y1="14" x2="92" y2="107"><stop offset="0" stop-color="' + palette.mane + '"/><stop offset=".5" stop-color="#06070a"/><stop offset="1" stop-color="' + palette.mane + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Muzzle" x1="27" y1="70" x2="58" y2="111"><stop offset="0" stop-color="' + palette.muzzle + '"/><stop offset="1" stop-color="#312626"/></linearGradient>' +
          '<clipPath id="' + uid + 'Clip"><circle cx="60" cy="60" r="55"/></clipPath>' +
        '</defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#' + uid + 'Bg)"/>' +
        '<g clip-path="url(#' + uid + 'Clip)">' +
          '<path d="M60 10v100M33 22l54 78M87 22l-54 78M12 60h96M21 36l78 48M99 36L21 84" stroke="#8f682e" stroke-width=".5" opacity=".22"/>' +
          '<g transform="translate(' + profile.nx + ' ' + profile.ny + ')">' +
            '<path d="' + mane + '" fill="url(#' + uid + 'Mane)" opacity=".96"/>' +
            '<path d="M51 29c14-7 31-3 40 9 8 10 8 25-1 37-8 10-16 18-16 34 0 14 7 28 17 43-25-8-45-21-58-40-14-21-18-45-13-68 4-20 13-33 31-15Z" fill="url(#' + uid + 'Coat)" transform="scale(' + profile.neck + ' 1) translate(' + (profile.neck > 1 ? -4 : 0) + ' 0)"/>' +
            '<g transform="translate(52 59) rotate(' + genes.tilt + ') scale(' + profile.sx + ' ' + profile.sy + ') translate(-52 -59)">' +
              '<path d="M50 31c-13 8-22 21-26 38-4 16-1 32 8 45 8 12 21 18 37 15 20-4 33-17 34-34 1-16-8-29-22-38-10-6-20-10-31-13-2-5-2-9 0-13Z" fill="url(#' + uid + 'Coat)"/>' +
              '<path d="M45 38c-10 8-16 19-18 34-2 14 1 27 10 38 8 10 18 15 30 15-8-12-12-24-11-37 1-12 6-23 17-32-12-2-21-8-28-18Z" fill="url(#' + uid + 'Face)" opacity=".72"/>' +
              '<path d="M64 72c12 4 22 3 30-4-1 12-8 21-20 26-13 5-25 2-37-8 8-7 17-12 27-14Z" fill="' + palette.dark + '" opacity=".28"/>' +
              '<g transform="translate(' + ((profile.muzzle - 1) * 8).toFixed(1) + ' 0) scale(' + profile.muzzle + ' 1)">' +
                '<path d="M28 88c8-9 20-13 34-10 13 3 22 12 24 24 1 10-5 18-16 23-13 6-31 5-42-3-9-7-11-23 0-34Z" fill="url(#' + uid + 'Muzzle)"/>' +
                '<path d="M33 102c8-6 19-7 30-3 8 3 14 8 17 15-9 6-20 9-33 7-10-1-17-6-21-13 2-2 4-4 7-6Z" fill="#211a1d" opacity=".36"/>' +
                '<ellipse cx="35" cy="114" rx="6" ry="8" fill="#111116"/><ellipse cx="36" cy="115" rx="3.6" ry="5" fill="#2d292d"/>' +
              '</g>' +
              (blaze ? '<path d="' + blaze + '" fill="' + palette.blaze + '" opacity=".95"/>' : '') +
              '<g transform="translate(50 32) scale(' + profile.ear + ')">' +
                '<path d="M0 0c-3-13-1-23 5-28 8 6 10 18 6 31-4 2-8 2-11-3Z" fill="url(#' + uid + 'Coat)"/>' +
                '<path d="M4-1c-1-9 0-16 3-21 3 6 4 13 2 21-2 1-3 1-5 0Z" fill="#1a1010" opacity=".56"/>' +
              '</g>' +
              '<path d="M54 69c5-5 13-5 19 0-5 6-13 6-19 0Z" fill="#171015"/>' +
              '<ellipse cx="64" cy="69" rx="6.2" ry="4.4" fill="#4c2b18"/><circle cx="64" cy="69" r="2.6" fill="#100807"/><circle cx="66.2" cy="67.2" r="1.2" fill="#fff4df"/>' +
              dapple +
            '</g>' +
            '<path d="M43 34c13 9 29 10 48 3" fill="none" stroke="#fff" stroke-width="2" opacity="' + (0.08 + genes.shade * 0.12).toFixed(2) + '" stroke-linecap="round"/>' +
          '</g>' +
        '</g>' +
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
