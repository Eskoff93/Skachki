// Breeding screen and breeding actions.

window.SKACHKI_BREEDING = (function () {
  var selectedStallionId = null;
  var selectedMareId = null;
  var breedStep = 'pair';
  var latestFoalId = null;

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }
  function breedingService() { return window.SKACHKI_BREEDING_SERVICE || {}; }

  function stateHorses() {
    var G = game();
    return G && G.state && Array.isArray(G.state.horses) ? G.state.horses : [];
  }

  function isExternalStud(parentOrId) {
    var service = breedingService();
    return service.isExternalStud ? service.isExternalStud(parentOrId) : false;
  }

  function isExternalMare(parentOrId) {
    var service = breedingService();
    return service.isExternalMare ? service.isExternalMare(parentOrId) : false;
  }

  function isExternalParent(parentOrId) {
    var service = breedingService();
    return service.isExternalParent ? service.isExternalParent(parentOrId) : false;
  }

  function parentFee(parent) {
    var service = breedingService();
    return service.parentFee ? service.parentFee(parent) : 0;
  }

  function totalFee(stallion, mare) {
    var service = breedingService();
    return service.totalFee ? service.totalFee(stallion, mare) : parentFee(stallion) + parentFee(mare);
  }

  function serviceLabel(parent) {
    var service = breedingService();
    return service.serviceLabel ? service.serviceLabel(parent) : '';
  }

  function serviceNote(parent) {
    var service = breedingService();
    return service.serviceNote ? service.serviceNote(parent) : '';
  }

  function ownAvailableParents(gender) {
    var service = breedingService();
    return service.ownAvailableParents ? service.ownAvailableParents(stateHorses(), gender) : [];
  }

  function availableParents(gender) {
    var service = breedingService();
    return service.availableParents ? service.availableParents(stateHorses(), gender) : ownAvailableParents(gender);
  }

  function findHorse(id) {
    var service = breedingService();
    return service.findHorse ? service.findHorse(stateHorses(), id) : null;
  }

  function canUseAsParent(horse, gender) {
    var service = breedingService();
    return service.canUseAsParent ? service.canUseAsParent(stateHorses(), horse, gender) : false;
  }

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
    var base = Math.round((stallion.potential + mare.potential) / 2);
    var min = Math.max(50, Math.min(100, base - 4));
    var max = Math.max(50, Math.min(100, base + 5));
    var minLabel = potentialLabel(min);
    var maxLabel = potentialLabel(max);
    var average = Math.round((min + max) / 2);

    return {
      min: min,
      max: max,
      label: minLabel === maxLabel ? minLabel : minLabel + '–' + maxLabel,
      stars: potentialStars(average)
    };
  }

  function potentialForecastLabel(stallion, mare) {
    return potentialForecast(stallion, mare).label;
  }

  function forecastStars(stars, title) {
    var percent = Math.max(1, Math.min(5, stars)) * 20;
    return '<div class="star-rating breed-stars" title="' + title + '"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function genderLabel(horse) {
    if (isExternalParent(horse)) return serviceLabel(horse);
    var tools = horseTools();
    if (tools.genderLabel) return tools.genderLabel(horse.gender);
    return horse.gender === 'mare' ? 'Кобыла' : 'Жеребец';
  }

  function horsePortrait(horse) {
    var UI = horseUi();
    return UI.horsePortrait ? UI.horsePortrait(horse) : '';
  }

  function renderAvatar(horse, className) {
    return '<div class="horse-avatar detail-horse-avatar ' + (className || '') + '">' + horsePortrait(horse) + '</div>';
  }

  function qualityValue(horse, key) {
    var qualities = horse && horse.hiddenQualities ? horse.hiddenQualities : {};
    return Number.isFinite(qualities[key]) ? qualities[key] : 8;
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
    var base = Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2);
    var min = Math.max(1, Math.min(20, base - 2));
    var max = Math.max(1, Math.min(20, base + 2));
    var minRank = qualityRank(min);
    var maxRank = qualityRank(max);
    var label = minRank === maxRank
      ? qualityRankLabel(minRank)
      : qualityRankLabel(minRank) + '–' + qualityRankLabel(maxRank);

    return { rank: maxRank, label: label };
  }

  function forecastQualityBadge(stallion, mare, key) {
    var forecast = forecastQualityRank(stallion, mare, key);
    return '<div class="quality-badge quality-' + forecast.rank + ' compact">' +
      '<div class="quality-icon">' + qualityIcon(key) + '</div>' +
      '<div><div class="quality-name">' + qualityLabel(key) + '</div><div class="quality-rank">' + forecast.label + '</div></div>' +
    '</div>';
  }

  function qualityGrid(horse) {
    var UI = horseUi();
    if (UI.qualityGrid) return UI.qualityGrid(horse, true);
    return '';
  }

  function starRating(horse) {
    var UI = horseUi();
    var G = game();
    var cls;
    var rounded;
    var percent;

    if (!horse) return '';
    if (UI.starRating) return UI.starRating(horse).replace('class="star-rating"', 'class="star-rating breed-stars"');

    cls = G.horseClass(horse);
    rounded = Math.round(cls / 10) * 10;
    percent = Math.max(0, Math.min(100, rounded));
    return '<div class="star-rating breed-stars" title="Уровень"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function statShort(label, value) {
    return '<div class="breed-stat-chip"><b>' + value + '</b><span>' + label + '</span></div>';
  }

  function statRange(label, value) {
    var min = Math.max(10, value - 5);
    var max = Math.min(100, value + 6);
    return '<div class="breed-forecast-stat"><b>' + min + '–' + max + '</b><span>' + label + '</span></div>';
  }

  function ensureSelection() {
    var stallions = availableParents('stallion');
    var mares = availableParents('mare');
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    if (!canUseAsParent(stallion, 'stallion')) selectedStallionId = stallions[0] ? String(stallions[0].id) : null;
    if (!canUseAsParent(mare, 'mare')) selectedMareId = mares[0] ? String(mares[0].id) : null;
  }

  function openBreedScreen() {
    var G = game();
    breedStep = 'pair';
    ensureSelection();
    renderBreedScreen();
    G.showScreen('breed');
  }

  function renderBreedScreen() {
    var G = game();
    var scroll = G.byId('breedScroll');
    if (!scroll) return;

    ensureSelection();

    if (breedStep === 'stallion' || breedStep === 'mare') {
      scroll.innerHTML = renderParentPicker(breedStep);
    } else {
      scroll.innerHTML = renderPairStep();
    }

    updateBreedButton();
  }

  function renderPairIntro(stallion, mare) {
    var fee = totalFee(stallion, mare);
    var usesStudService = isExternalStud(stallion);
    var usesMareService = isExternalMare(mare);
    var desc = 'Выберите жеребца и кобылу. Потомок унаследует породу, масть, характер, показатели и качества родителей.';

    if (usesStudService && usesMareService) {
      desc = 'Своих доступных родителей нет. Можно использовать племенного жеребца и племенную кобылу за ' + fee + ' 🪙.';
    } else if (usesStudService) {
      desc = 'Своих доступных жеребцов нет. Можно нанять племенного жеребца за ' + parentFee(stallion) + ' 🪙.';
    } else if (usesMareService) {
      desc = 'Своих доступных кобыл нет. Можно нанять племенную кобылу за ' + parentFee(mare) + ' 🪙.';
    }

    return '<section class="breed-intro-card">' +
      '<div class="summary-title">Разведение</div>' +
      '<div class="summary-desc">' + desc + '</div>' +
    '</section>';
  }

  function renderPairStep() {
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    return renderPairIntro(stallion, mare) +
      '<div class="section-label">Жеребец</div>' +
      renderParentSlot(stallion, 'stallion') +
      '<div class="breed-heart-divider" aria-hidden="true">♡</div>' +
      '<div class="section-label">Кобыла</div>' +
      renderParentSlot(mare, 'mare') +
      renderForecast(stallion, mare);
  }

  function renderParentSlot(horse, gender) {
    var symbol = gender === 'stallion' ? '♂' : '♀';
    var buttonText = gender === 'stallion' ? 'Выбрать жеребца' : 'Выбрать кобылу';
    var accent = gender === 'stallion' ? 'breed-parent-stallion' : 'breed-parent-mare';
    var UI = horseUi();

    if (!horse || !UI.renderHorseCard) {
      return '<button class="breed-parent-empty ' + accent + '" data-open-parent-picker="' + gender + '">' +
        '<span class="breed-empty-symbol">' + symbol + '</span>' +
        '<b>' + buttonText + '</b>' +
      '</button>';
    }

    return '<div class="breed-parent-slot ' + accent + '">' +
      UI.renderHorseCard(horse, { extraClass: 'breed-parent-card' }) +
      serviceNote(horse) +
      '<button class="breed-change-parent-btn" type="button" data-open-parent-picker="' + gender + '">' + buttonText + '</button>' +
    '</div>';
  }

  function renderParentPicker(gender) {
    var hasOwn = ownAvailableParents(gender).length > 0;
    var usesService = !hasOwn;
    var title = gender === 'stallion' ? 'Выбор жеребца' : 'Выбор кобылы';
    var desc;
    var selectedId = gender === 'stallion' ? selectedStallionId : selectedMareId;
    var list = availableParents(gender);
    var UI = horseUi();

    if (usesService && gender === 'stallion') {
      desc = 'Своих доступных жеребцов нет. Доступна племенная станция за ' + parentFee(list[0]) + ' 🪙.';
    } else if (usesService && gender === 'mare') {
      desc = 'Своих доступных кобыл нет. Доступна племенная кобыла за ' + parentFee(list[0]) + ' 🪙.';
    } else {
      desc = gender === 'stallion'
        ? 'Выберите жеребца для пары. Карточки показывают те же параметры, что и в Конюшне.'
        : 'Выберите кобылу для пары. Карточки показывают те же параметры, что и в Конюшне.';
    }

    return '<section class="breed-intro-card">' +
        '<div class="summary-title">' + title + '</div>' +
        '<div class="summary-desc">' + desc + '</div>' +
      '</section>' +
      '<div class="section-label">Доступные варианты</div>' +
      list.map(function (horse) {
        var selected = String(horse.id) === String(selectedId);
        var card = UI.renderHorseCard ? UI.renderHorseCard(horse, {
          dataHorse: false,
          selected: selected,
          extraClass: 'breed-picker-card'
        }) : '';
        if (selected) {
          card = card.replace(
            '<article class="',
            '<article style="border-color:rgba(255,210,93,.76)!important;box-shadow:0 0 0 1px rgba(255,210,93,.24) inset,0 18px 52px rgba(0,0,0,.46)!important;" class="'
          );
        }
        if (isExternalParent(horse)) card += '<div class="breed-forecast-note">Стоимость скрещивания: ' + parentFee(horse) + ' 🪙</div>';
        return '<div class="breed-picker-item" data-select-parent="' + gender + '" data-id="' + horse.id + '">' + card + '</div>';
      }).join('');
  }

  function traitForecast(label, value) {
    return '<div class="breed-trait-chip"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function traitPair(valueA, valueB) {
    if (valueA === valueB) return valueA;
    return valueA + ' / ' + valueB;
  }

  function renderFoalPreview() {
    return '<div class="breed-foal-preview-avatar" style="position:relative;width:86px;height:86px;flex:0 0 86px;border-radius:26px;overflow:hidden;background:linear-gradient(180deg,rgba(16,36,56,.98),rgba(5,14,26,.98));box-shadow:0 0 0 1px rgba(216,169,67,.28) inset,0 12px 28px rgba(0,0,0,.28);">' +
      '<div class="breed-foal-glow" style="position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle,rgba(255,211,77,.2),rgba(95,184,255,.08) 55%,transparent 72%);pointer-events:none;"></div>' +
      '<svg class="breed-foal-preview-svg" style="position:relative;display:block;width:100%;height:100%;border-radius:26px;" viewBox="0 0 120 120" aria-hidden="true">' +
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

  function parentAfterText(parent) {
    if (isExternalParent(parent)) return serviceLabel(parent) + ': ' + parentFee(parent) + ' 🪙';
    return parent.name + ' ' + (parent.offspringCount + 1) + '/' + parent.offspringLimit;
  }

  function renderForecast(stallion, mare) {
    if (!stallion || !mare) {
      return '<section class="breed-forecast-panel breed-foal-card">' +
        '<div class="breed-forecast-head">' +
          '<div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Выберите жеребца и кобылу, чтобы увидеть прогноз.</div></div>' +
          renderFoalPreview() +
        '</div>' +
      '</section>';
    }

    function avg(key) { return Math.round((stallion[key] + mare[key]) / 2); }

    var forecast = {
      speed: avg('speed'),
      stamina: avg('stamina'),
      acceleration: avg('acceleration')
    };
    var expectedClass = Math.round((forecast.speed + forecast.stamina + forecast.acceleration) / 3);
    var potential = potentialForecast(stallion, mare);

    return '<section class="breed-forecast-panel breed-foal-card">' +
      '<div class="breed-forecast-head breed-foal-head">' +
        '<div>' +
          '<div class="summary-title">Будущий жеребёнок</div>' +
          '<div class="summary-desc">Прогноз наследования. Точные значения откроются после рождения.</div>' +
        '</div>' +
        renderFoalPreview() +
      '</div>' +
      '<div class="breed-foal-level-row">' +
        '<span>Прогноз потенциала</span>' +
        forecastStars(potential.stars, 'Потенциал: ' + potential.label) +
      '</div>' +
      '<div class="breed-forecast-note">Потенциал: ' + potential.label + ' • Ожидаемый класс: ' + Math.max(10, expectedClass - 5) + '–' + Math.min(100, expectedClass + 6) + '</div>' +
      '<div class="breed-forecast-section-title">Вероятные признаки</div>' +
      '<div class="breed-trait-grid">' +
        traitForecast('Пол', 'случайный') +
        traitForecast('Порода', traitPair(stallion.breed, mare.breed)) +
        traitForecast('Масть', traitPair(stallion.coat, mare.coat)) +
        traitForecast('Характер', traitPair(stallion.temperament, mare.temperament)) +
      '</div>' +
      '<div class="breed-forecast-section-title">Прогноз показателей</div>' +
      '<div class="breed-forecast-grid">' +
        statRange('Класс', expectedClass) +
        statRange('Скорость', forecast.speed) +
        statRange('Выносливость', forecast.stamina) +
        statRange('Ускорение', forecast.acceleration) +
      '</div>' +
      '<div class="breed-forecast-section-title">Наследование качеств</div>' +
      '<div class="quality-grid breed-forecast-quality-grid">' +
        forecastQualityBadge(stallion, mare, 'strength') +
        forecastQualityBadge(stallion, mare, 'agility') +
        forecastQualityBadge(stallion, mare, 'instinct') +
      '</div>' +
      '<div class="breed-forecast-note">После разведения: ' + parentAfterText(stallion) + ' • ' + parentAfterText(mare) + '</div>' +
    '</section>';
  }

  function showStandaloneScreen(screenId) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (screen) {
      screen.classList.remove('active');
    });
    var target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  function renderFoalResult(child, stallion, mare) {
    var G = game();
    var card = G.byId('breedResultCard');
    var input = G.byId('foalNameInput');
    if (!card || !input) return;

    card.innerHTML =
      '<div class="foal-card-top">' +
        '<div class="foal-gender-badge">' + (child.gender === 'mare' ? '♀' : '♂') + '</div>' +
        renderAvatar(child, 'foal-avatar') +
        '<div class="foal-name-display">' + child.name + '</div>' +
        starRating(child) +
      '</div>' +
      '<div class="foal-info-lines">' +
        '<div><span>Пол</span><b>' + genderLabel(child) + '</b></div>' +
        '<div><span>Порода</span><b>' + child.breed + '</b></div>' +
        '<div><span>Масть</span><b>' + child.coat + '</b></div>' +
        '<div><span>Характер</span><b>' + child.temperament + '</b></div>' +
        '<div><span>Потенциал</span><b>' + potentialLabel(child.potential) + '</b></div>' +
      '</div>' +
      '<div class="foal-stat-grid">' +
        statShort('Скорость', child.speed) +
        statShort('Выносливость', child.stamina) +
        statShort('Ускорение', child.acceleration) +
      '</div>' +
      qualityGrid(child) +
      '<div class="foal-parents">' +
        '<div><span>Отец</span><b>' + stallion.name + '</b></div>' +
        '<div class="foal-heart">♡</div>' +
        '<div><span>Мать</span><b>' + mare.name + '</b></div>' +
      '</div>';

    input.value = child.name;
    input.oninput = function () {
      var cleanName = input.value.trim().slice(0, 18);
      child.name = cleanName || 'Жеребёнок';
      var display = card.querySelector('.foal-name-display');
      if (display) display.textContent = child.name;
      G.saveGame();
    };
  }

  function updateBreedButton() {
    var G = game();
    var button = G.byId('confirmBreedScreenBtn');
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);
    var fee = totalFee(stallion, mare);
    var ready = !!stallion && !!mare;
    if (!button) return;

    if (breedStep === 'stallion' || breedStep === 'mare') {
      button.disabled = false;
      button.className = 'btn btn-dark';
      button.textContent = 'Назад к паре';
      return;
    }

    button.disabled = !ready || G.state.coins < fee;
    button.className = ready && G.state.coins >= fee ? 'btn btn-teal' : 'btn btn-dark';
    if (!ready) button.textContent = 'Выберите пару';
    else if (fee && G.state.coins < fee) button.textContent = 'Нужно ' + fee + ' 🪙';
    else button.textContent = fee ? 'Скрестить • ' + fee + ' 🪙' : 'Скрестить';
  }

  function inheritQuality(stallion, mare, key) {
    var G = game();
    var average = Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2);
    var strongest = Math.max(qualityValue(stallion, key), qualityValue(mare, key));
    var base = Math.random() < 0.22 ? Math.round((average + strongest) / 2) : average;
    return G.clamp(base + G.randInt(-2, 2), 1, 20);
  }

  function inheritVisibleStat(stallion, mare, key) {
    var G = game();
    return G.clamp(Math.round((stallion[key] + mare[key]) / 2) + G.randInt(-5, 6), 10, 100);
  }

  function inheritPotential(stallion, mare) {
    var G = game();
    var average = Math.round((stallion.potential + mare.potential) / 2);
    var strongest = Math.max(stallion.potential, mare.potential);
    var bonus = 0;

    if (strongest >= 95 && Math.random() < 0.24) bonus += 3;
    if (stallion.potential >= 85 && mare.potential >= 85 && Math.random() < 0.18) bonus += 2;

    return G.clamp(average + bonus + G.randInt(-4, 6), 65, 100);
  }

  function inheritParentTrait(stallion, mare, key) {
    return Math.random() < 0.5 ? stallion[key] : mare[key];
  }

  function incrementParentUsage(parent) {
    if (!parent || isExternalParent(parent)) return;
    parent.offspringCount += 1;
    if (parent.offspringCount >= parent.offspringLimit && parent.status === 'retired') parent.status = 'archived';
  }

  function breedSelected() {
    var G = game();
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);
    var fee = totalFee(stallion, mare);

    if (breedStep === 'stallion' || breedStep === 'mare') {
      breedStep = 'pair';
      renderBreedScreen();
      return;
    }

    if (!stallion) return G.showToast('Выберите жеребца');
    if (!mare) return G.showToast('Выберите кобылу');
    if (!canUseAsParent(stallion, 'stallion')) return G.showToast('Выберите доступного жеребца');
    if (!canUseAsParent(mare, 'mare')) return G.showToast('Выберите доступную кобылу');
    if (fee && G.state.coins < fee) return G.showToast('Недостаточно монет для племенной станции');

    var child = G.normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: 'Жеребёнок ' + (G.state.horses.length + 1),
      breed: inheritParentTrait(stallion, mare, 'breed'),
      coat: inheritParentTrait(stallion, mare, 'coat'),
      speed: inheritVisibleStat(stallion, mare, 'speed'),
      stamina: inheritVisibleStat(stallion, mare, 'stamina'),
      acceleration: inheritVisibleStat(stallion, mare, 'acceleration'),
      agility: inheritVisibleStat(stallion, mare, 'agility'),
      power: inheritVisibleStat(stallion, mare, 'power'),
      intelligence: inheritVisibleStat(stallion, mare, 'intelligence'),
      hiddenQualities: {
        strength: inheritQuality(stallion, mare, 'strength'),
        agility: inheritQuality(stallion, mare, 'agility'),
        instinct: inheritQuality(stallion, mare, 'instinct')
      },
      potential: inheritPotential(stallion, mare),
      temperament: inheritParentTrait(stallion, mare, 'temperament')
    });

    if (fee) G.state.coins -= fee;

    incrementParentUsage(stallion);
    incrementParentUsage(mare);

    G.state.horses.push(child);
    latestFoalId = String(child.id);
    selectedStallionId = String(stallion.id);
    selectedMareId = String(mare.id);
    breedStep = 'pair';

    G.saveGame();
    showStandaloneScreen('breedResultScreen');
    renderFoalResult(child, stallion, mare);
  }

  function bind() {
    var G = game();
    var scroll = G.byId('breedScroll');
    var back = G.byId('breedBackBtn');
    var cancel = G.byId('breedCancelBtn');
    var confirm = G.byId('confirmBreedScreenBtn');
    var stableBtn = G.byId('breedResultStableBtn');
    var againBtn = G.byId('breedResultAgainBtn');

    if (scroll) {
      scroll.addEventListener('click', function (event) {
        var openPicker = event.target.closest('[data-open-parent-picker]');
        var selectParent = event.target.closest('[data-select-parent]');

        if (openPicker) {
          breedStep = openPicker.dataset.openParentPicker;
          renderBreedScreen();
          return;
        }

        if (selectParent) {
          if (selectParent.dataset.selectParent === 'stallion') selectedStallionId = selectParent.dataset.id;
          if (selectParent.dataset.selectParent === 'mare') selectedMareId = selectParent.dataset.id;
          breedStep = 'pair';
          renderBreedScreen();
        }
      });
    }

    if (back) back.onclick = function () {
      if (breedStep === 'stallion' || breedStep === 'mare') {
        breedStep = 'pair';
        renderBreedScreen();
        return;
      }
      G.showScreen('stable');
    };
    if (cancel) cancel.onclick = function () { G.showScreen('stable'); };
    if (confirm) confirm.onclick = breedSelected;
    if (stableBtn) stableBtn.onclick = function () { G.showScreen('stable'); };
    if (againBtn) againBtn.onclick = function () { openBreedScreen(); };
  }

  return {
    openBreedScreen: openBreedScreen,
    renderBreedScreen: renderBreedScreen,
    breedSelected: breedSelected,
    bind: bind
  };
})();
