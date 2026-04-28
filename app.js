    window.addEventListener('error', function (e) {
      var fatal = document.getElementById('fatal');
      if (!fatal) return;
      fatal.style.display = 'block';
      fatal.innerHTML = '<h2>Ошибка</h2><pre>' + String(e.message) + '\n' + String(e.filename || '') + ':' + String(e.lineno || '') + '</pre>';
    });


    (function initTelegram() {
      try {
        if (window.Telegram && Telegram.WebApp) {
          Telegram.WebApp.ready();
          Telegram.WebApp.expand();
          Telegram.WebApp.disableVerticalSwipes && Telegram.WebApp.disableVerticalSwipes();
          Telegram.WebApp.setHeaderColor && Telegram.WebApp.setHeaderColor('#10263d');
          Telegram.WebApp.setBackgroundColor && Telegram.WebApp.setBackgroundColor('#081423');
          var topInset = 0;
          if (Telegram.WebApp.contentSafeAreaInset && Telegram.WebApp.contentSafeAreaInset.top) {
            topInset = Telegram.WebApp.contentSafeAreaInset.top;
          } else if (Telegram.WebApp.safeAreaInset && Telegram.WebApp.safeAreaInset.top) {
            topInset = Telegram.WebApp.safeAreaInset.top;
          }
          if (topInset) {
            document.documentElement.style.setProperty('--tg-top-offset', Math.max(20, topInset) + 'px');
          }
        }
      } catch (e) {}
    })();

    if (!window.Phaser) {
      var fatalNoPhaser = document.getElementById('fatal');
      fatalNoPhaser.style.display = 'block';
      fatalNoPhaser.innerHTML = '<h2>Phaser не загрузился</h2><p>Проверьте файл <b>phaser.min.js</b> рядом с index.html</p>';
      throw new Error('Phaser not loaded');
    }

    var SAVE_KEY = 'skachki_proto_toptrack_v2';
    var horses = [];
    var coins = 250;
    var raceGame = null;
    var currentRaceHorses = [];
    var raceResults = [];
    var raceRunning = false;
    var selectedHorseId = null;
    var selectedTrainingHorseId = null;
    var selectedRaceHorseIds = [];
    var audioCtx = null;
    var hoofInterval = null;

    var stableNames = ['Буран', 'Молния', 'Ветерок'];
    var temperaments = ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    var trainingTypes = [
      { key: 'speed', label: 'Скорость', cost: 25, energy: 10, desc: 'Максимальная скорость.' },
      { key: 'stamina', label: 'Выносливость', cost: 25, energy: 10, desc: 'Темп до финиша.' },
      { key: 'acceleration', label: 'Ускорение', cost: 20, energy: 8, desc: 'Старт и рывки.' },
      { key: 'agility', label: 'Манёвренность', cost: 18, energy: 7, desc: 'Перестроения и обгоны.' },
      { key: 'power', label: 'Сила', cost: 18, energy: 7, desc: 'Силовой запас.' },
      { key: 'intelligence', label: 'Интеллект', cost: 18, energy: 6, desc: 'Выбор траектории.' }
    ];

    var stableScreen = document.getElementById('stableScreen');
    var selectionScreen = document.getElementById('selectionScreen');
    var trainingScreen = document.getElementById('trainingScreen');
    var breedScreen = document.getElementById('breedScreen');
    var raceScreen = document.getElementById('raceScreen');
    var horseListEl = document.getElementById('horseList');
    var selectionListEl = document.getElementById('selectionList');
    var summaryGridEl = document.getElementById('summaryGrid');
    var coinsPill = document.getElementById('coinsPill');
    var selectedCountEl = document.getElementById('selectedCount');
    var stableScrollEl = document.getElementById('stableScroll');
    var raceStatusEl = document.getElementById('raceStatus');
    var resultsListEl = document.getElementById('resultsList');
    var toastEl = document.getElementById('toast');

    var horseModal = document.getElementById('horseModal');
    var horseModalTitle = document.getElementById('horseModalTitle');
    var horseModalBody = document.getElementById('horseModalBody');
    var trainingModal = document.getElementById('trainingModal');
    var trainingTitle = document.getElementById('trainingTitle');
    var trainingOptions = document.getElementById('trainingOptions');
    var trainingHero = document.getElementById('trainingHero');
    var trainingScreenOptions = document.getElementById('trainingScreenOptions');
    var breedModal = document.getElementById('breedModal');
    var parentOne = document.getElementById('parentOne');
    var parentTwo = document.getElementById('parentTwo');
    var breedParentOne = document.getElementById('breedParentOne');
    var breedParentTwo = document.getElementById('breedParentTwo');
    var breedCompareGrid = document.getElementById('breedCompareGrid');
    var childPreviewText = document.getElementById('childPreviewText');
    var childPreviewGrid = document.getElementById('childPreviewGrid');
    var resultsModal = document.getElementById('resultsModal');
    var infoModal = document.getElementById('infoModal');

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function createHorse(name) {
      if (HORSE_DOMAIN.createHorse) return HORSE_DOMAIN.createHorse(name, randInt);
      return {
        id: Date.now() + Math.random().toString(36).slice(2, 8),
        name: name,
        speed: randInt(54, 78),
        stamina: randInt(52, 76),
        acceleration: randInt(52, 78),
        agility: randInt(48, 74),
        power: randInt(48, 74),
        intelligence: randInt(50, 76),
        potential: randInt(84, 100),
        energy: randInt(74, 100),
        temperament: temperaments[randInt(0, temperaments.length - 1)]
      };
    }

    function horseClass(h) {
      if (HORSE_DOMAIN.horseClass) return HORSE_DOMAIN.horseClass(h);
      return Math.round((h.speed + h.stamina + h.acceleration + h.agility + h.power + h.intelligence) / 6);
    }

    function behaviorLabel(temperament) {
      if (HORSE_DOMAIN.behaviorLabel) return HORSE_DOMAIN.behaviorLabel(temperament);
      if (temperament === 'Смелая') return 'часто идёт на риск и делает рывки';
      if (temperament === 'Пугливая') return 'осторожный старт, сильнее раскрывается позже';
      if (temperament === 'Упрямая') return 'держит свою дорожку и стабильно идёт темпом';
      if (temperament === 'Резкая') return 'быстрее меняет дорожку';
      if (temperament === 'Быстрая') return 'резкий старт, но может просесть к финишу';
      return 'обычный стиль гонки';
    }

    function saveGame() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ horses: horses, coins: coins }));
      } catch (e) {}
    }

    function newGame() {
      horses = stableNames.map(createHorse);
      coins = 250;
      saveGame();
    }

    function loadGame() {
      try {
        var raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return newGame();
        var data = JSON.parse(raw);
        horses = Array.isArray(data.horses) && data.horses.length ? data.horses : stableNames.map(createHorse);
        coins = Number.isFinite(data.coins) ? data.coins : 250;
      } catch (e) {
        newGame();
      }
    }

    function averageClass() {
      if (!horses.length) return 0;
      return Math.round(horses.reduce(function (sum, h) { return sum + horseClass(h); }, 0) / horses.length);
    }

    function playTone(freq, duration, type, volume) {
      try {
        if (!audioCtx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq || 440;
        gain.gain.setValueAtTime(volume || 0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration || 0.08));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (duration || 0.08));
      } catch (e) {}
    }
    function playSuccess() {
      playTone(660, 0.07, 'sine', 0.07);
      setTimeout(function () { playTone(880, 0.09, 'sine', 0.06); }, 80);
    }
    function startHoofSound() {
      stopHoofSound();
      hoofInterval = setInterval(function () {
        playTone(95 + Math.random() * 25, 0.035, 'triangle', 0.04);
        setTimeout(function () { playTone(78 + Math.random() * 18, 0.03, 'triangle', 0.03); }, 70);
      }, 180);
    }
    function stopHoofSound() { if (hoofInterval) clearInterval(hoofInterval); hoofInterval = null; }
    function playFinish() {
      stopHoofSound();
      playTone(720, 0.08, 'sine', 0.07);
      setTimeout(function () { playTone(960, 0.08, 'sine', 0.07); }, 90);
      setTimeout(function () { playTone(1160, 0.12, 'sine', 0.07); }, 180);
    }

    function showToast(message) {
      toastEl.textContent = message;
      toastEl.classList.add('active');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { toastEl.classList.remove('active'); }, 1800);
    }

    function statBlock(label, value, color) {
      return '<div>' +
        '<div class="stat-top"><span>' + label + '</span><b>' + Math.round(value) + '</b></div>' +
        '<div class="stat-bar"><span style="width:' + Math.min(100, value) + '%;background:' + color + '"></span></div>' +
      '</div>';
    }

    function renderSummary() {
      coinsPill.innerHTML = '🪙 ' + coins + '<small>Монеты</small>';
      summaryGridEl.innerHTML =
        '<div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div>' +
        '<div class="chip-box"><div class="value">' + averageClass() + '</div><div class="label">Средний класс</div></div>' +
        '<div class="chip-box"><div class="value">' + coins + '</div><div class="label">Монеты</div></div>';
    }

    function renderStable() {
      renderSummary();
      horseListEl.innerHTML = horses.map(function (horse, index) {
        return '<article class="horse-card">' +
          '<div class="horse-head">' +
            '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
            '<div class="horse-meta">' +
              '<div class="horse-name-row">' +
                '<div class="horse-name">' + horse.name + '</div>' +
                '<div class="horse-rank">#' + (index + 1) + '</div>' +
              '</div>' +
              '<div class="horse-tags">' +
                '<span class="mini-tag">Класс: ' + horseClass(horse) + '</span>' +
                '<span class="mini-tag">Энергия: ' + horse.energy + '</span>' +
                '<span class="mini-tag">Потенциал: ' + horse.potential + '</span>' +
                '<span class="mini-tag">Характер: ' + horse.temperament + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="power-grid">' +
            '<div class="power-box"><div class="num">' + horse.speed + '</div><div class="txt">Скорость</div></div>' +
            '<div class="power-box"><div class="num">' + horse.stamina + '</div><div class="txt">Выносливость</div></div>' +
            '<div class="power-box"><div class="num">' + horse.acceleration + '</div><div class="txt">Ускорение</div></div>' +
          '</div>' +
          '<div class="stats-grid">' +
            statBlock('Скорость', horse.speed, 'linear-gradient(90deg,#34d17a,#37c86e)') +
            statBlock('Выносливость', horse.stamina, 'linear-gradient(90deg,#42b3ff,#4b9ef7)') +
            statBlock('Ускорение', horse.acceleration, 'linear-gradient(90deg,#ffd44d,#eeb600)') +
            statBlock('Манёвренность', horse.agility, 'linear-gradient(90deg,#ffad67,#ff8441)') +
            statBlock('Сила', horse.power, 'linear-gradient(90deg,#9c8cff,#7e72f7)') +
            statBlock('Интеллект', horse.intelligence, 'linear-gradient(90deg,#ff89c1,#f24c92)') +
          '</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-blue" data-action="train" data-id="' + horse.id + '">Тренировать</button>' +
            '<button class="btn btn-dark" data-action="details" data-id="' + horse.id + '">Подробнее</button>' +
          '</div>' +
        '</article>';
      }).join('');
    }

    function renderSelectionScreen() {
      if (!selectedRaceHorseIds.length && horses.length) {
        selectedRaceHorseIds = horses.slice(0, Math.min(4, horses.length)).map(function (h) { return String(h.id); });
      }
      selectedCountEl.textContent = selectedRaceHorseIds.length;
      selectionListEl.innerHTML = horses.map(function (horse) {
        var selected = selectedRaceHorseIds.indexOf(String(horse.id)) !== -1;
        return '<div class="select-horse-card ' + (selected ? 'selected' : '') + '" data-select-id="' + horse.id + '">' +
          '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div class="select-horse-info">' +
            '<div class="select-horse-name">' + horse.name + '</div>' +
            '<div class="select-badges">' +
              '<span class="mini-tag">Класс ' + horseClass(horse) + '</span>' +
              '<span class="mini-tag">Энергия ' + horse.energy + '</span>' +
              '<span class="mini-tag">' + horse.temperament + '</span>' +
            '</div>' +
            '<div class="stats-grid">' +
              statBlock('Скорость', horse.speed, 'linear-gradient(90deg,#34d17a,#37c86e)') +
              statBlock('Манёвренность', horse.agility, 'linear-gradient(90deg,#ffad67,#ff8441)') +
            '</div>' +
          '</div>' +
          '<div class="toggle-select"></div>' +
        '</div>';
      }).join('');
    }

    function toggleRaceHorse(id) {
      id = String(id);
      var idx = selectedRaceHorseIds.indexOf(id);
      if (idx !== -1) {
        selectedRaceHorseIds.splice(idx, 1);
      } else {
        if (selectedRaceHorseIds.length >= 8) return showToast('Максимум 8 участников');
        selectedRaceHorseIds.push(id);
      }
      renderSelectionScreen();
    }

    function chooseBestHorses() {
      selectedRaceHorseIds = horses.slice().sort(function (a, b) { return horseClass(b) - horseClass(a); }).slice(0, Math.min(8, horses.length)).map(function (h) { return String(h.id); });
      renderSelectionScreen();
      showToast('Выбраны сильнейшие лошади');
    }

    function openHorseDetails(id) {
      var horse = horses.find(function (h) { return String(h.id) === String(id); });
      if (!horse) return;
      selectedHorseId = horse.id;
      horseModalTitle.textContent = horse.name;
      horseModalBody.innerHTML =
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">' +
          '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div><div style="font-size:13px;color:var(--muted)">Характер</div><div style="font-size:18px;font-weight:900">' + horse.temperament + '</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Класс: <b style="color:#fff">' + horseClass(horse) + '</b></div></div>' +
        '</div>' +
        '<div class="detail-grid">' +
          '<div class="detail-box"><div class="label">Скорость</div><div class="value">' + horse.speed + '</div></div>' +
          '<div class="detail-box"><div class="label">Выносливость</div><div class="value">' + horse.stamina + '</div></div>' +
          '<div class="detail-box"><div class="label">Ускорение</div><div class="value">' + horse.acceleration + '</div></div>' +
          '<div class="detail-box"><div class="label">Манёвренность</div><div class="value">' + horse.agility + '</div></div>' +
          '<div class="detail-box"><div class="label">Сила</div><div class="value">' + horse.power + '</div></div>' +
          '<div class="detail-box"><div class="label">Интеллект</div><div class="value">' + horse.intelligence + '</div></div>' +
          '<div class="detail-box"><div class="label">Потенциал</div><div class="value">' + horse.potential + '</div></div>' +
          '<div class="detail-box"><div class="label">Энергия</div><div class="value">' + horse.energy + '</div></div>' +
        '</div>';
      horseModal.classList.add('active');
    }

    function openTrainingModal(id) {
      var horse = horses.find(function (h) { return String(h.id) === String(id); });
      if (!horse) return;
      selectedTrainingHorseId = horse.id;
      renderTrainingScreen(horse);
      showScreen('training');
    }

    function renderTrainingScreen(horse) {
      trainingHero.innerHTML =
        '<div class="training-hero-head">' +
          '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="training-hero-title">' + horse.name + '</div>' +
            '<div class="training-hero-sub">Класс ' + horseClass(horse) + ' • Энергия ' + horse.energy + ' • Потенциал ' + horse.potential + '</div>' +
            '<span class="behavior-chip">Характер: ' + horse.temperament + ' • ' + behaviorLabel(horse.temperament) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="power-grid">' +
          '<div class="power-box"><div class="num">' + horse.speed + '</div><div class="txt">Скорость</div></div>' +
          '<div class="power-box"><div class="num">' + horse.stamina + '</div><div class="txt">Выносливость</div></div>' +
          '<div class="power-box"><div class="num">' + horse.agility + '</div><div class="txt">Манёвр</div></div>' +
        '</div>';

      trainingScreenOptions.innerHTML = trainingTypes.map(function (t) {
        var current = horse[t.key];
        var disabled = coins < t.cost || horse.energy < t.energy || current >= 100;
        return '<div class="training-option-card">' +
          '<div class="option-top">' +
            '<div><div class="option-name">' + t.label + '</div><div class="option-desc">' + t.desc + '</div></div>' +
            '<div class="option-price">🪙 ' + t.cost + ' • ⚡ ' + t.energy + '</div>' +
          '</div>' +
          statBlock('Текущее значение', current, 'linear-gradient(90deg,#ffd44d,#eeb600)') +
          '<button class="btn ' + (disabled ? 'btn-dark' : 'btn-blue') + '" data-train-key="' + t.key + '" style="width:100%;margin-top:12px" ' + (disabled ? 'disabled' : '') + '>' + (disabled ? 'Недоступно' : 'Прокачать +2–6') + '</button>' +
        '</div>';
      }).join('');
    }

    function performTraining(key) {
      var horse = horses.find(function (h) { return String(h.id) === String(selectedTrainingHorseId); });
      var type = trainingTypes.find(function (t) { return t.key === key; });
      if (!horse || !type) return;
      if (coins < type.cost) return showToast('Недостаточно монет');
      if (horse.energy < type.energy) return showToast('Недостаточно энергии');
      var gain = randInt(2, 6);
      horse[key] = Math.min(100, horse[key] + gain);
      horse.energy = Math.max(0, horse.energy - type.energy);
      horse.potential = Math.max(50, horse.potential - randInt(1, 2));
      coins -= type.cost;
      saveGame();
      renderStable();
      playSuccess();
      showToast(horse.name + ': ' + type.label + ' +' + gain);
      renderTrainingScreen(horse);
      if (horseModal.classList.contains('active')) openHorseDetails(horse.id);
      renderSelectionScreen();
    }

    function openBreedModal() {
      if (horses.length < 2) return showToast('Нужно минимум 2 лошади');
      renderBreedScreen();
      showScreen('breed');
    }

    function renderBreedScreen() {
      var options = horses.map(function (horse) {
        return '<option value="' + horse.id + '">' + horse.name + ' — Класс ' + horseClass(horse) + '</option>';
      }).join('');
      if (!breedParentOne.innerHTML) breedParentOne.innerHTML = options;
      if (!breedParentTwo.innerHTML) breedParentTwo.innerHTML = options;

      var currentOne = breedParentOne.value;
      var currentTwo = breedParentTwo.value;
      breedParentOne.innerHTML = options;
      breedParentTwo.innerHTML = options;
      if (currentOne) breedParentOne.value = currentOne;
      if (currentTwo) breedParentTwo.value = currentTwo;
      if (!breedParentTwo.value && horses[1]) breedParentTwo.value = String(horses[1].id);
      if (breedParentOne.value === breedParentTwo.value && horses[1]) breedParentTwo.value = String(horses[1].id);
      updateBreedPreview();
    }

    function parentCompareCard(title, horse) {
      if (!horse) return '<div class="parent-card"><div class="parent-card-title">' + title + '</div><div class="modal-sub">Не выбран</div></div>';
      return '<div class="parent-card">' +
        '<div class="parent-card-title">' + title + ': ' + horse.name + '</div>' +
        '<div class="mini-tag">Класс ' + horseClass(horse) + '</div>' +
        '<div class="parent-mini-row"><span>Скорость</span><b>' + horse.speed + '</b></div>' +
        '<div class="parent-mini-row"><span>Выносливость</span><b>' + horse.stamina + '</b></div>' +
        '<div class="parent-mini-row"><span>Ускорение</span><b>' + horse.acceleration + '</b></div>' +
        '<div class="parent-mini-row"><span>Манёвр</span><b>' + horse.agility + '</b></div>' +
        '<div class="parent-mini-row"><span>Интеллект</span><b>' + horse.intelligence + '</b></div>' +
        '<div class="behavior-chip">' + horse.temperament + '</div>' +
      '</div>';
    }

    function updateBreedPreview() {
      var h1 = horses.find(function (h) { return String(h.id) === String(breedParentOne.value); });
      var h2 = horses.find(function (h) { return String(h.id) === String(breedParentTwo.value); });
      breedCompareGrid.innerHTML = parentCompareCard('Родитель 1', h1) + parentCompareCard('Родитель 2', h2);
      if (!h1 || !h2 || String(h1.id) === String(h2.id)) {
        childPreviewText.textContent = 'Выберите двух разных родителей.';
        childPreviewGrid.innerHTML = '';
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
      var predictedClass = Math.round(preview.reduce(function (sum, p) { return sum + p[1]; }, 0) / preview.length);
      childPreviewText.textContent = 'Ожидаемый класс потомка около ' + predictedClass + '. Характер наследуется от одного из родителей.';
      childPreviewGrid.innerHTML = preview.map(function (p) {
        return '<div class="preview-stat"><div class="preview-value">' + p[1] + ' ' + p[2] + '</div><div class="preview-label">' + p[0] + '</div></div>';
      }).join('');
    }

    function breedSelected() {
      var h1 = horses.find(function (h) { return String(h.id) === String(breedParentOne.value); });
      var h2 = horses.find(function (h) { return String(h.id) === String(breedParentTwo.value); });
      if (!h1 || !h2 || String(h1.id) === String(h2.id)) return showToast('Выберите разных родителей');
      function avg(a, b) { return (a + b) / 2; }
      var child = {
        id: Date.now() + Math.random().toString(36).slice(2, 8),
        name: 'Жеребёнок ' + (horses.length + 1),
        speed: Math.min(100, Math.max(10, Math.round(avg(h1.speed, h2.speed) + randInt(-5, 6)))),
        stamina: Math.min(100, Math.max(10, Math.round(avg(h1.stamina, h2.stamina) + randInt(-5, 6)))),
        acceleration: Math.min(100, Math.max(10, Math.round(avg(h1.acceleration, h2.acceleration) + randInt(-5, 6)))),
        agility: Math.min(100, Math.max(10, Math.round(avg(h1.agility, h2.agility) + randInt(-5, 6)))),
        power: Math.min(100, Math.max(10, Math.round(avg(h1.power, h2.power) + randInt(-5, 6)))),
        intelligence: Math.min(100, Math.max(10, Math.round(avg(h1.intelligence, h2.intelligence) + randInt(-5, 6)))),
        potential: Math.min(100, Math.max(65, Math.round(avg(h1.potential, h2.potential) + randInt(-3, 5)))),
        energy: 100,
        temperament: Math.random() < 0.5 ? h1.temperament : h2.temperament
      };
      horses.push(child);
      saveGame();
      renderStable();
      renderSelectionScreen();
      renderBreedScreen();
      playSuccess();
      showToast('Новый потомок: ' + child.name);
    }

    function showScreen(name) {
      stableScreen.classList.toggle('active', name === 'stable');
      selectionScreen.classList.toggle('active', name === 'selection');
      trainingScreen.classList.toggle('active', name === 'training');
      breedScreen.classList.toggle('active', name === 'breed');
      raceScreen.classList.toggle('active', name === 'race');
    }

    
    function temperamentRaceProfile(temperament) {
      var profile = {
        burstBonus: 0,
        laneChangeBonus: 1,
        startModifier: 1,
        finishModifier: 1,
        stability: 1
      };

      if (temperament === 'Смелая') {
        profile.burstBonus = 0.0012;
        profile.laneChangeBonus = 1.12;
      }
      if (temperament === 'Пугливая') {
        profile.startModifier = 0.92;
        profile.finishModifier = 1.08;
        profile.laneChangeBonus = 0.9;
      }
      if (temperament === 'Упрямая') {
        profile.stability = 1.18;
        profile.laneChangeBonus = 0.78;
      }
      if (temperament === 'Резкая') {
        profile.laneChangeBonus = 1.55;
        profile.burstBonus = 0.0005;
      }
      if (temperament === 'Быстрая') {
        profile.startModifier = 1.1;
        profile.finishModifier = 0.95;
        profile.burstBonus = 0.0008;
      }

      return profile;
    }

    function makeRunnerTextures(scene, key, color) {
      if (scene.textures.exists(key)) return;
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x000000, 0.14);
      g.fillEllipse(40, 54, 32, 12);
      g.fillStyle(color, 1);
      g.fillEllipse(40, 34, 28, 40);
      g.fillEllipse(40, 18, 18, 20);
      g.fillStyle(0x2f1e14, 1);
      g.fillEllipse(40, 24, 14, 16);
      g.fillStyle(0xffffff, 0.96);
      g.fillCircle(40, 30, 10);
      g.fillStyle((color + 0x222222) & 0xffffff, 1);
      g.fillRect(28, 46, 6, 18);
      g.fillRect(46, 46, 6, 18);
      g.generateTexture(key, 80, 72);
      g.destroy();
    }

    function makeTrackPath(width, height) {
      var cx = width / 2;
      var cy = height / 2 + 2;
      var rx = width * 0.39;
      var ry = height * 0.31;
      return { cx: cx, cy: cy, rx: rx, ry: ry };
    }

    function pointOnOval(track, t, laneOffset) {
      var angle = -Math.PI / 2 + t * Math.PI * 2;
      var rx = track.rx + laneOffset;
      var ry = track.ry + laneOffset * 0.58;
      return {
        x: track.cx + Math.cos(angle) * rx,
        y: track.cy + Math.sin(angle) * ry,
        angle: angle
      };
    }

    function drawTrack(scene, width, height) {
      var track = makeTrackPath(width, height);
      var g = scene.add.graphics();
      g.fillStyle(0x16523a, 1);
      g.fillRoundedRect(0, 0, width, height, 18);
      g.fillStyle(0x245f3d, 1);
      g.fillEllipse(track.cx, track.cy, track.rx * 2.42, track.ry * 2.42);
      g.fillStyle(0xb66a37, 1);
      g.fillEllipse(track.cx, track.cy, track.rx * 2.14, track.ry * 2.14);
      g.fillStyle(0xd58b4b, 1);
      g.fillEllipse(track.cx, track.cy, track.rx * 1.94, track.ry * 1.94);
      g.fillStyle(0x1d6a43, 1);
      g.fillEllipse(track.cx, track.cy, track.rx * 1.28, track.ry * 1.28);
      g.lineStyle(3, 0xf0d2a2, 0.7);
      for (var i = 0; i < 7; i++) {
        var off = i * 18;
        g.strokeEllipse(track.cx, track.cy, (track.rx + off) * 2, (track.ry + off * 0.58) * 2);
      }
      var finish = pointOnOval(track, 0, 82);
      g.lineStyle(5, 0xffffff, 0.95);
      g.lineBetween(finish.x - 52, finish.y, finish.x + 52, finish.y);
      scene.add.text(finish.x + 56, finish.y - 12, 'ФИНИШ', { fontFamily: 'Arial', fontSize: '16px', fontStyle: '900', color: '#ffffff' }).setShadow(0, 2, '#000', 3);
      return track;
    }

    function destroyRaceGame() {
      stopHoofSound();
      if (raceGame) {
        raceGame.destroy(true);
        raceGame = null;
      }
      raceRunning = false;
    }

    function createRaceGame() {
      destroyRaceGame();
      raceRunning = true;
      var container = document.getElementById('phaserBox');
      var rect = container.getBoundingClientRect();
      var width = Math.max(360, Math.floor(rect.width));
      var height = Math.max(520, Math.floor(rect.height));
      raceStatusEl.textContent = 'Старт! Лошади выходят на дистанцию.';
      startHoofSound();

      raceGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'phaser-game',
        width: width,
        height: height,
        backgroundColor: '#16304a',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: { antialias: true, roundPixels: false },
        scene: {
          preload: function () {},
          create: function () {
            var scene = this;
            scene.track = drawTrack(scene, width, height);
            scene.runners = [];
            scene.totalLaps = 1.86;
            scene.finished = false;
            scene.finishCount = 0;
            scene.startTime = scene.time.now;
            scene.lastBoardUpdate = 0;
            scene.eventLog = [];

            var palette = [0x2f83ff, 0xf4c542, 0xff4d8d, 0x3fd486, 0xa47cff, 0xff8b45, 0x2fd7d2, 0xd8e2ff];
            currentRaceHorses.forEach(function (horse, index) {
              var profile = temperamentRaceProfile(horse.temperament);
              var lane = index;
              var laneOffset = lane * 18;
              var textureKey = 'runner_' + index + '_' + palette[index % palette.length];
              makeRunnerTextures(scene, textureKey, palette[index % palette.length]);
              var p = pointOnOval(scene.track, 0.002 - index * 0.012, laneOffset);
              var sprite = scene.add.image(p.x, p.y, textureKey).setScale(0.55).setDepth(20 + index);
              var label = scene.add.text(p.x, p.y - 40, horse.name, {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: '900',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.38)',
                padding: { left: 5, right: 5, top: 2, bottom: 2 }
              }).setOrigin(0.5).setDepth(60).setShadow(0, 2, '#000', 3);
              var classValue = horseClass(horse);
              var pace = (0.00062 + classValue * 0.000009 + horse.speed * 0.000002 + horse.stamina * 0.0000012) * profile.startModifier;
              pace *= (0.96 + Math.random() * 0.08);
              scene.runners.push({
                horse: horse,
                sprite: sprite,
                label: label,
                progress: 0.002 - index * 0.012,
                laneOffset: laneOffset,
                baseLane: laneOffset,
                pace: pace,
                classValue: classValue,
                profile: profile,
                fatigue: 0,
                nextLaneChange: scene.time.now + randInt(1800, 4200),
                nextBurst: scene.time.now + randInt(2600, 6500),
                nextError: scene.time.now + randInt(9000, 17000),
                eventText: null,
                finished: false,
                finishTime: null
              });
            });

            scene.boardBox = scene.add.rectangle(10, 10, 190, 160, 0x0b1d30, 0.78).setOrigin(0, 0).setDepth(120);
            scene.boardLines = [];
            for (var b = 0; b < Math.min(8, currentRaceHorses.length); b++) {
              scene.boardLines.push(scene.add.text(22, 24 + b * 17, '', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff' }).setDepth(130));
            }
            scene.statusText = scene.add.text(width / 2, height - 34, '', { fontFamily: 'Arial', fontSize: '18px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(150).setShadow(0, 2, '#000', 3);
          },
          update: function (time, delta) {
            var scene = this;
            if (scene.finished) return;
            var dt = delta;
            scene.runners.forEach(function (r) {
              if (r.finished) return;
              var progressNorm = Math.max(0, Math.min(1, r.progress / scene.totalLaps));
              var finishPhase = progressNorm > 0.72 ? (progressNorm - 0.72) / 0.28 : 0;
              var staminaFactor = 1 - Math.max(0, finishPhase) * (1 - r.horse.stamina / 130) * 0.34;
              staminaFactor *= r.profile.finishModifier;
              var energyFactor = 0.72 + (r.horse.energy / 100) * 0.28;
              var randomPulse = 1 + Math.sin(time / 520 + r.classValue) * 0.012;
              var speed = r.pace * staminaFactor * energyFactor * randomPulse;

              if (time > r.nextBurst) {
                var burstChance = 0.35 + r.horse.acceleration / 240 + r.profile.burstBonus * 130;
                if (Math.random() < burstChance) {
                  speed *= 1.55;
                  addRaceEvent(scene, r, 'Рывок!', 0xffe66d);
                }
                r.nextBurst = time + randInt(4200, 7800);
              }

              if (time > r.nextLaneChange) {
                var laneShift = randInt(-1, 1) * 18 * r.profile.laneChangeBonus;
                if (Math.abs(laneShift) > 1) {
                  r.laneOffset = clampValue(r.laneOffset + laneShift, 0, 126);
                  if (Math.random() < 0.55) addRaceEvent(scene, r, 'Смена дорожки', 0x9de7ff);
                }
                r.nextLaneChange = time + randInt(2600, 5200);
              }

              if (time > r.nextError) {
                var errorChance = Math.max(0.035, 0.18 - r.horse.intelligence / 700 - r.profile.stability * 0.03);
                if (Math.random() < errorChance) {
                  speed *= 0.55;
                  addRaceEvent(scene, r, 'Сбилась!', 0xff6b6b);
                  scene.cameras.main.shake(90, 0.004);
                }
                r.nextError = time + randInt(10000, 18000);
              }

              r.progress += speed * dt;
              var lapProgress = ((r.progress % 1) + 1) % 1;
              var p = pointOnOval(scene.track, lapProgress, r.laneOffset);
              r.sprite.x = p.x;
              r.sprite.y = p.y;
              r.sprite.rotation = p.angle + Math.PI / 2;
              r.sprite.setDepth(20 + Math.floor(p.y));
              r.label.x = p.x;
              r.label.y = p.y - 34;

              if (r.progress >= scene.totalLaps && !r.finished) {
                r.finished = true;
                r.finishTime = ((time - scene.startTime) / 1000).toFixed(2);
                scene.finishCount += 1;
                raceResults.push({ name: r.horse.name, time: r.finishTime, horse: r.horse });
                addRaceEvent(scene, r, 'Финиш!', 0xffffff);
                if (scene.finishCount === 1) {
                  scene.statusText.setText('Победитель: ' + r.horse.name);
                  raceStatusEl.textContent = 'Финиш! Победитель: ' + r.horse.name;
                  playFinish();
                }
              }
            });

            if (time - scene.lastBoardUpdate > 250) {
              updateLeaderboard(scene);
              scene.lastBoardUpdate = time;
            }

            if (scene.finishCount >= scene.runners.length) {
              scene.finished = true;
              setTimeout(showResults, 700);
            }
          }
        }
      });
    }

    function addRaceEvent(scene, runner, text, color) {
      if (runner.eventText) runner.eventText.destroy();
      runner.eventText = scene.add.text(runner.sprite.x, runner.sprite.y - 58, text, {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { left: 7, right: 7, top: 4, bottom: 4 }
      }).setOrigin(0.5).setDepth(180).setShadow(0, 2, '#000', 4);
      scene.tweens.add({ targets: runner.eventText, y: runner.sprite.y - 84, alpha: 0, duration: 1100, onComplete: function () { if (runner.eventText) runner.eventText.destroy(); runner.eventText = null; } });
      raceStatusEl.textContent = runner.horse.name + ': ' + text;
    }

    function updateLeaderboard(scene) {
      var ordered = scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
      ordered.forEach(function (r, idx) {
        if (!scene.boardLines[idx]) return;
        var pct = Math.min(100, Math.round((r.progress / scene.totalLaps) * 100));
        scene.boardLines[idx].setText((idx + 1) + '. ' + r.horse.name + ' ' + pct + '%');
      });
    }

    function startRaceWithSelected() {
      if (selectedRaceHorseIds.length < 2) return showToast('Выберите минимум 2 лошади');
      currentRaceHorses = selectedRaceHorseIds.map(function (id) {
        return horses.find(function (h) { return String(h.id) === String(id); });
      }).filter(Boolean);
      raceResults = [];
      showScreen('race');
      setTimeout(createRaceGame, 50);
    }

    function openSelectionScreen() {
      renderSelectionScreen();
      showScreen('selection');
    }

    function buildResultsHTML(items, totalReward) {
      var winner = items[0];
      var podium = items.slice(0, 3);
      var html = '';
      if (winner) {
        html += '<div class="results-header">' +
          '<div class="winner-banner">' +
            '<div class="winner-crown">🏆</div>' +
            '<div class="winner-main"><div class="winner-place">Победитель</div><div class="winner-name">' + winner.name + '</div><div class="winner-time">' + winner.time + ' сек</div></div>' +
          '</div>' +
          '<div class="reward-summary"><span>Общая награда за гонку</span><b>+' + totalReward + ' 🪙</b></div>' +
        '</div>';
      }
      if (podium.length) {
        html += '<div class="podium">';
        var order = [1, 0, 2];
        order.forEach(function (posIndex) {
          if (!podium[posIndex]) return;
          var item = podium[posIndex];
          var place = posIndex + 1;
          html += '<div class="podium-box place-' + place + '">' +
            '<div class="podium-place">' + place + ' место</div>' +
            '<div class="podium-name">' + item.name + '</div>' +
            '<div class="podium-meta">' + item.time + ' сек<br>+' + item.reward + ' 🪙</div>' +
          '</div>';
        });
        html += '</div>';
      }
      html += items.map(function (item, idx) {
        return '<div class="result-item">' +
          '<div class="result-head">' +
            '<div><div style="font-size:16px;font-weight:900">' + (idx + 1) + '. ' + item.name + '</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Время: ' + item.time + ' сек</div></div>' +
            '<div class="result-reward">+' + item.reward + ' 🪙</div>' +
          '</div>' +
        '</div>';
      }).join('');
      return html;
    }

    function showResults() {
      raceResults.sort(function (a, b) { return parseFloat(a.time) - parseFloat(b.time); });
      var rewardByPlace = [90, 55, 30, 15, 10];
      var totalReward = 0;
      raceResults.forEach(function (item, idx) {
        item.reward = rewardByPlace[idx] || 5;
        totalReward += item.reward;
        var realHorse = horses.find(function (h) { return h.name === item.name; });
        if (realHorse) realHorse.energy = Math.max(0, realHorse.energy - randInt(4, 8));
      });
      coins += totalReward;
      saveGame();
      renderStable();
      renderSelectionScreen();
      showToast('Награда за гонку: 🪙 ' + totalReward);
      resultsListEl.innerHTML = buildResultsHTML(raceResults, totalReward);
      resultsModal.classList.add('active');
    }

    horseListEl.addEventListener('click', function (e) {
      var button = e.target.closest('button[data-action]');
      if (!button) return;
      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      if (action === 'train') openTrainingModal(id);
      if (action === 'details') openHorseDetails(id);
    });

    selectionListEl.addEventListener('click', function (e) {
      var card = e.target.closest('[data-select-id]');
      if (!card) return;
      toggleRaceHorse(card.getAttribute('data-select-id'));
    });

    trainingOptions.addEventListener('click', function (e) {
      var button = e.target.closest('[data-train-key]');
      if (!button) return;
      performTraining(button.getAttribute('data-train-key'));
    });

    trainingScreenOptions.addEventListener('click', function (e) {
      var button = e.target.closest('[data-train-key]');
      if (!button || button.disabled) return;
      performTraining(button.getAttribute('data-train-key'));
    });

    breedParentOne.addEventListener('change', updateBreedPreview);
    breedParentTwo.addEventListener('change', updateBreedPreview);

    document.getElementById('horseModalTrainBtn').addEventListener('click', function () {
      horseModal.classList.remove('active');
      if (selectedHorseId) openTrainingModal(selectedHorseId);
    });
    document.getElementById('closeHorseBtn').addEventListener('click', function () { horseModal.classList.remove('active'); });
    document.getElementById('closeTrainingBtn').addEventListener('click', function () { trainingModal.classList.remove('active'); });
    document.getElementById('trainingBackBtn').addEventListener('click', function () { showScreen('stable'); });
    document.getElementById('openBreedBtn').addEventListener('click', openBreedModal);
    document.getElementById('confirmBreedBtn').addEventListener('click', breedSelected);
    document.getElementById('closeBreedBtn').addEventListener('click', function () { breedModal.classList.remove('active'); });
    document.getElementById('breedBackBtn').addEventListener('click', function () { showScreen('stable'); });
    document.getElementById('breedCancelBtn').addEventListener('click', function () { showScreen('stable'); });
    document.getElementById('confirmBreedScreenBtn').addEventListener('click', breedSelected);
    document.getElementById('openRaceBtn').addEventListener('click', openSelectionScreen);
    document.getElementById('selectionBackBtn').addEventListener('click', function () { showScreen('stable'); });
    document.getElementById('selectBestBtn').addEventListener('click', chooseBestHorses);
    document.getElementById('clearSelectionBtn').addEventListener('click', function () { selectedRaceHorseIds = []; renderSelectionScreen(); showToast('Выбор очищен'); });
    document.getElementById('startSelectedRaceBtn').addEventListener('click', startRaceWithSelected);
    document.getElementById('restartRaceBtn').addEventListener('click', startRaceWithSelected);
    document.getElementById('raceBackBtn').addEventListener('click', function () { destroyRaceGame(); showScreen('selection'); });
    document.getElementById('closeResultsBtn').addEventListener('click', function () { resultsModal.classList.remove('active'); });
    document.getElementById('infoBtn').addEventListener('click', function () { infoModal.classList.add('active'); });
    document.getElementById('closeInfoBtn').addEventListener('click', function () { infoModal.classList.remove('active'); });
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (confirm('Сбросить прогресс?')) {
        localStorage.removeItem(SAVE_KEY);
        newGame();
        selectedRaceHorseIds = [];
        renderStable();
        renderSelectionScreen();
        if (breedParentOne) { breedParentOne.innerHTML = ''; breedParentTwo.innerHTML = ''; }
        showToast('Прогресс сброшен');
      }
    });

    [horseModal, trainingModal, breedModal, resultsModal, infoModal].forEach(function (modal) {
      modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
    });

    loadGame();
    renderStable();
    renderSelectionScreen();


