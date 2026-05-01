// Breeding render module.
// Owns parent selection and foal forecast rendering.

window.SKACHKI_BREEDING_RENDER = (function () {
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }
  function breedingLogic() { return window.SKACHKI_BREEDING_LOGIC || {}; }
  function foalResult() { return window.SKACHKI_FOAL_RESULT_RENDER || {}; }

  function potentialStars(value) {
    var UI = horseUi();
    if (UI.potentialStars) return UI.potentialStars(value);
    value = Number(value) || 0;
    if (value >= 90) return 5;
    if (value >= 80) return 4;
    if (value >= 70) return 3;
    if (value >= 60) return 2;
    return 1;
  }

  function potentialLabel(value) {
    var UI = horseUi();
    if (UI.potentialLabel) return UI.potentialLabel(value);
    value = Number(value) || 0;
    if (value >= 90) return 'Выдающийся';
    if (value >= 80) return 'Высокий';
    if (value >= 70) return 'Хороший';
    if (value >= 60) return 'Средний';
    return 'Базовый';
  }

  function potentialForecast(stallion, mare) {
    var L = breedingLogic();
    var forecast = L.potentialForecast ? L.potentialForecast(stallion, mare) : {
      min: Math.max(50, Math.min(100, Math.round((stallion.potential + mare.potential) / 2) - 4)),
      max: Math.max(50, Math.min(100, Math.round((stallion.potential + mare.potential) / 2) + 5)),
      average: Math.round((stallion.potential + mare.potential) / 2)
    };
    var minLabel = potentialLabel(forecast.min);
    var maxLabel = potentialLabel(forecast.max);

    return {
      min: forecast.min,
      max: forecast.max,
      label: minLabel === maxLabel ? minLabel : minLabel + '–' + maxLabel,
      stars: potentialStars(forecast.average)
    };
  }

  function forecastStars(stars, title) {
    var percent = Math.max(1, Math.min(5, stars)) * 20;
    return '<div class="star-rating breed-stars" title="' + title + '"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function qualityValue(horse, key) {
    var L = breedingLogic();
    return L.qualityValue ? L.qualityValue(horse, key) : 8;
  }

  function qualityRank(value) {
    var tools = horseTools();
    if (tools.hiddenRankFromValue) return tools.hiddenRankFromValue(value);
    if (value >= 16) return 'diamond';
    if (value >= 11) return 'gold';
    if (value >= 6) return 'silver';
    return 'bronze';
  }

  function qualityRankLabel(rank) {
    var tools = horseTools();
    if (tools.rankLabel) return tools.rankLabel(rank);
    if (rank === 'diamond') return 'Алмаз';
    if (rank === 'gold') return 'Золото';
    if (rank === 'silver') return 'Серебро';
    return 'Бронза';
  }

  function qualityLabel(key) {
    var tools = horseTools();
    if (tools.hiddenQualityLabel) return tools.hiddenQualityLabel(key);
    if (key === 'strength') return 'Сила';
    if (key === 'agility') return 'Ловкость';
    if (key === 'instinct') return 'Чутьё';
    return key;
  }

  function qualityIcon(key) {
    if (key === 'strength') return '♞';
    if (key === 'agility') return '♘';
    return '◆';
  }

  function forecastQualityRank(stallion, mare, key) {
    var L = breedingLogic();
    var values = L.forecastQualityValues ? L.forecastQualityValues(stallion, mare, key) : {
      min: Math.max(1, Math.min(20, Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2) - 2)),
      max: Math.max(1, Math.min(20, Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2) + 2))
    };
    var minRank = qualityRank(values.min);
    var maxRank = qualityRank(values.max);

    return {
      rank: maxRank,
      label: minRank === maxRank ? qualityRankLabel(minRank) : qualityRankLabel(minRank) + '–' + qualityRankLabel(maxRank)
    };
  }

  function forecastQualityBadge(stallion, mare, key) {
    var forecast = forecastQualityRank(stallion, mare, key);
    return '<div class="quality-badge quality-' + forecast.rank + ' compact">' +
      '<div class="quality-icon">' + qualityIcon(key) + '</div>' +
      '<div><div class="quality-name">' + qualityLabel(key) + '</div><div class="quality-rank">' + forecast.label + '</div></div>' +
    '</div>';
  }

  function statRange(label, value) {
    var min = Math.max(10, value - 5);
    var max = Math.min(100, value + 6);
    return '<div class="breed-forecast-stat"><b>' + min + '–' + max + '</b><span>' + label + '</span></div>';
  }

  function traitForecast(label, value) {
    return '<div class="breed-trait-chip breed-trait-polished"><span>' + label + ':&nbsp;</span><b>' + value + '</b></div>';
  }

  function traitPair(valueA, valueB) {
    return valueA === valueB ? valueA : valueA + ' / ' + valueB;
  }

  function renderFoalPreview() {
    return '<div class="breed-foal-preview-avatar" style="position:relative;width:78px;height:78px;flex:0 0 78px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,rgba(16,36,56,.98),rgba(5,14,26,.98));box-shadow:0 0 0 1px rgba(216,169,67,.28) inset,0 12px 28px rgba(0,0,0,.28);">' +
      '<div class="breed-foal-glow" style="position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle,rgba(255,211,77,.22),rgba(95,184,255,.08) 55%,transparent 72%);pointer-events:none;"></div>' +
      '<svg class="breed-foal-preview-svg" style="position:relative;display:block;width:100%;height:100%;border-radius:24px;" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs><radialGradient id="breedFoalPreviewBg" cx="50%" cy="36%" r="74%"><stop offset="0" stop-color="#2a4363"/><stop offset=".62" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient></defs>' +
        '<circle cx="60" cy="60" r="57" fill="url(#breedFoalPreviewBg)"/>' +
        '<path d="M43 96C40 78 43 64 53 53C59 47 66 44 75 44C73 35 76 28 82 22C88 30 90 38 87 46C98 51 105 61 108 73C112 88 104 100 91 101C81 102 74 94 67 84C60 74 53 76 50 88C49 92 49 95 50 100Z" fill="#d8a943" opacity=".9"/>' +
        '<path d="M43 96C37 78 40 59 58 44C70 34 85 34 96 43C80 44 68 54 64 69C60 83 65 95 78 105Z" fill="#171015" opacity=".7"/>' +
        '<path d="M67 51C75 55 84 67 96 86C91 93 82 91 76 82C69 70 60 59 50 54C55 50 61 49 67 51Z" fill="#fff4dc" opacity=".82"/>' +
        '<ellipse cx="84" cy="61" rx="6" ry="4" fill="#171015"/><circle cx="86" cy="59" r="1.2" fill="#fff4dc"/>' +
        '<text x="60" y="110" text-anchor="middle" font-size="12" font-weight="900" fill="#ffe6a2">?</text>' +
      '</svg>' +
    '</div>';
  }

  function parentAfterText(ctx, parent) {
    if (ctx.isExternalParent(parent)) return ctx.serviceLabel(parent) + ': ' + ctx.parentFee(parent) + ' 🪙';
    return parent.name + ' ' + (parent.offspringCount + 1) + '/' + parent.offspringLimit;
  }

  function renderParentSlot(ctx, horse, gender) {
    var UI = horseUi();
    var symbol = gender === 'stallion' ? '♂' : '♀';
    var buttonText = gender === 'stallion' ? 'Выбрать жеребца' : 'Выбрать кобылу';
    var accent = gender === 'stallion' ? 'breed-parent-stallion' : 'breed-parent-mare';

    if (!horse || !UI.renderHorseCard) {
      return '<button class="breed-parent-empty ' + accent + '" data-open-parent-picker="' + gender + '">' +
        '<span class="breed-empty-symbol">' + symbol + '</span><b>' + buttonText + '</b>' +
      '</button>';
    }

    return '<div class="breed-parent-slot breed-parent-selectable ' + accent + '" data-open-parent-picker="' + gender + '" role="button" tabindex="0" aria-label="' + buttonText + '" style="margin-bottom:0;">' +
      UI.renderHorseCard(horse, { extraClass: 'breed-parent-card' }) +
      ctx.serviceNote(horse) +
    '</div>';
  }

  function renderPairStep(ctx, stallion, mare) {
    return renderParentSlot(ctx, stallion, 'stallion') +
      '<div class="breed-heart-divider" aria-hidden="true" style="position:relative;z-index:8;margin:-12px auto -12px;">♡</div>' +
      renderParentSlot(ctx, mare, 'mare') +
      renderForecast(ctx, stallion, mare);
  }

  function renderParentPicker(ctx, gender, list, selectedId, hasOwn) {
    var UI = horseUi();
    var title = gender === 'stallion' ? 'Выбор жеребца' : 'Выбор кобылы';
    var desc;

    if (!hasOwn && gender === 'stallion') {
      desc = 'Своих доступных жеребцов нет. Доступна племенная станция за ' + ctx.parentFee(list[0]) + ' 🪙.';
    } else if (!hasOwn && gender === 'mare') {
      desc = 'Своих доступных кобыл нет. Доступна племенная кобыла за ' + ctx.parentFee(list[0]) + ' 🪙.';
    } else {
      desc = gender === 'stallion' ? 'Выберите жеребца для пары.' : 'Выберите кобылу для пары.';
    }

    return '<section class="breed-intro-card breed-picker-title"><div class="summary-title">' + title + '</div><div class="summary-desc">' + desc + '</div></section>' +
      '<div class="section-label">Доступные варианты</div>' +
      list.map(function (horse) {
        var selected = String(horse.id) === String(selectedId);
        var card = UI.renderHorseCard ? UI.renderHorseCard(horse, { dataHorse: false, selected: selected, extraClass: 'breed-picker-card' }) : '';

        if (selected) {
          card = card.replace('<article class="', '<article style="border-color:rgba(255,210,93,.76)!important;box-shadow:0 0 0 1px rgba(255,210,93,.24) inset,0 18px 52px rgba(0,0,0,.46)!important;" class="');
        }

        if (ctx.isExternalParent(horse)) card += '<div class="breed-forecast-note">Стоимость скрещивания: ' + ctx.parentFee(horse) + ' 🪙</div>';
        return '<div class="breed-picker-item" data-select-parent="' + gender + '" data-id="' + horse.id + '">' + card + '</div>';
      }).join('');
  }

  function renderForecast(ctx, stallion, mare) {
    var L = breedingLogic();
    var forecast;
    var expectedClass;
    var potential;

    if (!stallion || !mare) {
      return '<section class="breed-forecast-panel breed-foal-card breed-forecast-polished">' +
        '<div class="breed-forecast-head breed-foal-head" style="align-items:center;gap:14px;">' +
          '<div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Выберите пару, чтобы увидеть прогноз.</div></div>' +
          renderFoalPreview() +
        '</div>' +
      '</section>';
    }

    forecast = L.forecastVisibleStats ? L.forecastVisibleStats(stallion, mare) : {
      speed: Math.round((stallion.speed + mare.speed) / 2),
      stamina: Math.round((stallion.stamina + mare.stamina) / 2),
      acceleration: Math.round((stallion.acceleration + mare.acceleration) / 2)
    };
    expectedClass = forecast.expectedClass || Math.round((forecast.speed + forecast.stamina + forecast.acceleration) / 3);
    potential = potentialForecast(stallion, mare);

    return '<section class="breed-forecast-panel breed-foal-card breed-forecast-polished">' +
      '<div class="breed-forecast-head breed-foal-head" style="align-items:center;gap:14px;margin-bottom:14px;">' +
        '<div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Прогноз наследования. Точные значения откроются после рождения.</div></div>' +
        renderFoalPreview() +
      '</div>' +
      '<div class="breed-foal-level-row" style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 0 10px;">' +
        '<span style="font-weight:900;color:#ffe6a2;">Прогноз потенциала</span>' +
        forecastStars(potential.stars, 'Потенциал: ' + potential.label) +
      '</div>' +
      '<div class="breed-forecast-note" style="margin-bottom:14px;">Потенциал: ' + potential.label + ' • Ожидаемый класс: ' + Math.max(10, expectedClass - 5) + '–' + Math.min(100, expectedClass + 6) + '</div>' +
      '<div class="breed-forecast-section-title">Вероятные признаки</div>' +
      '<div class="breed-trait-grid" style="gap:8px;margin-top:8px;">' +
        traitForecast('Пол', 'случайный') +
        traitForecast('Порода', traitPair(stallion.breed, mare.breed)) +
        traitForecast('Масть', traitPair(stallion.coat, mare.coat)) +
        traitForecast('Характер', traitPair(stallion.temperament, mare.temperament)) +
      '</div>' +
      '<div class="breed-forecast-section-title" style="margin-top:16px;">Прогноз показателей</div>' +
      '<div class="breed-forecast-grid" style="gap:8px;margin-top:8px;">' +
        statRange('Класс', expectedClass) +
        statRange('Скорость', forecast.speed) +
        statRange('Выносливость', forecast.stamina) +
        statRange('Ускорение', forecast.acceleration) +
      '</div>' +
      '<div class="breed-forecast-section-title" style="margin-top:16px;">Наследование качеств</div>' +
      '<div class="quality-grid breed-forecast-quality-grid" style="gap:8px;margin-top:8px;">' +
        forecastQualityBadge(stallion, mare, 'strength') +
        forecastQualityBadge(stallion, mare, 'agility') +
        forecastQualityBadge(stallion, mare, 'instinct') +
      '</div>' +
      '<div class="breed-forecast-note" style="margin-top:14px;">После разведения: ' + parentAfterText(ctx, stallion) + ' • ' + parentAfterText(ctx, mare) + '</div>' +
    '</section>';
  }

  function renderSharedFoalCard() {
    var F = foalResult();
    if (F.renderSharedFoalCard) return F.renderSharedFoalCard.apply(F, arguments);
  }

  function setupFoalNameEditor() {
    var F = foalResult();
    if (F.setupFoalNameEditor) return F.setupFoalNameEditor.apply(F, arguments);
  }

  function showFoalResult() {
    var F = foalResult();
    if (F.showFoalResult) return F.showFoalResult.apply(F, arguments);
  }

  return {
    renderPairStep: renderPairStep,
    renderParentPicker: renderParentPicker,
    renderForecast: renderForecast,
    renderSharedFoalCard: renderSharedFoalCard,
    setupFoalNameEditor: setupFoalNameEditor,
    showFoalResult: showFoalResult
  };
})();
