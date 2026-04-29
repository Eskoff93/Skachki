// Breeding screen and breeding actions.

window.SKACHKI_BREEDING = (function () {
  var selectedStallionId = null;
  var selectedMareId = null;
  var activePicker = null;

  function game() { return window.SKACHKI_GAME; }

  function genderLabel(horse) {
    var tools = window.SKACHKI_HORSE || {};
    if (tools.genderLabel) return tools.genderLabel(horse.gender);
    return horse.gender === 'mare' ? 'Кобыла' : 'Жеребец';
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
    var G = game();
    if (!horse) return '';
    var cls = G.horseClass(horse);
    var rounded = Math.round(cls / 10) * 10;
    var percent = Math.max(0, Math.min(100, rounded));
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
        '<div class="summary-title">Выберите жеребца и кобылу</div>' +
        '<div class="summary-desc">Потомок наследует параметры, характер и потенциал родителей с небольшой мутацией.</div>' +
      '</section>' +
      '<section class="breed-choice-card breed-stallion-card" data-picker="stallion">' + renderSelectedHorse('Жеребец', '♂', stallion, 'stallion') + '</section>' +
      renderPicker('stallion') +
      '<section class="breed-choice-card breed-mare-card" data-picker="mare">' + renderSelectedHorse('Кобыла', '♀', mare, 'mare') + '</section>' +
      renderPicker('mare') +
      renderComparison(stallion, mare) +
      renderForecast(stallion, mare);

    updateBreedButton();
  }

  function renderSelectedHorse(title, symbol, horse, gender) {
    if (!horse) {
      return '<div class="breed-selected-empty"><div class="breed-selected-title">' + symbol + ' ' + title + '</div><div class="summary-desc">Нажмите, чтобы выбрать</div></div>';
    }

    return '<div class="breed-selected-head">' +
      '<div class="horse-avatar breed-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
      '<div class="breed-selected-main">' +
        '<div class="breed-selected-role">' + symbol + ' ' + title + '</div>' +
        '<div class="breed-selected-name">' + horse.name + '</div>' +
        starRating(horse) +
        '<div class="breed-selected-tags">' +
          '<span>Форма: ' + game().formLabel(horse.form) + '</span>' +
          '<span>Потомство: ' + horse.offspringCount + '/' + horse.offspringLimit + '</span>' +
          '<span>Карьера: ' + horse.racesRun + '/' + horse.careerLimit + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="breed-change-btn" data-open-picker="' + gender + '">Выбрать</button>' +
    '</div>' +
    '<div class="breed-key-stats">' +
      statShort('СКР', horse.speed) +
      statShort('ВЫН', horse.stamina) +
      statShort('УСК', horse.acceleration) +
    '</div>';
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
          '<div class="horse-avatar breed-candidate-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div class="breed-candidate-main">' +
            '<div class="breed-candidate-name">' + horse.name + '</div>' +
            starRating(horse) +
            '<div class="breed-candidate-meta">' + genderLabel(horse) + ' • ' + game().formLabel(horse.form) + ' • Потомство ' + horse.offspringCount + '/' + horse.offspringLimit + '</div>' +
            '<div class="breed-candidate-stats">' + horse.speed + ' СКР • ' + horse.stamina + ' ВЫН • ' + horse.acceleration + ' УСК</div>' +
          '</div>' +
          '<div class="breed-candidate-check">' + (selected ? '✓' : '+') + '</div>' +
        '</button>';
      }).join('') + '</div>' +
    '</section>';
  }

  function renderComparison(stallion, mare) {
    if (!stallion || !mare) return '';

    var rows = [
      ['Скорость', stallion.speed, mare.speed],
      ['Выносливость', stallion.stamina, mare.stamina],
      ['Ускорение', stallion.acceleration, mare.acceleration],
      ['Манёвренность', stallion.agility, mare.agility],
      ['Сила', stallion.power, mare.power],
      ['Интеллект', stallion.intelligence, mare.intelligence],
      ['Потенциал', stallion.potential, mare.potential]
    ];

    return '<section class="breed-compare-panel">' +
      '<div class="summary-title">Сравнение пары</div>' +
      '<div class="summary-desc">Сильные стороны родителей влияют на прогноз потомка.</div>' +
      '<div class="breed-compare-table">' + rows.map(function (row) {
        var max = Math.max(row[1], row[2], 100);
        return '<div class="breed-compare-row">' +
          '<div class="breed-compare-value">' + row[1] + '</div>' +
          '<div class="breed-compare-mid"><span>' + row[0] + '</span><div><i style="width:' + (row[1] / max * 100) + '%"></i><b style="width:' + (row[2] / max * 100) + '%"></b></div></div>' +
          '<div class="breed-compare-value">' + row[2] + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="breed-temper-note">Характер: ' + stallion.temperament + ' или ' + mare.temperament + '</div>' +
    '</section>';
  }

  function renderForecast(stallion, mare) {
    if (!stallion || !mare) {
      return '<section class="breed-forecast-panel"><div class="summary-title">Прогноз потомка</div><div class="summary-desc">Выберите жеребца и кобылу.</div></section>';
    }

    function avg(key) { return Math.round((stallion[key] + mare[key]) / 2); }
    var forecast = {
      speed: avg('speed'),
      stamina: avg('stamina'),
      acceleration: avg('acceleration'),
      agility: avg('agility'),
      power: avg('power'),
      intelligence: avg('intelligence')
    };
    var expected = Math.round((forecast.speed + forecast.stamina + forecast.acceleration + forecast.agility + forecast.power + forecast.intelligence) / 6);
    var percent = Math.max(0, Math.min(100, Math.round(expected / 10) * 10));

    return '<section class="breed-forecast-panel">' +
      '<div class="breed-forecast-head">' +
        '<div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Пол определится случайно. Характер наследуется от одного из родителей.</div></div>' +
        '<div class="star-rating breed-stars"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>' +
      '</div>' +
      '<div class="breed-forecast-grid">' +
        statRange('Скорость', forecast.speed) +
        statRange('Выносливость', forecast.stamina) +
        statRange('Ускорение', forecast.acceleration) +
        statRange('Манёвр', forecast.agility) +
        statRange('Сила', forecast.power) +
        statRange('Интеллект', forecast.intelligence) +
      '</div>' +
      '<div class="breed-forecast-note">После разведения: ' + stallion.name + ' ' + (stallion.offspringCount + 1) + '/' + stallion.offspringLimit + ' • ' + mare.name + ' ' + (mare.offspringCount + 1) + '/' + mare.offspringLimit + '</div>' +
    '</section>';
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

  function breedSelected() {
    var G = game();
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    if (!stallion) return G.showToast('Выберите жеребца');
    if (!mare) return G.showToast('Выберите кобылу');
    if (stallion.gender !== 'stallion') return G.showToast('В блоке жеребца должен быть жеребец');
    if (mare.gender !== 'mare') return G.showToast('В блоке кобылы должна быть кобыла');
    if (stallion.offspringCount >= stallion.offspringLimit || mare.offspringCount >= mare.offspringLimit) return G.showToast('У одного из родителей исчерпан лимит потомства');

    function avg(key) {
      return G.clamp(Math.round((stallion[key] + mare[key]) / 2) + G.randInt(-5, 6), 10, 100);
    }

    var child = G.normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: 'Жеребёнок ' + (G.state.horses.length + 1),
      speed: avg('speed'),
      stamina: avg('stamina'),
      acceleration: avg('acceleration'),
      agility: avg('agility'),
      power: avg('power'),
      intelligence: avg('intelligence'),
      potential: G.clamp(Math.round((stallion.potential + mare.potential) / 2) + G.randInt(-3, 5), 65, 100),
      temperament: Math.random() < 0.5 ? stallion.temperament : mare.temperament
    });

    stallion.offspringCount += 1;
    mare.offspringCount += 1;
    if (stallion.offspringCount >= stallion.offspringLimit && stallion.status === 'retired') stallion.status = 'archived';
    if (mare.offspringCount >= mare.offspringLimit && mare.status === 'retired') mare.status = 'archived';

    G.state.horses.push(child);
    selectedStallionId = String(stallion.id);
    selectedMareId = String(mare.id);
    activePicker = null;

    G.saveGame();
    G.showToast('Новый потомок: ' + child.name);
    renderBreedScreen();
  }

  function bind() {
    var G = game();
    var scroll = G.byId('breedScroll');
    var back = G.byId('breedBackBtn');
    var cancel = G.byId('breedCancelBtn');
    var confirm = G.byId('confirmBreedScreenBtn');

    if (scroll) {
      scroll.addEventListener('click', function (event) {
        var open = event.target.closest('[data-open-picker], [data-picker]');
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
          var next = open.dataset.openPicker || open.dataset.picker;
          activePicker = activePicker === next ? null : next;
          renderBreedScreen();
        }
      });
    }

    if (back) back.onclick = function () { G.showScreen('menu'); };
    if (cancel) cancel.onclick = function () { G.showScreen('menu'); };
    if (confirm) confirm.onclick = breedSelected;
  }

  return {
    openBreedScreen: openBreedScreen,
    renderBreedScreen: renderBreedScreen,
    breedSelected: breedSelected,
    bind: bind
  };
})();
