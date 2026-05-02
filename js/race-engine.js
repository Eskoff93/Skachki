// Phaser race engine.
// Coordinates the scene and runner movement. Track drawing, audio and AI live in split modules.

window.SKACHKI_RACE_ENGINE = (function () {
  function game() { return window.SKACHKI_GAME; }
  function raceTrack() { return window.SKACHKI_RACE_TRACK || {}; }
  function raceAudio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function raceAi() { return window.SKACHKI_RACE_AI || {}; }

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
    var height = Math.max(470, Math.floor(rect.height));
    var resolution = raceRenderResolution();

    var status = G.byId('raceStatus');
    if (status) status.textContent = 'Старт! Камера следует за вашей лошадью.';

    var audio = raceAudio();
    if (audio.bindUnlock) audio.bindUnlock();
    if (audio.startHoofSound) audio.startHoofSound();

    G.state.raceGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-game',
      width: width,
      height: height,
      resolution: resolution,
      backgroundColor: '#0d2d26',
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

  function setupRaceScene(scene, width, height) {
    var G = game();
    var track = raceTrack();
    var raceType = G.state.activeRaceType || {};
    var horseCount = G.state.currentRaceHorses.length;
    var worldWidth = Math.max(width * 2.6, 1040);
    var worldHeight = Math.max(height * 1.65, 780);
    var trackHeight = Math.min(worldHeight * 0.66, 560);
    var trackWidth = Math.min(worldWidth * 0.88, Math.max(760, trackHeight * 2.05));
    var laneSpacing = horseCount > 6 ? 18 : 21;
    var startProgress = 0.006;

    scene.viewportWidth = width;
    scene.viewportHeight = height;
    scene.worldWidth = worldWidth;
    scene.worldHeight = worldHeight;
    scene.track = track.makeTrackGeometry(worldWidth, worldHeight, trackWidth, trackHeight, laneSpacing, horseCount);
    scene.runners = [];
    scene.playerRunner = null;
    scene.startProgress = startProgress;
    scene.raceDistance = 1;
    scene.finishProgress = startProgress + scene.raceDistance;
    scene.totalLaps = scene.finishProgress;
    scene.targetRaceTime = raceTargetTime(raceType);
    scene.basePace = scene.raceDistance / scene.targetRaceTime;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;

    resetTopRaceProgress();
    track.drawTrack(scene, worldWidth, worldHeight);

    G.state.currentRaceHorses.forEach(function (horse, index) {
      makeRunner(scene, 'runner_' + index, horse, index);

      var lane = index * scene.track.laneSpacing;
      var p = track.pointOnTrack(scene.track, startProgress, lane);
      var scale = horse.isPlayer ? 0.96 : 0.84;
      var sprite = scene.add.image(p.x, p.y, 'runner_' + index).setScale(scale).setDepth(30 + index);
      var name = String(horse.name || '').replace(/^Вы:\s*/, '');
      var labelText = horse.isPlayer ? 'Вы' : String(index + 1);
      var label = scene.add.text(p.x, p.y - 52, labelText, {
        fontFamily: 'Arial',
        fontSize: horse.isPlayer ? '16px' : '14px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: horse.isPlayer ? 'rgba(255,176,52,.9)' : 'rgba(0,0,0,.56)',
        padding: { left: 7, right: 7, top: 4, bottom: 4 },
        resolution: 2
      }).setOrigin(0.5).setDepth(200);

      var cls = G.horseClass(horse);
      var form = formRaceMultiplier(horse.form);
      var classFactor = 0.88 + cls / 500;
      var staminaFactor = 0.94 + (Number(horse.stamina) || 60) / 1000;
      var randomFactor = 0.965 + Math.random() * 0.07;
      var marker = null;

      if (horse.isPlayer) {
        marker = scene.add.circle(p.x, p.y, 36, 0xffd34d, 0.14).setStrokeStyle(2, 0xffd34d, 0.7).setDepth(25);
      }

      var runner = {
        horse: horse,
        displayName: name,
        sprite: sprite,
        label: label,
        marker: marker,
        progress: startProgress,
        lane: lane,
        laneTarget: lane,
        pace: scene.basePace * classFactor * staminaFactor * form * randomFactor,
        burstUntil: 0,
        penaltyUntil: 0,
        finished: false,
        finishTime: null,
        nextEvent: scene.time.now + G.randInt(3600, 6800),
        nextLaneThink: scene.time.now + G.randInt(120, 420)
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
    camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    camera.setRoundPixels(false);
    camera.setZoom(1);

    if (scene.playerRunner) {
      camera.startFollow(scene.playerRunner.sprite, true, 0.08, 0.08);
      camera.setDeadzone(Math.round(scene.viewportWidth * 0.11), Math.round(scene.viewportHeight * 0.1));
    }
  }

  function setupHud(scene, width, height) {
    var G = game();

    scene.boardBox = scene.add.rectangle(10, 10, 188, 128, 0x071827, 0.84).setOrigin(0, 0).setDepth(300).setScrollFactor(0);
    scene.boardBox.setStrokeStyle(1, 0xd8a943, 0.34);
    scene.boardLines = [];

    for (var i = 0; i < Math.min(5, G.state.currentRaceHorses.length); i++) {
      scene.boardLines.push(scene.add.text(20, 23 + i * 20, '', {
        fontFamily: 'Arial',
        fontSize: '13px',
        fontStyle: '800',
        color: '#ffffff',
        resolution: 2
      }).setDepth(310).setScrollFactor(0));
    }

    scene.playerHud = scene.add.text(width - 14, 14, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffe6a2',
      align: 'right',
      backgroundColor: 'rgba(7,24,39,.86)',
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
      resolution: 2
    }).setOrigin(1, 0).setDepth(315).setScrollFactor(0);

    scene.soundToggle = scene.add.text(width - 14, 116, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: 'rgba(7,24,39,.86)',
      padding: { left: 9, right: 9, top: 7, bottom: 7 },
      resolution: 2
    }).setOrigin(1, 0).setDepth(316).setScrollFactor(0).setInteractive({ useHandCursor: true });

    scene.soundToggle.on('pointerdown', function (pointer, localX, localY, event) {
      var audio = raceAudio();
      if (event && event.stopPropagation) event.stopPropagation();
      if (audio.toggleMuted) audio.toggleMuted();
      if (audio.unlockAudio) audio.unlockAudio();
      if (audio.isMuted && !audio.isMuted() && !scene.finished && audio.startHoofSound) audio.startHoofSound();
      updateSoundButton(scene);
    });
    updateSoundButton(scene);

    scene.statusText = scene.add.text(width / 2, height - 38, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: '900',
      color: '#fff',
      resolution: 2
    }).setOrigin(0.5).setDepth(320).setShadow(0, 2, '#000', 3).setScrollFactor(0);
  }

  function updateSoundButton(scene) {
    var audio = raceAudio();
    if (!scene || !scene.soundToggle) return;
    scene.soundToggle.setText(audio.isMuted && audio.isMuted() ? '🔇 Звук' : '🔊 Звук');
  }

  function resetTopRaceProgress() {
    var G = game();
    var fill = G && G.byId ? G.byId('raceProgressFill') : null;
    var meta = G && G.byId ? G.byId('raceProgressMeta') : null;
    if (fill) fill.style.width = '0%';
    if (meta) meta.textContent = '0%';
  }

  function racePercent(scene, runner) {
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
    if (meta) meta.textContent = percent + '%';
  }

  function raceTargetTime(raceType) {
    var distance = Number(raceType.distance) || 1600;
    var distanceFactor = Math.max(-900, Math.min(1100, (distance - 1600) * 0.55));
    return 20000 + distanceFactor;
  }

  function formRaceMultiplier(form) {
    var G = game();
    var raw = G.formMultiplier ? G.formMultiplier(form) : 0.8;
    if (raw >= 1) return 1.055;
    if (raw <= 0.6) return 0.93;
    return 1;
  }

  function updateRaceScene(scene, time, delta) {
    var G = game();
    var track = raceTrack();
    var ai = raceAi();
    if (scene.finished) return;

    scene.runners.forEach(function (runner) {
      if (runner.finished) return;

      var lineEfficiency = ai.update ? ai.update(scene, runner, time) : 1;
      var wave = 1 + Math.sin(time / 740 + G.horseClass(runner.horse)) * 0.01;
      var lateRace = Math.max(0, racePercent(scene, runner) / 100 - 0.62);
      var staminaReserve = (Number(runner.horse.stamina) || 60) / 100;
      var fatigue = 1 - lateRace * (0.105 - staminaReserve * 0.052);
      var speed = runner.pace * wave * Math.max(0.9, fatigue) * lineEfficiency;

      if (time < runner.burstUntil) speed *= 1.17;
      if (time < runner.penaltyUntil) speed *= 0.76;

      if (time > runner.nextEvent) {
        handleRaceEvent(scene, runner, time);
        runner.nextEvent = time + G.randInt(4200, 7600);
      }

      runner.lane += (runner.laneTarget - runner.lane) * Math.min(1, delta / 440);
      runner.progress += speed * delta;

      var p = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
      runner.sprite.x = p.x;
      runner.sprite.y = p.y;
      runner.sprite.rotation = p.angle + Math.PI / 2;
      runner.sprite.setDepth(30 + Math.floor(p.y));
      runner.label.x = p.x;
      runner.label.y = p.y - 52;

      if (runner.marker) {
        runner.marker.x = p.x;
        runner.marker.y = p.y;
        runner.marker.setDepth(Math.max(1, runner.sprite.depth - 2));
      }

      if (runner.progress >= scene.finishProgress && !runner.finished) {
        runner.progress = scene.finishProgress;
        runner.finished = true;
        runner.finishTime = ((time - scene.startTime) / 1000).toFixed(2);
        scene.finishCount++;
        G.state.raceResults.push({ name: runner.horse.name, time: runner.finishTime, horse: runner.horse });
        if (scene.finishCount === 1) {
          scene.statusText.setText('Победитель: ' + runner.horse.name);
          var status = G.byId('raceStatus');
          if (status) status.textContent = 'Финиш! Победитель: ' + runner.horse.name;
          var audio = raceAudio();
          if (audio.playFinish) audio.playFinish();
          updateSoundButton(scene);
        }
      }
    });

    if (time - scene.lastBoard > 250) {
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
      addRaceEvent(scene, runner, 'Рывок!');
      return;
    }

    if (roll > 0.88 && agility < 72) {
      runner.penaltyUntil = time + 850;
      if (audio.playMistake) audio.playMistake();
      addRaceEvent(scene, runner, 'Сбилась!');
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

  function makeRunner(scene, key, horse, index) {
    if (scene.textures.exists(key)) return;
    var body = coatColor(horse, index);
    var mane = body === 0x191919 ? 0x4b4b4b : 0x231713;
    var saddle = horse.isPlayer ? 0xffd34d : 0x2f83ff;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x000000, 0.18).fillEllipse(42, 50, 40, 13);
    g.fillStyle(body, 1).fillEllipse(42, 37, 20, 42);
    g.fillStyle(body, 1).fillEllipse(42, 17, 15, 19);
    g.fillStyle(mane, 1).fillEllipse(35, 26, 7, 28);
    g.fillStyle(saddle, 0.95).fillRoundedRect(34, 34, 16, 12, 3);
    g.fillStyle(0xf5ead5, 0.78).fillEllipse(42, 13, 5, 10);
    g.fillStyle(0x0b0b0b, 0.72).fillCircle(38, 14, 1.4).fillCircle(46, 14, 1.4);
    g.lineStyle(3, 0x15100c, 0.78);
    g.lineBetween(34, 41, 25, 53);
    g.lineBetween(50, 41, 59, 53);
    g.lineBetween(36, 31, 28, 19);
    g.lineBetween(48, 31, 56, 19);
    g.fillStyle(0xffffff, 0.92).fillCircle(56, 36, 8);
    g.fillStyle(0x111111, 0.74).fillCircle(56, 36, 5);
    g.generateTexture(key, 84, 72);
    g.destroy();
  }

  function addRaceEvent(scene, runner, text) {
    var G = game();
    var status = G.byId('raceStatus');
    if (status) status.textContent = runner.horse.name + ': ' + text;
    var eventText = scene.add.text(runner.sprite.x, runner.sprite.y - 64, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: '900',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,.62)',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      resolution: 2
    }).setOrigin(0.5).setDepth(330);
    scene.tweens.add({
      targets: eventText,
      y: runner.sprite.y - 100,
      alpha: 0,
      duration: 950,
      onComplete: function () { eventText.destroy(); }
    });
  }

  function sortedRunners(scene) {
    return scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  function updateLeaderboard(scene) {
    sortedRunners(scene).forEach(function (runner, index) {
      if (scene.boardLines[index]) {
        var percent = racePercent(scene, runner);
        scene.boardLines[index].setText((index + 1) + '. ' + (runner.horse.isPlayer ? 'Вы' : runner.displayName) + ' ' + percent + '%');
      }
    });
  }

  function updatePlayerHud(scene) {
    if (!scene.playerHud || !scene.playerRunner) return;

    var order = sortedRunners(scene);
    var place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    var percent = racePercent(scene, scene.playerRunner);
    var remaining = Math.max(0, 100 - percent);
    var pace = 'ровный';

    if (scene.time.now < scene.playerRunner.burstUntil) pace = 'рывок';
    else if (scene.time.now < scene.playerRunner.penaltyUntil) pace = 'сбой';
    else if (percent > 72) pace = 'финиш';

    scene.playerHud.setText(place + '/' + scene.runners.length + ' место\n' + percent + '% дистанции\nТемп: ' + pace + '\nДо финиша: ' + remaining + '%');
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
