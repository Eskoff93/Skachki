// Breeding render module.
// Owns breeding HTML rendering and foal result presentation.

window.SKACHKI_BREEDING_RENDER = (function () {
  var activeNameInput = null;
  var tapGuardUntil = 0;
  var tapGuardBound = false;

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }
  function horseTools() { return window.SKACHKI_HORSE || {}; }
  function breedingLogic() { return window.SKACHKI_BREEDING_LOGIC || {}; }

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
        if (root && typeof root.scrollBy === 'function') {
          root.scrollBy({ top: 28, behavior: 'smooth' });
        }
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
    var L = breedingLogic();
    var forecast = L.potentialForecast ? L.potentialForecast(stallion, mare) : {
      min: Math.max(50, Math.min(100, Math.round((stallion.potential + mare.potential) / 2) - 4)),
      max: Math.max(50, Math.min(100, Math.round((stallion.potential + mare.potential) / 2) + 5)),
      average: Math.round((stallion.potential + mare.potential) / 2)
    };
    var minLabel = potentialLabel(forecast.min);
    var maxLabel = potentialLabel(forecast.max);

    return {
      min: forecast.min,
      max: forecast.max,
      label: minLabel === maxLabel ? minLabel : minLabel + '–' + maxLabel,
      stars: potentialStars(forecast.average)
    };
  }

  function forecastStars(stars, title) {
    var percent = Math.max(1, Math.min(5, stars)) * 20;
    return '<div class="star-rating breed-stars" title="' + title + '"><span class="star-rating-bg">★★★★★</span><span class="star-rating-fill" style="width:' + percent + '%">★★★★★</span></div>';
  }

  function qualityValue(horse, key) {
    var L = breedingLogic();
    return L.qualityValue ? L.qualityValue(horse, key) : 8;
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
    var L = breedingLogic();
    var values = L.forecastQualityValues ? L.forecastQualityValues(stallion, mare, key) : {
      min: Math.max(1, Math.min(20, Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2) - 2)),
      max: Math.max(1, Math.min(20, Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2) + 2))
    };
    var minRank = qualityRank(values.min);
    var maxRank = qualityRank(values.max);

    return {
      rank: maxRank,
      label: minRank === maxRank ? qualityRankLabel(minRank) : qualityRankLabel(minRank) + '–' + qualityRankLabel(maxRank)
    };
  }

  function forecastQualityBadge(stallion, mare, key) {
    var forecast = forecastQualityRank(stallion, mare, key);
    return '<div class="quality-badge quality-' + forecast.rank + ' compact">' +
      '<div class="quality-icon">' + qualityIcon(key) + '</div>' +
      '<div><div class="quality-name">' + qualityLabel(key) + '</div><div class="quality-rank">' + forecast.label + '</div></div>' +
    '</div>';
  }

  function statRange(label, value) {
    var min = Math.max(10, value - 5);
    var max = Math.min(100, value + 6);
    return '<div class="breed-forecast-stat"><b>' + min + '–' + max + '</b><span>' + label + '</span></div>';
  }

  function traitForecast(label, value) {
    return '<div class="breed-trait-chip"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function traitPair(valueA, valueB) {
    return valueA === valueB ? valueA : valueA + ' / ' + valueB;
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

  function parentAfterText(ctx, parent) {
    if (ctx.isExternalParent(parent)) return ctx.serviceLabel(parent) + ': ' + ctx.parentFee(parent) + ' 🪙';
    return parent.name + ' ' + (parent.offspringCount + 1) + '/' + parent.offspringLimit;
  }

  function renderPairIntro(ctx, stallion, mare) {
    var fee = ctx.totalFee(stallion, mare);
    var desc = 'Выберите жеребца и кобылу. Потомок унаследует породу, масть, характер, показатели и качества родителей.';

    if (ctx.isExternalStud(stallion) && ctx.isExternalMare(mare)) {
      desc = 'Своих доступных родителей нет. Можно использовать племенного жеребца и племенную кобылу за ' + fee + ' 🪙.';
    } else if (ctx.isExternalStud(stallion)) {
      desc = 'Своих доступных жеребцов нет. Можно нанять племенного жеребца за ' + ctx.parentFee(stallion) + ' 🪙.';
    } else if (ctx.isExternalMare(mare)) {
      desc = 'Своих доступных кобыл нет. Можно нанять племенную кобылу за ' + ctx.parentFee(mare) + ' 🪙.';
    }

    return '<section class="breed-intro-card"><div class="summary-title">Разведение</div><div class="summary-desc">' + desc + '</div></section>';
  }

  function renderParentSlot(ctx, horse, gender) {
    var UI = horseUi();
    var symbol = gender === 'stallion' ? '♂' : '♀';
    var buttonText = gender === 'stallion' ? 'Выбрать жеребца' : 'Выбрать кобылу';
    var accent = gender === 'stallion' ? 'breed-parent-stallion' : 'breed-parent-mare';

    if (!horse || !UI.renderHorseCard) {
      return '<button class="breed-parent-empty ' + accent + '" data-open-parent-picker="' + gender + '"><span class="breed-empty-symbol">' + symbol + '</span><b>' + buttonText + '</b></button>';
    }

    return '<div class="breed-parent-slot ' + accent + '">' +
      UI.renderHorseCard(horse, { extraClass: 'breed-parent-card' }) +
      ctx.serviceNote(horse) +
      '<button class="breed-change-parent-btn" type="button" data-open-parent-picker="' + gender + '">' + buttonText + '</button>' +
    '</div>';
  }

  function renderPairStep(ctx, stallion, mare) {
    return renderPairIntro(ctx, stallion, mare) +
      '<div class="section-label">Жеребец</div>' +
      renderParentSlot(ctx, stallion, 'stallion') +
      '<div class="breed-heart-divider" aria-hidden="true">♡</div>' +
      '<div class="section-label">Кобыла</div>' +
      renderParentSlot(ctx, mare, 'mare') +
      renderForecast(ctx, stallion, mare);
  }

  function renderParentPicker(ctx, gender, list, selectedId, hasOwn) {
    var UI = horseUi();
    var title = gender === 'stallion' ? 'Выбор жеребца' : 'Выбор кобылы';
    var desc;

    if (!hasOwn && gender === 'stallion') {
      desc = 'Своих доступных жеребцов нет. Доступна племенная станция за ' + ctx.parentFee(list[0]) + ' 🪙.';
    } else if (!hasOwn && gender === 'mare') {
      desc = 'Своих доступных кобыл нет. Доступна племенная кобыла за ' + ctx.parentFee(list[0]) + ' 🪙.';
    } else {
      desc = gender === 'stallion'
        ? 'Выберите жеребца для пары. Карточки показывают те же параметры, что и в Конюшне.'
        : 'Выберите кобылу для пары. Карточки показывают те же параметры, что и в Конюшне.';
    }

    return '<section class="breed-intro-card"><div class="summary-title">' + title + '</div><div class="summary-desc">' + desc + '</div></section>' +
      '<div class="section-label">Доступные варианты</div>' +
      list.map(function (horse) {
        var selected = String(horse.id) === String(selectedId);
        var card = UI.renderHorseCard ? UI.renderHorseCard(horse, { dataHorse: false, selected: selected, extraClass: 'breed-picker-card' }) : '';

        if (selected) {
          card = card.replace('<article class="', '<article style="border-color:rgba(255,210,93,.76)!important;box-shadow:0 0 0 1px rgba(255,210,93,.24) inset,0 18px 52px rgba(0,0,0,.46)!important;" class="');
        }

        if (ctx.isExternalParent(horse)) card += '<div class="breed-forecast-note">Стоимость скрещивания: ' + ctx.parentFee(horse) + ' 🪙</div>';
        return '<div class="breed-picker-item" data-select-parent="' + gender + '" data-id="' + horse.id + '">' + card + '</div>';
      }).join('');
  }

  function renderForecast(ctx, stallion, mare) {
    var L = breedingLogic();
    var forecast;
    var expectedClass;
    var potential;

    if (!stallion || !mare) {
      return '<section class="breed-forecast-panel breed-foal-card"><div class="breed-forecast-head"><div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Выберите жеребца и кобылу, чтобы увидеть прогноз.</div></div>' + renderFoalPreview() + '</div></section>';
    }

    forecast = L.forecastVisibleStats ? L.forecastVisibleStats(stallion, mare) : {
      speed: Math.round((stallion.speed + mare.speed) / 2),
      stamina: Math.round((stallion.stamina + mare.stamina) / 2),
      acceleration: Math.round((stallion.acceleration + mare.acceleration) / 2)
    };
    expectedClass = forecast.expectedClass || Math.round((forecast.speed + forecast.stamina + forecast.acceleration) / 3);
    potential = potentialForecast(stallion, mare);

    return '<section class="breed-forecast-panel breed-foal-card">' +
      '<div class="breed-forecast-head breed-foal-head"><div><div class="summary-title">Будущий жеребёнок</div><div class="summary-desc">Прогноз наследования. Точные значения откроются после рождения.</div></div>' + renderFoalPreview() + '</div>' +
      '<div class="breed-foal-level-row"><span>Прогноз потенциала</span>' + forecastStars(potential.stars, 'Потенциал: ' + potential.label) + '</div>' +
      '<div class="breed-forecast-note">Потенциал: ' + potential.label + ' • Ожидаемый класс: ' + Math.max(10, expectedClass - 5) + '–' + Math.min(100, expectedClass + 6) + '</div>' +
      '<div class="breed-forecast-section-title">Вероятные признаки</div>' +
      '<div class="breed-trait-grid">' + traitForecast('Пол', 'случайный') + traitForecast('Порода', traitPair(stallion.breed, mare.breed)) + traitForecast('Масть', traitPair(stallion.coat, mare.coat)) + traitForecast('Характер', traitPair(stallion.temperament, mare.temperament)) + '</div>' +
      '<div class="breed-forecast-section-title">Прогноз показателей</div>' +
      '<div class="breed-forecast-grid">' + statRange('Класс', expectedClass) + statRange('Скорость', forecast.speed) + statRange('Выносливость', forecast.stamina) + statRange('Ускорение', forecast.acceleration) + '</div>' +
      '<div class="breed-forecast-section-title">Наследование качеств</div>' +
      '<div class="quality-grid breed-forecast-quality-grid">' + forecastQualityBadge(stallion, mare, 'strength') + forecastQualityBadge(stallion, mare, 'agility') + forecastQualityBadge(stallion, mare, 'instinct') + '</div>' +
      '<div class="breed-forecast-note">После разведения: ' + parentAfterText(ctx, stallion) + ' • ' + parentAfterText(ctx, mare) + '</div>' +
    '</section>';
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
    renderPairStep: renderPairStep,
    renderParentPicker: renderParentPicker,
    renderForecast: renderForecast,
    renderSharedFoalCard: renderSharedFoalCard,
    setupFoalNameEditor: setupFoalNameEditor,
    showFoalResult: showFoalResult
  };
})();
