// Race HUD.
// HTML/CSS overlay above Phaser canvas. Phaser owns only track, horses, camera and effects.

window.SKACHKI_RACE_HUD = (function () {
  function game() { return window.SKACHKI_GAME; }
  function audio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function physicsApi() { return window.SKACHKI_RACE_PHYSICS || {}; }
  function runnerView() { return window.SKACHKI_RACE_RUNNER_VIEW || {}; }

  function sortedRunners(scene) {
    return scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexColor(value) {
    var n = Number(value) || 0xffffff;
    return '#' + ('000000' + n.toString(16)).slice(-6);
  }

  function staminaHex(stamina) {
    if (stamina >= 55) return '#54d66a';
    if (stamina >= 25) return '#f2c94c';
    return '#ff7a45';
  }

  function staminaLabel(stamina) {
    if (stamina >= 55) return 'ТЕМП СТАБИЛЕН';
    if (stamina >= 25) return 'УСТАЛОСТЬ';
    return 'ТЯЖЁЛЫЙ ФИНИШ';
  }

  function racePercent(scene, runner) {
    var physics = physicsApi();
    if (physics.progressPercent && runner && runner.physics) return physics.progressPercent(runner.physics);
    if (!scene || !runner) return 0;
    return clamp(Math.round((runner.progress - scene.startProgress) / scene.raceDistance * 100), 0, 100);
  }

  function resetTopProgress() {
    var G = game();
    var fill = G && G.byId ? G.byId('raceProgressFill') : null;
    var meta = G && G.byId ? G.byId('raceProgressMeta') : null;
    if (fill) fill.style.width = '0%';
    if (meta) meta.textContent = '0%';
  }

  function updateTopProgress(scene) {
    var G = game();
    var runner = scene.playerRunner || scene.runners[0];
    var percent = racePercent(scene, runner);
    var fill = G.byId('raceProgressFill');
    var meta = G.byId('raceProgressMeta');
    var meters = runner && runner.physics ? Math.round(runner.physics.distanceMeters) : 0;

    if (fill) fill.style.width = percent + '%';
    if (meta) meta.textContent = meters + ' / ' + scene.raceDistanceMeters + ' м';
  }

  function removeExistingOverlay(box) {
    var existing = box ? box.querySelector('.race-dom-hud') : null;
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function buildLeaderboard(scene, root) {
    var board = el('section', 'race-dom-board');
    var head = el('div', 'race-dom-board-head');
    var live = el('span', 'race-dom-live-dot');
    var title = el('span', 'race-dom-board-title', 'ЗАЕЗД');
    var liveText = el('span', 'race-dom-live-text', 'LIVE');
    var rows = el('div', 'race-dom-board-rows');
    var rowRefs = [];
    var i;

    head.appendChild(live);
    head.appendChild(title);
    head.appendChild(liveText);
    board.appendChild(head);
    board.appendChild(rows);

    for (i = 0; i < scene.runners.length; i++) {
      rowRefs.push(createLeaderboardRow(rows, i));
    }

    root.appendChild(board);
    return { board: board, rows: rowRefs };
  }

  function createLeaderboardRow(parent, index) {
    var row = el('div', 'race-dom-board-row');
    var place = el('span', 'race-dom-board-place', String(index + 1));
    var silk = el('span', 'race-dom-board-silk');
    var name = el('span', 'race-dom-board-name');
    var gap = el('span', 'race-dom-board-gap');

    row.appendChild(place);
    row.appendChild(silk);
    row.appendChild(name);
    row.appendChild(gap);
    parent.appendChild(row);

    return { root: row, place: place, silk: silk, name: name, gap: gap };
  }

  function buildPlayerCard(root) {
    var card = el('section', 'race-dom-player');
    var top = el('div', 'race-dom-player-top');
    var place = el('div', 'race-dom-player-place');
    var info = el('div', 'race-dom-player-info');
    var name = el('div', 'race-dom-player-name');
    var gap = el('div', 'race-dom-player-gap');
    var speedBox = el('div', 'race-dom-player-speedbox');
    var speed = el('div', 'race-dom-player-speed', '0.0');
    var unit = el('div', 'race-dom-player-unit', 'км/ч');
    var staminaMeta = el('div', 'race-dom-stamina-meta');
    var staminaLabelNode = el('span', 'race-dom-stamina-label', 'ВЫНОСЛИВОСТЬ');
    var staminaState = el('span', 'race-dom-stamina-state', 'ТЕМП СТАБИЛЕН');
    var staminaPercent = el('span', 'race-dom-stamina-percent', '100%');
    var staminaBar = el('div', 'race-dom-stamina-bar');
    var staminaFill = el('span', 'race-dom-stamina-fill');

    info.appendChild(name);
    info.appendChild(gap);
    speedBox.appendChild(speed);
    speedBox.appendChild(unit);
    top.appendChild(place);
    top.appendChild(info);
    top.appendChild(speedBox);

    staminaMeta.appendChild(staminaLabelNode);
    staminaMeta.appendChild(staminaState);
    staminaMeta.appendChild(staminaPercent);
    staminaBar.appendChild(staminaFill);

    card.appendChild(top);
    card.appendChild(staminaMeta);
    card.appendChild(staminaBar);
    root.appendChild(card);

    return {
      card: card,
      place: place,
      name: name,
      gap: gap,
      speed: speed,
      unit: unit,
      staminaState: staminaState,
      staminaPercent: staminaPercent,
      staminaFill: staminaFill
    };
  }

  function buildSoundButton(scene, root) {
    var button = el('button', 'race-dom-sound');
    button.type = 'button';
    button.addEventListener('click', function (event) {
      var raceAudio = audio();
      event.preventDefault();
      event.stopPropagation();
      if (raceAudio.toggleMuted) raceAudio.toggleMuted();
      if (raceAudio.unlockAudio) raceAudio.unlockAudio();
      if (raceAudio.isMuted && !raceAudio.isMuted() && !scene.finished && raceAudio.startHoofSound) raceAudio.startHoofSound();
      updateSoundButton(scene);
    });
    root.appendChild(button);
    return button;
  }

  function setup(scene, width, height) {
    var G = game();
    var box = G && G.byId ? G.byId('phaserBox') : null;
    var root;
    var leaderboard;
    var playerCard;

    scene.hud = scene.hud || {};
    scene.hud.viewportWidth = width;
    scene.hud.viewportHeight = height;

    if (!box) return;
    box.style.position = 'relative';
    removeExistingOverlay(box);

    root = el('div', 'race-dom-hud');
    box.appendChild(root);

    leaderboard = buildLeaderboard(scene, root);
    playerCard = buildPlayerCard(root);

    scene.hud.dom = {
      root: root,
      sound: buildSoundButton(scene, root),
      board: leaderboard.board,
      rows: leaderboard.rows,
      player: playerCard
    };

    if (scene.events && scene.events.once) {
      scene.events.once('shutdown', function () { removeExistingOverlay(box); });
      scene.events.once('destroy', function () { removeExistingOverlay(box); });
    }

    updateSoundButton(scene);
    updateLeaderboard(scene);
    updatePlayerHud(scene);
  }

  function leaderGapText(scene, order) {
    var leader;
    var gap;
    if (!scene.playerRunner || !scene.playerRunner.physics || !order.length) return '';
    leader = order[0];
    gap = (leader.physics ? leader.physics.distanceMeters : 0) - scene.playerRunner.physics.distanceMeters;
    if (scene.playerRunner === leader) return 'Лидер заезда';
    return '+' + Math.max(0, gap).toFixed(1) + ' м от лидера';
  }

  function compactGapText(runner, leader) {
    var gap;
    if (!runner || !leader || !runner.physics || !leader.physics) return '';
    if (runner === leader) return 'лид';
    gap = Math.max(0, (leader.physics.distanceMeters || 0) - (runner.physics.distanceMeters || 0));
    return '+' + gap.toFixed(gap >= 10 ? 0 : 1) + 'м';
  }

  function updateLeaderboard(scene) {
    var hud = scene && scene.hud && scene.hud.dom;
    var shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    var order;
    var leader;

    if (!hud || !hud.rows) return;

    order = sortedRunners(scene);
    leader = order[0];

    order.forEach(function (runner, index) {
      var row = hud.rows[index];
      var isPlayer = runner === scene.playerRunner;
      var isLeader = index === 0;
      if (!row) return;

      row.root.className = 'race-dom-board-row' + (isPlayer ? ' is-player' : '') + (isLeader ? ' is-leader' : '');
      row.place.textContent = String(index + 1);
      row.silk.style.backgroundColor = hexColor(runner.color);
      row.name.textContent = isPlayer ? shortName(runner.displayName) : isLeader ? 'ЛИД' : '№' + String(index + 1);
      row.gap.textContent = compactGapText(runner, leader);
    });
  }

  function updatePlayerHud(scene) {
    var hud = scene && scene.hud && scene.hud.dom;
    var player;
    var shortName;
    var order;
    var place;
    var total;
    var speed;
    var stamina;
    var state;
    var color;

    if (!hud || !hud.player || !scene.playerRunner) return;

    player = hud.player;
    shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    order = sortedRunners(scene);
    place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    total = Math.max(1, scene.runners.length);
    speed = scene.playerRunner.physics ? scene.playerRunner.physics.currentSpeedKmh : 0;
    stamina = scene.playerRunner.physics ? Math.round(scene.playerRunner.physics.staminaReserve) : 0;
    state = staminaLabel(stamina);
    color = staminaHex(stamina);

    player.place.textContent = place + '/' + total;
    player.place.classList.toggle('is-leader', place === 1);
    player.name.textContent = shortName(scene.playerRunner.displayName || scene.playerRunner.horse.name);
    player.gap.textContent = leaderGapText(scene, order);
    player.speed.textContent = (Math.round(speed * 10) / 10).toFixed(1);
    player.staminaState.textContent = state;
    player.staminaState.style.color = color;
    player.staminaPercent.textContent = stamina + '%';
    player.staminaFill.style.width = clamp(stamina, 0, 100) + '%';
    player.staminaFill.style.background = color;
  }

  function updateSoundButton(scene) {
    var raceAudio = audio();
    var hud = scene && scene.hud && scene.hud.dom;
    if (!hud || !hud.sound) return;
    hud.sound.textContent = raceAudio.isMuted && raceAudio.isMuted() ? '🔇' : '🔊';
    hud.sound.setAttribute('aria-label', raceAudio.isMuted && raceAudio.isMuted() ? 'Включить звук' : 'Выключить звук');
  }

  return {
    resetTopProgress: resetTopProgress,
    setup: setup,
    updateLeaderboard: updateLeaderboard,
    updatePlayerHud: updatePlayerHud,
    updateSoundButton: updateSoundButton,
    updateTopProgress: updateTopProgress
  };
})();
