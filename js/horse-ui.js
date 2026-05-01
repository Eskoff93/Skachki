// Horse card, potential stars and quality UI.

window.SKACHKI_HORSE_UI = (function () {
  function game() { return window.SKACHKI_GAME; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }
  function portraitTools() { return window.SKACHKI_HORSE_PORTRAIT || {}; }

  function potentialStars(value) {
    var potential = Number(value) || 0;
    if (potential >= 90) return 5;
    if (potential >= 80) return 4;
    if (potential >= 70) return 3;
    if (potential >= 60) return 2;
    return 1;
  }

  function potentialLabel(value) {
    var stars = potentialStars(value);
    if (stars === 5) return 'Выдающийся';
    if (stars === 4) return 'Высокий';
    if (stars === 3) return 'Хороший';
    if (stars === 2) return 'Средний';
    return 'Базовый';
  }

  function potentialTier(value) {
    var stars = potentialStars(value);
    if (stars === 5) return 'elite';
    if (stars === 4) return 'high';
    if (stars === 3) return 'good';
    return 'base';
  }

  function potentialBadge(horse) {
    return '<span class="potential-badge potential-' + potentialTier(horse.potential) + '">Потенциал: ' + potentialLabel(horse.potential) + '</span>';
  }

  function horseClassNumber(horse) {
    var G = game();
    if (!G || !G.horseClass) {
      return Math.round(((horse.speed || 0) + (horse.stamina || 0) + (horse.acceleration || 0)) / 3);
    }
    return Math.round(G.horseClass(horse));
  }

  function classScoreBadge(horse) {
    return '<div class="class-score-badge" title="Текущий класс"><b>' + horseClassNumber(horse) + '</b></div>';
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

  function horsePortrait(horse) {
    var portrait = portraitTools();
    if (portrait.render) return portrait.render(horse);
    return '<img src="./horse_icon.png" alt="horse">';
  }

  function starRating(horse) {
    var stars = potentialStars(horse.potential);
    var percent = stars * 20;
    return '<div class="star-rating potential-star-rating" title="Потенциал: ' + potentialLabel(horse.potential) + '"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
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

  function renderMedallion(horse) {
    var sexSymbol = horse.gender === 'mare' ? '♀' : '♂';
    var sexClass = horse.gender === 'mare' ? 'sex-mare' : 'sex-stallion';
    var rank = horseRank(horse);

    return '<div class="horse-medallion medallion-' + rank + ' ' + sexClass + '">' +
      classScoreBadge(horse) +
      '<div class="medallion-crest">♞</div>' +
      horsePortrait(horse) +
      '<div class="sex-badge ' + sexClass + '">' + sexSymbol + '</div>' +
      '<div class="rank-badge">' + horseRankLabel(horse) + '</div>' +
    '</div>';
  }

  function renderHorseCard(horse, options) {
    var opts = options || {};
    var classes = ['horse-card', 'luxury-horse-card'];
    if (opts.extraClass) classes.push(opts.extraClass);
    if (opts.selected) classes.push('selected');

    var dataAttr = opts.dataHorse ? ' data-horse="' + horse.id + '"' : '';
    var actions = opts.actions ? '<div class="card-actions luxury-actions">' +
      '<button class="btn btn-blue" data-action="train" data-id="' + horse.id + '">Тренировать</button>' +
      '<button class="btn btn-dark" data-action="details" data-id="' + horse.id + '">Подробнее</button>' +
    '</div>' : '';

    return '<article class="' + classes.join(' ') + '"' + dataAttr + '>' +
      '<div class="luxury-horse-top">' +
        renderMedallion(horse) +
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
      actions +
    '</article>';
  }

  return {
    averageStars: averageStars,
    horseClassNumber: horseClassNumber,
    horsePortrait: horsePortrait,
    horseRank: horseRank,
    horseRankLabel: horseRankLabel,
    horseStatLine: horseStatLine,
    potentialBadge: potentialBadge,
    potentialLabel: potentialLabel,
    potentialStars: potentialStars,
    potentialTier: potentialTier,
    qualityGrid: qualityGrid,
    renderHorseCard: renderHorseCard,
    starRating: starRating
  };
})();

(function () {
  function potentialStarsFromForecastText(text) {
    var value = String(text || '');
    if (value.indexOf('Выдающийся') !== -1) return 5;
    if (value.indexOf('Высокий') !== -1) return 4;
    if (value.indexOf('Хороший') !== -1) return 3;
    if (value.indexOf('Средний') !== -1) return 2;
    return 1;
  }

  function findPotentialChip(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll('.breed-trait-chip')).find(function (chip) {
      var label = chip.querySelector('span');
      return label && label.textContent.trim() === 'Потенциал';
    });
  }

  function syncBreedPotentialForecast() {
    Array.prototype.slice.call(document.querySelectorAll('#breedScroll .breed-foal-card')).forEach(function (panel) {
      var row = panel.querySelector('.breed-foal-level-row');
      var chip = findPotentialChip(panel);
      var value = chip && chip.querySelector('b') ? chip.querySelector('b').textContent.trim() : '';
      var label = row ? row.querySelector('span') : null;
      var rating = row ? row.querySelector('.star-rating') : null;
      var fill = rating ? rating.querySelector('.star-rating-fill') : null;
      var stars = potentialStarsFromForecastText(value);

      if (!row || !value || !rating || !fill) return;
      if (label) label.textContent = 'Прогноз потенциала';
      rating.title = 'Потенциал: ' + value;
      fill.style.width = (stars * 20) + '%';
      if (chip) chip.style.display = 'none';
    });
  }

  function installBreedPotentialForecastSync() {
    var scroll = document.getElementById('breedScroll');
    var scheduled = false;

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        syncBreedPotentialForecast();
      });
    }

    if (!scroll || !window.MutationObserver) {
      syncBreedPotentialForecast();
      return;
    }

    syncBreedPotentialForecast();
    new MutationObserver(schedule).observe(scroll, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBreedPotentialForecastSync);
  } else {
    installBreedPotentialForecastSync();
  }
})();
