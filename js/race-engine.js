// Phaser race engine.
// Coordinates the scene and runner movement. Track drawing and audio live in split modules.

window.SKACHKI_RACE_ENGINE = (function () {
  function game() { return window.SKACHKI_GAME; }
  function raceTrack() { return window.SKACHKI_RACE_TRACK || {}; }
  function raceAudio() { return window.SKACHKI_RACE_AUDIO || {}; }

  function destroyRaceGame() {
    var audio = raceAudio();
    if (audio.stopHoofSound) audio.stopHoofSound();

    var G = game();
    if (G.state.raceGame) {
      G.state.raceGame.destroy(true);
      G.state.raceGame = null;
    }
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

    var status = G.byId('raceStatus');
    if (status) status.textContent = 'Старт! Камера следует за вашей лошадью.';

    var audio = raceAudio();
    if (audio.startHoofSound) audio.startHoofSound();

    G.state.raceGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-game',
      width: width,
      height: height,
      backgroundColor: '#0d2d26',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
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
    var worldWidth = Math.max(width * 2.35, 960);
    var worldHeight = Math.max(height * 1.55, 720);
    var trackHeight = Math.min(worldHeight * 0.58, 470);
    var trackWidth = Math.min(worldWidth * 0.78, Math.max(620, trackHeight * 1.95));
    var laneSpacing = horseCount > 6 ? 14 : 16;

    scene.viewportWidth = width;
    scene.viewportHeight = height;
    scene.worldWidth = worldWidth;
    scene.worldHeight = worldHeight;
    scene.track = track.makeTrackGeometry(worldWidth, worldHeight, trackWidth, trackHeight, laneSpacing, horseCount);
    scene.runners = [];
    scene.playerRunner = null;
    scene.totalLaps = 1.28;
    scene.targetRaceTime = raceTargetTime(raceType);
    scene.basePace = scene.totalLaps / scene.targetRaceTime;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;

    track.drawTrack(scene, worldWidth, worldHeight);

    G.state.currentRaceHorses.forEach(function (horse, index) {
      makeRunner(scene, 'runner_' + index, horse, index);

      var lane = index * scene.track.laneSpacing;
      var p = track.pointOnTrack(scene.track, 0.006 - index * 0.01, lane);
      var scale = horse.isPlayer ? 0.78 : 0.68;
      var sprite = scene.add.image(p.x, p.y, 'runner_' + index).setScale(scale).setDepth(30 + index);
      var name = String(horse.name || '').replace(/^Вы:\s*/, '');
      var labelText = horse.isPlayer ? 'Вы' : String(index + 1);
      var label = scene.add.text(p.x, p.y - 42, labelText, {
        fontFamily: 'Arial',
        fontSize: horse.isPlayer ? '14px' : '12px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: horse.isPlayer ? 'rgba(255,176,52,.88)' : 'rgba(0,0,0,.52)',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      }).setOrigin(0.5).setDepth(200);

      var cls = G.horseClass(horse);
      var form = formRaceMultiplier(horse.form);
      var classFactor = 0.88 + cls / 500;
      var staminaFactor = 0.94 + (Number(horse.stamina) || 60) / 1000;
      var randomFactor = 0.965 + Math.random() * 0.07;
      var marker = null;

      if (horse.isPlayer) {
        marker = scene.add.circle(p.x, p.y, 28, 0xffd34d, 0.14).setStrokeStyle(2, 0xffd34d, 0.7).setDepth(25);
      }

      var runner = {
        horse: horse,
        displayName: name,
        sprite: sprite,
        label: label,
        marker: marker,
        progress: 0.006 - index * 0.01,
        lane: lane,
        laneTarget: lane,
        pace: scene.basePace * classFactor * staminaFactor * form * randomFactor,
        burstUntil: 0,
        penaltyUntil: 0,
        finished: false,
        finishTime: null,
        nextEvent: scene.time.now + G.randInt(3600, 6800)
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

    if (scene.playerRunner) {
      camera.startFollow(scene.playerRunner.sprite, true, 0.07, 0.07);
      camera.setDeadzone(Math.round(scene.viewportWidth * 0.18), Math.round(scene.viewportHeight * 0.16));
    }
  }

  function setupHud(scene, width, height) {
    var G = game();

    scene.boardBox = scene.add.rectangle(10, 10, 172, 116, 0x071827, 0.78).setOrigin(0, 0).setDepth(300).setScrollFactor(0);
    scene.boardBox.setStrokeStyle(1, 0xd8a943, 0.26);
    scene.boardLines = [];

    for (var i = 0; i < Math.min(5, G.state.currentRaceHorses.length); i++) {
      scene.boardLines.push(scene.add.text(20, 22 + i * 18, '', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#fff'
      }).setDepth(310).setScrollFactor(0));
    }

    scene.playerHud = scene.add.text(width - 14, 14, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      fontStyle: '900',
      color: '#ffe6a2',
      align: 'right',
      backgroundColor: 'rgba(7,24,39,.78)',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(1, 0).setDepth(315).setScrollFactor(0);

    scene.statusText = scene.add.text(width / 2, height - 36, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: '900',
      color: '#fff'
    }).setOrigin(0.5).setDepth(320).setShadow(0, 2, '#000', 3).setScrollFactor(0);
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
    if (scene.finished) return;

    scene.runners.forEach(function (runner) {
      if (runner.finished) return;

      var wave = 1 + Math.sin(time / 740 + G.horseClass(runner.horse)) * 0.01;
      var lateRace = Math.max(0, runner.progress / scene.totalLaps - 0.62);
      var staminaReserve = (Number(runner.horse.stamina) || 60) / 100;
      var fatigue = 1 - lateRace * (0.105 - staminaReserve * 0.052);
      var speed = runner.pace * wave * Math.max(0.9, fatigue);

      if (time < runner.burstUntil) speed *= 1.17;
      if (time < runner.penaltyUntil) speed *= 0.76;

      if (time > runner.nextEvent) {
        handleRaceEvent(scene, runner, time);
        runner.nextEvent = time + G.randInt(4200, 7600);
      }

      runner.lane += (runner.laneTarget - runner.lane) * Math.min(1, delta / 380);
      runner.progress += speed * delta;

      var p = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
      runner.sprite.x = p.x;
      runner.sprite.y = p.y;
      runner.sprite.rotation = p.angle + Math.PI / 2;
      runner.sprite.setDepth(30 + Math.floor(p.y));
      runner.label.x = p.x;
      runner.label.y = p.y - 42;

      if (runner.marker) {
        runner.marker.x = p.x;
        runner.marker.y = p.y;
        runner.marker.setDepth(Math.max(1, runner.sprite.depth - 2));
      }

      if (runner.progress >= scene.totalLaps && !runner.finished) {
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
        }
      }
    });

    if (time - scene.lastBoard > 250) {
      updateLeaderboard(scene);
      updatePlayerHud(scene);
      scene.lastBoard = time;
    }

    if (scene.finishCount >= scene.runners.length) {
      scene.finished = true;
      setTimeout(function () {
        if (window.SKACHKI_RESULTS) window.SKACHKI_RESULTS.showResults();
      }, 800);
    }
  }

  function handleRaceEvent(scene, runner, time) {
    var G = game();
    var temperament = runner.horse.temperament;
    var agility = Number(runner.horse.agility) || 60;
    var roll = Math.random();

    if (temperament === 'Резкая' || roll < 0.2) {
      runner.laneTarget = G.clamp(runner.laneTarget + G.randInt(-1, 1) * scene.track.laneSpacing, 0, scene.track.laneSpacing * Math.max(0, scene.track.laneCount - 1));
    }

    if (roll < 0.36 || temperament === 'Быстрая') {
      runner.burstUntil = time + 900;
      addRaceEvent(scene, runner, 'Рывок!');
      return;
    }

    if (roll > 0.84 && agility < 72) {
      runner.penaltyUntil = time + 850;
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
    var eventText = scene.add.text(runner.sprite.x, runner.sprite.y - 58, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: '900',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,.56)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    }).setOrigin(0.5).setDepth(330);
    scene.tweens.add({
      targets: eventText,
      y: runner.sprite.y - 92,
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
        var percent = Math.min(100, Math.round(runner.progress / scene.totalLaps * 100));
        scene.boardLines[index].setText((index + 1) + '. ' + (runner.horse.isPlayer ? 'Вы' : runner.displayName) + ' ' + percent + '%');
      }
    });
  }

  function updatePlayerHud(scene) {
    if (!scene.playerHud || !scene.playerRunner) return;

    var order = sortedRunners(scene);
    var place = Math.max(1, order.indexOf(scene.playerRunner) + 1);
    var percent = Math.min(100, Math.round(scene.playerRunner.progress / scene.totalLaps * 100));
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
