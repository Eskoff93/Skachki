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

  function applyFoalSafetyLayout(card) {
    if (!card) return;

    var info = card.querySelector('.foal-info-lines');
    var stars = card.querySelector('.star-rating');
    var gender = card.querySelector('.foal-gender-badge');
    var name = card.querySelector('.foal-name-display');
    var main = card.querySelector('.foal-main-wrap');
    var top = card.querySelector('.foal-card-top');

    card.style.maxWidth = '100%';
    card.style.overflow = 'hidden';
    card.style.boxSizing = 'border-box';

    if (top) {
      top.style.minWidth = '0';
      top.style.overflow = 'hidden';
    }

    if (main) {
      main.style.minWidth = '0';
      main.style.overflow = 'hidden';
    }

    if (name) {
      name.style.maxWidth = '100%';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.whiteSpace = 'normal';
      name.style.wordBreak = 'break-word';
    }

    if (gender) {
      gender.style.position = 'absolute';
      gender.style.right = '6px';
      gender.style.top = '6px';
      gender.style.width = '28px';
      gender.style.height = '28px';
      gender.style.display = 'flex';
      gender.style.alignItems = 'center';
      gender.style.justifyContent = 'center';
      gender.style.lineHeight = '1';
      gender.style.padding = '0';
      gender.style.transform = 'none';
    }

    if (stars) {
      stars.style.maxWidth = '96px';
      stars.style.width = '96px';
      stars.style.overflow = 'hidden';
      stars.style.flex = '0 0 auto';
    }

    if (info) {
      info.style.display = 'grid';
      info.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      info.style.gap = '8px';
      info.style.maxWidth = '100%';
      info.style.overflow = 'hidden';

      Array.prototype.forEach.call(info.children, function (item) {
        var label = item.querySelector('span');
        var value = item.querySelector('b');
        var labelText = label ? label.textContent.trim() : '';

        if (labelText === 'Пол' || labelText === 'Потенциал') {
          item.style.display = 'none';
          return;
        }

        item.style.minWidth = '0';
        item.style.overflow = 'hidden';
        item.style.boxSizing = 'border-box';

        if (label) {
          label.style.display = 'inline';
          label.style.whiteSpace = 'nowrap';
        }

        if (value) {
          value.style.display = 'inline-block';
          value.style.maxWidth = '100%';
          value.style.overflow = 'hidden';
          value.style.textOverflow = 'ellipsis';
          value.style.whiteSpace = 'nowrap';
          value.style.verticalAlign = 'bottom';
        }
      });
    }
  }

  function enhanceFoalResult() {
    var card = document.getElementById('breedResultCard');
    if (!card) return;

    // The card node is reused between births. Its enhanced class can remain
    // while breeding.js replaces the inner HTML with a fresh raw result.
    // Therefore the real idempotency check is the presence of the medallion,
    // not the class on the reused card.
    if (card.querySelector('.foal-medallion-wrap')) {
      applyFoalSafetyLayout(card);
      return;
    }

    var top = card.querySelector('.foal-card-top');
    var avatar = card.querySelector('.foal-avatar');
    var gender = card.querySelector('.foal-gender-badge');
    var name = card.querySelector('.foal-name-display');
    var stars = card.querySelector('.star-rating');
    var stats = Array.prototype.slice.call(card.querySelectorAll('.foal-stat-grid .breed-stat-chip b'));
    if (!top || !avatar || !gender || !name || !stars || stats.length < 3) {
      applyFoalSafetyLayout(card);
      return;
    }

    card.classList.add('foal-card-enhanced');

    var score = Math.round((numberValue(stats[0]) + numberValue(stats[1]) + numberValue(stats[2])) / 3);
    var medallion = document.createElement('div');
    var scoreBadge = document.createElement('div');
    var main = document.createElement('div');
    var header = document.createElement('div');
    var titleWrap = document.createElement('div');
    var subline = document.createElement('div');
    var editor = name.nextElementSibling && name.nextElementSibling.classList.contains('foal-name-inline-editor')
      ? name.nextElementSibling
      : null;

    medallion.className = 'foal-medallion-wrap';
    scoreBadge.className = 'foal-result-score';
    scoreBadge.textContent = score;

    main.className = 'foal-main-wrap';
    header.className = 'foal-header-row';
    titleWrap.className = 'foal-title-wrap';
    subline.className = 'foal-subline';
    subline.textContent = 'Новорождённый потомок';

    medallion.appendChild(scoreBadge);
    medallion.appendChild(avatar);

    titleWrap.appendChild(name);
    titleWrap.appendChild(gender);
    header.appendChild(titleWrap);
    header.appendChild(stars);

    main.appendChild(header);
    if (editor) main.appendChild(editor);
    main.appendChild(subline);

    top.textContent = '';
    top.appendChild(medallion);
    top.appendChild(main);

    applyFoalSafetyLayout(card);
  }

  function runEnhanceSoon() {
    enhanceFoalResult();
    setTimeout(enhanceFoalResult, 0);
    setTimeout(enhanceFoalResult, 80);
  }

  function init() {
    var card = document.getElementById('breedResultCard');
    if (!card) return;

    setupFoalNameEditor();
    runEnhanceSoon();

    new MutationObserver(function () {
      setupFoalNameEditor();
      runEnhanceSoon();
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