/* Consolidated gameplay/navigation patch.
   Merged from previous menu/stable/race hotfix files.
*/
(function () {
  var RACE_TYPES = [
    { id: 'rookie', name: 'Новичковый заезд', level: 'Низкая', fee: 0, prizeMin: 30, prizeMax: 60, distance: 1000, opponents: 3, classOffset: -12, desc: 'Бесплатный старт, чтобы восстановить баланс и продолжить игру.' },
    { id: 'standard', name: 'Обычный заезд', level: 'Средняя', fee: 25, prizeMin: 80, prizeMax: 150, distance: 1600, opponents: 5, classOffset: 0, desc: 'Базовый формат: нормальные соперники и честный приз.' },
    { id: 'strong', name: 'Сильный заезд', level: 'Высокая', fee: 50, prizeMin: 180, prizeMax: 300, distance: 2000, opponents: 6, classOffset: 10, desc: 'Серьёзная проверка для прокачанных лошадей.' },
    { id: 'elite', name: 'Элитный заезд', level: 'Очень высокая', fee: 100, prizeMin: 400, prizeMax: 700, distance: 2400, opponents: 7, classOffset: 20, desc: 'Большой риск и большой приз. Нужна сильная конюшня.' }
  ];

  var BOT_NAMES = ['Гром', 'Тайфун', 'Северный Ветер', 'Золотой Барс', 'Красный Шторм', 'Феникс', 'Ледяной', 'Циклон', 'Буревестник', 'Рассвет'];

  var HELP = {
    'Скорость': 'Максимальный темп лошади на дистанции. Чем выше скорость, тем быстрее лошадь идёт на прямых участках.',
    'Выносливость': 'Помогает не проседать ближе к финишу. Особенно важна на длинных заездах.',
    'Ускорение': 'Влияет на старт и короткие рывки во время гонки.',
    'Манёвренность': 'Помогает менять дорожку, обходить соперников и терять меньше скорости при перестроении.',
    'Сила': 'Запас мощности. Помогает держать темп и стабильнее проходить плотную борьбу.',
    'Интеллект': 'Влияет на выбор траектории и шанс избежать ошибки или сбоя.',
    'Потенциал': 'Запас развития. Чем выше потенциал, тем перспективнее тренировки.',
    'Энергия': 'Текущее состояние лошади. Низкая энергия ухудшает результат в гонке.',
    'Характер': 'Особый стиль поведения в гонке: рывки, риск, стабильность или частая смена дорожек.',
    'Класс': 'Средняя сила лошади по всем основным параметрам.'
  };

  var selectedRaceTypeId = 'standard';
  var selectedPlayerHorseId = null;
  var activeRaceType = null;

  var originalShowScreen = showScreen;
  var originalRenderStable = renderStable;
  var originalShowResults = showResults;

  function byId(id) { return document.getElementById(id); }
  function currentMoney() { return typeof coins === 'number' ? coins : 0; }
  function currentRaceType() {
    return RACE_TYPES.find(function (x) { return x.id === selectedRaceTypeId; }) || RACE_TYPES[1];
  }
  function clampValue(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function addExtraScreens() {
    if (!byId('mainMenuScreen')) {
      var main = document.createElement('div');
      main.id = 'mainMenuScreen';
      main.className = 'screen';
      main.innerHTML =
        '<div class="topbar"><div class="topbar-row">' +
          '<div style="width:38px;flex:0 0 auto"></div>' +
          '<div class="topbar-title"><h1>ГЛАВНОЕ МЕНЮ</h1><p>Конюшня, гонки и развитие</p></div>' +
          '<button class="icon-btn" id="mainInfoBtn">i</button>' +
        '</div></div>' +
        '<div class="content-scroll" id="mainMenuScroll"></div>';
      document.body.insertBefore(main, document.body.firstChild);
    }

    if (!byId('raceMenuScreen')) {
      var raceMenu = document.createElement('div');
      raceMenu.id = 'raceMenuScreen';
      raceMenu.className = 'screen';
      raceMenu.innerHTML =
        '<div class="topbar"><div class="topbar-row">' +
          '<button class="icon-btn" id="raceMenuBackBtn">←</button>' +
          '<div class="topbar-title"><h1>ГОНКИ</h1><p>Выберите заезд и свою лошадь</p></div>' +
          '<div style="width:38px;flex:0 0 auto"></div>' +
        '</div></div>' +
        '<div class="content-scroll" id="raceMenuScroll"></div>' +
        '<div class="race-start-panel"><button class="btn btn-gold" id="raceMenuStartBtn" style="width:100%">Начать заезд</button></div>';
      document.body.insertBefore(raceMenu, document.body.firstChild);
    }
  }

  function hideAllScreens() {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (screen) {
      screen.classList.remove('active');
    });
  }

  showScreen = function (name) {
    if (name === 'menu') {
      hideAllScreens();
      byId('mainMenuScreen').classList.add('active');
      renderMainMenu();
      return;
    }

    if (name === 'raceMenu') {
      hideAllScreens();
      byId('raceMenuScreen').classList.add('active');
      renderRaceMenu();
      return;
    }

    originalShowScreen(name);
    var main = byId('mainMenuScreen');
    var raceMenu = byId('raceMenuScreen');
    if (main) main.classList.remove('active');
    if (raceMenu) raceMenu.classList.remove('active');
  };

  function menuTile(action, icon, title, desc, disabled) {
    return '<button class="menu-tile ' + (disabled ? 'disabled' : '') + '" data-menu="' + action + '">' +
      '<div class="menu-icon">' + icon + '</div>' +
      '<div><div class="menu-title">' + title + '</div><div class="menu-desc">' + desc + '</div></div>' +
    '</button>';
  }

  function renderMainMenu() {
    var el = byId('mainMenuScroll');
    if (!el) return;
    var horseCount = Array.isArray(horses) ? horses.length : 0;
    var avg = typeof averageClass === 'function' ? averageClass() : 0;

    el.innerHTML =
      '<section class="main-menu-hero">' +
        '<div class="main-menu-title">СКАЧКИ</div>' +
        '<div class="main-menu-sub">Развивайте конюшню, выбирайте подходящий заезд и получайте награды за короткие гонки.</div>' +
        '<div class="main-menu-stats">' +
          '<div class="chip-box"><div class="value">🪙 ' + currentMoney() + '</div><div class="label">Баланс</div></div>' +
          '<div class="chip-box"><div class="value">' + horseCount + '</div><div class="label">Лошадей</div></div>' +
          '<div class="chip-box"><div class="value">' + avg + '</div><div class="label">Класс</div></div>' +
        '</div>' +
      '</section>' +
      menuTile('stable', '🐴', 'Конюшня', 'Ваши лошади, тренировки и характеристики') +
      menuTile('races', '🏁', 'Гонки', 'Заезды, взносы, соперники и призы') +
      menuTile('breed', '🧬', 'Разведение', 'Новые потомки') +
      menuTile('rating', '🏆', 'Рейтинг', 'Скоро', true);
  }

  function renderRaceCard(raceType) {
    var selected = raceType.id === selectedRaceTypeId;
    return '<div class="race-card ' + (selected ? 'selected' : '') + '" data-race="' + raceType.id + '">' +
      '<div class="race-top">' +
        '<div><div class="race-title">' + raceType.name + '</div><div class="race-desc">' + raceType.desc + '</div></div>' +
        '<div class="race-fee">' + raceType.fee + ' 🪙</div>' +
      '</div>' +
      '<div class="race-grid">' +
        '<div class="race-box"><b>' + raceType.level + '</b><span>Соперники</span></div>' +
        '<div class="race-box"><b>' + raceType.distance + ' м</b><span>Дистанция</span></div>' +
        '<div class="race-box"><b>' + raceType.prizeMin + '–' + raceType.prizeMax + '</b><span>Приз</span></div>' +
      '</div>' +
    '</div>';
  }

  function raceFitNote(horse, raceType, horsePower) {
    var target = 65 + raceType.classOffset;
    var diff = horsePower - target;
    var energyNote = horse.energy < 25 ? ' Энергии мало.' : horse.energy < 55 ? ' Энергия средняя.' : ' Энергия хорошая.';
    if (diff >= 12) return 'Сильный выбор для этого заезда.' + energyNote;
    if (diff >= -3) return 'Подходит для этого уровня.' + energyNote;
    return 'Будет тяжело: соперники сильнее.' + energyNote;
  }

  function renderPlayerHorseCard(horse) {
    var raceType = currentRaceType();
    var power = horseClass(horse);
    var selected = String(horse.id) === String(selectedPlayerHorseId);
    return '<div class="my-horse-card ' + (selected ? 'selected' : '') + '" data-horse="' + horse.id + '">' +
      '<div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div>' +
      '<div class="my-horse-info">' +
        '<div class="my-horse-name">' + horse.name + (selected ? ' <span class="player-badge">Выбрана</span>' : '') + '</div>' +
        '<div class="select-badges">' +
          '<span class="mini-tag">Класс ' + power + '</span>' +
          '<span class="mini-tag">Энергия ' + horse.energy + '</span>' +
          '<span class="mini-tag">' + horse.temperament + '</span>' +
        '</div>' +
        '<div class="my-horse-note">' + raceFitNote(horse, raceType, power) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderRaceMenu() {
    var el = byId('raceMenuScroll');
    if (!el) return;
    if (!selectedPlayerHorseId && horses && horses[0]) selectedPlayerHorseId = String(horses[0].id);

    el.innerHTML =
      '<section class="selection-summary">' +
        '<div><div class="summary-title">Доступные заезды</div><div class="summary-desc">Выберите уровень гонки и одну свою лошадь. Соперники создаются автоматически.</div></div>' +
        '<div class="selection-count"><span>🪙</span><small>' + currentMoney() + '</small></div>' +
      '</section>' +
      '<div class="section-label">Тип гонки</div>' +
      RACE_TYPES.map(renderRaceCard).join('') +
      '<div class="section-label">Ваша лошадь</div>' +
      (horses || []).map(renderPlayerHorseCard).join('');

    var raceType = currentRaceType();
    byId('raceMenuStartBtn').textContent = raceType.fee === 0 ? 'Начать заезд • бесплатно' : 'Начать заезд • взнос ' + raceType.fee + ' 🪙';
  }

  function createBotHorse(base, index) {
    function stat() { return clampValue(base + randInt(-8, 8), 35, 100); }
    return {
      id: 'bot_' + Date.now() + '_' + index,
      name: BOT_NAMES[index % BOT_NAMES.length],
      speed: stat(),
      stamina: stat(),
      acceleration: stat(),
      agility: stat(),
      power: stat(),
      intelligence: stat(),
      potential: clampValue(base + randInt(-5, 10), 50, 100),
      energy: randInt(75, 100),
      temperament: temperaments[randInt(0, temperaments.length - 1)],
      isBot: true
    };
  }

  function startMenuRace() {
    var raceType = currentRaceType();
    var playerHorse = (horses || []).find(function (h) { return String(h.id) === String(selectedPlayerHorseId); });

    if (!playerHorse) return showToast('Выберите свою лошадь');
    if (currentMoney() < raceType.fee) return showToast('Недостаточно монет для взноса');

    coins -= raceType.fee;
    activeRaceType = raceType;

    var baseClass = clampValue(horseClass(playerHorse) + raceType.classOffset, 35, 100);
    var playerClone = JSON.parse(JSON.stringify(playerHorse));
    playerClone.name = 'Вы: ' + playerClone.name;
    playerClone.isPlayer = true;
    playerClone.playerHorseId = playerHorse.id;

    currentRaceHorses = [playerClone];
    for (var i = 0; i < raceType.opponents; i++) currentRaceHorses.push(createBotHorse(baseClass, i));

    raceResults = [];
    saveGame();
    showScreen('race');
    raceStatusEl.textContent = raceType.name + ': взнос ' + raceType.fee + ' 🪙, приз ' + raceType.prizeMin + '–' + raceType.prizeMax + ' 🪙.';
    setTimeout(createRaceGame, 40);
  }

  showResults = function () {
    if (!activeRaceType) return originalShowResults();

    raceResults.sort(function (a, b) { return parseFloat(a.time) - parseFloat(b.time); });

    var playerIndex = raceResults.findIndex(function (item) {
      return item.horse && item.horse.isPlayer;
    });
    var place = playerIndex + 1;
    var reward = 0;

    if (place === 1) reward = activeRaceType.prizeMax;
    else if (place === 2) reward = Math.round((activeRaceType.prizeMin + activeRaceType.prizeMax) / 2);
    else if (place === 3) reward = activeRaceType.prizeMin;

    coins += reward;

    var playerResult = raceResults[playerIndex];
    if (playerResult && playerResult.horse && playerResult.horse.playerHorseId) {
      var realHorse = horses.find(function (h) { return String(h.id) === String(playerResult.horse.playerHorseId); });
      if (realHorse) realHorse.energy = Math.max(0, realHorse.energy - randInt(6, 12));
    }

    saveGame();
    renderStable();

    var total = reward > 0 ? '+' + reward + ' 🪙' : '-' + activeRaceType.fee + ' 🪙';
    resultsListEl.innerHTML =
      '<div class="results-header"><div class="winner-banner"><div class="winner-crown">🏁</div><div class="winner-main">' +
      '<div class="winner-place">Ваш результат</div><div class="winner-name">' + (place || '—') + ' место</div>' +
      '<div class="winner-time">' + activeRaceType.name + ' • итог: ' + total + '</div></div></div></div>' +
      raceResults.map(function (item, index) {
        var isPlayer = item.horse && item.horse.isPlayer;
        return '<div class="result-item"><div class="result-head"><div>' +
          '<div style="font-size:16px;font-weight:900">' + (index + 1) + '. ' + item.name + (isPlayer ? ' <span class="player-badge">Вы</span>' : '') + '</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:4px">Время: ' + item.time + ' сек</div>' +
          '</div><div class="result-reward">' + (isPlayer ? total : '') + '</div></div></div>';
      }).join('') +
      '<button class="btn btn-gold" id="resultRaceMenuBtn" style="width:100%;margin-top:12px">В меню гонок</button>' +
      '<button class="btn btn-dark" id="resultMainMenuBtn" style="width:100%;margin-top:10px">В главное меню</button>';

    resultsModal.classList.add('active');
    setTimeout(function () {
      var raceBtn = byId('resultRaceMenuBtn');
      var mainBtn = byId('resultMainMenuBtn');
      if (raceBtn) raceBtn.onclick = function () { resultsModal.classList.remove('active'); showScreen('raceMenu'); };
      if (mainBtn) mainBtn.onclick = function () { resultsModal.classList.remove('active'); showScreen('menu'); };
    }, 0);

    showToast(reward > 0 ? 'Выигрыш: 🪙 ' + reward : 'Приз не получен');
    activeRaceType = null;
  };

  function fixStableScreen() {
    var footer = document.querySelector('#stableScreen .footer-actions');
    if (footer) footer.style.display = 'none';

    var back = byId('resetBtn') || byId('stableBackMenuBtn');
    if (back) {
      back.id = 'stableBackMenuBtn';
      back.textContent = '←';
      back.title = 'В главное меню';
    }

    var subtitle = document.querySelector('#stableScreen .topbar-title p');
    if (subtitle) subtitle.textContent = 'Ваши лошади и развитие конюшни';
  }

  renderStable = function () {
    originalRenderStable();
    fixStableScreen();
  };

  function enableDetailsHelp() {
    Array.prototype.forEach.call(document.querySelectorAll('#horseModal .detail-box .label'), function (label) {
      var key = (label.textContent || '').trim();
      if (HELP[key]) {
        label.classList.add('helpable');
        label.setAttribute('data-help', key);
      }
    });
  }

  function showInlineHelp(target) {
    var key = target.getAttribute('data-help') || (target.textContent || '').trim();
    if (!HELP[key]) return;

    var box = target.closest('.detail-box') || target.parentElement;
    if (!box) return;

    var existing = box.querySelector('.inline-param-help');
    if (existing) {
      existing.remove();
      return;
    }

    Array.prototype.forEach.call(document.querySelectorAll('#horseModal .inline-param-help'), function (el) { el.remove(); });

    var note = document.createElement('div');
    note.className = 'inline-param-help';
    note.innerHTML = '<b>' + key + '</b>' + HELP[key];
    box.appendChild(note);
  }

  function removeLegacyRaceOverlays() {
    var top = byId('raceDomBoard');
    if (top) top.remove();
    var bottom = byId('raceBelowBoard');
    if (bottom) bottom.remove();
  }

  function restoreSideLeaderboard() {
    var scene = raceGame && raceGame.scene && raceGame.scene.scenes && raceGame.scene.scenes[0];
    if (!scene) return;
    if (scene.boardBox) scene.boardBox.setVisible(true);
    if (scene.boardLines) scene.boardLines.forEach(function (line) { if (line) line.setVisible(true); });
  }

  setInterval(function () {
    removeLegacyRaceOverlays();
    restoreSideLeaderboard();
  }, 300);

  function bindConsolidatedUI() {
    byId('mainMenuScroll').addEventListener('click', function (e) {
      var tile = e.target.closest('[data-menu]');
      if (!tile) return;
      var action = tile.getAttribute('data-menu');
      if (action === 'stable') return showScreen('stable');
      if (action === 'races') return showScreen('raceMenu');
      if (action === 'breed') return openBreedModal();
      if (action === 'rating') return showToast('Рейтинг добавим позже');
    });

    byId('raceMenuBackBtn').addEventListener('click', function () { showScreen('menu'); });

    byId('raceMenuScroll').addEventListener('click', function (e) {
      var raceCard = e.target.closest('[data-race]');
      if (raceCard) {
        selectedRaceTypeId = raceCard.getAttribute('data-race');
        renderRaceMenu();
        return;
      }

      var horseCard = e.target.closest('[data-horse]');
      if (horseCard) {
        selectedPlayerHorseId = horseCard.getAttribute('data-horse');
        renderRaceMenu();
      }
    });

    byId('raceMenuStartBtn').addEventListener('click', startMenuRace);

    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'stableBackMenuBtn') {
        e.preventDefault();
        e.stopImmediatePropagation();
        showScreen('menu');
      }
    }, true);

    document.addEventListener('click', function (e) {
      var oldRaceButton = e.target.closest('#openRaceBtn');
      if (!oldRaceButton) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showScreen('raceMenu');
    }, true);

    document.addEventListener('click', function (e) {
      var detailsButton = e.target.closest('button[data-action="details"]');
      if (detailsButton) setTimeout(enableDetailsHelp, 30);

      var helpTarget = e.target.closest('#horseModal .helpable');
      if (helpTarget) {
        e.preventDefault();
        e.stopPropagation();
        showInlineHelp(helpTarget);
      }
    }, true);

    var raceBack = byId('raceBackBtn');
    if (raceBack) {
      raceBack.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        destroyRaceGame();
        showScreen('raceMenu');
      }, true);
    }

    var breedBack = byId('breedBackBtn');
    if (breedBack) {
      breedBack.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showScreen('menu');
      }, true);
    }

    var breedCancel = byId('breedCancelBtn');
    if (breedCancel) {
      breedCancel.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showScreen('menu');
      }, true);
    }

    var mainInfo = byId('mainInfoBtn');
    if (mainInfo) mainInfo.addEventListener('click', function () { if (infoModal) infoModal.classList.add('active'); });
  }

  addExtraScreens();
  fixStableScreen();
  bindConsolidatedUI();
  renderStable();
  renderMainMenu();
  showScreen('menu');
})();
