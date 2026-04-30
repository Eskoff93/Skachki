// Breeding render enhancements.
// Bridge module for foal result UI until breeding.js is fully split.

window.SKACHKI_BREEDING_RENDER = (function () {
  function setupFoalNameEditor() {
    var card = document.getElementById('breedResultCard');
    var sourceInput = document.getElementById('foalNameInput');
    var name = card ? card.querySelector('.foal-name-display') : null;
    if (!card || !sourceInput || !name || name.classList.contains('editable-foal-name')) return;

    var editor = document.createElement('div');
    var label = document.createElement('label');
    var input = document.createElement('input');

    name.classList.add('editable-foal-name');
    name.setAttribute('role', 'button');
    name.setAttribute('tabindex', '0');
    name.setAttribute('aria-label', 'Переименовать жеребёнка');

    editor.className = 'foal-name-inline-editor';
    editor.hidden = true;

    label.className = 'foal-name-inline-label';
    label.textContent = 'Имя жеребёнка';

    input.className = 'foal-name-inline-input';
    input.type = 'text';
    input.maxLength = 18;
    input.placeholder = 'Введите имя';
    input.autocomplete = 'off';
    input.value = sourceInput.value || name.textContent.trim();

    editor.appendChild(label);
    editor.appendChild(input);
    name.insertAdjacentElement('afterend', editor);

    function openEditor() {
      editor.hidden = false;
      input.value = sourceInput.value || name.textContent.trim();
      setTimeout(function () {
        input.focus();
        input.select();
        editor.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 0);
    }

    name.addEventListener('click', openEditor);
    name.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEditor();
      }
    });

    input.addEventListener('input', function () {
      sourceInput.value = input.value;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function numberValue(node) {
    var value = node ? parseInt(node.textContent, 10) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function enhanceFoalResult() {
    var card = document.getElementById('breedResultCard');
    if (!card) return;

    // The card node is reused between births. Its enhanced class can remain
    // while breeding.js replaces the inner HTML with a fresh raw result.
    // Therefore the real idempotency check is the presence of the medallion,
    // not the class on the reused card.
    if (card.querySelector('.foal-medallion-wrap')) return;

    var top = card.querySelector('.foal-card-top');
    var avatar = card.querySelector('.foal-avatar');
    var gender = card.querySelector('.foal-gender-badge');
    var name = card.querySelector('.foal-name-display');
    var stars = card.querySelector('.star-rating');
    var stats = Array.prototype.slice.call(card.querySelectorAll('.foal-stat-grid .breed-stat-chip b'));
    if (!top || !avatar || !gender || !name || !stars || stats.length < 3) return;

    card.classList.add('foal-card-enhanced');

    var score = Math.round((numberValue(stats[0]) + numberValue(stats[1]) + numberValue(stats[2])) / 3);
    var medallion = document.createElement('div');
    var scoreBadge = document.createElement('div');
    var main = document.createElement('div');
    var subline = document.createElement('div');
    var editor = name.nextElementSibling && name.nextElementSibling.classList.contains('foal-name-inline-editor')
      ? name.nextElementSibling
      : null;

    medallion.className = 'foal-medallion-wrap';
    scoreBadge.className = 'foal-result-score';
    scoreBadge.textContent = score;

    main.className = 'foal-main-wrap';
    subline.className = 'foal-subline';
    subline.textContent = 'Новорождённый потомок';

    medallion.appendChild(scoreBadge);
    medallion.appendChild(avatar);
    medallion.appendChild(gender);

    main.appendChild(name);
    if (editor) main.appendChild(editor);
    main.appendChild(stars);
    main.appendChild(subline);

    top.textContent = '';
    top.appendChild(medallion);
    top.appendChild(main);
  }

  function init() {
    var card = document.getElementById('breedResultCard');
    if (!card) return;

    setupFoalNameEditor();
    enhanceFoalResult();

    new MutationObserver(function () {
      setupFoalNameEditor();
      enhanceFoalResult();
    }).observe(card, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    enhanceFoalResult: enhanceFoalResult,
    setupFoalNameEditor: setupFoalNameEditor
  };
})();
