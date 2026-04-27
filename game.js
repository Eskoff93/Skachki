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
      return Math.round((h.speed + h.stamina + h.acceleration + h.agility + h.power + h.intelligence) / 6);
    }

    function behaviorLabel(temperament) {
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
      g.fillRect(34, 30, 12, 16);
      g.fillStyle(0x111111, 1);
      g.fillRect(32, 48, 4, 12);
      g.fillRect(44, 48, 4, 12);
      g.fillRect(34, 20, 3, 8);
      g.fillRect(43, 20, 3, 8);
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(40, 27, 2);
      g.generateTexture(key, 80, 64);
      g.destroy();
      var badge = scene.make.graphics({ x: 0, y: 0, add: false });
      badge.fillStyle(color, 1);
      badge.fillCircle(10, 10, 10);
      badge.lineStyle(2, 0xffffff, 0.8);
      badge.strokeCircle(10, 10, 10);
      badge.generateTexture(key + '_badge', 20, 20);
      badge.destroy();
    }

    function makeConfettiTexture(scene) {
      if (scene.textures.exists('confetti_dot')) return;
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('confetti_dot', 8, 8);
      g.destroy();
    }

    class TopTrackRaceScene extends Phaser.Scene {
      constructor() { super('TopTrackRaceScene'); }
      preload() {
        if (!this.cache.audio.exists('beep')) this.load.audio('beep', './beep.wav');
      }
      create() {
        raceRunning = false;
        this.w = this.scale.width;
        this.h = this.scale.height;
        this.distanceMeters = 1600;
        this.trackLanes = Math.max(4, Math.min(8, currentRaceHorses.length));
        this.laneWidth = Math.max(7, Math.min(10, this.w * 0.022));
        this.panelW = Math.min(174, Math.max(126, this.w * 0.40));
        this.mapLeft = this.panelW + 12;
        this.mapRight = this.w - 14;
        this.mapW = Math.max(180, this.mapRight - this.mapLeft);
        this.centerX = this.mapLeft + this.mapW * 0.53;
        this.centerY = this.h * 0.56;
        this.baseRadius = Math.max(46, Math.min(72, this.mapW * 0.24));
        this.halfStraight = Math.max(102, Math.min(185, this.h * 0.285));
        this.totalLaps = 1.0;
        this.finishShown = false;
        this.colors = [0xe94c4c, 0x3aa0ff, 0x2ecc71, 0xf5c542, 0x8b7cff, 0xff944d, 0x11b7a3, 0xcfd8e3];
        this.cameras.main.setBackgroundColor('#102f48');
        this.drawScene();
        this.createHud();
        this.createLeaderboard();
        this.createRunners();
        this.createCountdown();
        this.showCountdown();
      }
      drawScene() {
        this.add.rectangle(0, 0, this.w, this.h, 0x102f48).setOrigin(0, 0);
        this.add.rectangle(0, 0, this.w, this.h, 0x071423, 0.20).setOrigin(0, 0);
        var bg = this.add.graphics();
        bg.fillStyle(0x1f7d46, 0.20);
        bg.fillRoundedRect(this.mapLeft - 8, 104, this.mapW + 2, this.h - 166, 24);
        bg.fillStyle(0x0c2033, 0.78);
        bg.fillRoundedRect(10, 12, this.w - 20, 80, 18);
        bg.lineStyle(1, 0xffffff, 0.10);
        bg.strokeRoundedRect(10, 12, this.w - 20, 80, 18);

        this.add.text(22, 20, 'Забег 7', { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#68e6a1' }).setDepth(105);
        this.add.text(22, 42, '1600 м | Газон | Хорошая', { fontFamily: 'Arial', fontSize: '12px', color: '#d7e7f5' }).setDepth(105);
        this.timerText = this.add.text(this.w - 22, 22, '0:00.0', { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 0).setDepth(105);
        this.add.text(this.w - 22, 46, 'ТАЙМЕР', { fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: '#9fb3c8' }).setOrigin(1, 0).setDepth(105);

        this.drawProgressScale();
        this.drawStands();
        this.drawStadiumTrack();
      }
      drawProgressScale() {
        var x0 = 22, x1 = this.w - 22, y = 78;
        this.progressBg = this.add.graphics().setDepth(106);
        this.progressBg.lineStyle(5, 0xffffff, 0.12);
        this.progressBg.beginPath();
        this.progressBg.moveTo(x0, y);
        this.progressBg.lineTo(x1, y);
        this.progressBg.strokePath();
        this.progressFill = this.add.graphics().setDepth(107);
        this.progressLabels = [];
        var marks = [0, 400, 800, 1200, 1600];
        for (var i = 0; i < marks.length; i++) {
          var px = x0 + (x1 - x0) * (marks[i] / 1600);
          this.add.circle(px, y, 4, 0xffffff, i === 0 || i === marks.length - 1 ? 0.95 : 0.55).setDepth(108);
          this.add.text(px, y + 8, marks[i] === 0 ? 'СТАРТ' : (marks[i] === 1600 ? 'ФИНИШ' : marks[i] + ' м'), { fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: '#cfe2f5' }).setOrigin(0.5, 0).setDepth(108);
        }
      }
      drawStands() {
        var g = this.add.graphics();
        g.fillStyle(0x203447, 0.92);
        g.fillRoundedRect(this.mapLeft - 4, this.h - 52, this.mapW, 28, 12);
        g.fillStyle(0x314a62, 1);
        var count = Math.max(18, Math.floor(this.mapW / 12));
        for (var i = 0; i < count; i++) {
          var x = this.mapLeft + i * (this.mapW / count);
          g.fillStyle(i % 3 === 0 ? 0xf5c542 : (i % 3 === 1 ? 0x8bd7ff : 0xe8eef5), 0.85);
          g.fillCircle(x + 4, this.h - 38, 2.4);
        }
      }
      getTrackPoints(lane, samples) {
        var pts = [];
        for (var i = 0; i <= samples; i++) pts.push(this.trackPos(lane, i / samples));
        return pts;
      }
      drawStadiumTrack() {
        var outerLane = this.trackLanes - 1;
        var track = this.add.graphics();
        track.lineStyle(this.trackLanes * this.laneWidth + 16, 0x8b6642, 1);
        this.strokeTrackLine(track, outerLane / 2, 220, false);

        var grass = this.add.graphics();
        var innerR = Math.max(24, this.baseRadius - this.laneWidth * 1.55);
        grass.fillStyle(0x2f843f, 1);
        grass.fillRoundedRect(this.centerX - innerR, this.centerY - this.halfStraight, innerR * 2, this.halfStraight * 2, innerR);
        grass.fillStyle(0x3b9650, 0.68);
        grass.fillRoundedRect(this.centerX - innerR * 0.64, this.centerY - this.halfStraight + 20, innerR * 1.28, this.halfStraight * 2 - 40, innerR * 0.60);
        this.add.text(this.centerX, this.centerY, 'ТАКТИЧЕСКАЯ\nКАРТА', { fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#d8f5df', align: 'center' }).setOrigin(0.5).setAlpha(0.55).setDepth(3);

        var lanes = this.add.graphics();
        for (var i = 0; i < this.trackLanes; i++) {
          lanes.lineStyle(1.5, 0xe8d1ae, i === 0 ? 0.44 : 0.24);
          this.strokeTrackLine(lanes, i, 220, true);
        }
        var rail = this.add.graphics();
        rail.lineStyle(3, 0xf8ecd8, 0.75);
        this.strokeTrackLine(rail, -0.86, 220, true);
        rail.lineStyle(3, 0xf8ecd8, 0.58);
        this.strokeTrackLine(rail, this.trackLanes - 0.12, 220, true);

        var startOuter = this.trackPos(this.trackLanes - 1, 0);
        var startInner = this.trackPos(0, 0);
        this.drawFinishLine(startOuter, startInner);
        this.add.text(startOuter.x + 8, startOuter.y - 4, 'ФИНИШ', { fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: '#ffffff', stroke: '#102033', strokeThickness: 3 }).setDepth(25);
        this.add.text(this.centerX + this.baseRadius + this.trackLanes * this.laneWidth + 10, this.centerY + this.halfStraight * 0.2, '1200 м', { fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1f8f55', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(12);
      }
      strokeTrackLine(graphics, lane, samples, stroke) {
        var p0 = this.trackPos(lane, 0);
        graphics.beginPath();
        graphics.moveTo(p0.x, p0.y);
        for (var i = 1; i <= samples; i++) {
          var p = this.trackPos(lane, i / samples);
          graphics.lineTo(p.x, p.y);
        }
        graphics.closePath();
        graphics.strokePath();
      }
      drawFinishLine(outerPos, innerPos) {
        var dx = outerPos.x - innerPos.x;
        var dy = outerPos.y - innerPos.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var angle = Math.atan2(dy, dx) + Math.PI / 2;
        var steps = 16;
        for (var i = 0; i < steps; i++) {
          var t = i / steps;
          var x = innerPos.x + dx * t;
          var y = innerPos.y + dy * t;
          this.add.rectangle(x, y, 9, len / steps + 3, i % 2 === 0 ? 0xffffff : 0x101010, 1).setRotation(angle).setDepth(26);
        }
      }
      createHud() {
        this.distanceText = this.add.text(this.mapRight, 112, '1600 м до финиша', { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0f2236', padding: { x: 9, y: 5 } }).setOrigin(1, 0).setDepth(110);
        this.eventTicker = this.add.text(this.panelW + 22, this.h - 82, 'События заезда появятся здесь', { fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#dce8f2', backgroundColor: '#0f2236', padding: { x: 8, y: 5 } }).setDepth(111).setAlpha(0.82);
      }
      createLeaderboard() {
        var rows = Math.min(8, currentRaceHorses.length);
        var boardX = 12;
        var boardY = 112;
        var boardW = this.panelW - 16;
        var boardH = 38 + rows * 44;
        var g = this.add.graphics().setDepth(100);
        g.fillStyle(0x0d2135, 0.92);
        g.fillRoundedRect(boardX, boardY, boardW, boardH, 16);
        g.lineStyle(1, 0xffffff, 0.13);
        g.strokeRoundedRect(boardX, boardY, boardW, boardH, 16);
        this.add.text(boardX + 12, boardY + 10, 'ЛИДЕРЫ', { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setDepth(101);
        this.boardRows = [];
        for (var i = 0; i < rows; i++) {
          var y = boardY + 36 + i * 44;
          var rowG = this.add.graphics().setDepth(101);
          rowG.fillStyle(0xffffff, 0.045);
          rowG.fillRoundedRect(boardX + 8, y, boardW - 16, 36, 10);
          var place = this.add.text(boardX + 18, y + 8, String(i + 1), { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setDepth(102);
          var name = this.add.text(boardX + 38, y + 6, '', { fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: '#ffffff' }).setDepth(102);
          var meta = this.add.text(boardX + 38, y + 20, '', { fontFamily: 'Arial', fontSize: '9px', color: '#9fb3c8' }).setDepth(102);
          var barBg = this.add.rectangle(boardX + boardW - 26, y + 24, 26, 4, 0xffffff, 0.16).setOrigin(0.5).setDepth(102);
          var bar = this.add.rectangle(boardX + boardW - 39, y + 24, 1, 4, 0x2ecc71, 0.95).setOrigin(0, 0.5).setDepth(103);
          this.boardRows.push({ place: place, name: name, meta: meta, bar: bar, barBg: barBg });
        }
      }
      createRunners() {
        var self = this;
        this.runners = currentRaceHorses.slice(0, 8).map(function (horse, index) {
          var color = self.colors[index % self.colors.length];
          makeRunnerTextures(self, 'runner_' + index, color);
          var lane = Math.min(index, self.trackLanes - 1);
          var pos = self.trackPos(lane, index * -0.012);
          var container = self.add.container(pos.x, pos.y).setDepth(40 + index);
          var sprite = self.add.image(0, 0, 'runner_' + index).setScale(0.58);
          var badge = self.add.image(-15, -17, 'runner_' + index + '_badge').setScale(0.86);
          var number = self.add.text(-15, -17, String(index + 1), { fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
          container.add([sprite, badge, number]);
          container.setRotation(pos.rotation);
          return { horse: horse, color: color, lane: lane, targetLane: lane, progress: index * -0.012, done: false, burst: 0, burstTimer: randInt(3600, 6900), laneTimer: randInt(1100, 2200), finishTime: null, stumbleTimer: 0, eventCooldown: randInt(3400, 7200), displaySpeed: 0, profile: temperamentRaceProfile(horse.temperament), container: container };
        });
      }
      createCountdown() {
        this.countText = this.add.text(this.centerX, this.centerY, '', { fontFamily: 'Arial', fontSize: '48px', fontStyle: 'bold', color: '#ffffff', stroke: '#0c1d2d', strokeThickness: 6 }).setOrigin(0.5).setDepth(130);
      }
      showCountdown() {
        var self = this;
        var steps = ['3', '2', '1', 'СТАРТ'];
        var idx = 0;
        var beep = this.sound.add('beep', { volume: 0.28 });
        raceStatusEl.textContent = 'Подготовка к старту...';
        function tick() {
          if (idx >= steps.length) { self.countText.setVisible(false); self.beginRace(); return; }
          self.countText.setText(steps[idx]);
          self.countText.setScale(0.75);
          self.tweens.add({ targets: self.countText, scale: 1, duration: 280, ease: 'Back.Out' });
          try { beep.play(); } catch (e) {}
          playTone(520, 0.07, 'square', 0.05);
          idx += 1;
          self.time.delayedCall(700, tick);
        }
        tick();
      }
      beginRace() {
        raceRunning = true;
        raceResults = [];
        this.startTime = this.time.now;
        raceStatusEl.textContent = 'Гонка началась. Средний темп — около 30 секунд.';
        this.eventTicker.setText('Старт! Лошади вышли на дистанцию.');
        startHoofSound();
      }
      trackPos(lane, progress) {
        var laneNum = Number(lane);
        var r = this.baseRadius + laneNum * this.laneWidth;
        var straight = this.halfStraight;
        var straightLen = straight * 2;
        var arcLen = Math.PI * r;
        var total = 2 * straightLen + 2 * arcLen;
        var d = ((progress % 1) + 1) % 1 * total;
        var x, y, tx, ty;
        if (d < straightLen) {
          var t1 = d / straightLen;
          x = this.centerX + r;
          y = this.centerY - straight + t1 * straightLen;
          tx = 0; ty = 1;
        } else if (d < straightLen + arcLen) {
          var a1 = ((d - straightLen) / arcLen) * Math.PI;
          x = this.centerX + Math.cos(a1) * r;
          y = this.centerY + straight + Math.sin(a1) * r;
          tx = -Math.sin(a1); ty = Math.cos(a1);
        } else if (d < 2 * straightLen + arcLen) {
          var t2 = (d - straightLen - arcLen) / straightLen;
          x = this.centerX - r;
          y = this.centerY + straight - t2 * straightLen;
          tx = 0; ty = -1;
        } else {
          var a2 = Math.PI + ((d - 2 * straightLen - arcLen) / arcLen) * Math.PI;
          x = this.centerX + Math.cos(a2) * r;
          y = this.centerY - straight + Math.sin(a2) * r;
          tx = -Math.sin(a2); ty = Math.cos(a2);
        }
        return { x: x, y: y, rotation: Math.atan2(ty, tx) };
      }
      findRunnerAhead(base) {
        var nearest = null;
        for (var i = 0; i < this.runners.length; i++) {
          var other = this.runners[i];
          if (other === base || other.done) continue;
          if (Math.abs(other.lane - base.lane) > 1.1) continue;
          var diff = other.progress - base.progress;
          if (diff > 0 && (!nearest || diff < nearest.distance)) nearest = { runner: other, distance: diff };
        }
        return nearest;
      }
      showRaceEvent(runner, text, color) {
        this.eventTicker.setText(runner.horse.name + ': ' + text);
        var label = this.add.text(runner.container.x, runner.container.y - 28, text, { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: color || '#ffffff', stroke: '#0b1724', strokeThickness: 4 }).setOrigin(0.5).setDepth(140);
        this.tweens.add({ targets: label, y: label.y - 20, alpha: 0, duration: 820, ease: 'Quad.Out', onComplete: function () { label.destroy(); } });
      }
      update(time, delta) {
        if (!raceRunning) return;
        var elapsed = Math.max(0, time - this.startTime);
        var minutes = Math.floor(elapsed / 60000);
        var seconds = ((elapsed % 60000) / 1000).toFixed(1).padStart(4, '0');
        this.timerText.setText(minutes + ':' + seconds);
        var deltaFactor = delta / 16.6667;
        for (var i = 0; i < this.runners.length; i++) {
          var runner = this.runners[i];
          if (runner.done) continue;
          var horse = runner.horse;
          var progressRatio = Phaser.Math.Clamp(runner.progress / this.totalLaps, 0, 1);

          runner.eventCooldown = Math.max(0, runner.eventCooldown - delta);
          if (runner.eventCooldown <= 0 && runner.stumbleTimer <= 0 && Math.random() < 0.000020 * deltaFactor) {
            var safeChance = (horse.intelligence + horse.agility) / 265;
            if (Math.random() > safeChance) {
              runner.stumbleTimer = randInt(700, 1150);
              runner.burst = 0;
              this.showRaceEvent(runner, 'Сбилась!', '#ff6f8f');
              this.cameras.main.shake(80, 0.003);
            }
            runner.eventCooldown = randInt(5200, 8500);
          }

          runner.burstTimer -= delta;
          if (runner.burstTimer <= 0 && runner.stumbleTimer <= 0) {
            runner.burst = 0.00023 + Math.random() * 0.00036 + (runner.profile ? runner.profile.burstBonus * 0.15 : 0);
            runner.burstTimer = randInt(4300, 7600);
            if (Math.random() < 0.45) this.showRaceEvent(runner, 'Рывок!', '#ffd34d');
          }
          runner.burst *= 0.985;
          runner.stumbleTimer = Math.max(0, runner.stumbleTimer - delta);

          runner.laneTimer -= delta;
          if (runner.laneTimer <= 0) {
            var ahead = this.findRunnerAhead(runner);
            var laneChangeChance = 0.12;
            if (horse.temperament === 'Упрямая') laneChangeChance = 0.05;
            if (horse.temperament === 'Смелая') laneChangeChance = 0.23;
            if (horse.temperament === 'Пугливая') laneChangeChance = 0.18;
            if (horse.temperament === 'Резкая') laneChangeChance = 0.38;
            if (ahead && ahead.distance < 0.018) {
              var dir = Math.random() < 0.5 ? -1 : 1;
              runner.targetLane = Phaser.Math.Clamp(Math.round(runner.targetLane + dir), 0, this.trackLanes - 1);
            } else if (Math.random() < laneChangeChance) {
              runner.targetLane = Phaser.Math.Clamp(Math.round(runner.lane) + (Math.random() < 0.5 ? -1 : 1), 0, this.trackLanes - 1);
            }
            runner.laneTimer = randInt(1050, 2100) / (runner.profile ? runner.profile.laneChangeBonus : 1);
          }
          runner.lane += (runner.targetLane - runner.lane) * Math.min(1, (delta / 1000) * (horse.temperament === 'Резкая' ? 4.4 : 2.9));

          var baseSpeed = 0.000205 + horse.speed * 0.00000215 + horse.acceleration * 0.00000105 + horse.stamina * 0.00000100;
          var tactical = horse.agility * 0.00000068 + horse.intelligence * 0.00000055;
          var energyFactor = 0.86 + (horse.energy / 100) * 0.17;
          var lanePenalty = Math.abs(runner.targetLane - runner.lane) * 0.000026;
          var randomJitter = (Math.random() - 0.5) * 0.000036;
          var behaviorFactor = 1;
          var burstFactor = 1;
          var fatigueFactor = 1;

          if (horse.temperament === 'Смелая') { burstFactor = 1.22; randomJitter *= 1.25; }
          else if (horse.temperament === 'Пугливая') { behaviorFactor *= progressRatio < 0.18 ? 0.92 : 1.035; randomJitter *= 1.12; }
          else if (horse.temperament === 'Упрямая') { behaviorFactor *= 1.01; lanePenalty *= 0.58; randomJitter *= 0.58; }
          else if (horse.temperament === 'Резкая') { lanePenalty *= 0.62; runner.laneTimer = Math.min(runner.laneTimer, 480); randomJitter *= 1.12; }
          else if (horse.temperament === 'Быстрая') { behaviorFactor *= progressRatio < 0.34 ? 1.09 : (progressRatio > 0.76 ? 0.965 : 1.01); }

          if (progressRatio > 0.68) {
            var tiredness = (progressRatio - 0.68) / 0.32;
            fatigueFactor = 1 - Math.min(0.16, tiredness * (1 - horse.stamina / 132));
          }
          if (runner.stumbleTimer > 0) { behaviorFactor *= 0.52; randomJitter -= 0.000024; }

          var step = (baseSpeed + tactical + runner.burst * burstFactor - lanePenalty + randomJitter) * energyFactor * behaviorFactor * fatigueFactor * deltaFactor;
          step = Math.max(0.000065, step);
          runner.progress += step;
          runner.displaySpeed = Phaser.Math.Linear(runner.displaySpeed || 0, 48 + step * 21000, 0.12);
          var pos = this.trackPos(runner.lane, runner.progress);
          runner.container.setPosition(pos.x, pos.y + (runner.stumbleTimer > 0 ? Math.sin(time / 40) * 2 : 0));
          runner.container.setRotation(pos.rotation);
          runner.container.setScale(runner.stumbleTimer > 0 ? 0.92 : 1);
          if (runner.progress >= this.totalLaps) {
            runner.done = true;
            runner.finishTime = ((time - this.startTime) / 1000).toFixed(2);
            raceResults.push({ name: horse.name, time: runner.finishTime, horse: horse });
            if (raceResults.length === 1) this.showFinishAnimation(horse.name);
            if (raceResults.length === this.runners.length) {
              raceRunning = false;
              raceStatusEl.textContent = 'Гонка завершена! Результаты готовы.';
              playFinish();
              this.time.delayedCall(700, function () { showResults(); });
            }
          }
        }
        this.updateLeaderboard();
        this.updateProgressHud();
      }
      updateProgressHud() {
        var leader = this.runners.slice().sort(function (a, b) { return b.progress - a.progress; })[0];
        var ratio = leader ? Phaser.Math.Clamp(leader.progress / this.totalLaps, 0, 1) : 0;
        var x0 = 22, x1 = this.w - 22, y = 78;
        this.progressFill.clear();
        this.progressFill.lineStyle(5, 0x2ecc71, 0.95);
        this.progressFill.beginPath();
        this.progressFill.moveTo(x0, y);
        this.progressFill.lineTo(x0 + (x1 - x0) * ratio, y);
        this.progressFill.strokePath();
        var left = Math.max(0, Math.round(this.distanceMeters * (1 - ratio)));
        this.distanceText.setText(left + ' м до финиша');
      }
      showFinishAnimation(name) {
        if (this.finishShown) return;
        this.finishShown = true;
        makeConfettiTexture(this);
        var title = this.add.text(this.centerX, this.centerY - 12, 'ФИНИШ!', { fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold', color: '#ffffff', stroke: '#0c1d2d', strokeThickness: 6 }).setOrigin(0.5).setDepth(150).setScale(0.4);
        var sub = this.add.text(this.centerX, this.centerY + 20, name + ' первым пересёк линию', { fontFamily: 'Arial', fontSize: '14px', color: '#fff3c2', fontStyle: 'bold' }).setOrigin(0.5).setDepth(150).setAlpha(0);
        this.tweens.add({ targets: title, scale: 1, duration: 260, ease: 'Back.Out' });
        this.tweens.add({ targets: sub, alpha: 1, duration: 220, delay: 140 });
        this.tweens.add({ targets: [title, sub], alpha: 0, duration: 450, delay: 1200, onComplete: function () { title.destroy(); sub.destroy(); } });
        var particles = this.add.particles(0, 0, 'confetti_dot', { x: this.centerX, y: this.centerY - 20, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0.4 }, blendMode: 'ADD', lifespan: 900, quantity: 6, tint: [0xffd54d, 0x4ab0ff, 0xff7ea8, 0x47d56d, 0xa088ff] });
        this.time.delayedCall(850, function () { particles.stop(); });
        this.time.delayedCall(1600, function () { particles.destroy(); });
      }
      updateLeaderboard() {
        var sorted = this.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
        for (var i = 0; i < this.boardRows.length; i++) {
          var row = this.boardRows[i];
          var runner = sorted[i];
          if (!runner) { row.name.setText(''); row.meta.setText(''); row.bar.setDisplaySize(1, 4); continue; }
          row.place.setText(String(i + 1));
          row.place.setColor('#' + runner.color.toString(16).padStart(6, '0'));
          row.name.setText(runner.horse.name.slice(0, 13));
          row.meta.setText(Math.round(runner.displaySpeed || 0) + ' км/ч • ⚡ ' + Math.max(0, Math.round(runner.horse.energy)));
          row.bar.fillColor = runner.color;
          row.bar.setDisplaySize(Math.max(2, 26 * (runner.horse.energy / 100)), 4);
        }
      }
    }


    function destroyRaceGame() {
      stopHoofSound();
      if (raceGame) {
        try { raceGame.destroy(true); } catch (e) {}
        raceGame = null;
      }
      document.getElementById('phaser-game').innerHTML = '';
    }

    function createRaceGame() {
      destroyRaceGame();
      var phaserBox = document.getElementById('phaserBox');
      raceGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'phaser-game',
        width: Math.max(320, phaserBox.clientWidth),
        height: Math.max(420, phaserBox.clientHeight),
        backgroundColor: '#16304a',
        antialias: true,
        roundPixels: false,
        resolution: Math.max(2, Math.min(3, window.devicePixelRatio || 1)),
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false, transparent: false },
        scene: [TopTrackRaceScene]
      });
    }

    function openSelectionScreen() {
      renderSelectionScreen();
      showScreen('selection');
    }

    function startRaceWithSelected() {
      if (selectedRaceHorseIds.length < 2) return showToast('Нужно минимум 2 участника');
      currentRaceHorses = horses.filter(function (h) { return selectedRaceHorseIds.indexOf(String(h.id)) !== -1; }).map(function (h) { return JSON.parse(JSON.stringify(h)); });
      raceResults = [];
      showScreen('race');
      raceStatusEl.textContent = 'Инициализация заезда...';
      setTimeout(createRaceGame, 40);
    }

    function buildResultsHTML(items, totalReward) {
      var winner = items[0];
      var podium = items.slice(0, 3);
      var rest = items.slice(3);
      var html = '';
      if (winner) {
        html += '<div class="results-header">' +
          '<div class="winner-banner">' +
            '<div class="winner-crown">👑</div>' +
            '<div class="winner-main">' +
              '<div class="winner-place">Победитель заезда</div>' +
              '<div class="winner-name">' + winner.name + '</div>' +
              '<div class="winner-time">Время: ' + winner.time + ' сек • Награда: +' + winner.reward + ' 🪙</div>' +
            '</div>' +
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
