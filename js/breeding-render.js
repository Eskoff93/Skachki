// Breeding render enhancements.
// Temporary bridge module for foal result UI until breeding.js is fully split.

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

  function addResultStyles() {
    if (document.getElementById('foalResultEnhanceStyles')) return;

    var style = document.createElement('style');
    style.id = 'foalResultEnhanceStyles';
    style.textContent = [
      '.foal-card-enhanced{padding:16px 14px 15px 18px!important;text-align:left!important}',
      '.foal-card-enhanced .foal-card-top{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:14px!important;place-items:initial!important;padding:4px 0 4px 4px}',
      '.foal-medallion-wrap{position:relative;flex:0 0 auto;width:121px;height:121px;border-radius:50%;padding:4px;background:linear-gradient(135deg,#fff0a8,#d4a341,#5a340f);box-shadow:0 10px 30px rgba(0,0,0,.48),0 0 0 5px rgba(216,169,67,.08)}',
      '.foal-medallion-wrap:before{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px solid rgba(216,169,67,.38)}',
      '.foal-medallion-wrap .foal-avatar{position:absolute;inset:4px;width:calc(100% - 8px)!important;height:calc(100% - 8px)!important;border-radius:50%!important;box-shadow:none!important;border:0!important}',
      '.foal-medallion-wrap .horse-portrait-svg{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:50%!important}',
      '.foal-result-score{position:absolute;left:-11px;top:6px;z-index:7;min-width:36px;height:36px;padding:4px 7px;box-sizing:border-box;border-radius:13px;background:linear-gradient(180deg,rgba(31,39,45,.98),rgba(9,15,22,.98));border:1px solid rgba(255,218,111,.58);box-shadow:0 8px 18px rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;color:#ffe08a;font-size:22px;font-weight:950;letter-spacing:-.04em}',
      '.foal-medallion-wrap .foal-gender-badge{right:-2px!important;top:6px!important;width:28px!important;height:28px!important;font-size:18px!important}',
      '.foal-main-wrap{min-width:0;flex:1;text-align:left}',
      '.foal-main-wrap .foal-name-display{margin:0!important;font-size:26px!important;line-height:1!important;text-align:left}',
      '.foal-main-wrap .breed-stars{font-size:18px!important;width:94px!important;height:20px!important;margin-top:8px!important}',
      '.foal-subline{margin-top:7px;color:#d3dfeb;font-size:12px;font-weight:800}',
      '.foal-info-lines{grid-template-columns:repeat(3,1fr)!important;gap:6px!important;margin-top:11px!important}',
      '.foal-info-lines div{display:block!important;text-align:center!important;padding:8px 7px!important}',
      '.foal-info-lines div:first-child,.foal-info-lines div:nth-child(5){display:none!important}',
      '.foal-stat-grid{position:relative;margin-top:22px!important;padding-top:12px!important}',
      '.foal-stat-grid:before{content:"";position:absolute;left:14%;right:14%;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(216,169,67,.78),transparent)}',
      '@media(max-width:420px){.foal-card-enhanced{padding:14px 12px 14px 15px!important}.foal-card-enhanced .foal-card-top{gap:11px!important;padding:3px 0 3px 3px}.foal-medallion-wrap{width:103px;height:103px}.foal-main-wrap .foal-name-display{font-size:22px!important}}'
    ].join('');

    document.head.appendChild(style);
  }

  function numberValue(node) {
    var value = node ? parseInt(node.textContent, 10) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function enhanceFoalResult() {
    var card = document.getElementById('breedResultCard');
    if (!card || card.classList.contains('foal-card-enhanced')) return;

    var top = card.querySelector('.foal-card-top');
    var avatar = card.querySelector('.foal-avatar');
    var gender = card.querySelector('.foal-gender-badge');
    var name = card.querySelector('.foal-name-display');
    var stars = card.querySelector('.star-rating');
    var stats = Array.prototype.slice.call(card.querySelectorAll('.foal-stat-grid .breed-stat-chip b'));
    if (!top || !avatar || !gender || !name || !stars || stats.length < 3) return;

    addResultStyles();
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
