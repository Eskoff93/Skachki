// Breeding screen and breeding actions.

window.SKACHKI_BREEDING = (function () {
  var selectedStallionId = null;
  var selectedMareId = null;
  var activePicker = null;
  var latestFoalId = null;

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }

  function genderLabel(horse) {
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

    return {
      rank: maxRank,
      label: label
    };
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

  function availableParents(gender) {
    var G = game();
    return G.state.horses.filter(function (horse) {
      return horse.status !== 'archived' &&
        horse.gender === gender &&
        horse.offspringCount < horse.offspringLimit;
    });
  }

  function findHorse(id) {
    var G = game();
    return G.state.horses.find(function (horse) {
      return String(horse.id) === String(id);
    });
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

    if (!findHorse(selectedStallionId) && stallions[0]) selectedStallionId = String(stallions[0].id);
    if (!findHorse(selectedMareId) && mares[0]) selectedMareId = String(mares[0].id);

    if (findHorse(selectedStallionId) && findHorse(selectedStallionId).gender !== 'stallion') selectedStallionId = stallions[0] ? String(stallions[0].id) : null;
    if (findHorse(selectedMareId) && findHorse(selectedMareId).gender !== 'mare') selectedMareId = mares[0] ? String(mares[0].id) : null;
  }

  function openBreedScreen() {
    var G = game();
    if (!availableParents('stallion').length) return G.showToast('Нет доступных жеребцов');
    if (!availableParents('mare').length) return G.showToast('Нет доступных кобыл');
    ensureSelection();
    renderBreedScreen();
    G.showScreen('breed');
  }

  function renderBreedScreen() {
    var G = game();
    var scroll = G.byId('breedScroll');
    if (!scroll) return;

    ensureSelection();

    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    scroll.innerHTML =
      '<section class="breed-intro-card">' +
        '<div class="summary-title">Выберите пару</div>' +
        '<div class="summary-desc">Жеребёнок наследует породу, масть, характер, показатели и скрытые качества родителей.</div>' +
      '</section>' +
      '<section class="breed-pair-row">' +
        '<div class="breed-choice-card breed-stallion-card" data-picker="stallion">' + renderSelectedHorse('♂', stallion) + '</div>' +
        '<div class="breed-choice-card breed-mare-card" data-picker="mare">' + renderSelectedHorse('♀', mare) + '</div>' +
      '</section>' +
      renderPicker('stallion') +
      renderPicker('mare') +
      renderForecast(stallion, mare);

    updateBreedButton();
  }

  function renderSelectedHorse(symbol, horse) {
    if (!horse) {
      return '<div class="breed-selected-empty"><div class="breed-selected-title">' + symbol + '</div><div class="summary-desc">Нажмите, чтобы выбрать</div></div>';
    }

    return '<div class="breed-selected-head">' +
      renderAvatar(horse, 'breed-avatar') +
      '<div class="breed-selected-main">' +
        '<div class="breed-selected-topline">' +
          '<span class="breed-sex-symbol">' + symbol + '</span>' +
          starRating(horse) +
        '</div>' +
        '<div class="breed-selected-name">' + horse.name + '</div>' +
        '<div class="breed-selected-tags">' +
          '<span>' + horse.breed + '</span>' +
          '<span>' + horse.coat + '</span>' +
          '<span>Потомство ' + horse.offspringCount + '/' + horse.offspringLimit + '</span>' +
          '<span>Карьера ' + horse.racesRun + '/' + horse.careerLimit + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="breed-key-stats">' +
      statShort('СКР', horse.speed) +
      statShort('ВЫН', horse.stamina) +
      statShort('УСК', horse.acceleration) +
    '</div>' +
    qualityGrid(horse);
  }

  function renderPicker(gender) {
    if (activePicker !== gender) return '';

    var list = availableParents(gender);
    var selectedId = gender === 'stallion' ? selectedStallionId : selectedMareId;
    var title = gender === 'stallion' ? 'Доступные жеребцы' : 'Доступные кобылы';

    return '<section class="breed-picker-panel ' + (gender === 'stallion' ? 'breed-picker-blue' : 'breed-picker-pink') + '">' +
      '<div class="breed-picker-title">' + title + '</div>' +
      '<div class="breed-picker-grid">' + list.map(function (horse) {
        var selected = String(horse.id) === String(selectedId);
        return '<button class="breed-candidate ' + (selected ? 'selected' : '') + '" data-select-' + gender + '="' + horse.id + '">' +
          renderAvatar(horse, 'breed-candidate-avatar') +
          '<div class="breed-candidate-main">' +
            '<div class="breed-candidate-name">' + horse.name + '</div>' +
            starRating(horse) +
            '<div class="breed-candidate-meta">' + genderLabel(horse) + ' • ' + horse.breed + ' • ' + horse.coat + '</div>' +
            '<div class="breed-candidate-stats">Потомство ' + horse.offspringCount + '/' + horse.offspringLimit + ' • Карьера ' + horse.racesRun + '/' + horse.careerLimit + '</div>' +
          '</div>' +
          '<div class="breed-candidate-check">' + (selected ? '✓' : '+') + '</div>' +
        '</button>';
      }).join('') + '</div>' +
    '</section>';
  }

  function traitForecast(label, value) {
    return '<div class="breed-trait-chip"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function traitPair(valueA, valueB) {
    if (valueA === valueB) return valueA;
    return valueA + ' / ' + valueB;
  }

  function renderForecast(stallion, mare) {
    if (!stallion || !mare) {
      return '<section class="breed-forecast-panel"><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Выберите жеребца и кобылу.</div></section>';
    }

    function avg(key) { return Math.round((stallion[key] + mare[key]) / 2); }
    var forecast = {
      speed: avg('speed'),
      stamina: avg('stamina'),
      acceleration: avg('acceleration')
    };
    var expected = Math.round((forecast.speed + forecast.stamina + forecast.acceleration) / 3);
    var percent = Math.max(0, Math.min(100, Math.round(expected / 10) * 10));

    return '<section class="breed-forecast-panel breed-foal-simulation">' +
      '<div class="breed-forecast-head">' +
        '<div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Прогноз не раскрывает точные числа: финальный результат получит небольшую мутацию.</div></div>' +
        '<div class="star-rating breed-stars"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>' +
      '</div>' +
      '<div class="breed-forecast-section-title">Вероятные признаки</div>' +
      '<div class="breed-trait-grid">' +
        traitForecast('Пол', 'случайный') +
        traitForecast('Порода', traitPair(stallion.breed, mare.breed)) +
        traitForecast('Масть', traitPair(stallion.coat, mare.coat)) +
        traitForecast('Характер', traitPair(stallion.temperament, mare.temperament)) +
      '</div>' +
      '<div class="breed-forecast-section-title">Прогноз показателей</div>' +
      '<div class="breed-forecast-grid">' +
        statRange('Скорость', forecast.speed) +
        statRange('Выносливость', forecast.stamina) +
        statRange('Ускорение', forecast.acceleration) +
        statRange('Потенциал', Math.round((stallion.potential + mare.potential) / 2)) +
      '</div>' +
      '<div class="breed-forecast-section-title">Наследование качеств</div>' +
      '<div class="quality-grid breed-forecast-quality-grid">' +
        forecastQualityBadge(stallion, mare, 'strength') +
        forecastQualityBadge(stallion, mare, 'agility') +
        forecastQualityBadge(stallion, mare, 'instinct') +
      '</div>' +
      '<div class="breed-forecast-note">После разведения: ' + stallion.name + ' ' + (stallion.offspringCount + 1) + '/' + stallion.offspringLimit + ' • ' + mare.name + ' ' + (mare.offspringCount + 1) + '/' + mare.offspringLimit + '</div>' +
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
        '<div><span>Потенциал</span><b>' + child.potential + '</b></div>' +
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
    if (!button) return;
    var ready = !!findHorse(selectedStallionId) && !!findHorse(selectedMareId);
    button.disabled = !ready;
    button.className = ready ? 'btn btn-teal' : 'btn btn-dark';
    button.textContent = ready ? 'Скрестить' : 'Выберите пару';
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

  function inheritParentTrait(stallion, mare, key) {
    return Math.random() < 0.5 ? stallion[key] : mare[key];
  }

  function breedSelected() {
    var G = game();
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    if (!stallion) return G.showToast('Выберите жеребца');
    if (!mare) return G.showToast('Выберите кобылу');
    if (stallion.gender !== 'stallion') return G.showToast('В блоке жеребца должен быть жеребец');
    if (mare.gender !== 'mare') return G.showToast('В блоке кобылы должна быть кобыла');
    if (stallion.offspringCount >= stallion.offspringLimit || mare.offspringCount >= mare.offspringLimit) return G.showToast('У одного из родителей исчерпан лимит потомства');

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
      potential: G.clamp(Math.round((stallion.potential + mare.potential) / 2) + G.randInt(-3, 5), 65, 100),
      temperament: inheritParentTrait(stallion, mare, 'temperament')
    });

    stallion.offspringCount += 1;
    mare.offspringCount += 1;
    if (stallion.offspringCount >= stallion.offspringLimit && stallion.status === 'retired') stallion.status = 'archived';
    if (mare.offspringCount >= mare.offspringLimit && mare.status === 'retired') mare.status = 'archived';

    G.state.horses.push(child);
    latestFoalId = String(child.id);
    selectedStallionId = String(stallion.id);
    selectedMareId = String(mare.id);
    activePicker = null;

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
        var open = event.target.closest('[data-picker]');
        var selectStallion = event.target.closest('[data-select-stallion]');
        var selectMare = event.target.closest('[data-select-mare]');

        if (selectStallion) {
          selectedStallionId = selectStallion.dataset.selectStallion;
          activePicker = null;
          renderBreedScreen();
          return;
        }

        if (selectMare) {
          selectedMareId = selectMare.dataset.selectMare;
          activePicker = null;
          renderBreedScreen();
          return;
        }

        if (open) {
          var next = open.dataset.picker;
          activePicker = activePicker === next ? null : next;
          renderBreedScreen();
        }
      });
    }

    if (back) back.onclick = function () { G.showScreen('stable'); };
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
