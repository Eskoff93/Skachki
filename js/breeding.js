// Breeding screen and breeding actions.

window.SKACHKI_BREEDING = (function () {
  function game() { return window.SKACHKI_GAME; }

  function openBreedScreen() {
    var G = game();
    if (G.state.horses.length < 2) return G.showToast('Нужно минимум 2 лошади');
    renderBreedScreen();
    G.showScreen('breed');
  }

  function renderBreedScreen() {
    var G = game();
    var parentOne = G.byId('breedParentOne');
    var parentTwo = G.byId('breedParentTwo');
    if (!parentOne || !parentTwo) return;

    var options = G.state.horses.map(function (horse) {
      return '<option value="' + horse.id + '">' + horse.name + ' — Класс ' + G.horseClass(horse) + '</option>';
    }).join('');

    var currentOne = parentOne.value;
    var currentTwo = parentTwo.value;

    parentOne.innerHTML = options;
    parentTwo.innerHTML = options;

    if (currentOne) parentOne.value = currentOne;
    if (currentTwo) parentTwo.value = currentTwo;
    if (!parentTwo.value && G.state.horses[1]) parentTwo.value = String(G.state.horses[1].id);
    if (parentOne.value === parentTwo.value && G.state.horses[1]) parentTwo.value = String(G.state.horses[1].id);

    updateBreedPreview();
  }

  function updateBreedPreview() {
    var G = game();
    var parentOne = G.byId('breedParentOne');
    var parentTwo = G.byId('breedParentTwo');
    var compareGrid = G.byId('breedCompareGrid');
    var childPreviewText = G.byId('childPreviewText');
    var childPreviewGrid = G.byId('childPreviewGrid');

    var h1 = G.state.horses.find(function (h) { return String(h.id) === String(parentOne.value); });
    var h2 = G.state.horses.find(function (h) { return String(h.id) === String(parentTwo.value); });

    if (compareGrid) compareGrid.innerHTML = parentCompareCard('Родитель 1', h1) + parentCompareCard('Родитель 2', h2);

    if (!h1 || !h2 || String(h1.id) === String(h2.id)) {
      if (childPreviewText) childPreviewText.textContent = 'Выберите двух разных родителей.';
      if (childPreviewGrid) childPreviewGrid.innerHTML = '';
      return;
    }

    function avg(a, b) { return Math.round((a + b) / 2); }
    var preview = [
      ['Скорость', avg(h1.speed, h2.speed), '±5'],
      ['Выносливость', avg(h1.stamina, h2.stamina), '±5'],
      ['Ускорение', avg(h1.acceleration, h2.acceleration), '±5'],
      ['Манёвр', avg(h1.agility, h2.agility), '±5'],
      ['Сила', avg(h1.power, h2.power), '±5'],
      ['Интеллект', avg(h1.intelligence, h2.intelligence), '±5']
    ];

    var predictedClass = Math.round(preview.reduce(function (sum, item) { return sum + item[1]; }, 0) / preview.length);
    if (childPreviewText) childPreviewText.textContent = 'Ожидаемый класс потомка около ' + predictedClass + '. Характер наследуется от одного из родителей.';
    if (childPreviewGrid) {
      childPreviewGrid.innerHTML = preview.map(function (item) {
        return '<div class="preview-stat"><div class="preview-value">' + item[1] + ' ' + item[2] + '</div><div class="preview-label">' + item[0] + '</div></div>';
      }).join('');
    }
  }

  function parentCompareCard(title, horse) {
    var G = game();
    if (!horse) return '<div class="parent-card"><div class="parent-card-title">' + title + '</div><div class="modal-sub">Не выбран</div></div>';
    return '<div class="parent-card">' +
      '<div class="parent-card-title">' + title + ': ' + horse.name + '</div>' +
      '<div class="mini-tag">Класс ' + G.horseClass(horse) + '</div>' +
      '<div class="mini-tag">Форма ' + G.formLabel(horse.form) + '</div>' +
      '<div class="mini-tag">Потомство ' + horse.offspringCount + '/' + horse.offspringLimit + '</div>' +
      '<div class="parent-mini-row"><span>Скорость</span><b>' + horse.speed + '</b></div>' +
      '<div class="parent-mini-row"><span>Выносливость</span><b>' + horse.stamina + '</b></div>' +
      '<div class="parent-mini-row"><span>Ускорение</span><b>' + horse.acceleration + '</b></div>' +
      '<div class="parent-mini-row"><span>Манёвр</span><b>' + horse.agility + '</b></div>' +
      '<div class="parent-mini-row"><span>Интеллект</span><b>' + horse.intelligence + '</b></div>' +
      '<div class="behavior-chip">' + horse.temperament + '</div>' +
    '</div>';
  }

  function breedSelected() {
    var G = game();
    var parentOne = G.byId('breedParentOne');
    var parentTwo = G.byId('breedParentTwo');
    var h1 = G.state.horses.find(function (h) { return String(h.id) === String(parentOne.value); });
    var h2 = G.state.horses.find(function (h) { return String(h.id) === String(parentTwo.value); });

    if (!h1 || !h2 || String(h1.id) === String(h2.id)) return G.showToast('Выберите разных родителей');
    if (h1.offspringCount >= h1.offspringLimit || h2.offspringCount >= h2.offspringLimit) return G.showToast('У одного из родителей исчерпан лимит потомства');

    function avg(key) {
      return G.clamp(Math.round((h1[key] + h2[key]) / 2) + G.randInt(-5, 6), 10, 100);
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
      potential: G.clamp(Math.round((h1.potential + h2.potential) / 2) + G.randInt(-3, 5), 65, 100),
      temperament: Math.random() < 0.5 ? h1.temperament : h2.temperament
    });

    h1.offspringCount += 1;
    h2.offspringCount += 1;
    if (h1.offspringCount >= h1.offspringLimit && h1.status === 'retired') h1.status = 'archived';
    if (h2.offspringCount >= h2.offspringLimit && h2.status === 'retired') h2.status = 'archived';

    G.state.horses.push(child);
    G.saveGame();
    G.showToast('Новый потомок: ' + child.name);
    renderBreedScreen();
  }

  function bind() {
    var G = game();
    var parentOne = G.byId('breedParentOne');
    var parentTwo = G.byId('breedParentTwo');
    var back = G.byId('breedBackBtn');
    var cancel = G.byId('breedCancelBtn');
    var confirm = G.byId('confirmBreedScreenBtn');

    if (parentOne) parentOne.onchange = updateBreedPreview;
    if (parentTwo) parentTwo.onchange = updateBreedPreview;
    if (back) back.onclick = function () { G.showScreen('menu'); };
    if (cancel) cancel.onclick = function () { G.showScreen('menu'); };
    if (confirm) confirm.onclick = breedSelected;
  }

  return {
    openBreedScreen: openBreedScreen,
    renderBreedScreen: renderBreedScreen,
    updateBreedPreview: updateBreedPreview,
    breedSelected: breedSelected,
    bind: bind
  };
})();
