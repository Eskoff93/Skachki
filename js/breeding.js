// Breeding coordinator.
// State, events and calls to service / logic / render modules.

window.SKACHKI_BREEDING = (function () {
  var selectedStallionId = null;
  var selectedMareId = null;
  var breedStep = 'pair';
  var latestFoalId = null;

  function game() { return window.SKACHKI_GAME; }
  function service() { return window.SKACHKI_BREEDING_SERVICE || {}; }
  function logic() { return window.SKACHKI_BREEDING_LOGIC || {}; }
  function render() { return window.SKACHKI_BREEDING_RENDER || {}; }

  function stateHorses() {
    var G = game();
    return G && G.state && Array.isArray(G.state.horses) ? G.state.horses : [];
  }

  function isExternalStud(parentOrId) {
    var S = service();
    return S.isExternalStud ? S.isExternalStud(parentOrId) : false;
  }

  function isExternalMare(parentOrId) {
    var S = service();
    return S.isExternalMare ? S.isExternalMare(parentOrId) : false;
  }

  function isExternalParent(parentOrId) {
    var S = service();
    return S.isExternalParent ? S.isExternalParent(parentOrId) : false;
  }

  function parentFee(parent) {
    var S = service();
    return S.parentFee ? S.parentFee(parent) : 0;
  }

  function totalFee(stallion, mare) {
    var S = service();
    return S.totalFee ? S.totalFee(stallion, mare) : parentFee(stallion) + parentFee(mare);
  }

  function serviceLabel(parent) {
    var S = service();
    return S.serviceLabel ? S.serviceLabel(parent) : '';
  }

  function serviceNote(parent) {
    var S = service();
    return S.serviceNote ? S.serviceNote(parent) : '';
  }

  function ownAvailableParents(gender) {
    var S = service();
    return S.ownAvailableParents ? S.ownAvailableParents(stateHorses(), gender) : [];
  }

  function availableParents(gender) {
    var S = service();
    return S.availableParents ? S.availableParents(stateHorses(), gender) : ownAvailableParents(gender);
  }

  function findHorse(id) {
    var S = service();
    return S.findHorse ? S.findHorse(stateHorses(), id) : null;
  }

  function canUseAsParent(horse, gender) {
    var S = service();
    return S.canUseAsParent ? S.canUseAsParent(stateHorses(), horse, gender) : false;
  }

  function renderContext() {
    return {
      isExternalStud: isExternalStud,
      isExternalMare: isExternalMare,
      isExternalParent: isExternalParent,
      parentFee: parentFee,
      totalFee: totalFee,
      serviceLabel: serviceLabel,
      serviceNote: serviceNote
    };
  }

  function ensureSelection() {
    var stallions = availableParents('stallion');
    var mares = availableParents('mare');
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);

    if (!canUseAsParent(stallion, 'stallion')) {
      selectedStallionId = stallions[0] ? String(stallions[0].id) : null;
    }

    if (!canUseAsParent(mare, 'mare')) {
      selectedMareId = mares[0] ? String(mares[0].id) : null;
    }
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
    var R = render();
    var scroll = G.byId('breedScroll');
    var stallion;
    var mare;
    var html = '';

    if (!scroll) return;

    ensureSelection();

    if (breedStep === 'stallion' || breedStep === 'mare') {
      html = R.renderParentPicker ? R.renderParentPicker(
        renderContext(),
        breedStep,
        availableParents(breedStep),
        breedStep === 'stallion' ? selectedStallionId : selectedMareId,
        ownAvailableParents(breedStep).length > 0
      ) : '';
    } else {
      stallion = findHorse(selectedStallionId);
      mare = findHorse(selectedMareId);
      html = R.renderPairStep ? R.renderPairStep(renderContext(), stallion, mare) : '';
    }

    scroll.innerHTML = html;
    updateBreedButton();
  }

  function showStandaloneScreen(screenId) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (screen) {
      screen.classList.remove('active');
    });

    var target = document.getElementById(screenId);
    if (target) target.classList.add('active');
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

  function createFoal(stallion, mare) {
    var G = game();
    var L = logic();

    if (!L.createFoal) return null;
    return L.createFoal(G, stallion, mare, 'Жеребёнок ' + (G.state.horses.length + 1));
  }

  function incrementParentUsage(parent) {
    if (!parent || isExternalParent(parent)) return;

    parent.offspringCount += 1;
    if (parent.offspringCount >= parent.offspringLimit && parent.status === 'retired') {
      parent.status = 'archived';
    }
  }

  function breedSelected() {
    var G = game();
    var R = render();
    var stallion = findHorse(selectedStallionId);
    var mare = findHorse(selectedMareId);
    var fee = totalFee(stallion, mare);
    var child;

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

    child = createFoal(stallion, mare);
    if (!child) return G.showToast('Не удалось создать жеребёнка');

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
    if (R.showFoalResult) R.showFoalResult(child, stallion, mare);
  }

  function bind() {
    var G = game();
    var scroll = G.byId('breedScroll');
    var back = G.byId('breedBackBtn');
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

    if (back) {
      back.onclick = function () {
        if (breedStep === 'stallion' || breedStep === 'mare') {
          breedStep = 'pair';
          renderBreedScreen();
          return;
        }
        G.showScreen('stable');
      };
    }

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
