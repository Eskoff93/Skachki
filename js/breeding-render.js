// Breeding result presentation.
// Uses the shared horse card from SKACHKI_HORSE_UI and adds only birth reveal UX.

window.SKACHKI_BREEDING_RENDER = (function () {
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
    var stars = card.querySelector('.star-rating');
    var stats = card.querySelector('.football-stats');
    var qualities = card.querySelector('.quality-grid');

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

    if (name) {
      name.style.cursor = 'pointer';
      name.style.maxWidth = '100%';
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

    if (stats) {
      stats.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    }

    if (qualities) {
      qualities.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
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
      '<div class="foal-name-inline-editor" hidden>' +
        '<label class="foal-name-inline-label">Имя жеребёнка</label>' +
        '<input class="foal-name-inline-input" type="text" maxlength="18" placeholder="Введите имя" autocomplete="off" />' +
      '</div>' +
      '</div>';

    applyCompactSharedCardLayout(card);
    setupFoalNameEditor();
    revealFoalCard(card, foal);
  }

  function setupFoalNameEditor() {
    var card = document.getElementById('breedResultCard');
    var sourceInput = document.getElementById('foalNameInput');
    var foal = latestFoal();
    var name = card ? card.querySelector('.luxury-name') : null;
    var editor = card ? card.querySelector('.foal-name-inline-editor') : null;
    var input = editor ? editor.querySelector('.foal-name-inline-input') : null;

    if (!card || !sourceInput || !foal || !name || !editor || !input) return;

    sourceInput.value = foal.name || sourceInput.value || 'Жеребёнок';
    input.value = sourceInput.value;

    name.classList.add('editable-foal-name');
    name.setAttribute('role', 'button');
    name.setAttribute('tabindex', '0');
    name.setAttribute('aria-label', 'Переименовать жеребёнка');

    if (card.dataset.nameEditorBound === String(foal.id)) return;
    card.dataset.nameEditorBound = String(foal.id);

    function openEditor() {
      editor.hidden = false;
      input.value = foal.name || sourceInput.value || name.textContent.trim();
      setTimeout(function () {
        input.focus();
        input.select();
        editor.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 0);
    }

    function applyName(value) {
      var cleanName = String(value || '').trim().slice(0, 18) || 'Жеребёнок';
      foal.name = cleanName;
      sourceInput.value = cleanName;
      name.textContent = cleanName;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
      saveGame();
    }

    name.addEventListener('click', openEditor);
    name.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEditor();
      }
    });

    input.addEventListener('input', function () {
      applyName(input.value);
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
      ], {
        duration: 520,
        easing: 'cubic-bezier(.2,.9,.2,1)',
        fill: 'forwards'
      });
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

  function runRenderSoon() {
    renderSharedFoalCard();
    setTimeout(renderSharedFoalCard, 0);
    setTimeout(renderSharedFoalCard, 80);
  }

  function init() {
    var card = document.getElementById('breedResultCard');
    if (!card) return;

    runRenderSoon();

    new MutationObserver(function () {
      runRenderSoon();
    }).observe(card, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    renderSharedFoalCard: renderSharedFoalCard,
    setupFoalNameEditor: setupFoalNameEditor
  };
})();
