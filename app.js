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
      if (Telegram.WebApp.contentSafeAreaInset && Telegram.WebApp.contentSafeAreaInset.top) topInset = Telegram.WebApp.contentSafeAreaInset.top;
      else if (Telegram.WebApp.safeAreaInset && Telegram.WebApp.safeAreaInset.top) topInset = Telegram.WebApp.safeAreaInset.top;
      if (topInset) document.documentElement.style.setProperty('--tg-top-offset', Math.max(20, topInset) + 'px');
    }
  } catch (e) {}
})();

(function () {
  var DATA = window.SKACHKI_DATA || {};
  var HORSE = window.SKACHKI_HORSE || {};
  var STORE = window.SKACHKI_STATE || {};

  var stableNames = DATA.stableNames || ['Буран', 'Молния', 'Ветерок'];
  var temperaments = DATA.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
  var trainingTypes = DATA.trainingTypes || [];
  var raceTypes = DATA.raceTypes || [];
  var botNames = DATA.botNames || ['Гром', 'Тайфун', 'Северный Ветер', 'Золотой Барс', 'Красный Шторм', 'Феникс'];
  var parameterHelp = DATA.parameterHelp || {};

  var horses = [];
  var coins = 250;
  var selectedTrainingHorseId = null;
  var selectedPlayerHorseId = null;
  var selectedRaceTypeId = 'rookie';
  var currentRaceHorses = [];
  var raceResults = [];
  var activeRaceType = null;
  var raceGame = null;
  var audioCtx = null;
  var hoofTimer = null;

  var stableScreen = byId('stableScreen');
  var selectionScreen = byId('selectionScreen');
  var trainingScreen = byId('trainingScreen');
  var breedScreen = byId('breedScreen');
  var raceScreen = byId('raceScreen');
  var horseListEl = byId('horseList');
  var summaryGridEl = byId('summaryGrid');
  var coinsPill = byId('coinsPill');
  var raceStatusEl = byId('raceStatus');
  var resultsListEl = byId('resultsList');
  var toastEl = byId('toast');
  var horseModal = byId('horseModal');
  var horseModalTitle = byId('horseModalTitle');
  var horseModalBody = byId('horseModalBody');
  var trainingHero = byId('trainingHero');
  var trainingScreenOptions = byId('trainingScreenOptions');
  var breedParentOne = byId('breedParentOne');
  var breedParentTwo = byId('breedParentTwo');
  var breedCompareGrid = byId('breedCompareGrid');
  var childPreviewText = byId('childPreviewText');
  var childPreviewGrid = byId('childPreviewGrid');
  var resultsModal = byId('resultsModal');
  var infoModal = byId('infoModal');

  function byId(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function clamp(v, min, max) { return window.clampValue ? window.clampValue(v, min, max) : Math.max(min, Math.min(max, v)); }
  function createHorse(name) { return HORSE.createHorse ? HORSE.createHorse(name, randInt) : fallbackCreateHorse(name); }
  function horseClass(h) { return HORSE.horseClass ? HORSE.horseClass(h) : Math.round((h.speed + h.stamina + h.acceleration + h.agility + h.power + h.intelligence) / 6); }
  function behaviorLabel(t) { return HORSE.behaviorLabel ? HORSE.behaviorLabel(t) : 'обычный стиль гонки'; }
  function fallbackCreateHorse(name) {
    return { id: Date.now() + Math.random().toString(36).slice(2, 8), name: name, speed: randInt(54, 78), stamina: randInt(52, 76), acceleration: randInt(52, 78), agility: randInt(48, 74), power: randInt(48, 74), intelligence: randInt(50, 76), potential: randInt(84, 100), energy: randInt(74, 100), temperament: temperaments[randInt(0, temperaments.length - 1)] };
  }
  function saveGame() { if (STORE.save) STORE.save({ horses: horses, coins: coins }); else localStorage.setItem('skachki_proto_toptrack_v2', JSON.stringify({ horses: horses, coins: coins })); }
  function newGame() { horses = stableNames.map(createHorse); coins = 250; saveGame(); }
  function loadGame() {
    var data = STORE.load ? STORE.load() : null;
    if (!data) {
      try { data = JSON.parse(localStorage.getItem('skachki_proto_toptrack_v2') || 'null'); } catch(e) { data = null; }
    }
    if (!data || !Array.isArray(data.horses) || !data.horses.length) return newGame();
    horses = data.horses;
    coins = Number.isFinite(data.coins) ? data.coins : 250;
  }
  function averageClass() { return horses.length ? Math.round(horses.reduce(function (s, h) { return s + horseClass(h); }, 0) / horses.length) : 0; }
  function showToast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('active'); clearTimeout(showToast.t); showToast.t = setTimeout(function () { toastEl.classList.remove('active'); }, 1800); }

  function addScreens() {
    if (!byId('mainMenuScreen')) {
      var main = document.createElement('div');
      main.id = 'mainMenuScreen';
      main.className = 'screen';
      main.innerHTML = '<div class="topbar"><div class="topbar-row"><div style="width:38px;flex:0 0 auto"></div><div class="topbar-title"><h1>ГЛАВНОЕ МЕНЮ</h1><p>Конюшня, гонки и развитие</p></div><button class="icon-btn" id="mainInfoBtn">i</button></div></div><div class="content-scroll" id="mainMenuScroll"></div>';
      document.body.insertBefore(main, document.body.firstChild);
    }
    if (!byId('raceMenuScreen')) {
      var raceMenu = document.createElement('div');
      raceMenu.id = 'raceMenuScreen';
      raceMenu.className = 'screen';
      raceMenu.innerHTML = '<div class="topbar"><div class="topbar-row"><button class="icon-btn" id="raceMenuBackBtn">←</button><div class="topbar-title"><h1>ГОНКИ</h1><p>Выберите заезд и свою лошадь</p></div><div style="width:38px;flex:0 0 auto"></div></div></div><div class="content-scroll" id="raceMenuScroll"></div><div class="race-start-panel"><button class="btn btn-gold" id="raceMenuStartBtn" style="width:100%">Начать заезд</button></div>';
      document.body.insertBefore(raceMenu, document.body.firstChild);
    }
  }

  function showScreen(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.remove('active'); });
    var map = { menu: 'mainMenuScreen', stable: 'stableScreen', training: 'trainingScreen', breed: 'breedScreen', race: 'raceScreen', raceMenu: 'raceMenuScreen' };
    var screen = byId(map[name] || 'mainMenuScreen');
    if (screen) screen.classList.add('active');
    if (name === 'menu') renderMainMenu();
    if (name === 'stable') renderStable();
    if (name === 'raceMenu') renderRaceMenu();
  }

  function statBlock(label, value, color) {
    return '<div><div class="stat-top"><span>' + label + '</span><b>' + Math.round(value) + '</b></div><div class="stat-bar"><span style="width:' + Math.min(100, value) + '%;background:' + color + '"></span></div></div>';
  }
  function renderSummary() {
    if (coinsPill) coinsPill.innerHTML = '🪙 ' + coins + '<small>Монеты</small>';
    if (summaryGridEl) summaryGridEl.innerHTML = '<div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div><div class="chip-box"><div class="value">' + averageClass() + '</div><div class="label">Средний класс</div></div><div class="chip-box"><div class="value">' + coins + '</div><div class="label">Монеты</div></div>';
  }
  function renderStable() {
    renderSummary();
    var footer = document.querySelector('#stableScreen .footer-actions');
    if (footer) footer.style.display = 'none';
    var back = byId('resetBtn');
    if (back) { back.textContent = '←'; back.id = 'stableBackMenuBtn'; }
    if (!horseListEl) return;
    horseListEl.innerHTML = horses.map(function (h, i) {
      return '<article class="horse-card"><div class="horse-head"><div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div><div class="horse-meta"><div class="horse-name-row"><div class="horse-name">' + h.name + '</div><div class="horse-rank">#' + (i + 1) + '</div></div><div class="horse-tags"><span class="mini-tag">Класс: ' + horseClass(h) + '</span><span class="mini-tag">Энергия: ' + h.energy + '</span><span class="mini-tag">Потенциал: ' + h.potential + '</span><span class="mini-tag">Характер: ' + h.temperament + '</span></div></div></div><div class="power-grid"><div class="power-box"><div class="num">' + h.speed + '</div><div class="txt">Скорость</div></div><div class="power-box"><div class="num">' + h.stamina + '</div><div class="txt">Выносливость</div></div><div class="power-box"><div class="num">' + h.acceleration + '</div><div class="txt">Ускорение</div></div></div><div class="stats-grid">' + statBlock('Скорость', h.speed, 'linear-gradient(90deg,#34d17a,#37c86e)') + statBlock('Выносливость', h.stamina, 'linear-gradient(90deg,#42b3ff,#4b9ef7)') + statBlock('Ускорение', h.acceleration, 'linear-gradient(90deg,#ffd44d,#eeb600)') + statBlock('Манёвренность', h.agility, 'linear-gradient(90deg,#ffad67,#ff8441)') + statBlock('Сила', h.power, 'linear-gradient(90deg,#9c8cff,#7e72f7)') + statBlock('Интеллект', h.intelligence, 'linear-gradient(90deg,#ff89c1,#f24c92)') + '</div><div class="card-actions"><button class="btn btn-blue" data-action="train" data-id="' + h.id + '">Тренировать</button><button class="btn btn-dark" data-action="details" data-id="' + h.id + '">Подробнее</button></div></article>';
    }).join('');
  }
  function renderMainMenu() {
    var el = byId('mainMenuScroll');
    if (!el) return;
    el.innerHTML = '<section class="main-menu-hero"><div class="main-menu-title">СКАЧКИ</div><div class="main-menu-sub">Развивайте конюшню, выбирайте подходящий заезд и получайте награды.</div><div class="main-menu-stats"><div class="chip-box"><div class="value">🪙 ' + coins + '</div><div class="label">Баланс</div></div><div class="chip-box"><div class="value">' + horses.length + '</div><div class="label">Лошадей</div></div><div class="chip-box"><div class="value">' + averageClass() + '</div><div class="label">Класс</div></div></div></section>' + menuTile('stable','🐴','Конюшня','Ваши лошади и тренировки') + menuTile('races','🏁','Гонки','Заезды, взносы и призы') + menuTile('breed','🧬','Разведение','Новые потомки') + menuTile('rating','🏆','Рейтинг','Скоро', true);
  }
  function menuTile(action, icon, title, desc, disabled) { return '<button class="menu-tile ' + (disabled ? 'disabled' : '') + '" data-menu="' + action + '"><div class="menu-icon">' + icon + '</div><div><div class="menu-title">' + title + '</div><div class="menu-desc">' + desc + '</div></div></button>'; }

  function openDetails(id) {
    var h = horses.find(function (x) { return String(x.id) === String(id); });
    if (!h || !horseModal) return;
    horseModalTitle.textContent = h.name;
    var params = [['Скорость', h.speed], ['Выносливость', h.stamina], ['Ускорение', h.acceleration], ['Манёвренность', h.agility], ['Сила', h.power], ['Интеллект', h.intelligence], ['Потенциал', h.potential], ['Энергия', h.energy], ['Характер', h.temperament], ['Класс', horseClass(h)]];
    horseModalBody.innerHTML = '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div><div><div style="font-size:13px;color:var(--muted)">Характер</div><div style="font-size:18px;font-weight:900">' + h.temperament + '</div><div style="font-size:13px;color:var(--muted);margin-top:4px">' + behaviorLabel(h.temperament) + '</div></div></div><div class="detail-grid">' + params.map(function (p) { return '<div class="detail-box"><div class="label helpable" data-help="' + p[0] + '">' + p[0] + '</div><div class="value">' + p[1] + '</div></div>'; }).join('') + '</div>';
    horseModal.classList.add('active');
  }
  function openTraining(id) {
    var h = horses.find(function (x) { return String(x.id) === String(id); });
    if (!h) return;
    selectedTrainingHorseId = h.id;
    trainingHero.innerHTML = '<div class="training-hero-head"><div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div><div style="flex:1;min-width:0"><div class="training-hero-title">' + h.name + '</div><div class="training-hero-sub">Класс ' + horseClass(h) + ' • Энергия ' + h.energy + ' • Потенциал ' + h.potential + '</div><span class="behavior-chip">Характер: ' + h.temperament + ' • ' + behaviorLabel(h.temperament) + '</span></div></div>';
    trainingScreenOptions.innerHTML = trainingTypes.map(function (t) { var disabled = coins < t.cost || h.energy < t.energy || h[t.key] >= 100; return '<div class="training-option-card"><div class="option-top"><div><div class="option-name">' + t.label + '</div><div class="option-desc">' + t.desc + '</div></div><div class="option-price">🪙 ' + t.cost + ' • ⚡ ' + t.energy + '</div></div>' + statBlock('Текущее значение', h[t.key], 'linear-gradient(90deg,#ffd44d,#eeb600)') + '<button class="btn ' + (disabled ? 'btn-dark' : 'btn-blue') + '" data-train-key="' + t.key + '" style="width:100%;margin-top:12px" ' + (disabled ? 'disabled' : '') + '>' + (disabled ? 'Недоступно' : 'Прокачать +2–6') + '</button></div>'; }).join('');
    showScreen('training');
  }
  function performTraining(key) {
    var h = horses.find(function (x) { return String(x.id) === String(selectedTrainingHorseId); });
    var t = trainingTypes.find(function (x) { return x.key === key; });
    if (!h || !t) return;
    if (coins < t.cost) return showToast('Недостаточно монет');
    if (h.energy < t.energy) return showToast('Недостаточно энергии');
    var gain = randInt(2, 6);
    h[key] = Math.min(100, h[key] + gain);
    h.energy = Math.max(0, h.energy - t.energy);
    coins -= t.cost;
    saveGame();
    showToast(h.name + ': ' + t.label + ' +' + gain);
    openTraining(h.id);
  }

  function renderRaceMenu() {
    var el = byId('raceMenuScroll');
    if (!el) return;
    if (!selectedPlayerHorseId && horses[0]) selectedPlayerHorseId = String(horses[0].id);
    if (!raceTypes.length) raceTypes = [{ id:'rookie', name:'Новичковый заезд', level:'Низкая', fee:0, prizeMin:30, prizeMax:60, distance:1000, opponents:3, classOffset:-12, desc:'Бесплатный старт.' }];
    el.innerHTML = '<section class="selection-summary"><div><div class="summary-title">Доступные заезды</div><div class="summary-desc">Выберите уровень гонки и одну свою лошадь.</div></div><div class="selection-count"><span>🪙</span><small>' + coins + '</small></div></section><div class="section-label">Тип гонки</div>' + raceTypes.map(renderRaceCard).join('') + '<div class="section-label">Ваша лошадь</div>' + horses.map(renderPlayerHorseCard).join('');
    var rt = getRaceType();
    byId('raceMenuStartBtn').textContent = rt.fee === 0 ? 'Начать заезд • бесплатно' : 'Начать заезд • взнос ' + rt.fee + ' 🪙';
  }
  function getRaceType() { return raceTypes.find(function (x) { return x.id === selectedRaceTypeId; }) || raceTypes[0]; }
  function renderRaceCard(r) { return '<div class="race-card ' + (r.id === selectedRaceTypeId ? 'selected' : '') + '" data-race="' + r.id + '"><div class="race-top"><div><div class="race-title">' + r.name + '</div><div class="race-desc">' + r.desc + '</div></div><div class="race-fee">' + r.fee + ' 🪙</div></div><div class="race-grid"><div class="race-box"><b>' + r.level + '</b><span>Сложность</span></div><div class="race-box"><b>' + r.distance + ' м</b><span>Дистанция</span></div><div class="race-box"><b>' + r.prizeMin + '–' + r.prizeMax + '</b><span>Приз</span></div></div></div>'; }
  function renderPlayerHorseCard(h) { return '<div class="my-horse-card ' + (String(h.id) === String(selectedPlayerHorseId) ? 'selected' : '') + '" data-horse="' + h.id + '"><div class="horse-avatar"><img src="./horse_icon.png" alt="horse"></div><div class="my-horse-info"><div class="my-horse-name">' + h.name + (String(h.id) === String(selectedPlayerHorseId) ? ' <span class="player-badge">Выбрана</span>' : '') + '</div><div class="select-badges"><span class="mini-tag">Класс ' + horseClass(h) + '</span><span class="mini-tag">Энергия ' + h.energy + '</span><span class="mini-tag">' + h.temperament + '</span></div><div class="my-horse-note">' + behaviorLabel(h.temperament) + '</div></div></div>'; }
  function createBotHorse(base, index) { function stat() { return clamp(base + randInt(-8, 8), 35, 100); } return { id:'bot_' + Date.now() + '_' + index, name: botNames[index % botNames.length], speed:stat(), stamina:stat(), acceleration:stat(), agility:stat(), power:stat(), intelligence:stat(), potential:stat(), energy:randInt(75,100), temperament:temperaments[randInt(0, temperaments.length - 1)], isBot:true }; }
  function startMenuRace() {
    var rt = getRaceType();
    var player = horses.find(function (h) { return String(h.id) === String(selectedPlayerHorseId); });
    if (!player) return showToast('Выберите свою лошадь');
    if (coins < rt.fee) return showToast('Недостаточно монет для взноса');
    coins -= rt.fee;
    activeRaceType = rt;
    var clone = JSON.parse(JSON.stringify(player));
    clone.name = 'Вы: ' + clone.name;
    clone.isPlayer = true;
    clone.playerHorseId = player.id;
    currentRaceHorses = [clone];
    var base = clamp(horseClass(player) + rt.classOffset, 35, 100);
    for (var i = 0; i < rt.opponents; i++) currentRaceHorses.push(createBotHorse(base, i));
    raceResults = [];
    saveGame();
    showScreen('race');
    setTimeout(createRaceGame, 50);
  }

  function destroyRaceGame() { stopHoofSound(); if (raceGame) { raceGame.destroy(true); raceGame = null; } }
  function createRaceGame() {
    destroyRaceGame();
    if (!window.Phaser) return showToast('Phaser не загрузился');
    var box = byId('phaserBox');
    var rect = box.getBoundingClientRect();
    var width = Math.max(360, Math.floor(rect.width));
    var height = Math.max(470, Math.floor(rect.height));
    raceStatusEl.textContent = 'Старт! Лошади выходят на дистанцию.';
    startHoofSound();
    raceGame = new Phaser.Game({ type: Phaser.AUTO, parent: 'phaser-game', width: width, height: height, backgroundColor: '#16304a', scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true, roundPixels: false }, scene: { create: function () { setupRaceScene(this, width, height); }, update: function (time, delta) { updateRaceScene(this, time, delta); } } });
  }
  function setupRaceScene(scene, width, height) {
    scene.track = { cx: width/2, cy: height/2 + 4, rx: width * 0.32, ry: height * 0.25 };
    drawTrack(scene, width, height);
    scene.runners = [];
    scene.totalLaps = 1.86;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;
    var colors = [0x2f83ff,0xf4c542,0xff4d8d,0x3fd486,0xa47cff,0xff8b45,0x2fd7d2,0xd8e2ff];
    currentRaceHorses.forEach(function (h, i) {
      makeRunner(scene, 'runner_' + i, colors[i % colors.length]);
      var lane = i * 14;
      var p = pointOnOval(scene.track, 0.002 - i * 0.012, lane);
      var sprite = scene.add.image(p.x, p.y, 'runner_' + i).setScale(0.48).setDepth(30 + i);
      var label = scene.add.text(p.x, p.y - 32, h.name, { fontFamily:'Arial', fontSize:'11px', fontStyle:'900', color:'#ffffff', backgroundColor:'rgba(0,0,0,.38)', padding:{left:4,right:4,top:2,bottom:2} }).setOrigin(.5).setDepth(200);
      var cls = horseClass(h);
      scene.runners.push({ horse:h, sprite:sprite, label:label, progress:0.002 - i*0.012, lane:lane, pace:(0.00048 + cls * 0.0000075) * (0.96 + Math.random()*0.08), finished:false, finishTime:null, nextEvent:scene.time.now + randInt(3000,7000) });
    });
    scene.boardBox = scene.add.rectangle(10, 10, 190, 160, 0x0b1d30, .78).setOrigin(0,0).setDepth(300);
    scene.boardLines = [];
    for (var b=0;b<Math.min(8,currentRaceHorses.length);b++) scene.boardLines.push(scene.add.text(22,24+b*17,'',{fontFamily:'Arial',fontSize:'12px',color:'#fff'}).setDepth(310));
    scene.statusText = scene.add.text(width/2, height-34, '', {fontFamily:'Arial',fontSize:'17px',fontStyle:'900',color:'#fff'}).setOrigin(.5).setDepth(320).setShadow(0,2,'#000',3);
  }
  function drawTrack(scene, w, h) { var t = scene.track, g = scene.add.graphics(); g.fillStyle(0x16523a,1).fillRoundedRect(0,0,w,h,18); g.fillStyle(0x245f3d,1).fillEllipse(t.cx,t.cy,t.rx*2.45,t.ry*2.45); g.fillStyle(0xb66a37,1).fillEllipse(t.cx,t.cy,t.rx*2.18,t.ry*2.18); g.fillStyle(0xd58b4b,1).fillEllipse(t.cx,t.cy,t.rx*1.95,t.ry*1.95); g.fillStyle(0x1d6a43,1).fillEllipse(t.cx,t.cy,t.rx*1.22,t.ry*1.22); g.lineStyle(3,0xf0d2a2,.7); for(var i=0;i<7;i++) g.strokeEllipse(t.cx,t.cy,(t.rx+i*16)*2,(t.ry+i*9)*2); var f=pointOnOval(t,0,78); g.lineStyle(5,0xffffff,.95).lineBetween(f.x-50,f.y,f.x+50,f.y); scene.add.text(f.x+54,f.y-12,'ФИНИШ',{fontFamily:'Arial',fontSize:'15px',fontStyle:'900',color:'#fff'}).setShadow(0,2,'#000',3); }
  function pointOnOval(t, p, lane) { var a = -Math.PI/2 + p*Math.PI*2; return { x:t.cx + Math.cos(a)*(t.rx+lane), y:t.cy + Math.sin(a)*(t.ry+lane*.56), angle:a }; }
  function makeRunner(scene, key, color) { if(scene.textures.exists(key)) return; var g=scene.make.graphics({x:0,y:0,add:false}); g.fillStyle(0x000000,.15).fillEllipse(40,54,32,12); g.fillStyle(color,1).fillEllipse(40,34,28,40).fillEllipse(40,18,18,20); g.fillStyle(0x2f1e14,1).fillEllipse(40,24,14,16); g.fillStyle(0xffffff,.96).fillCircle(40,30,10); g.generateTexture(key,80,72); g.destroy(); }
  function updateRaceScene(scene, time, delta) {
    if (scene.finished) return;
    scene.runners.forEach(function (r) {
      if (r.finished) return;
      var progress = Math.max(0, Math.min(1, r.progress / scene.totalLaps));
      var stamina = .72 + r.horse.stamina / 360;
      var energy = .72 + r.horse.energy / 360;
      var speed = r.pace * stamina * energy * (1 + Math.sin(time/520 + horseClass(r.horse)) * .012);
      if (time > r.nextEvent) { if (Math.random() < .45) { speed *= 1.35; addRaceEvent(scene,r,'Рывок!'); } else if (Math.random() < .18) { speed *= .65; addRaceEvent(scene,r,'Сбилась!'); } r.nextEvent = time + randInt(3500,7500); }
      r.progress += speed * delta;
      var p = pointOnOval(scene.track, ((r.progress % 1)+1)%1, r.lane);
      r.sprite.x = p.x; r.sprite.y = p.y; r.sprite.rotation = p.angle + Math.PI/2; r.sprite.setDepth(30 + Math.floor(p.y));
      r.label.x = p.x; r.label.y = p.y - 32;
      if (r.progress >= scene.totalLaps && !r.finished) { r.finished = true; r.finishTime = ((time - scene.startTime)/1000).toFixed(2); scene.finishCount++; raceResults.push({ name:r.horse.name, time:r.finishTime, horse:r.horse }); if(scene.finishCount===1){ scene.statusText.setText('Победитель: ' + r.horse.name); raceStatusEl.textContent = 'Финиш! Победитель: ' + r.horse.name; playFinish(); } }
    });
    if (time - scene.lastBoard > 250) { updateLeaderboard(scene); scene.lastBoard = time; }
    if (scene.finishCount >= scene.runners.length) { scene.finished = true; setTimeout(showResults, 800); }
  }
  function addRaceEvent(scene, r, text) { raceStatusEl.textContent = r.horse.name + ': ' + text; var e = scene.add.text(r.sprite.x,r.sprite.y-54,text,{fontFamily:'Arial',fontSize:'15px',fontStyle:'900',color:'#fff',backgroundColor:'rgba(0,0,0,.45)',padding:{left:6,right:6,top:3,bottom:3}}).setOrigin(.5).setDepth(330); scene.tweens.add({targets:e,y:r.sprite.y-82,alpha:0,duration:950,onComplete:function(){e.destroy();}}); }
  function updateLeaderboard(scene) { scene.runners.slice().sort(function(a,b){return b.progress-a.progress;}).forEach(function(r,i){ if(scene.boardLines[i]) scene.boardLines[i].setText((i+1)+'. '+r.horse.name+' '+Math.min(100,Math.round(r.progress/scene.totalLaps*100))+'%'); }); }
  function showResults() {
    raceResults.sort(function(a,b){return parseFloat(a.time)-parseFloat(b.time);});
    var idx = raceResults.findIndex(function (r) { return r.horse && r.horse.isPlayer; });
    var place = idx + 1;
    var reward = 0;
    if (activeRaceType) { if (place === 1) reward = activeRaceType.prizeMax; else if (place === 2) reward = Math.round((activeRaceType.prizeMin + activeRaceType.prizeMax)/2); else if (place === 3) reward = activeRaceType.prizeMin; }
    coins += reward;
    var playerResult = raceResults[idx];
    if (playerResult && playerResult.horse && playerResult.horse.playerHorseId) { var real = horses.find(function(h){return String(h.id) === String(playerResult.horse.playerHorseId);}); if(real) real.energy = Math.max(0, real.energy - randInt(6,12)); }
    saveGame();
    resultsListEl.innerHTML = '<div class="results-header"><div class="winner-banner"><div class="winner-crown">🏁</div><div class="winner-main"><div class="winner-place">Ваш результат</div><div class="winner-name">' + (place || '—') + ' место</div><div class="winner-time">Награда: +' + reward + ' 🪙</div></div></div></div>' + raceResults.map(function(r,i){ var isPlayer = r.horse && r.horse.isPlayer; return '<div class="result-item"><div class="result-head"><div><div style="font-size:16px;font-weight:900">' + (i+1) + '. ' + r.name + (isPlayer ? ' <span class="player-badge">Вы</span>' : '') + '</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Время: ' + r.time + ' сек</div></div></div></div>'; }).join('') + '<button class="btn btn-gold" id="resultRaceMenuBtn" style="width:100%;margin-top:12px">В меню гонок</button><button class="btn btn-dark" id="resultMainMenuBtn" style="width:100%;margin-top:10px">В главное меню</button>';
    resultsModal.classList.add('active');
    setTimeout(function(){ var rbtn=byId('resultRaceMenuBtn'), mbtn=byId('resultMainMenuBtn'); if(rbtn) rbtn.onclick=function(){resultsModal.classList.remove('active'); showScreen('raceMenu');}; if(mbtn) mbtn.onclick=function(){resultsModal.classList.remove('active'); showScreen('menu');}; },0);
    showToast(reward ? 'Выигрыш: 🪙 ' + reward : 'Приз не получен');
    activeRaceType = null;
  }

  function playTone(freq,dur,type,vol){ try{ if(!audioCtx){ var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; audioCtx=new AC(); } var o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type||'sine'; o.frequency.value=freq||440; g.gain.setValueAtTime(vol||.05,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+(dur||.08)); o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+(dur||.08)); }catch(e){} }
  function startHoofSound(){ stopHoofSound(); hoofTimer=setInterval(function(){playTone(90+Math.random()*25,.035,'triangle',.035);},190); }
  function stopHoofSound(){ if(hoofTimer) clearInterval(hoofTimer); hoofTimer=null; }
  function playFinish(){ stopHoofSound(); playTone(720,.08,'sine',.07); setTimeout(function(){playTone(960,.09,'sine',.07);},90); }

  function renderBreedScreen() {
    var options = horses.map(function(h){return '<option value="' + h.id + '">' + h.name + ' — Класс ' + horseClass(h) + '</option>';}).join('');
    breedParentOne.innerHTML = options; breedParentTwo.innerHTML = options; if(horses[1]) breedParentTwo.value = horses[1].id; updateBreedPreview(); showScreen('breed');
  }
  function updateBreedPreview() { var h1=horses.find(function(h){return String(h.id)===String(breedParentOne.value);}); var h2=horses.find(function(h){return String(h.id)===String(breedParentTwo.value);}); if(!h1||!h2||h1.id===h2.id){ childPreviewText.textContent='Выберите двух разных родителей.'; childPreviewGrid.innerHTML=''; return; } breedCompareGrid.innerHTML='<div class="parent-card"><div class="parent-card-title">Родитель 1: '+h1.name+'</div><div class="mini-tag">Класс '+horseClass(h1)+'</div></div><div class="parent-card"><div class="parent-card-title">Родитель 2: '+h2.name+'</div><div class="mini-tag">Класс '+horseClass(h2)+'</div></div>'; childPreviewText.textContent='Ожидаемый класс потомка около '+Math.round((horseClass(h1)+horseClass(h2))/2)+'.'; childPreviewGrid.innerHTML=['speed','stamina','acceleration','agility','power','intelligence'].map(function(k){return '<div class="preview-stat"><div class="preview-value">'+Math.round((h1[k]+h2[k])/2)+' ±5</div><div class="preview-label">'+k+'</div></div>';}).join(''); }
  function breedSelected() { var h1=horses.find(function(h){return String(h.id)===String(breedParentOne.value);}); var h2=horses.find(function(h){return String(h.id)===String(breedParentTwo.value);}); if(!h1||!h2||h1.id===h2.id)return showToast('Выберите разных родителей'); function avg(k){return clamp(Math.round((h1[k]+h2[k])/2)+randInt(-5,6),10,100);} horses.push({id:Date.now()+Math.random().toString(36).slice(2,8),name:'Жеребёнок '+(horses.length+1),speed:avg('speed'),stamina:avg('stamina'),acceleration:avg('acceleration'),agility:avg('agility'),power:avg('power'),intelligence:avg('intelligence'),potential:clamp(Math.round((h1.potential+h2.potential)/2)+randInt(-3,5),65,100),energy:100,temperament:Math.random()<.5?h1.temperament:h2.temperament}); saveGame(); renderStable(); renderBreedScreen(); showToast('Новый потомок создан'); }

  function bind() {
    document.addEventListener('click', function(e){ var tile=e.target.closest('[data-menu]'); if(tile){ var a=tile.getAttribute('data-menu'); if(a==='stable')showScreen('stable'); else if(a==='races')showScreen('raceMenu'); else if(a==='breed')renderBreedScreen(); else showToast('Скоро'); } });
    document.addEventListener('click', function(e){ if(e.target && e.target.id==='stableBackMenuBtn'){ e.preventDefault(); showScreen('menu'); } });
    horseListEl.addEventListener('click', function(e){ var b=e.target.closest('button[data-action]'); if(!b)return; if(b.dataset.action==='train') openTraining(b.dataset.id); if(b.dataset.action==='details') openDetails(b.dataset.id); });
    trainingScreenOptions.addEventListener('click', function(e){ var b=e.target.closest('[data-train-key]'); if(b && !b.disabled) performTraining(b.dataset.trainKey); });
    byId('trainingBackBtn').onclick = function(){ showScreen('stable'); };
    byId('raceMenuBackBtn').onclick = function(){ showScreen('menu'); };
    byId('raceMenuScroll').addEventListener('click', function(e){ var r=e.target.closest('[data-race]'); if(r){ selectedRaceTypeId=r.dataset.race; renderRaceMenu(); return; } var h=e.target.closest('[data-horse]'); if(h){ selectedPlayerHorseId=h.dataset.horse; renderRaceMenu(); } });
    byId('raceMenuStartBtn').onclick = startMenuRace;
    byId('raceBackBtn').onclick = function(){ destroyRaceGame(); showScreen('raceMenu'); };
    byId('restartRaceBtn').onclick = startMenuRace;
    byId('breedBackBtn').onclick = function(){ showScreen('menu'); };
    byId('breedCancelBtn').onclick = function(){ showScreen('menu'); };
    byId('confirmBreedScreenBtn').onclick = breedSelected;
    breedParentOne.onchange = updateBreedPreview; breedParentTwo.onchange = updateBreedPreview;
    byId('closeHorseBtn').onclick = function(){ horseModal.classList.remove('active'); };
    byId('horseModalTrainBtn').onclick = function(){ horseModal.classList.remove('active'); if(horses[0]) openTraining(horses[0].id); };
    byId('closeResultsBtn').onclick = function(){ resultsModal.classList.remove('active'); };
    byId('infoBtn').onclick = function(){ infoModal.classList.add('active'); };
    byId('closeInfoBtn').onclick = function(){ infoModal.classList.remove('active'); };
    var mainInfo = byId('mainInfoBtn'); if(mainInfo) mainInfo.onclick = function(){ infoModal.classList.add('active'); };
    document.addEventListener('click', function(e){ var h=e.target.closest('#horseModal .helpable'); if(!h)return; var box=h.closest('.detail-box'); var old=box.querySelector('.inline-param-help'); if(old){old.remove();return;} Array.prototype.forEach.call(document.querySelectorAll('.inline-param-help'), function(x){x.remove();}); var note=document.createElement('div'); note.className='inline-param-help'; note.innerHTML='<b>'+h.dataset.help+'</b>'+ (parameterHelp[h.dataset.help] || 'Описание появится позже.'); box.appendChild(note); }, true);
  }

  addScreens();
  loadGame();
  bind();
  showScreen('menu');
})();
