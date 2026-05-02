// Phaser race engine.
// Coordinates the scene and runner movement. Track drawing, audio, AI and physics live in split modules.

window.SKACHKI_RACE_ENGINE = (function () {
  function game() { return window.SKACHKI_GAME; }
  function raceTrack() { return window.SKACHKI_RACE_TRACK || {}; }
  function raceAudio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function raceAi() { return window.SKACHKI_RACE_AI || {}; }
  function racePhysics() { return window.SKACHKI_RACE_PHYSICS || {}; }

  function destroyRaceGame() {
    var audio = raceAudio();
    if (audio.stopHoofSound) audio.stopHoofSound();

    resetTopRaceProgress();

    var G = game();
    if (G.state.raceGame) {
      G.state.raceGame.destroy(true);
      G.state.raceGame = null;
    }
  }

  function raceRenderResolution() {
    return Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  }

  function createRaceGame() {
    var G = game();
    destroyRaceGame();

    if (!window.Phaser) return G.showToast('Phaser не загрузился');

    var box = G.byId('phaserBox');
    if (!box) return;

    var rect = box.getBoundingClientRect();
    var width = Math.max(360, Math.floor(rect.width));
    var height = Math.max(560, Math.floor(rect.height));
    var resolution = raceRenderResolution();

    var status = G.byId('raceStatus');
    if (status) status.textContent = 'Гонка идёт. Камера держит вашу лошадь в фокусе.';

    var audio = raceAudio();
    if (audio.bindUnlock) audio.bindUnlock();
    if (audio.startHoofSound) audio.startHoofSound();

    G.state.raceGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-game',
      width: width,
      height: height,
      resolution: resolution,
      backgroundColor: '#081423',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: {
        antialias: true,
        antialiasGL: true,
        roundPixels: false,
        pixelArt: false,
        powerPreference: 'high-performance'
      },
      scene: {
        create: function () { setupRaceScene(this, width, height); },
        update: function (time, delta) { updateRaceScene(this, time, delta); }
      }
    });
  }

  function updateRaceTitle(raceType) {
    var G = game();
    var screen = G.byId('raceScreen');
    var subtitle = screen ? screen.querySelector('.topbar-title p') : null;
    if (subtitle && raceType) subtitle.textContent = 'Вид сверху • фокус на вашей лошади • ' + raceType.distance + ' м';
  }

  function setupRaceScene(scene, width, height) {
    var G = game();
    var track = raceTrack();
    var physics = racePhysics();
    var raceType = G.state.activeRaceType || {};
    var horseCount = G.state.currentRaceHorses.length;
    var worldWidth = Math.max(width * 2.35, 980);
    var worldHeight = Math.max(height * 1.75, 900);
    var trackHeight = Math.min(worldHeight * 0.72, 640);
    var trackWidth = Math.min(worldWidth * 0.92, Math.max(820, trackHeight * 2.08));
    var laneSpacing = horseCount > 6 ? 21 : 24;
    var startProgress = 0.006;
    var raceDistanceMeters = Math.max(80, Number(raceType.distance) || 220);

    updateRaceTitle(raceType);

    scene.viewportWidth = width;
    scene.viewportHeight = height;
    scene.worldWidth = worldWidth;
    scene.worldHeight = worldHeight;
    scene.track = track.makeTrackGeometry(worldWidth, worldHeight, trackWidth, trackHeight, laneSpacing, horseCount);
    scene.runners = [];
    scene.playerRunner = null;
    scene.startProgress = startProgress;
    scene.raceDistance = 1;
    scene.raceDistanceMeters = raceDistanceMeters;
    scene.finishProgress = startProgress + scene.raceDistance;
    scene.totalLaps = scene.finishProgress;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;
    scene.lastDust = 0;

    resetTopRaceProgress();
    track.drawTrack(scene, worldWidth, worldHeight);

    G.state.currentRaceHorses.forEach(function (horse, index) {
      makeRunner(scene, 'runner_' + index, horse, index);

      var lane = index * scene.track.laneSpacing;
      var p = track.pointOnTrack(scene.track, startProgress, lane);
      var scale = horse.isPlayer ? 1.18 : 1.03;
      var sprite = scene.add.image(p.x, p.y, 'runner_' + index).setScale(scale).setDepth(30 + index);
      var name = String(horse.name || '').replace(/^Вы:\s*/, '');
      var labelText = horse.isPlayer ? '★' : String(index + 1);
      var label = scene.add.text(p.x, p.y - 54, labelText, {
        fontFamily: 'Arial',
        fontSize: horse.isPlayer ? '18px' : '13px',
        fontStyle: '900',
        color: horse.isPlayer ? '#241400' : '#ffffff',
        backgroundColor: horse.isPlayer ? 'rgba(255,211,77,.96)' : 'rgba(0,0,0,.5)',
        padding: { left: 7, right: 7, top: 4, bottom: 4 },
        resolution: 2
      }).setOrigin(0.5).setDepth(230);

      var form = formRaceMultiplier(horse.form);
      var randomFactor = 0.965 + Math.random() * 0.07;
      var marker = null;
      var glow = null;

      if (horse.isPlayer) {
        glow = scene.add.circle(p.x, p.y, 48, 0xffd34d, 0.08).setStrokeStyle(2, 0xffd34d, 0.52).setDepth(22);
        marker = scene.add.circle(p.x, p.y, 34, 0xffd34d, 0.08).setStrokeStyle(3, 0xffd34d, 0.82).setDepth(25);
      }

      var runner = {
        horse: horse,
        displayName: name,
        sprite: sprite,
        label: label,
        marker: marker,
        glow: glow,
        progress: startProgress,
        lane: lane,
        laneTarget: lane,
        pace: physics.speedToKmh ? physics.speedToKmh(horse.speed) : Number(horse.speed) || 30,
        formMultiplier: form,
        randomFactor: randomFactor,
        physics: physics.initialRunnerPhysics ? physics.initialRunnerPhysics(horse, raceDistanceMeters) : null,
        burstUntil: 0,
        penaltyUntil: 0,
        finished: false,
        finishTime: null,
        nextEvent: scene.time.now + G.randInt(3600, 6800),
        nextLaneThink: scene.time.now + G.randInt(120, 420),
        color: silkColor(index, horse)
      };

      scene.runners.push(runner);
      if (horse.isPlayer) scene.playerRunner = runner;
    });

    if (!scene.playerRunner && scene.runners.length) scene.playerRunner = scene.runners[0];
    setupCamera(scene);
    setupHud(scene, width, height);
  }

  function setupCamera(scene) {
    var camera = scene.cameras.main;
    var zoom = scene.viewportHeight >= 660 ? 1.34 : 1.22;

    camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    camera.setRoundPixels(false);
    camera.setZoom(zoom);

    if (scene.playerRunner) {
      camera.startFollow(scene.playerRunner.sprite, true, 0.1, 0.1);
      camera.setDeadzone(Math.round(scene.viewportWidth * 0.08), Math.round(scene.viewportHeight * 0.12));
    }
  }

  function setupHud(scene, width, height) {
    scene.hud = {
      boardWidth: Math.min(128, Math.max(106, Math.round(width * 0.3))),
      boardX: width - 12,
      boardY: Math.max(78, Math.round(height * 0.16)),
      bottomHeight: Math.min(176, Math.max(144, Math.round(height * 0.25))),
      margin: 12
    };

    setupLeaderboard(scene);
    setupPlayerCard(scene, width, height);
    setupSoundButton(scene, width);
  }

  function setupLeaderboard(scene) {
    var boardWidth = scene.hud.boardWidth;
    var lineHeight = 30;
    var boardHeight = 36 + scene.runners.length * lineHeight;
    var x = scene.hud.boardX;
    var y = scene.hud.boardY;

    scene.boardBg = scene.add.rectangle(x, y, boardWidth, boardHeight, 0x06111f, 0.82)
      .setOrigin(1, 0)
      .setDepth(300)
      .setScrollFactor(0);
    scene.boardBg.setStrokeStyle(1, 0xd8a943, 0.62);

    scene.boardTitle = scene.add.text(x - boardWidth + 12, y + 11, 'ПОЗИЦИИ', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#ffe6a2',
      resolution: 2
    }).setDepth(310).setScrollFactor(0);

    scene.boardRows = [];
    for (var i = 0; i < scene.runners.length; i++) {
      var rowY = y + 34 + i * lineHeight;
      var rowBg = scene.add.rectangle(x - 4, rowY, boardWidth - 8, 25, 0x000000, 0)
        .setOrigin(1, 0)
        .setDepth(304)
        .setScrollFactor(0);
      var place = scene.add.text(x - boardWidth + 13, rowY + 5, String(i + 1), {
        fontFamily: 'Arial',
        fontSize: '17px',
        fontStyle: '900',
        color: '#ffffff',
        resolution: 2
      }).setDepth(311).setScrollFactor(0);
      var silk = scene.add.rectangle(x - boardWidth + 45, rowY + 12, 15, 19, 0xffffff, 1)
        .setDepth(311)
        .setScrollFactor(0);
      silk.setStrokeStyle(1, 0xffffff, 0.45);
      var name = scene.add.text(x - boardWidth + 60, rowY + 6, '', {
        fontFamily: 'Arial',
        fontSize: '10px',
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
    var player = scene.playerRunner || scene.runners[0];
    var cardX = margin;
    var cardY = y;

    scene.playerCardBg = scene.add.rectangle(cardX, cardY, w, h, 0x06111f, 0.88)
      .setOrigin(0, 0)
      .setDepth(300)
      .setScrollFactor(0);
    scene.playerCardBg.setStrokeStyle(2, 0xd8a943, 0.72);

    scene.playerCardTopLine = scene.add.rectangle(cardX + 13, cardY + 10, w - 26, 2, 0xd8a943, 0.78)
      .setOrigin(0, 0)
      .setDepth(302)
      .setScrollFactor(0);

    scene.hudPortraitRing = scene.add.circle(cardX + 54, cardY + 70, 43, 0x0a1a2b, 1)
      .setStrokeStyle(3, 0xd8a943, 0.85)
      .setDepth(305)
      .setScrollFactor(0);

    if (player) {
      scene.hudPortrait = scene.add.image(cardX + 54, cardY + 70, player.sprite.texture.key)
        .setScale(0.92)
        .setDepth(306)
        .setScrollFactor(0);
    }

    scene.hudRankShield = scene.add.rectangle(cardX + 45, cardY + 112, 34, 30, 0x164f99, 1)
      .setStrokeStyle(2, 0xd8a943, 0.78)
      .setDepth(307)
      .setScrollFactor(0);
    scene.hudRankText = scene.add.text(cardX + 45, cardY + 112, '5', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: '900',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setDepth(308).setScrollFactor(0);

    scene.hudName = scene.add.text(cardX + 112, cardY + 42, '', {
      fontFamily: 'Arial',
      fontSize: width <= 390 ? '28px' : '33px',
      fontStyle: '900',
      color: '#ffffff',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudPlace = scene.add.text(cardX + 114, cardY + 78, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: '900',
      color: '#ffd34d',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudGap = scene.add.text(cardX + 114, cardY + 103, '', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: '800',
      color: '#c8d4df',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudSpeed = scene.add.text(cardX + w - 28, cardY + 48, '', {
      fontFamily: 'Arial',
      fontSize: width <= 390 ? '38px' : '46px',
      fontStyle: '900',
      color: '#ffffff',
      align: 'right',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudSpeedUnit = scene.add.text(cardX + w - 30, cardY + 100, 'км/ч', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: '900',
      color: '#c8d4df',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaLabel = scene.add.text(cardX + 114, cardY + h - 54, 'ВЫНОСЛИВОСТЬ', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: '900',
      color: '#aebfd0',
      resolution: 2
    }).setDepth(306).setScrollFactor(0);

    scene.hudStaminaPercent = scene.add.text(cardX + w - 28, cardY + h - 57, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: '900',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(1, 0).setDepth(306).setScrollFactor(0);

    scene.hudStaminaBarX = cardX + 114;
    scene.hudStaminaBarY = cardY + h - 30;
    scene.hudStaminaBarW = w - 158;
    scene.hudStaminaBarBg = scene.add.rectangle(scene.hudStaminaBarX, scene.hudStaminaBarY, scene.hudStaminaBarW, 12, 0x17202c, 1)
      .setOrigin(0, 0)
      .setDepth(306)
      .setScrollFactor(0);
    scene.hudStaminaBarBg.setStrokeStyle(1, 0xd8a943, 0.45);
    scene.hudStaminaFill = scene.add.rectangle(scene.hudStaminaBarX + 2, scene.hudStaminaBarY + 2, scene.hudStaminaBarW - 4, 8, 0x54d66a, 1)
      .setOrigin(0, 0)
      .setDepth(307)
      .setScrollFactor(0);
  }

  function setupSoundButton(scene, width) {
    scene.soundToggle = scene.add.text(width - 14, 12, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: 'rgba(7,24,39,.72)',
      padding: { left: 9, right: 9, top: 7, bottom: 7 },
      resolution: 2
    }).setOrigin(1, 0).setDepth(340).setScrollFactor(0).setInteractive({ useHandCursor: true });

    scene.soundToggle.on('pointerdown', function (pointer, localX, localY, event) {
      var audio = raceAudio();
      if (event && event.stopPropagation) event.stopPropagation();
      if (audio.toggleMuted) audio.toggleMuted();
      if (audio.unlockAudio) audio.unlockAudio();
      if (audio.isMuted && !audio.isMuted() && !scene.finished && audio.startHoofSound) audio.startHoofSound();
      updateSoundButton(scene);
    });
    updateSoundButton(scene);
  }

  function updateSoundButton(scene) {
    var audio = raceAudio();
    if (!scene || !scene.soundToggle) return;
    scene.soundToggle.setText(audio.isMuted && audio.isMuted() ? '🔇' : '🔊');
  }

  function resetTopRaceProgress() {
    var G = game();
    var fill = G && G.byId ? G.byId('raceProgressFill') : null;
    var meta = G && G.byId ? G.byId('raceProgressMeta') : null;
    if (fill) fill.style.width = '0%';
    if (meta) meta.textContent = '0%';
  }

  function racePercent(scene, runner) {
    var physics = racePhysics();
    if (physics.progressPercent && runner && runner.physics) return physics.progressPercent(runner.physics);
    if (!scene || !runner) return 0;
    return Math.max(0, Math.min(100, Math.round((runner.progress - scene.startProgress) / scene.raceDistance * 100)));
  }

  function updateTopRaceProgress(scene) {
    var G = game();
    var runner = scene.playerRunner || scene.runners[0];
    var percent = racePercent(scene, runner);
    var fill = G.byId('raceProgressFill');
    var meta = G.byId('raceProgressMeta');
    if (fill) fill.style.width = percent + '%';
    if (meta) meta.textContent = Math.round((runner.physics ? runner.physics.distanceMeters : 0)) + ' / ' + scene.raceDistanceMeters + ' м';
  }

  function formRaceMultiplier(form) {
    var G = game();
    var raw = G.formMultiplier ? G.formMultiplier(form) : 0.8;
    if (raw >= 1) return 1;
    if (raw <= 0.6) return 0.93;
    return 1;
  }

  function updateRaceScene(scene, time, delta) {
    var G = game();
    var track = raceTrack();
    var ai = raceAi();
    var physics = racePhysics();
    var deltaSeconds = delta / 1000;
    if (scene.finished) return;

    scene.runners.forEach(function (runner) {
      if (runner.finished) return;

      var lineEfficiency = ai.update ? ai.update(scene, runner, time) : 1;
      var isBursting = time < runner.burstUntil;
      var isPenalized = time < runner.penaltyUntil;
      var runnerPhysics = physics.updateRunner ? physics.updateRunner(runner, {
        deltaSeconds: deltaSeconds,
        raceDistanceMeters: scene.raceDistanceMeters,
        lineEfficiency: lineEfficiency,
        formMultiplier: runner.formMultiplier,
        randomFactor: runner.randomFactor,
        isBursting: isBursting,
        isPenalized: isPenalized
      }) : null;

      if (time > runner.nextEvent) {
        handleRaceEvent(scene, runner, time);
        runner.nextEvent = time + G.randInt(4200, 7600);
      }

      runner.lane += (runner.laneTarget - runner.lane) * Math.min(1, delta / 440);
      if (runnerPhysics) runner.progress = scene.startProgress + runnerPhysics.distanceMeters / scene.raceDistanceMeters * scene.raceDistance;

      var p = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
      runner.sprite.x = p.x;
      runner.sprite.y = p.y;
      runner.sprite.rotation = p.angle + Math.PI / 2;
      runner.sprite.setDepth(30 + Math.floor(p.y));
      runner.label.x = p.x;
      runner.label.y = p.y - 57;
      runner.label.setDepth(runner.sprite.depth + 4);

      if (runner.marker) {
        runner.marker.x = p.x;
        runner.marker.y = p.y;
        runner.marker.setDepth(Math.max(1, runner.sprite.depth - 2));
      }

      if (runner.glow) {
        runner.glow.x = p.x;
        runner.glow.y = p.y;
        runner.glow.setDepth(Math.max(1, runner.sprite.depth - 3));
        runner.glow.setAlpha(isBursting ? 0.18 : 0.08);
        runner.glow.setRadius(isBursting ? 58 : 48);
      }

      if (time - scene.lastDust > 90) addDust(scene, runner, isBursting);

      if (runnerPhysics && runnerPhysics.distanceMeters >= scene.raceDistanceMeters && !runner.finished) {
        runner.progress = scene.finishProgress;
        runner.finished = true;
        runner.finishTime = runnerPhysics.elapsedSeconds.toFixed(2);
        scene.finishCount++;
        G.state.raceResults.push({
          name: runner.horse.name,
          time: runner.finishTime,
          horse: runner.horse,
          stats: physics.resultStats ? physics.resultStats(runnerPhysics) : null
        });
        if (scene.finishCount === 1) {
          var status = G.byId('raceStatus');
          if (status) status.textContent = 'Финиш! Победитель: ' + runner.horse.name;
          var audio = raceAudio();
          if (audio.playFinish) audio.playFinish();
          updateSoundButton(scene);
        }
      }
    });

    if (time - scene.lastDust > 90) scene.lastDust = time;

    if (time - scene.lastBoard > 180) {
      updateLeaderboard(scene);
      updatePlayerHud(scene);
      updateTopRaceProgress(scene);
      scene.lastBoard = time;
    }

    if (scene.finishCount >= scene.runners.length) {
      scene.finished = true;
      updateTopRaceProgress(scene);
      setTimeout(function () {
        if (window.SKACHKI_RESULTS) window.SKACHKI_RESULTS.showResults();
      }, 800);
    }
  }

  function handleRaceEvent(scene, runner, time) {
    var temperament = runner.horse.temperament;
    var agility = Number(runner.horse.agility) || 60;
    var roll = Math.random();
    var audio = raceAudio();

    if (roll < 0.28 || temperament === 'Быстрая') {
      runner.burstUntil = time + 900;
      if (audio.playBurst) audio.playBurst();
      addVisualRaceEvent(scene, runner, 'burst');
      return;
    }

    if (roll > 0.88 && agility < 72) {
      runner.penaltyUntil = time + 850;
      if (audio.playMistake) audio.playMistake();
      addVisualRaceEvent(scene, runner, 'mistake');
    }
  }

  function coatColor(horse, index) {
    var coat = String(horse.coat || '').toLowerCase();
    if (coat.indexOf('ворон') >= 0 || coat.indexOf('black') >= 0) return 0x191919;
    if (coat.indexOf('сера') >= 0 || coat.indexOf('gray') >= 0 || coat.indexOf('grey') >= 0) return 0xc8cfd2;
    if (coat.indexOf('рыж') >= 0 || coat.indexOf('chestnut') >= 0) return 0xb85c25;
    if (coat.indexOf('булан') >= 0 || coat.indexOf('buckskin') >= 0) return 0xd6a24c;
    if (coat.indexOf('солов') >= 0 || coat.indexOf('palomino') >= 0) return 0xe2bf66;
    if (coat.indexOf('гнед') >= 0 || coat.indexOf('bay') >= 0) return 0x8f4f22;
    var colors = [0x8f4f22, 0x191919, 0xb85c25, 0xc8cfd2, 0xd6a24c, 0xe2bf66, 0x6b3d1e, 0xb0a18a];
    return colors[index % colors.length];
  }

  function silkColor(index, horse) {
    if (horse && horse.isPlayer) return 0x2f83ff;
    var colors = [0x24a35a, 0x2f83ff, 0xd93a2e, 0xf0c94e, 0x8b4bd8, 0x22c3d4, 0xdfe6ed, 0xf07a24];
    return colors[index % colors.length];
  }

  function makeRunner(scene, key, horse, index) {
    if (scene.textures.exists(key)) return;
    var body = coatColor(horse, index);
    var mane = body === 0x191919 ? 0x4b4b4b : 0x231713;
    var saddle = silkColor(index, horse);
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x000000, 0.22).fillEllipse(50, 62, 48, 15);
    g.fillStyle(body, 1).fillEllipse(50, 45, 24, 50);
    g.fillStyle(body, 1).fillEllipse(50, 21, 17, 23);
    g.fillStyle(mane, 1).fillEllipse(41, 32, 8, 32);
    g.fillStyle(saddle, 0.96).fillRoundedRect(40, 42, 20, 15, 4);
    g.fillStyle(0xf5ead5, 0.78).fillEllipse(50, 16, 6, 12);
    g.fillStyle(0x0b0b0b, 0.72).fillCircle(45, 17, 1.6).fillCircle(55, 17, 1.6);
    g.lineStyle(4, 0x15100c, 0.78);
    g.lineBetween(40, 50, 29, 65);
    g.lineBetween(60, 50, 71, 65);
    g.lineBetween(43, 37, 32, 22);
    g.lineBetween(57, 37, 68, 22);
    g.fillStyle(0xffffff, 0.92).fillCircle(67, 45, 9);
    g.fillStyle(0x111111, 0.74).fillCircle(67, 45, 5);
    if (horse.isPlayer) {
      g.lineStyle(3, 0xffd34d, 0.9);
      g.strokeEllipse(50, 45, 34, 60);
    }
    g.generateTexture(key, 100, 86);
    g.destroy();
  }

  function addDust(scene, runner, isBursting) {
    if (!runner || !runner.sprite || runner.finished) return;
    var angle = runner.sprite.rotation - Math.PI / 2;
    var backX = runner.sprite.x - Math.cos(angle) * 32;
    var backY = runner.sprite.y - Math.sin(angle) * 32;
    var color = isBursting || runner.horse.isPlayer ? 0xffd34d : 0xd9a15c;
    var alpha = isBursting || runner.horse.isPlayer ? 0.36 : 0.16;
    var dust = scene.add.circle(backX, backY, isBursting ? 6 : 4, color, alpha).setDepth(Math.max(1, runner.sprite.depth - 4));

    scene.tweens.add({
      targets: dust,
      alpha: 0,
      scale: isBursting ? 2.5 : 1.8,
      duration: isBursting ? 700 : 520,
      onComplete: function () { dust.destroy(); }
    });
  }

  function addVisualRaceEvent(scene, runner, type) {
    if (!runner || !runner.sprite) return;

    if (type === 'burst') {
      var ring = scene.add.circle(runner.sprite.x, runner.sprite.y, 34, 0xffd34d, 0.08)
        .setStrokeStyle(3, 0xffd34d, 0.9)
        .setDepth(runner.sprite.depth + 2);
      scene.tweens.add({
        targets: ring,
        scale: 2.2,
        alpha: 0,
        duration: 620,
        onComplete: function () { ring.destroy(); }
      });
      return;
    }

    runner.sprite.setTint(0xff7979);
    scene.tweens.add({
      targets: runner.sprite,
      x: runner.sprite.x + 5,
      yoyo: true,
      repeat: 3,
      duration: 55,
      onComplete: function () { runner.sprite.clearTint(); }
    });
  }

  function sortedRunners(scene) {
    return scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  function shortName(name) {
    name = String(name || '').replace(/^Вы:\s*/, '');
    return name.length > 7 ? name.slice(0, 7).toUpperCase() : name.toUpperCase();
  }

  function updateLeaderboard(scene) {
    var order = sortedRunners(scene);

    order.forEach(function (runner, index) {
      var row = scene.boardRows[index];
      if (!row) return;
      var isPlayer = runner === scene.playerRunner;

      row.rowBg.setFillStyle(isPlayer ? 0x5b3d12 : 0x000000, isPlayer ? 0.84 : 0.18);
      row.rowBg.setStrokeStyle(isPlayer ? 2 : 0, 0xffd34d, isPlayer ? 0.9 : 0);
      row.place.setText(String(index + 1));
      row.place.setColor(isPlayer ? '#ffe6a2' : '#ffffff');
      row.silk.setFillStyle(runner.color || 0xffffff, 1);
      row.name.setText(isPlayer ? shortName(runner.displayName) : '');
      row.name.setColor(isPlayer ? '#ffd34d' : '#ffffff');
    });
  }

  function leaderGapText(scene, order) {
    if (!scene.playerRunner || !scene.playerRunner.physics || !order.length) return '';
    var leader = order[0];
    var gap = (leader.physics ? leader.physics.distanceMeters : 0) - scene.playerRunner.physics.distanceMeters;
    if (scene.playerRunner === leader) return 'Лидер заезда';
    return '+' + Math.max(0, gap).toFixed(1) + ' м от лидера';
  }

  function staminaColor(stamina) {
    if (stamina >= 55) return 0x54d66a;
    if (stamina >= 25) return 0xf2c94c;
    return 0xff7a45;
  }

  function updatePlayerHud(scene) {
    if (!scene.playerRunner) return;

    var order = sortedRunners(scene);
    var place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    var speed = scene.playerRunner.physics ? scene.playerRunner.physics.currentSpeedKmh : 0;
    var stamina = scene.playerRunner.physics ? Math.round(scene.playerRunner.physics.staminaReserve) : 0;
    var name = shortName(scene.playerRunner.displayName || scene.playerRunner.horse.name);
    var fillWidth = Math.max(0, (scene.hudStaminaBarW - 4) * stamina / 100);

    if (scene.hudName) scene.hudName.setText(name);
    if (scene.hudPlace) scene.hudPlace.setText(place + ' МЕСТО');
    if (scene.hudGap) scene.hudGap.setText(leaderGapText(scene, order));
    if (scene.hudSpeed) scene.hudSpeed.setText((Math.round(speed * 10) / 10).toFixed(1));
    if (scene.hudStaminaPercent) scene.hudStaminaPercent.setText(stamina + '%');
    if (scene.hudStaminaFill) {
      scene.hudStaminaFill.width = fillWidth;
      scene.hudStaminaFill.setFillStyle(staminaColor(stamina), 1);
    }
  }

  function bind() {
    var G = game();
    var back = G.byId('raceBackBtn');
    var restart = G.byId('restartRaceBtn');

    if (back) back.onclick = function () {
      destroyRaceGame();
      G.showScreen('raceMenu');
    };

    if (restart) restart.onclick = function () {
      if (window.SKACHKI_RACE_MENU) window.SKACHKI_RACE_MENU.startRace();
    };
  }

  return {
    createRaceGame: createRaceGame,
    destroyRaceGame: destroyRaceGame,
    bind: bind
  };
})();
