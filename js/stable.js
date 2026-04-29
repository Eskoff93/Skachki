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
      english: { sx: 1, sy: 1, dy: 0, ear: 1 },
      arabian: { sx: 0.96, sy: 0.98, dy: -1, ear: 1.05 },
      akhal: { sx: 0.94, sy: 1.08, dy: -5, ear: 1.08 },
      quarter: { sx: 1.06, sy: 1.01, dy: 1, ear: 0.94 },
      standard: { sx: 1.01, sy: 0.99, dy: 0, ear: 0.98 }
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
      'M25 111C22 82 30 58 48 40C63 25 82 23 99 35C80 35 64 43 52 58C40 74 36 94 39 117Z',
      'M25 111C23 84 29 61 44 43C60 24 85 20 103 37C83 35 68 44 57 61C46 79 45 98 52 119Z',
      'M26 111C20 83 28 56 48 38C67 22 91 25 103 43C84 35 66 43 53 60C39 80 35 99 42 118Z'
    ];
    return paths[type] || paths[0];
  }

  function blazePath(type) {
    var paths = [
      '',
      '<path d="M76 40C83 49 89 60 95 73C92 77 88 79 83 79C78 67 72 56 64 48C67 44 71 41 76 40Z" fill="__BLAZE__" opacity=".95"/>',
      '<path d="M72 39C80 47 89 62 100 82C95 88 87 88 80 82C74 68 67 56 58 49C61 44 66 40 72 39Z" fill="__BLAZE__" opacity=".95"/>',
      '<path d="M73 43C77 47 79 52 80 58C75 61 69 61 64 58C65 51 68 46 73 43Z" fill="__BLAZE__" opacity=".95"/><ellipse cx="95" cy="84" rx="6" ry="4" fill="__BLAZE__" opacity=".85"/>'
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
    var blazeMarkup = blazePath(genes.blaze).replace(/__BLAZE__/g, palette.blaze);
    var dappleMarkup = coat === 'gray'
      ? '<ellipse cx="55" cy="51" rx="2" ry="1.2" fill="#fff" opacity=".20"/><ellipse cx="68" cy="61" rx="1.8" ry="1.1" fill="#fff" opacity=".22"/><ellipse cx="77" cy="74" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/><ellipse cx="44" cy="82" rx="2" ry="1.1" fill="#fff" opacity=".16"/>'
      : '';

    return '<div class="breed-emblem breed-' + breed + '">' + breedShort(horse.breed) + '</div>' +
      '<svg class="horse-portrait-svg generated-horse-avatar coat-' + coat + ' breed-' + breed + '" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="' + uid + 'Bg" cx="50%" cy="36%" r="74%"><stop offset="0" stop-color="#29415f"/><stop offset=".58" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient>' +
          '<linearGradient id="' + uid + 'Coat" x1="35" y1="28" x2="91" y2="110"><stop offset="0" stop-color="' + palette.light + '"/><stop offset=".46" stop-color="' + palette.base + '"/><stop offset="1" stop-color="' + palette.dark + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Face" x1="41" y1="37" x2="91" y2="90"><stop offset="0" stop-color="' + palette.light + '"/><stop offset="1" stop-color="' + palette.mid + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Mane" x1="34" y1="22" x2="58" y2="116"><stop offset="0" stop-color="' + palette.mane + '"/><stop offset=".55" stop-color="#07080b"/><stop offset="1" stop-color="' + palette.mane + '"/></linearGradient>' +
          '<linearGradient id="' + uid + 'Muzzle" x1="82" y1="70" x2="111" y2="99"><stop offset="0" stop-color="' + palette.muzzle + '"/><stop offset="1" stop-color="#2d2525"/></linearGradient>' +
          '<clipPath id="' + uid + 'Round"><circle cx="60" cy="60" r="55"/></clipPath>' +
          '<clipPath id="' + uid + 'HeadClip"><path d="M50 42C61 31 78 29 93 38C104 45 110 58 109 72C108 81 103 87 96 88C91 89 87 92 83 97C74 107 60 111 47 104C35 98 30 84 33 69C35 57 41 48 50 42Z"/></clipPath>' +
        '</defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#' + uid + 'Bg)"/>' +
        '<g clip-path="url(#' + uid + 'Round)">' +
          '<path d="M60 10v100M33 22l54 78M87 22l-54 78M12 60h96M21 36l78 48M99 36L21 84" stroke="#8f682e" stroke-width=".55" opacity=".20"/>' +
          '<g transform="translate(60 62) rotate(' + genes.tilt + ') scale(' + profile.sx + ' ' + profile.sy + ') translate(-60 ' + (-62 + profile.dy) + ')">' +
            '<path d="' + manePath(genes.mane) + '" fill="url(#' + uid + 'Mane)" opacity=".98"/>' +
            '<path d="M32 111C29 88 34 66 48 49C59 36 72 32 87 37C78 45 74 56 78 68C83 82 84 96 76 113C60 116 44 115 32 111Z" fill="url(#' + uid + 'Coat)"/>' +
            '<path d="M50 42C61 31 78 29 93 38C104 45 110 58 109 72C108 81 103 87 96 88C91 89 87 92 83 97C74 107 60 111 47 104C35 98 30 84 33 69C35 57 41 48 50 42Z" fill="url(#' + uid + 'Coat)"/>' +
            '<g clip-path="url(#' + uid + 'HeadClip)">' +
              '<path d="M44 49C52 39 66 36 82 40C71 48 64 58 62 70C60 82 64 93 74 104C61 107 49 104 40 95C31 84 31 67 44 49Z" fill="url(#' + uid + 'Face)" opacity=".62"/>' +
              '<path d="M70 72C82 77 95 75 106 69C104 83 95 94 82 99C67 105 54 101 42 90C51 80 60 74 70 72Z" fill="' + palette.dark + '" opacity=".25"/>' +
              '<path d="M84 70C96 66 108 70 113 80C116 89 109 97 97 100C85 102 76 96 75 87C74 79 77 73 84 70Z" fill="url(#' + uid + 'Muzzle)"/>' +
              '<path d="M88 83C96 79 105 80 111 86C107 93 100 96 91 95C84 94 79 90 77 84C81 84 84 84 88 83Z" fill="#20191b" opacity=".34"/>' +
              blazeMarkup +
              dappleMarkup +
            '</g>' +
            '<path d="M63 20C60 31 61 41 66 49C58 48 53 43 51 36C50 28 54 22 63 20Z" fill="url(#' + uid + 'Coat)" transform="scale(' + profile.ear + ' ' + profile.ear + ') translate(' + (profile.ear > 1 ? -4 : 0) + ' ' + (profile.ear > 1 ? -3 : 0) + ')"/>' +
            '<path d="M80 23C76 33 76 43 82 51C74 51 69 46 68 39C68 31 72 25 80 23Z" fill="url(#' + uid + 'Coat)" transform="scale(' + profile.ear + ' ' + profile.ear + ') translate(' + (profile.ear > 1 ? -6 : 0) + ' ' + (profile.ear > 1 ? -3 : 0) + ')"/>' +
            '<path d="M76 57C81 52 89 52 94 57C89 63 81 63 76 57Z" fill="#171015"/>' +
            '<ellipse cx="86" cy="57" rx="5.4" ry="3.8" fill="#4b2b18"/><circle cx="86" cy="57" r="2.2" fill="#100807"/><circle cx="88" cy="55.5" r="1" fill="#fff4df"/>' +
            '<ellipse cx="101" cy="86" rx="5.3" ry="6.5" fill="#111116"/><ellipse cx="102" cy="87" rx="3" ry="4" fill="#2d292d"/>' +
            '<path d="M42 91C52 99 66 101 80 95" fill="none" stroke="#1b0d08" stroke-width="2.2" stroke-linecap="round" opacity=".38"/>' +
            '<path d="M45 47C57 36 73 34 90 40" fill="none" stroke="#fff" stroke-width="2.1" opacity="' + (0.08 + genes.shade * 0.1).toFixed(2) + '" stroke-linecap="round"/>' +
            '<path d="M41 66C43 54 50 45 60 39" fill="none" stroke="#fff" stroke-width="1.8" opacity=".08" stroke-linecap="round"/>' +
            '<path d="M47 42C37 52 33 66 34 82" fill="none" stroke="#000" stroke-width="2.2" opacity=".16" stroke-linecap="round"/>' +
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
