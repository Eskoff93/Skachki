// Foal result screen renderer.
// Owns the birth result card, reveal animation and inline name editor.

window.SKACHKI_FOAL_RESULT_RENDER = (function () {
  var activeNameInput = null;
  var tapGuardUntil = 0;
  var tapGuardBound = false;

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function stateHorses() {
    var G = game();
    return G && G.state && Array.isArray(G.state.horses) ? G.state.horses : [];
  }

  function latestFoal() {
    var horses = stateHorses();
    return horses.length ? horses[horses.length - 1] : null;
  }

  function saveGame() {
    var G = game();
    if (G && typeof G.saveGame === 'function') G.saveGame();
  }

  function resultFooter() {
    var screen = document.getElementById('breedResultScreen');
    return screen ? screen.querySelector('.footer-actions') : null;
  }

  function resultScrollRoot() {
    return document.querySelector('#breedResultScreen .breed-result-scroll') || document.scrollingElement || document.documentElement;
  }

  function setNameEditingMode(isEditing) {
    var footer = resultFooter();
    document.body.classList.toggle('foal-name-editing', !!isEditing);

    if (!footer) return;
    footer.style.transition = 'opacity .18s ease, transform .18s ease';
    footer.style.opacity = isEditing ? '0' : '';
    footer.style.pointerEvents = isEditing ? 'none' : '';
    footer.style.transform = isEditing ? 'translateY(26px)' : '';
  }

  function scrollEditorIntoView(editor) {
    var root = resultScrollRoot();
    if (!editor || typeof editor.scrollIntoView !== 'function') return;

    function scrollAndLift() {
      editor.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      window.setTimeout(function () {
        if (root && typeof root.scrollBy === 'function') root.scrollBy({ top: 28, behavior: 'smooth' });
      }, 80);
    }

    window.setTimeout(scrollAndLift, 90);
    window.setTimeout(scrollAndLift, 330);
  }

  function restoreResultScroll() {
    var root = resultScrollRoot();
    window.setTimeout(function () {
      if (root && typeof root.scrollTo === 'function') root.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }

  function isNameEditing() {
    return document.body.classList.contains('foal-name-editing') || Date.now() < tapGuardUntil;
  }

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  function handleNameEditOutsideTap(event) {
    var editor;
    if (!isNameEditing()) return;

    editor = document.querySelector('#breedResultCard .foal-name-inline-editor');
    if (editor && editor.contains(event.target)) return;

    stopEvent(event);
    if (activeNameInput && document.activeElement === activeNameInput) activeNameInput.blur();
  }

  function bindNameEditTapGuard() {
    if (tapGuardBound) return;
    tapGuardBound = true;
    document.addEventListener('pointerdown', handleNameEditOutsideTap, true);
    document.addEventListener('click', handleNameEditOutsideTap, true);
    document.addEventListener('touchstart', handleNameEditOutsideTap, { capture: true, passive: false });
  }

  function prepareRoot(card) {
    card.classList.remove('foal-card-enhanced');
    card.classList.add('foal-shared-result-root');
    card.style.padding = '0';
    card.style.background = 'transparent';
    card.style.border = '0';
    card.style.boxShadow = 'none';
    card.style.overflow = 'visible';
    card.style.textAlign = 'left';
  }

  function applyCompactSharedCardLayout(card) {
    var shell = card.querySelector('.foal-shared-card-shell');
    var article = card.querySelector('.foal-result-shared-card');
    var meta = card.querySelector('.luxury-meta-row');
    var name = card.querySelector('.luxury-name');
    var nameWrap = card.querySelector('.horse-name-wrap');
    var stars = card.querySelector('.star-rating');
    var stats = card.querySelector('.football-stats');
    var qualities = card.querySelector('.quality-grid');
    var editor = card.querySelector('.foal-name-inline-editor');
    var oldPencil = card.querySelector('.foal-name-edit-btn');

    if (oldPencil) oldPencil.remove();
    if (shell) {
      shell.style.width = '100%';
      shell.style.maxWidth = '100%';
      shell.style.overflow = 'visible';
    }
    if (article) {
      article.style.margin = '0';
      article.style.width = '100%';
      article.style.maxWidth = '100%';
      article.style.boxSizing = 'border-box';
      article.style.overflow = 'hidden';
    }
    if (nameWrap) {
      nameWrap.style.position = 'relative';
      nameWrap.style.minWidth = '0';
      nameWrap.style.paddingRight = '0';
    }
    if (name) {
      name.classList.remove('editable-foal-name');
      name.style.cursor = 'default';
      name.style.display = 'block';
      name.style.maxWidth = '100%';
      name.style.padding = '0';
      name.style.wordBreak = 'break-word';
    }
    if (stars) {
      stars.style.flex = '0 0 auto';
      stars.style.maxWidth = '96px';
      stars.style.overflow = 'hidden';
    }
    if (meta) {
      meta.style.display = 'grid';
      meta.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      meta.style.gap = '7px';
      meta.style.maxWidth = '100%';
      meta.style.overflow = 'hidden';
      Array.prototype.forEach.call(meta.children, function (item) {
        item.style.minWidth = '0';
        item.style.overflow = 'hidden';
        item.style.textOverflow = 'ellipsis';
        item.style.whiteSpace = 'nowrap';
      });
    }
    if (stats) stats.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    if (qualities) qualities.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    if (editor) {
      editor.style.margin = '12px auto 4px';
      editor.style.padding = '8px 10px';
      editor.style.transform = 'none';
      editor.style.scrollMarginBottom = '320px';
    }
  }

  function renderSharedFoalCard() {
    var card = document.getElementById('breedResultCard');
    var UI = horseUi();
    var foal = latestFoal();

    if (!card || !foal || !UI.renderHorseCard) return;
    prepareRoot(card);

    if (card.dataset.foalId === String(foal.id) && card.querySelector('.foal-shared-card-shell')) {
      applyCompactSharedCardLayout(card);
      setupFoalNameEditor();
      return;
    }

    card.dataset.foalId = String(foal.id);
    card.innerHTML = '<div class="foal-shared-card-shell" data-foal-id="' + foal.id + '">' +
      UI.renderHorseCard(foal, { extraClass: 'foal-result-shared-card', dataHorse: false, actions: false }) +
      '<div class="foal-name-inline-editor foal-name-quick-editor">' +
        '<input class="foal-name-inline-input" type="text" maxlength="18" placeholder="Новое имя" autocomplete="off" />' +
      '</div>' +
      '</div>';

    applyCompactSharedCardLayout(card);
    setupFoalNameEditor();
    revealFoalCard(card, foal);
  }

  function showFoalResult() {
    renderSharedFoalCard();
    setTimeout(renderSharedFoalCard, 0);
    setTimeout(renderSharedFoalCard, 80);
  }

  function setupFoalNameEditor() {
    var card = document.getElementById('breedResultCard');
    var sourceInput = document.getElementById('foalNameInput');
    var foal = latestFoal();
    var name = card ? card.querySelector('.luxury-name') : null;
    var editor = card ? card.querySelector('.foal-name-inline-editor') : null;
    var input = editor ? editor.querySelector('.foal-name-inline-input') : null;
    var oldPencil = card ? card.querySelector('.foal-name-edit-btn') : null;

    if (oldPencil) oldPencil.remove();
    if (!card || !sourceInput || !foal || !name || !editor || !input) return;

    sourceInput.value = foal.name || 'Жеребёнок';
    input.placeholder = 'Новое имя';

    name.classList.remove('editable-foal-name');
    name.style.cursor = 'default';
    name.removeAttribute('role');
    name.removeAttribute('tabindex');
    name.removeAttribute('aria-label');

    function applyName(value) {
      var cleanName = String(value || '').trim().slice(0, 18);
      if (!cleanName) return false;
      foal.name = cleanName;
      sourceInput.value = cleanName;
      name.textContent = cleanName;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
      saveGame();
      return true;
    }

    function commitInput() {
      if (applyName(input.value)) input.value = '';
    }

    if (card.dataset.nameEditorBound === String(foal.id)) return;
    card.dataset.nameEditorBound = String(foal.id);

    input.addEventListener('focus', function () {
      activeNameInput = input;
      setNameEditingMode(true);
      scrollEditorIntoView(editor);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitInput();
        input.blur();
      }
    });

    input.addEventListener('blur', function () {
      commitInput();
      tapGuardUntil = Date.now() + 850;
      window.setTimeout(function () {
        activeNameInput = null;
        setNameEditingMode(false);
        restoreResultScroll();
      }, 650);
    });
  }

  function animateElement(element, delay, keyframes) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.transform = 'translateY(12px) scale(.98)';
    if (typeof element.animate !== 'function') {
      element.style.opacity = '1';
      element.style.transform = 'none';
      return;
    }
    window.setTimeout(function () {
      element.animate(keyframes || [
        { opacity: 0, transform: 'translateY(14px) scale(.98)', filter: 'blur(4px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
      element.style.opacity = '1';
      element.style.transform = 'none';
    }, delay || 0);
  }

  function revealFoalCard(card, foal) {
    var shell = card.querySelector('.foal-shared-card-shell');
    if (!shell || shell.dataset.revealedFor === String(foal.id)) return;
    shell.dataset.revealedFor = String(foal.id);
    animateElement(card.querySelector('.horse-medallion'), 0, [
      { opacity: 0, transform: 'scale(.78)', filter: 'blur(5px)' },
      { opacity: 1, transform: 'scale(1.06)', filter: 'blur(0)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }
    ]);
    animateElement(card.querySelector('.luxury-name-row'), 160);
    animateElement(card.querySelector('.luxury-record'), 260);
    animateElement(card.querySelector('.luxury-meta-row'), 380);
    animateElement(card.querySelector('.football-stats'), 520);
    animateElement(card.querySelector('.quality-grid'), 680);
  }

  function init() {
    var card = document.getElementById('breedResultCard');
    bindNameEditTapGuard();
    if (!card) return;
    showFoalResult();
    new MutationObserver(showFoalResult).observe(card, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    renderSharedFoalCard: renderSharedFoalCard,
    setupFoalNameEditor: setupFoalNameEditor,
    showFoalResult: showFoalResult
  };
})();
