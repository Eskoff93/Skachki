// Phaser race engine.

window.SKACHKI_RACE_ENGINE = (function () {
  function game() { return window.SKACHKI_GAME; }

  function destroyRaceGame() {
    stopHoofSound();
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
    if (status) status.textContent = 'Старт! Лошади выходят на дистанцию.';

    startHoofSound();

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
    var raceType = G.state.activeRaceType || {};
    var horseCount = G.state.currentRaceHorses.length;
    var trackHeight = Math.min(height * 0.55, 310);
    var trackWidth = Math.min(width * 0.86, Math.max(330, trackHeight * 1.72));
    var laneSpacing = horseCount > 6 ? 9 : 11;

    scene.track = makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount);
    scene.runners = [];
    scene.totalLaps = 1.28;
    scene.targetRaceTime = raceTargetTime(raceType);
    scene.basePace = scene.totalLaps / scene.targetRaceTime;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;

    drawTrack(scene, width, height);

    G.state.currentRaceHorses.forEach(function (horse, index) {
      makeRunner(scene, 'runner_' + index, horse, index);

      var lane = index * scene.track.laneSpacing;
      var p = pointOnTrack(scene.track, 0.006 - index * 0.01, lane);
      var sprite = scene.add.image(p.x, p.y, 'runner_' + index).setScale(0.46).setDepth(30 + index);
      var name = String(horse.name || '').replace(/^Вы:\s*/, '');
      var labelText = horse.isPlayer ? 'Вы' : String(index + 1);
      var label = scene.add.text(p.x, p.y - 25, labelText, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: horse.isPlayer ? 'rgba(255,176,52,.82)' : 'rgba(0,0,0,.46)',
        padding: { left: 5, right: 5, top: 2, bottom: 2 }
      }).setOrigin(0.5).setDepth(200);

      var cls = G.horseClass(horse);
      var form = formRaceMultiplier(horse.form);
      var classFactor = 0.88 + cls / 500;
      var staminaFactor = 0.94 + (Number(horse.stamina) || 60) / 1000;
      var randomFactor = 0.965 + Math.random() * 0.07;

      scene.runners.push({
        horse: horse,
        displayName: name,
        sprite: sprite,
        label: label,
        progress: 0.006 - index * 0.01,
        lane: lane,
        laneTarget: lane,
        pace: scene.basePace * classFactor * staminaFactor * form * randomFactor,
        burstUntil: 0,
        penaltyUntil: 0,
        finished: false,
        finishTime: null,
        nextEvent: scene.time.now + G.randInt(3600, 6800)
      });
    });

    scene.boardBox = scene.add.rectangle(10, 10, 168, 142, 0x071827, 0.76).setOrigin(0, 0).setDepth(300);
    scene.boardBox.setStrokeStyle(1, 0xd8a943, 0.24);
    scene.boardLines = [];
    for (var i = 0; i < Math.min(7, G.state.currentRaceHorses.length); i++) {
      scene.boardLines.push(scene.add.text(20, 22 + i * 17, '', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#fff'
      }).setDepth(310));
    }

    scene.statusText = scene.add.text(width / 2, height - 36, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: '900',
      color: '#fff'
    }).setOrigin(0.5).setDepth(320).setShadow(0, 2, '#000', 3);
  }

  function makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount) {
    var cx = width / 2;
    var cy = height / 2 + 12;
    var radius = trackHeight / 2 - Math.max(32, laneSpacing * horseCount * 0.58);
    var straight = Math.max(120, trackWidth - radius * 2);

    return {
      cx: cx,
      cy: cy,
      w: straight + radius * 2,
      h: radius * 2,
      r: radius,
      straight: straight,
      leftCx: cx - straight / 2,
      rightCx: cx + straight / 2,
      laneSpacing: laneSpacing,
      laneCount: horseCount,
      laneOuter: laneSpacing * Math.max(1, horseCount - 1) + 18,
      laneInner: 24
    };
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

      var p = pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
      runner.sprite.x = p.x;
      runner.sprite.y = p.y;
      runner.sprite.rotation = p.angle + Math.PI / 2;
      runner.sprite.setDepth(30 + Math.floor(p.y));
      runner.label.x = p.x;
      runner.label.y = p.y - 26;

      if (runner.progress >= scene.totalLaps && !runner.finished) {
        runner.finished = true;
        runner.finishTime = ((time - scene.startTime) / 1000).toFixed(2);
        scene.finishCount++;
        G.state.raceResults.push({ name: runner.horse.name, time: runner.finishTime, horse: runner.horse });
        if (scene.finishCount === 1) {
          scene.statusText.setText('Победитель: ' + runner.horse.name);
          var status = G.byId('raceStatus');
          if (status) status.textContent = 'Финиш! Победитель: ' + runner.horse.name;
          playFinish();
        }
      }
    });

    if (time - scene.lastBoard > 250) {
      updateLeaderboard(scene);
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

  function drawTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    var outer = track.laneOuter;
    var inner = track.laneInner;

    g.fillStyle(0x0f4c35, 1).fillRoundedRect(0, 0, width, height, 18);

    for (var s = 0; s < 18; s++) {
      g.lineStyle(1, 0xffffff, 0.025);
      g.lineBetween(0, s * 36, width, s * 36 + 18);
    }

    g.fillStyle(0x215f3d, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2 + 34) / 2,
      track.cy - (track.h + outer * 2 + 34) / 2,
      track.w + outer * 2 + 34,
      track.h + outer * 2 + 34,
      track.r + outer + 17
    );

    g.fillStyle(0x9a5a35, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2) / 2,
      track.cy - (track.h + outer * 2) / 2,
      track.w + outer * 2,
      track.h + outer * 2,
      track.r + outer
    );

    g.fillStyle(0xd28a48, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2 - 12) / 2,
      track.cy - (track.h + outer * 2 - 12) / 2,
      track.w + outer * 2 - 12,
      track.h + outer * 2 - 12,
      track.r + outer - 6
    );

    g.fillStyle(0x17623f, 1).fillRoundedRect(
      track.cx - (track.w - inner * 2) / 2,
      track.cy - (track.h - inner * 2) / 2,
      track.w - inner * 2,
      track.h - inner * 2,
      Math.max(20, track.r - inner)
    );

    g.lineStyle(2, 0xf3d8aa, 0.54);
    for (var i = 0; i < track.laneCount; i++) {
      var lane = i * track.laneSpacing;
      g.strokeRoundedRect(
        track.cx - (track.w + lane * 2) / 2,
        track.cy - (track.h + lane * 2) / 2,
        track.w + lane * 2,
        track.h + lane * 2,
        track.r + lane
      );
    }

    g.lineStyle(4, 0xffffff, 0.94);
    var finishX = track.rightCx;
    var topY = track.cy - track.r - 4;
    g.lineBetween(finishX, topY - 18, finishX, topY + track.laneOuter + 4);
    g.lineStyle(2, 0x111111, 0.42);
    g.lineBetween(finishX + 6, topY - 18, finishX + 6, topY + track.laneOuter + 4);

    scene.add.text(finishX + 10, topY + 8, 'ФИНИШ', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: '900',
      color: '#ffffff'
    }).setShadow(0, 2, '#000', 3).setDepth(40);
  }

  function pointOnTrack(track, progress, lane) {
    var r = track.r + lane;
    var topY = track.cy - r;
    var bottomY = track.cy + r;
    var straight = track.straight;
    var arc = Math.PI * r;
    var perimeter = straight * 2 + arc * 2;
    var d = ((progress % 1) + 1) % 1 * perimeter;
    var x;
    var y;
    var angle;

    if (d < straight) {
      x = track.rightCx - d;
      y = topY;
      angle = Math.PI;
    } else if (d < straight + arc) {
      var leftArc = (d - straight) / arc;
      var a1 = -Math.PI / 2 - leftArc * Math.PI;
      x = track.leftCx + Math.cos(a1) * r;
      y = track.cy + Math.sin(a1) * r;
      angle = a1 - Math.PI / 2;
    } else if (d < straight * 2 + arc) {
      var bottomD = d - straight - arc;
      x = track.leftCx + bottomD;
      y = bottomY;
      angle = 0;
    } else {
      var rightArc = (d - straight * 2 - arc) / arc;
      var a2 = Math.PI / 2 - rightArc * Math.PI;
      x = track.rightCx + Math.cos(a2) * r;
      y = track.cy + Math.sin(a2) * r;
      angle = a2 - Math.PI / 2;
    }

    return { x: x, y: y, angle: angle };
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
    var eventText = scene.add.text(runner.sprite.x, runner.sprite.y - 48, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: '900',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,.48)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    }).setOrigin(0.5).setDepth(330);
    scene.tweens.add({
      targets: eventText,
      y: runner.sprite.y - 78,
      alpha: 0,
      duration: 950,
      onComplete: function () { eventText.destroy(); }
    });
  }

  function updateLeaderboard(scene) {
    scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; }).forEach(function (runner, index) {
      if (scene.boardLines[index]) {
        var percent = Math.min(100, Math.round(runner.progress / scene.totalLaps * 100));
        scene.boardLines[index].setText((index + 1) + '. ' + (runner.horse.isPlayer ? 'Вы' : runner.displayName) + ' ' + percent + '%');
      }
    });
  }

  function playTone(freq, duration, type, volume) {
    var G = game();
    try {
      if (!G.state.audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        G.state.audioCtx = new AudioContextClass();
      }
      var osc = G.state.audioCtx.createOscillator();
      var gain = G.state.audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq || 440;
      gain.gain.setValueAtTime(volume || 0.05, G.state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, G.state.audioCtx.currentTime + (duration || 0.08));
      osc.connect(gain);
      gain.connect(G.state.audioCtx.destination);
      osc.start();
      osc.stop(G.state.audioCtx.currentTime + (duration || 0.08));
    } catch (e) {}
  }

  function startHoofSound() {
    stopHoofSound();
    var G = game();
    G.state.hoofTimer = setInterval(function () {
      playTone(88 + Math.random() * 30, 0.034, 'triangle', 0.03);
    }, 205);
  }

  function stopHoofSound() {
    var G = game();
    if (G.state.hoofTimer) clearInterval(G.state.hoofTimer);
    G.state.hoofTimer = null;
  }

  function playFinish() {
    stopHoofSound();
    playTone(720, 0.08, 'sine', 0.07);
    setTimeout(function () { playTone(960, 0.09, 'sine', 0.07); }, 90);
  }

  function bind() {
    var G = game();
    var back = G.byId('raceBackBtn');
    var restart = G.byId('restartRaceBtn');
    if (back) back.onclick = function () { destroyRaceGame(); G.showScreen('raceMenu'); };
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
