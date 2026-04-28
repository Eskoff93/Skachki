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
      backgroundColor: '#16304a',
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
    scene.track = { cx: width / 2, cy: height / 2 + 4, rx: width * 0.32, ry: height * 0.25 };
    drawTrack(scene, width, height);

    scene.runners = [];
    scene.totalLaps = 1.86;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;

    var colors = [0x2f83ff, 0xf4c542, 0xff4d8d, 0x3fd486, 0xa47cff, 0xff8b45, 0x2fd7d2, 0xd8e2ff];

    G.state.currentRaceHorses.forEach(function (horse, index) {
      makeRunner(scene, 'runner_' + index, colors[index % colors.length]);
      var lane = index * 14;
      var p = pointOnOval(scene.track, 0.002 - index * 0.012, lane);
      var sprite = scene.add.image(p.x, p.y, 'runner_' + index).setScale(0.48).setDepth(30 + index);
      var label = scene.add.text(p.x, p.y - 32, horse.name, {
        fontFamily: 'Arial',
        fontSize: '11px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,.38)',
        padding: { left: 4, right: 4, top: 2, bottom: 2 }
      }).setOrigin(0.5).setDepth(200);

      var cls = G.horseClass(horse);
      scene.runners.push({
        horse: horse,
        sprite: sprite,
        label: label,
        progress: 0.002 - index * 0.012,
        lane: lane,
        pace: (0.00048 + cls * 0.0000075) * (0.96 + Math.random() * 0.08),
        finished: false,
        finishTime: null,
        nextEvent: scene.time.now + G.randInt(3000, 7000)
      });
    });

    scene.boardBox = scene.add.rectangle(10, 10, 190, 160, 0x0b1d30, 0.78).setOrigin(0, 0).setDepth(300);
    scene.boardLines = [];
    for (var i = 0; i < Math.min(8, G.state.currentRaceHorses.length); i++) {
      scene.boardLines.push(scene.add.text(22, 24 + i * 17, '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#fff'
      }).setDepth(310));
    }

    scene.statusText = scene.add.text(width / 2, height - 34, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: '900',
      color: '#fff'
    }).setOrigin(0.5).setDepth(320).setShadow(0, 2, '#000', 3);
  }

  function updateRaceScene(scene, time, delta) {
    var G = game();
    if (scene.finished) return;

    scene.runners.forEach(function (runner) {
      if (runner.finished) return;

      var stamina = 0.72 + runner.horse.stamina / 360;
      var energy = 0.72 + runner.horse.energy / 360;
      var speed = runner.pace * stamina * energy * (1 + Math.sin(time / 520 + G.horseClass(runner.horse)) * 0.012);

      if (time > runner.nextEvent) {
        if (Math.random() < 0.45) {
          speed *= 1.35;
          addRaceEvent(scene, runner, 'Рывок!');
        } else if (Math.random() < 0.18) {
          speed *= 0.65;
          addRaceEvent(scene, runner, 'Сбилась!');
        }
        runner.nextEvent = time + G.randInt(3500, 7500);
      }

      runner.progress += speed * delta;
      var p = pointOnOval(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
      runner.sprite.x = p.x;
      runner.sprite.y = p.y;
      runner.sprite.rotation = p.angle + Math.PI / 2;
      runner.sprite.setDepth(30 + Math.floor(p.y));
      runner.label.x = p.x;
      runner.label.y = p.y - 32;

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

  function drawTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    g.fillStyle(0x16523a, 1).fillRoundedRect(0, 0, width, height, 18);
    g.fillStyle(0x245f3d, 1).fillEllipse(track.cx, track.cy, track.rx * 2.45, track.ry * 2.45);
    g.fillStyle(0xb66a37, 1).fillEllipse(track.cx, track.cy, track.rx * 2.18, track.ry * 2.18);
    g.fillStyle(0xd58b4b, 1).fillEllipse(track.cx, track.cy, track.rx * 1.95, track.ry * 1.95);
    g.fillStyle(0x1d6a43, 1).fillEllipse(track.cx, track.cy, track.rx * 1.22, track.ry * 1.22);
    g.lineStyle(3, 0xf0d2a2, 0.7);
    for (var i = 0; i < 7; i++) {
      g.strokeEllipse(track.cx, track.cy, (track.rx + i * 16) * 2, (track.ry + i * 9) * 2);
    }
    var finish = pointOnOval(track, 0, 78);
    g.lineStyle(5, 0xffffff, 0.95).lineBetween(finish.x - 50, finish.y, finish.x + 50, finish.y);
    scene.add.text(finish.x + 54, finish.y - 12, 'ФИНИШ', {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '900',
      color: '#fff'
    }).setShadow(0, 2, '#000', 3);
  }

  function pointOnOval(track, progress, lane) {
    var angle = -Math.PI / 2 + progress * Math.PI * 2;
    return {
      x: track.cx + Math.cos(angle) * (track.rx + lane),
      y: track.cy + Math.sin(angle) * (track.ry + lane * 0.56),
      angle: angle
    };
  }

  function makeRunner(scene, key, color) {
    if (scene.textures.exists(key)) return;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 0.15).fillEllipse(40, 54, 32, 12);
    g.fillStyle(color, 1).fillEllipse(40, 34, 28, 40).fillEllipse(40, 18, 18, 20);
    g.fillStyle(0x2f1e14, 1).fillEllipse(40, 24, 14, 16);
    g.fillStyle(0xffffff, 0.96).fillCircle(40, 30, 10);
    g.generateTexture(key, 80, 72);
    g.destroy();
  }

  function addRaceEvent(scene, runner, text) {
    var G = game();
    var status = G.byId('raceStatus');
    if (status) status.textContent = runner.horse.name + ': ' + text;
    var eventText = scene.add.text(runner.sprite.x, runner.sprite.y - 54, text, {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '900',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,.45)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    }).setOrigin(0.5).setDepth(330);
    scene.tweens.add({
      targets: eventText,
      y: runner.sprite.y - 82,
      alpha: 0,
      duration: 950,
      onComplete: function () { eventText.destroy(); }
    });
  }

  function updateLeaderboard(scene) {
    scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; }).forEach(function (runner, index) {
      if (scene.boardLines[index]) {
        scene.boardLines[index].setText((index + 1) + '. ' + runner.horse.name + ' ' + Math.min(100, Math.round(runner.progress / scene.totalLaps * 100)) + '%');
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
      playTone(90 + Math.random() * 25, 0.035, 'triangle', 0.035);
    }, 190);
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
