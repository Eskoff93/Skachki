// Race HUD.
// Draws fixed-screen leaderboard, player telemetry and top progress.

window.SKACHKI_RACE_HUD = (function () {
  var HUD_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Arial, sans-serif';

  function game() { return window.SKACHKI_GAME; }
  function audio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function physicsApi() { return window.SKACHKI_RACE_PHYSICS || {}; }
  function runnerView() { return window.SKACHKI_RACE_RUNNER_VIEW || {}; }

  function textResolution() {
    return Math.max(3, Math.min(4, Math.ceil((window.devicePixelRatio || 2) * 1.25)));
  }

  function textStyle(size, color, weight, options) {
    var opts = options || {};
    var style = {
      fontFamily: HUD_FONT,
      fontSize: size,
      fontStyle: weight || '900',
      color: color || '#ffffff',
      resolution: textResolution()
    };

    if (opts.align) style.align = opts.align;
    if (opts.backgroundColor) style.backgroundColor = opts.backgroundColor;
    if (opts.padding) style.padding = opts.padding;
    if (opts.stroke) {
      style.stroke = opts.stroke;
      style.strokeThickness = opts.strokeThickness || 1;
    }

    return style;
  }

  function cssPx(name) {
    var styles = window.getComputedStyle ? getComputedStyle(document.documentElement) : null;
    var value = styles ? styles.getPropertyValue(name) : '';
    var parsed = parseFloat(String(value || '').replace('px', '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function hudSafeTop() {
    var tg = window.Telegram && window.Telegram.WebApp;
    var tgTop = 0;

    if (tg && tg.contentSafeAreaInset && tg.contentSafeAreaInset.top) tgTop = tg.contentSafeAreaInset.top;
    else if (tg && tg.safeAreaInset && tg.safeAreaInset.top) tgTop = tg.safeAreaInset.top;

    return Math.min(72, Math.max(0, tgTop, cssPx('--tg-top-offset'), cssPx('--safe-top')));
  }

  function sortedRunners(scene) {
    return scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  function staminaColor(stamina) {
    if (stamina >= 55) return 0x54d66a;
    if (stamina >= 25) return 0xf2c94c;
    return 0xff7a45;
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
    return Math.max(0, Math.min(100, Math.round((runner.progress - scene.startProgress) / scene.raceDistance * 100)));
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

  function setup(scene, width, height) {
    var safeTop = hudSafeTop();

    scene.hud = {
      boardWidth: Math.min(106, Math.max(94, Math.round(width * 0.24))),
      boardX: width - 6,
      boardY: 34 + safeTop,
      soundY: 8 + safeTop,
      bottomHeight: Math.min(112, Math.max(96, Math.round(height * 0.145))),
      margin: 8
    };

    setupLeaderboard(scene);
    setupPlayerCard(scene, width, height);
    setupSoundButton(scene, width);
  }

  function setupLeaderboard(scene) {
    var boardWidth = scene.hud.boardWidth;
    var lineHeight = 19;
    var boardHeight = 28 + scene.runners.length * lineHeight;
    var x = scene.hud.boardX;
    var y = scene.hud.boardY;
    var i;

    scene.boardBg = scene.add.rectangle(x, y, boardWidth, boardHeight, 0x06111f, 0.58)
      .setOrigin(1, 0).setDepth(300).setScrollFactor(0);
    scene.boardBg.setStrokeStyle(1, 0xd8a943, 0.3);

    scene.boardTopLine = scene.add.rectangle(x - boardWidth + 7, y + 6, boardWidth - 14, 2, 0xd8a943, 0.52)
      .setOrigin(0, 0).setDepth(310).setScrollFactor(0);

    scene.boardLiveDot = scene.add.circle(x - boardWidth + 12, y + 17, 2.6, 0xff4e4e, 0.82)
      .setDepth(311).setScrollFactor(0);

    scene.boardTitle = scene.add.text(x - boardWidth + 20, y + 11, 'ЗАЕЗД', textStyle('8px', '#ffe6a2', '900', { stroke: '#06111f' }))
      .setDepth(311).setScrollFactor(0);

    scene.boardSubTitle = scene.add.text(x - 8, y + 11, 'LIVE', textStyle('7px', '#ffffff', '900', { stroke: '#06111f' }))
      .setOrigin(1, 0).setDepth(311).setScrollFactor(0);

    scene.boardRows = [];
    for (i = 0; i < scene.runners.length; i++) {
      createLeaderboardRow(scene, i, x, y + 26 + i * lineHeight, boardWidth);
    }
  }

  function createLeaderboardRow(scene, index, x, rowY, boardWidth) {
    var rowBg = scene.add.rectangle(x - 4, rowY, boardWidth - 8, 16, 0x000000, 0.1)
      .setOrigin(1, 0).setDepth(304).setScrollFactor(0);
    var placeBg = scene.add.rectangle(x - boardWidth + 16, rowY + 8, 18, 13, 0x0d2235, 0.68)
      .setOrigin(0.5).setDepth(309).setScrollFactor(0);
    var place = scene.add.text(x - boardWidth + 16, rowY + 7.5, String(index + 1), textStyle('9px', '#ffffff', '900', { align: 'center', stroke: '#06111f' }))
      .setOrigin(0.5).setDepth(311).setScrollFactor(0);
    var silk = scene.add.rectangle(x - boardWidth + 32, rowY + 8, 7, 12, 0xffffff, 0.9)
      .setDepth(311).setScrollFactor(0);
    var name = scene.add.text(x - boardWidth + 41, rowY + 3.5, '', textStyle('7px', '#ffffff', '900', { stroke: '#06111f' }))
      .setDepth(311).setScrollFactor(0);
    var gap = scene.add.text(x - 7, rowY + 3.5, '', textStyle('7px', '#8fa6bb', '900', { stroke: '#06111f' }))
      .setOrigin(1, 0).setDepth(311).setScrollFactor(0);
    var separator = scene.add.rectangle(x - boardWidth + 8, rowY + 17, boardWidth - 16, 1, 0xffffff, 0.035)
      .setOrigin(0, 0).setDepth(305).setScrollFactor(0);

    placeBg.setStrokeStyle(1, 0xffffff, 0.08);
    silk.setStrokeStyle(1, 0xffffff, 0.24);
    scene.boardRows.push({ rowBg: rowBg, placeBg: placeBg, place: place, silk: silk, name: name, gap: gap, separator: separator });
  }

  function setupPlayerCard(scene, width, height) {
    var margin = scene.hud.margin;
    var h = scene.hud.bottomHeight;
    var y = height - h - margin;
    var w = width - margin * 2;
    var cardX = margin;
    var cardY = y;
    var leftX = cardX + 14;
    var rightX = cardX + w - 16;
    var centerY = cardY + 16;
    var speedSize = width <= 390 ? '34px' : '39px';

    scene.playerCardShadow = scene.add.rectangle(cardX + 1, cardY + 6, w, h, 0x000000, 0.32)
      .setOrigin(0, 0).setDepth(298).setScrollFactor(0);

    scene.playerCardBg = scene.add.rectangle(cardX, cardY, w, h, 0x06111f, 0.86)
      .setOrigin(0, 0).setDepth(300).setScrollFactor(0);
    scene.playerCardBg.setStrokeStyle(1, 0xd8a943, 0.54);

    scene.playerCardAccent = scene.add.rectangle(cardX + 10, cardY + 8, w - 20, 2, 0xd8a943, 0.72)
      .setOrigin(0, 0).setDepth(306).setScrollFactor(0);

    scene.hudPlaceBadge = scene.add.rectangle(leftX + 32, centerY + 19, 64, 38, 0x123359, 0.96)
      .setOrigin(0.5).setDepth(305).setScrollFactor(0);
    scene.hudPlaceBadge.setStrokeStyle(1, 0x7bd8ff, 0.72);

    scene.hudPlace = scene.add.text(leftX + 32, centerY + 19, '', textStyle(width <= 390 ? '18px' : '20px', '#ffffff', '900', { align: 'center', stroke: '#06111f', strokeThickness: 2 }))
      .setOrigin(0.5).setDepth(306).setScrollFactor(0);

    scene.hudName = scene.add.text(leftX + 76, centerY + 4, '', textStyle(width <= 390 ? '18px' : '21px', '#ffffff', '900', { stroke: '#06111f', strokeThickness: 2 }))
      .setDepth(306).setScrollFactor(0);

    scene.hudGap = scene.add.text(leftX + 78, centerY + 30, '', textStyle('11px', '#d9e4ef', '800', { stroke: '#06111f' }))
      .setDepth(306).setScrollFactor(0);

    scene.hudSpeed = scene.add.text(rightX, centerY + 0, '', textStyle(speedSize, '#ffffff', '900', { align: 'right', stroke: '#06111f', strokeThickness: 2 }))
      .setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudSpeedUnit = scene.add.text(rightX - 2, centerY + 42, 'км/ч', textStyle('11px', '#ffe6a2', '900', { stroke: '#06111f' }))
      .setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaLabel = scene.add.text(leftX, cardY + h - 30, 'ВЫНОСЛИВОСТЬ', textStyle('10px', '#cbd8e4', '900', { stroke: '#06111f' }))
      .setDepth(306).setScrollFactor(0);

    scene.hudStaminaState = scene.add.text(leftX + 96, cardY + h - 30, '', textStyle('10px', '#54d66a', '900', { stroke: '#06111f' }))
      .setDepth(306).setScrollFactor(0);

    scene.hudStaminaPercent = scene.add.text(rightX, cardY + h - 32, '', textStyle('14px', '#ffffff', '900', { stroke: '#06111f', strokeThickness: 2 }))
      .setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaBarX = leftX;
    scene.hudStaminaBarY = cardY + h - 13;
    scene.hudStaminaBarW = w - 28;
    scene.hudStaminaBarBg = scene.add.rectangle(scene.hudStaminaBarX, scene.hudStaminaBarY, scene.hudStaminaBarW, 7, 0x17202c, 1)
      .setOrigin(0, 0).setDepth(306).setScrollFactor(0);
    scene.hudStaminaBarBg.setStrokeStyle(1, 0xffffff, 0.08);
    scene.hudStaminaFill = scene.add.rectangle(scene.hudStaminaBarX + 1, scene.hudStaminaBarY + 1, scene.hudStaminaBarW - 2, 5, 0x54d66a, 1)
      .setOrigin(0, 0).setDepth(307).setScrollFactor(0);
  }

  function setupSoundButton(scene, width) {
    scene.soundToggle = scene.add.text(width - 8, scene.hud.soundY, '', textStyle('14px', '#ffffff', '900', {
      backgroundColor: 'rgba(7,24,39,.62)',
      padding: { left: 8, right: 8, top: 6, bottom: 6 },
      stroke: '#06111f'
    })).setOrigin(1, 0).setDepth(340).setScrollFactor(0).setInteractive({ useHandCursor: true });

    scene.soundToggle.on('pointerdown', function (pointer, localX, localY, event) {
      var raceAudio = audio();
      if (event && event.stopPropagation) event.stopPropagation();
      if (raceAudio.toggleMuted) raceAudio.toggleMuted();
      if (raceAudio.unlockAudio) raceAudio.unlockAudio();
      if (raceAudio.isMuted && !raceAudio.isMuted() && !scene.finished && raceAudio.startHoofSound) raceAudio.startHoofSound();
      updateSoundButton(scene);
    });
    updateSoundButton(scene);
  }

  function updateSoundButton(scene) {
    var raceAudio = audio();
    if (!scene || !scene.soundToggle) return;
    scene.soundToggle.setText(raceAudio.isMuted && raceAudio.isMuted() ? '🔇' : '🔊');
  }

  function leaderGapText(scene, order) {
    if (!scene.playerRunner || !scene.playerRunner.physics || !order.length) return '';
    var leader = order[0];
    var gap = (leader.physics ? leader.physics.distanceMeters : 0) - scene.playerRunner.physics.distanceMeters;
    if (scene.playerRunner === leader) return 'Лидер заезда';
    return '+' + Math.max(0, gap).toFixed(1) + ' м от лидера';
  }

  function compactGapText(scene, runner, leader) {
    var gap;
    if (!runner || !leader || !runner.physics || !leader.physics) return '';
    if (runner === leader) return 'лид';
    gap = Math.max(0, (leader.physics.distanceMeters || 0) - (runner.physics.distanceMeters || 0));
    return '+' + gap.toFixed(gap >= 10 ? 0 : 1) + 'м';
  }

  function updateLeaderboard(scene) {
    var shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    var order = sortedRunners(scene);
    var leader = order[0];

    order.forEach(function (runner, index) {
      var row = scene.boardRows[index];
      var isPlayer;
      var isLeader;
      if (!row) return;

      isPlayer = runner === scene.playerRunner;
      isLeader = index === 0;
      row.rowBg.setFillStyle(isPlayer ? 0x123b68 : isLeader ? 0x231a0d : 0x000000, isPlayer ? 0.66 : isLeader ? 0.4 : 0.09);
      row.rowBg.setStrokeStyle(isPlayer || isLeader ? 1 : 0, isPlayer ? 0x7bd8ff : 0xd8a943, isPlayer || isLeader ? 0.48 : 0);
      row.placeBg.setFillStyle(isLeader ? 0xd8a943 : isPlayer ? 0x1c5f9f : 0x0d2235, isLeader ? 0.84 : 0.66);
      row.placeBg.setStrokeStyle(1, isLeader ? 0xffe6a2 : 0xffffff, isLeader ? 0.26 : 0.08);
      row.place.setText(String(index + 1));
      row.place.setColor(isLeader ? '#06111f' : '#ffffff');
      row.silk.setFillStyle(runner.color || 0xffffff, 1);
      row.name.setText(isPlayer ? shortName(runner.displayName) : isLeader ? 'ЛИД' : '№' + String(index + 1));
      row.name.setColor(isPlayer ? '#ffffff' : isLeader ? '#ffe6a2' : '#dbe7f1');
      row.gap.setText(compactGapText(scene, runner, leader));
      row.gap.setColor(isLeader ? '#ffe6a2' : isPlayer ? '#7bd8ff' : '#a9bbcb');
      row.separator.setFillStyle(0xffffff, isPlayer ? 0.05 : 0.03);
    });
  }

  function updatePlayerHud(scene) {
    var shortName;
    var order;
    var place;
    var total;
    var speed;
    var stamina;
    var fillWidth;
    var staminaTone;
    var state;

    if (!scene.playerRunner) return;

    shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    order = sortedRunners(scene);
    place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    total = Math.max(1, scene.runners.length);
    speed = scene.playerRunner.physics ? scene.playerRunner.physics.currentSpeedKmh : 0;
    stamina = scene.playerRunner.physics ? Math.round(scene.playerRunner.physics.staminaReserve) : 0;
    fillWidth = Math.max(0, (scene.hudStaminaBarW - 2) * stamina / 100);
    staminaTone = staminaColor(stamina);
    state = staminaLabel(stamina);

    scene.hudName.setText(shortName(scene.playerRunner.displayName || scene.playerRunner.horse.name));
    scene.hudPlace.setText(place + '/' + total);
    scene.hudGap.setText(leaderGapText(scene, order));
    scene.hudSpeed.setText((Math.round(speed * 10) / 10).toFixed(1));
    scene.hudStaminaPercent.setText(stamina + '%');
    scene.hudStaminaState.setText(state);
    scene.hudStaminaState.setColor(stamina >= 55 ? '#54d66a' : stamina >= 25 ? '#f2c94c' : '#ff7a45');
    scene.hudStaminaFill.width = fillWidth;
    scene.hudStaminaFill.setFillStyle(staminaTone, 1);
    scene.hudPlaceBadge.setStrokeStyle(1, place === 1 ? 0xd8a943 : 0x7bd8ff, place === 1 ? 0.86 : 0.72);
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
