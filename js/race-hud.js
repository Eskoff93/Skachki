// Race HUD.
// Draws fixed-screen leaderboard, player telemetry and top progress.

window.SKACHKI_RACE_HUD = (function () {
  function game() { return window.SKACHKI_GAME; }
  function audio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function physicsApi() { return window.SKACHKI_RACE_PHYSICS || {}; }
  function runnerView() { return window.SKACHKI_RACE_RUNNER_VIEW || {}; }

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
    scene.hud = {
      boardWidth: Math.min(112, Math.max(96, Math.round(width * 0.26))),
      boardX: width - 8,
      boardY: 42,
      bottomHeight: Math.min(112, Math.max(96, Math.round(height * 0.145))),
      margin: 8
    };

    setupLeaderboard(scene);
    setupPlayerCard(scene, width, height);
    setupSoundButton(scene, width);
  }

  function setupLeaderboard(scene) {
    var boardWidth = scene.hud.boardWidth;
    var lineHeight = 24;
    var boardHeight = 28 + scene.runners.length * lineHeight;
    var x = scene.hud.boardX;
    var y = scene.hud.boardY;

    scene.boardBg = scene.add.rectangle(x, y, boardWidth, boardHeight, 0x06111f, 0.76)
      .setOrigin(1, 0)
      .setDepth(300)
      .setScrollFactor(0);
    scene.boardBg.setStrokeStyle(1, 0xd8a943, 0.5);

    scene.boardTitle = scene.add.text(x - boardWidth + 9, y + 8, 'ТОП', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#ffe6a2',
      resolution: 2
    }).setDepth(310).setScrollFactor(0);

    scene.boardRows = [];
    for (var i = 0; i < scene.runners.length; i++) {
      var rowY = y + 27 + i * lineHeight;
      var rowBg = scene.add.rectangle(x - 4, rowY, boardWidth - 8, 20, 0x000000, 0)
        .setOrigin(1, 0)
        .setDepth(304)
        .setScrollFactor(0);
      var place = scene.add.text(x - boardWidth + 10, rowY + 3, String(i + 1), {
        fontFamily: 'Arial',
        fontSize: '14px',
        fontStyle: '900',
        color: '#ffffff',
        resolution: 2
      }).setDepth(311).setScrollFactor(0);
      var silk = scene.add.rectangle(x - boardWidth + 34, rowY + 9, 12, 15, 0xffffff, 1)
        .setDepth(311)
        .setScrollFactor(0);
      silk.setStrokeStyle(1, 0xffffff, 0.35);
      var name = scene.add.text(x - boardWidth + 48, rowY + 4, '', {
        fontFamily: 'Arial',
        fontSize: '9px',
        fontStyle: '900',
        color: '#ffffff',
        resolution: 2
      }).setDepth(311).setScrollFactor(0);

      scene.boardRows.push({ rowBg: rowBg, place: place, silk: silk, name: name });
    }
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
      .setOrigin(0, 0)
      .setDepth(298)
      .setScrollFactor(0);

    scene.playerCardBg = scene.add.rectangle(cardX, cardY, w, h, 0x06111f, 0.86)
      .setOrigin(0, 0)
      .setDepth(300)
      .setScrollFactor(0);
    scene.playerCardBg.setStrokeStyle(1, 0xd8a943, 0.54);

    scene.playerCardAccent = scene.add.rectangle(cardX + 10, cardY + 8, w - 20, 2, 0xd8a943, 0.72)
      .setOrigin(0, 0)
      .setDepth(306)
      .setScrollFactor(0);

    scene.hudPlaceBadge = scene.add.rectangle(leftX + 25, centerY + 19, 50, 42, 0x123359, 0.96)
      .setOrigin(0.5)
      .setDepth(305)
      .setScrollFactor(0);
    scene.hudPlaceBadge.setStrokeStyle(1, 0x7bd8ff, 0.72);

    scene.hudPlace = scene.add.text(leftX + 25, centerY + 7, '', {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: '900',
      color: '#ffffff',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5, 0).setDepth(306).setScrollFactor(0);

    scene.hudPlaceTotal = scene.add.text(leftX + 25, centerY + 31, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#aebfd0',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5, 0).setDepth(306).setScrollFactor(0);

    scene.hudName = scene.add.text(leftX + 62, centerY + 4, '', {
      fontFamily: 'Arial',
      fontSize: width <= 390 ? '18px' : '21px',
      fontStyle: '900',
      color: '#ffffff',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudGap = scene.add.text(leftX + 64, centerY + 30, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: '800',
      color: '#c8d4df',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudSpeed = scene.add.text(rightX, centerY + 0, '', {
      fontFamily: 'Arial',
      fontSize: speedSize,
      fontStyle: '900',
      color: '#ffffff',
      align: 'right',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudSpeedUnit = scene.add.text(rightX - 2, centerY + 42, 'км/ч', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: '900',
      color: '#ffe6a2',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaLabel = scene.add.text(leftX, cardY + h - 30, 'ВЫНОСЛИВОСТЬ', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#aebfd0',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudStaminaState = scene.add.text(leftX + 96, cardY + h - 30, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#54d66a',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudStaminaPercent = scene.add.text(rightX, cardY + h - 32, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaBarX = leftX;
    scene.hudStaminaBarY = cardY + h - 13;
    scene.hudStaminaBarW = w - 28;
    scene.hudStaminaBarBg = scene.add.rectangle(scene.hudStaminaBarX, scene.hudStaminaBarY, scene.hudStaminaBarW, 7, 0x17202c, 1)
      .setOrigin(0, 0)
      .setDepth(306)
      .setScrollFactor(0);
    scene.hudStaminaBarBg.setStrokeStyle(1, 0xffffff, 0.08);
    scene.hudStaminaFill = scene.add.rectangle(scene.hudStaminaBarX + 1, scene.hudStaminaBarY + 1, scene.hudStaminaBarW - 2, 5, 0x54d66a, 1)
      .setOrigin(0, 0)
      .setDepth(307)
      .setScrollFactor(0);
  }

  function setupSoundButton(scene, width) {
    scene.soundToggle = scene.add.text(width - 8, 8, '', {
      fontFamily: 'Arial', fontSize: '14px', fontStyle: '900', color: '#ffffff',
      backgroundColor: 'rgba(7,24,39,.62)', padding: { left: 8, right: 8, top: 6, bottom: 6 }, resolution: 2
    }).setOrigin(1, 0).setDepth(340).setScrollFactor(0).setInteractive({ useHandCursor: true });

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

  function updateLeaderboard(scene) {
    var shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    var order = sortedRunners(scene);

    order.forEach(function (runner, index) {
      var row = scene.boardRows[index];
      if (!row) return;
      var isPlayer = runner === scene.playerRunner;

      row.rowBg.setFillStyle(isPlayer ? 0x153d73 : 0x000000, isPlayer ? 0.78 : 0.16);
      row.rowBg.setStrokeStyle(isPlayer ? 1 : 0, 0x7bd8ff, isPlayer ? 0.85 : 0);
      row.place.setText(String(index + 1));
      row.place.setColor(isPlayer ? '#ffffff' : '#ffffff');
      row.silk.setFillStyle(runner.color || 0xffffff, 1);
      row.name.setText(isPlayer ? shortName(runner.displayName) : '');
      row.name.setColor(isPlayer ? '#ffffff' : '#ffffff');
    });
  }

  function updatePlayerHud(scene) {
    if (!scene.playerRunner) return;

    var shortName = runnerView().shortName || function (name) { return String(name || '').slice(0, 7).toUpperCase(); };
    var order = sortedRunners(scene);
    var place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    var total = Math.max(1, scene.runners.length);
    var speed = scene.playerRunner.physics ? scene.playerRunner.physics.currentSpeedKmh : 0;
    var stamina = scene.playerRunner.physics ? Math.round(scene.playerRunner.physics.staminaReserve) : 0;
    var fillWidth = Math.max(0, (scene.hudStaminaBarW - 2) * stamina / 100);
    var staminaTone = staminaColor(stamina);
    var state = staminaLabel(stamina);

    scene.hudName.setText(shortName(scene.playerRunner.displayName || scene.playerRunner.horse.name));
    scene.hudPlace.setText(String(place));
    scene.hudPlaceTotal.setText('/ ' + total);
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
