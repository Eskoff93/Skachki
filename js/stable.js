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

  function horsePalette(coat) {
    var palettes = {
      bay: { base: '#985320', mid: '#bb6b2f', light: '#e2a15a', dark: '#351810', mane: '#101216', muzzle: '#8f7467', blaze: '#fff8ec' },
      black: { base: '#202127', mid: '#333841', light: '#737986', dark: '#07080b', mane: '#050609', muzzle: '#454149', blaze: '#f4f4ee' },
      chestnut: { base: '#b75b23', mid: '#d07331', light: '#eda25d', dark: '#4c1f10', mane: '#713016', muzzle: '#a27666', blaze: '#fff5e8' },
      gray: { base: '#bcc3c7', mid: '#d8dde0', light: '#f5f6f4', dark: '#5f6870', mane: '#636c73', muzzle: '#918b89', blaze: '#ffffff' },
      buckskin: { base: '#c89743', mid: '#d8aa55', light: '#f1cc77', dark: '#5f4017', mane: '#11100d', muzzle: '#957b67', blaze: '#fff7df' },
      palomino: { base: '#d4ad55', mid: '#e3c36a', light: '#ffe6a4', dark: '#75571f', mane: '#eadbb8', muzzle: '#ad8870', blaze: '#fff8e8' }
    };
    return palettes[coat] || palettes.bay;
  }

  function breedProfile(breed) {
    var profiles = {
      english: { sx: 1, sy: 1, dx: 0, dy: 0, ear: 1 },
      arabian: { sx: 0.96, sy: 0.99, dx: 1, dy: -1, ear: 1.08 },
      akhal: { sx: 0.94, sy: 1.08, dx: 2, dy: -4, ear: 1.1 },
      quarter: { sx: 1.06, sy: 1.01, dx: -1, dy: 1, ear: 0.94 },
      standard: { sx: 1.01, sy: 1, dx: 0, dy: 0, ear: 0.98 }
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
      tilt: ((seed >> 11) % 3) - 1
    };
  }

  function manePath(type) {
    var paths = [
      'M34 115C30 88 35 64 49 47C59 35 72 29 88 31C76 37 67 48 61 65C55 82 56 100 63 117Z',
      'M31 116C26 88 33 61 50 43C64 28 84 25 99 35C80 36 67 48 59 66C51 84 51 101 58 118Z',
      'M35 116C28 88 35 60 55 40C70 25 91 26 103 40C85 35 70 44 60 62C48 83 47 101 54 118Z'
    ];
    return paths[type] || paths[0];
  }

  function blazeMarkup(type, color) {
    var map = [
      '',
      '<path d="M66 40C73 48 81 62 89 82C86 86 82 88 77 88C71 68 63 54 55 47C58 43 62 41 66 40Z" fill="' + color + '" opacity=".92"/>',
      '<path d="M64 39C74 49 85 68 97 95C92 101 84 101 77 94C70 73 60 57 49 49C53 43 58 40 64 39Z" fill="' + color + '" opacity=".94"/>',
      '<path d="M66 43C70 47 72 52 72 58C68 61 62 61 58 58C59 51 62 46 66 43Z" fill="' + color + '" opacity=".9"/><ellipse cx="91" cy="88" rx="5" ry="3.6" fill="' + color + '" opacity=".86"/>'
    ];
    return map[type] || map[0];
  }

  function horsePortrait(horse) {
    var coat = slug(horse.coat);
    var breed = slug(horse.breed);
    var palette = horsePalette(coat);
    var profile = breedProfile(breed);
    var genes = avatarGenes(horse);
    var uid = 'hp' + hashString(horse.id || horse.name);
    var dapples = coat === 'gray'
      ? '<ellipse cx="56" cy="52" rx="2" ry="1.1" fill="#fff" opacity=".22"/><ellipse cx="70" cy="64" rx="1.8" ry="1" fill="#fff" opacity=".2"/><ellipse cx="82" cy="76" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/><ellipse cx="44" cy="82" rx="1.8" ry="1" fill="#fff" opacity=".16"/>'
      : '';

    return '<div class="breed-emblem breed-' + breed + '">' + breedShort(horse.breed) + '</div>' +
      '<svg class="horse-portrait-svg generated-horse-avatar coat-' + coat + ' breed-' + breed + '" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="' + uid + 'Bg" cx="50%" cy="36%" r="74%"><stop offset="0" stop-color="#29415f"/><stop offset=".58" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient>' +
          '<linearGradient id="' + uid + 'Coat" x1="36" y1="30" x2="101" y2="112"><stop offset="0" stop-color="' + palette.light + '"/><stop offset=".48" stop-color="' + palette.base + '"/><stop offset="1" stop-color="' + palette.dark + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Light" x1="43" y1="37" x2="82" y2="103"><stop offset="0" stop-color="' + palette.light + '"/><stop offset="1" stop-color="' + palette.mid + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Mane" x1="38" y1="25" x2="65" y2="116"><stop offset="0" stop-color="' + palette.mane + '"/><stop offset=".55" stop-color="#06070a"/><stop offset="1" stop-color="' + palette.mane + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Muzzle" x1="82" y1="74" x2="113" y2="103"><stop offset="0" stop-color="' + palette.muzzle + '"/><stop offset="1" stop-color="#2b2323"/></linearGradient>' +
          '<clipPath id="' + uid + 'Round"><circle cx="60" cy="60" r="55"/></clipPath>' +
          '<clipPath id="' + uid + 'HorseClip"><path d="M36 115C34 94 37 74 47 59C54 49 63 43 75 43C87 43 99 51 107 65C114 76 118 90 114 99C110 108 97 109 86 102C76 96 68 86 60 78C53 71 44 68 35 69C28 70 25 66 29 60C33 54 39 50 47 48C51 41 58 37 66 36C80 34 93 41 103 54C96 45 84 39 72 39C56 39 45 48 38 63C29 80 29 99 36 115Z"/></clipPath>' +
        '</defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#' + uid + 'Bg)"/>' +
        '<g clip-path="url(#' + uid + 'Round)">' +
          '<path d="M60 10v100M33 22l54 78M87 22l-54 78M12 60h96M21 36l78 48M99 36L21 84" stroke="#8f682e" stroke-width=".55" opacity=".18"/>' +
          '<g transform="translate(60 63) rotate(' + genes.tilt + ') scale(' + profile.sx + ' ' + profile.sy + ') translate(' + (-60 + profile.dx) + ' ' + (-63 + profile.dy) + ')">' +
            '<path d="' + manePath(genes.mane) + '" fill="url(#' + uid + 'Mane)" opacity=".98"/>' +
            '<path d="M36 115C34 94 37 74 47 59C54 49 63 43 75 43C87 43 99 51 107 65C114 76 118 90 114 99C110 108 97 109 86 102C76 96 68 86 60 78C53 71 44 68 35 69C28 70 25 66 29 60C33 54 39 50 47 48C51 41 58 37 66 36C80 34 93 41 103 54C96 45 84 39 72 39C56 39 45 48 38 63C29 80 29 99 36 115Z" fill="url(#' + uid + 'Coat)"/>' +
            '<g clip-path="url(#' + uid + 'HorseClip)">' +
              '<path d="M44 61C52 47 66 40 83 43C72 49 64 58 61 71C58 85 62 99 73 111C57 112 45 106 37 94C29 82 32 71 44 61Z" fill="url(#' + uid + 'Light)" opacity=".62"/>' +
              '<path d="M78 77C91 82 105 79 116 69C114 84 106 96 94 102C80 109 65 105 51 92C59 83 68 78 78 77Z" fill="' + palette.dark + '" opacity=".24"/>' +
              '<path d="M88 76C99 72 111 77 116 87C118 94 112 101 102 103C91 105 82 100 80 92C78 84 81 79 88 76Z" fill="url(#' + uid + 'Muzzle)"/>' +
              '<path d="M91 89C98 86 107 87 113 92C109 98 101 101 93 99C86 98 82 95 80 90C83 90 87 90 91 89Z" fill="#20191b" opacity=".34"/>' +
              blazeMarkup(genes.blaze, palette.blaze) +
              dapples +
            '</g>' +
            '<path d="M61 37C58 26 60 18 67 13C73 20 73 31 68 41C65 41 63 40 61 37Z" fill="url(#' + uid + 'Coat)" transform="scale(' + profile.ear + ') translate(' + (profile.ear > 1 ? -3 : 0) + ' ' + (profile.ear > 1 ? -2 : 0) + ')"/>' +
            '<path d="M75 39C73 28 76 20 84 16C89 25 87 35 80 43C78 42 76 41 75 39Z" fill="url(#' + uid + 'Coat)" transform="scale(' + profile.ear + ') translate(' + (profile.ear > 1 ? -4 : 0) + ' ' + (profile.ear > 1 ? -2 : 0) + ')"/>' +
            '<path d="M73 58C78 53 86 53 92 58C87 64 78 64 73 58Z" fill="#171015"/>' +
            '<ellipse cx="83" cy="58" rx="5.3" ry="3.8" fill="#4b2b18"/><circle cx="83" cy="58" r="2.2" fill="#100807"/><circle cx="85.1" cy="56.6" r="1" fill="#fff4df"/>' +
            '<ellipse cx="103" cy="92" rx="4.7" ry="6" fill="#111116"/><ellipse cx="104" cy="93" rx="2.6" ry="3.7" fill="#2d292d"/>' +
            '<path d="M48 93C59 101 73 102 86 95" fill="none" stroke="#1b0d08" stroke-width="2.1" stroke-linecap="round" opacity=".34"/>' +
            '<path d="M48 51C59 40 78 39 96 51" fill="none" stroke="#fff" stroke-width="2.1" opacity="' + (0.07 + genes.shade * 0.09).toFixed(2) + '" stroke-linecap="round"/>' +
            '<path d="M40 75C41 63 48 53 58 46" fill="none" stroke="#fff" stroke-width="1.6" opacity=".08" stroke-linecap="round"/>' +
            '<path d="M48 47C38 58 34 75 36 94" fill="none" stroke="#000" stroke-width="2.1" opacity=".16" stroke-linecap="round"/>' +
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
