// Race runner view.
// Owns horse race sprites, labels and visual color mapping.

window.SKACHKI_RACE_RUNNER_VIEW = (function () {
  function game() { return window.SKACHKI_GAME; }
  function trackApi() { return window.SKACHKI_RACE_TRACK || {}; }

  function coatColor(horse, index) {
    var coat = String(horse.coat || '').toLowerCase();
    if (coat.indexOf('ворон') >= 0 || coat.indexOf('black') >= 0) return 0x191919;
    if (coat.indexOf('сера') >= 0 || coat.indexOf('gray') >= 0 || coat.indexOf('grey') >= 0) return 0xc8cfd2;
    if (coat.indexOf('рыж') >= 0 || coat.indexOf('chestnut') >= 0) return 0xb85c25;
    if (coat.indexOf('булан') >= 0 || coat.indexOf('buckskin') >= 0) return 0xd6a24c;
    if (coat.indexOf('солов') >= 0 || coat.indexOf('palomino') >= 0) return 0xe2bf66;
    if (coat.indexOf('гнед') >= 0 || coat.indexOf('bay') >= 0) return 0x8f4f22;
    return [0x8f4f22, 0x191919, 0xb85c25, 0xc8cfd2, 0xd6a24c, 0xe2bf66, 0x6b3d1e, 0xb0a18a][index % 8];
  }

  function silkColor(index, horse) {
    if (horse && horse.isPlayer) return 0x2f83ff;
    return [0x24a35a, 0x2f83ff, 0xd93a2e, 0xf0c94e, 0x8b4bd8, 0x22c3d4, 0xdfe6ed, 0xf07a24][index % 8];
  }

  function mixColor(a, b, amount) {
    var ar = (a >> 16) & 255;
    var ag = (a >> 8) & 255;
    var ab = a & 255;
    var br = (b >> 16) & 255;
    var bg = (b >> 8) & 255;
    var bb = b & 255;
    var r = Math.round(ar + (br - ar) * amount);
    var g = Math.round(ag + (bg - ag) * amount);
    var bl = Math.round(ab + (bb - ab) * amount);
    return (r << 16) | (g << 8) | bl;
  }

  function shortName(name) {
    name = String(name || '').replace(/^Вы:\s*/, '');
    return name.length > 7 ? name.slice(0, 7).toUpperCase() : name.toUpperCase();
  }

  function drawLegs(g, body, dark) {
    g.lineStyle(5, dark, 0.86);
    g.lineBetween(43, 54, 31, 70);
    g.lineBetween(69, 54, 82, 70);
    g.lineBetween(45, 39, 29, 26);
    g.lineBetween(67, 39, 84, 27);

    g.lineStyle(3, body, 0.92);
    g.lineBetween(43, 54, 32, 68);
    g.lineBetween(69, 54, 80, 68);
    g.lineBetween(45, 39, 31, 28);
    g.lineBetween(67, 39, 81, 29);

    g.fillStyle(dark, 0.86).fillEllipse(31, 70, 8, 4);
    g.fillStyle(dark, 0.86).fillEllipse(82, 70, 8, 4);
    g.fillStyle(dark, 0.86).fillEllipse(29, 26, 7, 4);
    g.fillStyle(dark, 0.86).fillEllipse(84, 27, 7, 4);
  }

  function drawHorseBody(g, body, index) {
    var dark = mixColor(body, 0x000000, body === 0x191919 ? 0.1 : 0.42);
    var light = mixColor(body, 0xffffff, body === 0x191919 ? 0.16 : 0.22);
    var mane = body === 0x191919 ? 0x474747 : 0x20140d;
    var mark = index % 3 === 0 ? 0xf5ead5 : mixColor(body, 0xffffff, 0.28);

    drawLegs(g, body, dark);

    g.fillStyle(body, 1).fillEllipse(56, 48, 30, 54);
    g.fillStyle(light, 0.3).fillEllipse(61, 43, 12, 37);
    g.fillStyle(dark, 0.2).fillEllipse(48, 55, 10, 32);

    g.fillStyle(body, 1).fillEllipse(56, 22, 19, 24);
    g.fillStyle(body, 1).fillEllipse(56, 13, 13, 15);
    g.fillStyle(mark, 0.82).fillEllipse(56, 10, 5, 9);

    g.fillStyle(body, 1).fillTriangle(48, 14, 45, 4, 53, 11);
    g.fillStyle(body, 1).fillTriangle(64, 14, 67, 4, 59, 11);
    g.fillStyle(dark, 0.38).fillTriangle(48, 13, 47, 7, 52, 11);
    g.fillStyle(dark, 0.38).fillTriangle(64, 13, 65, 7, 60, 11);

    g.fillStyle(mane, 0.94).fillEllipse(45, 27, 8, 34);
    g.fillStyle(mane, 0.8).fillTriangle(46, 64, 34, 79, 50, 67);

    g.fillStyle(0x0b0b0b, 0.78).fillCircle(51, 13, 1.6).fillCircle(61, 13, 1.6);
  }

  function drawSaddleAndRider(g, saddle, horse, index) {
    var helmet = saddle;
    var trim = horse && horse.isPlayer ? 0x7bd8ff : 0xffffff;
    var numberBg = horse && horse.isPlayer ? 0x0b1e35 : 0xffffff;
    var numberDot = horse && horse.isPlayer ? 0x7bd8ff : 0x06111f;

    g.fillStyle(0x06111f, 0.52).fillRoundedRect(43, 39, 26, 20, 5);
    g.fillStyle(saddle, 0.98).fillRoundedRect(44, 38, 24, 18, 5);
    g.fillStyle(trim, 0.75).fillRect(44, 44, 24, 3);

    g.fillStyle(numberBg, 0.92).fillCircle(68, 48, 7);
    g.fillStyle(numberDot, 0.86).fillCircle(68, 48, horse && horse.isPlayer ? 3.5 : 3);

    g.fillStyle(0xf0d3b1, 0.95).fillEllipse(56, 36, 9, 10);
    g.fillStyle(helmet, 1).fillEllipse(56, 32, 11, 8);
    g.fillStyle(trim, 0.72).fillRect(51, 31, 10, 2);

    if (index % 2 === 0) {
      g.lineStyle(2, trim, 0.7);
      g.lineBetween(45, 40, 67, 55);
    }
  }

  function makeRunnerTexture(scene, key, horse, index) {
    if (scene.textures.exists(key)) return;

    var body = coatColor(horse, index);
    var saddle = silkColor(index, horse);
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x000000, 0.24).fillEllipse(56, 68, 58, 16);
    drawHorseBody(g, body, index);
    drawSaddleAndRider(g, saddle, horse, index);

    if (horse && horse.isPlayer) {
      g.lineStyle(2, 0x7bd8ff, 0.58).strokeEllipse(56, 48, 38, 62);
    }

    g.generateTexture(key, 112, 92);
    g.destroy();
  }

  function createRunner(scene, horse, index, physics, raceDistanceMeters, startProgress) {
    var G = game();
    var track = trackApi();
    var key = 'runner_' + index;
    var lane = index * scene.track.laneSpacing;
    var p = track.pointOnTrack(scene.track, startProgress, lane);
    var name = String(horse.name || '').replace(/^Вы:\s*/, '');
    var labelText = horse.isPlayer ? '★' : String(index + 1);
    var scale = horse.isPlayer ? 1.08 : 0.98;

    makeRunnerTexture(scene, key, horse, index);

    var sprite = scene.add.image(p.x, p.y, key).setScale(scale).setDepth(30 + index);
    var label = scene.add.text(p.x, p.y - 56, labelText, {
      fontFamily: 'Arial',
      fontSize: horse.isPlayer ? '15px' : '11px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: horse.isPlayer ? 'rgba(47,131,255,.9)' : 'rgba(6,17,31,.62)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      resolution: 2
    }).setOrigin(0.5).setDepth(230);

    return {
      horse: horse,
      displayName: name,
      sprite: sprite,
      label: label,
      progress: startProgress,
      lane: lane,
      laneTarget: lane,
      pace: physics.speedToKmh ? physics.speedToKmh(horse.speed) : Number(horse.speed) || 30,
      formMultiplier: 1,
      randomFactor: 0.965 + Math.random() * 0.07,
      physics: physics.initialRunnerPhysics ? physics.initialRunnerPhysics(horse, raceDistanceMeters) : null,
      burstUntil: 0,
      penaltyUntil: 0,
      finished: false,
      finishTime: null,
      nextEvent: scene.time.now + G.randInt(3600, 6800),
      nextLaneThink: scene.time.now + G.randInt(120, 420),
      color: silkColor(index, horse)
    };
  }

  function updateRunnerVisual(scene, runner) {
    var track = trackApi();
    var p = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);

    runner.sprite.x = p.x;
    runner.sprite.y = p.y;
    runner.sprite.rotation = p.angle + Math.PI / 2;
    runner.sprite.setDepth(30 + Math.floor(p.y));
    runner.label.x = p.x;
    runner.label.y = p.y - 56;
    runner.label.setDepth(runner.sprite.depth + 4);
  }

  return {
    coatColor: coatColor,
    createRunner: createRunner,
    makeRunnerTexture: makeRunnerTexture,
    shortName: shortName,
    silkColor: silkColor,
    updateRunnerVisual: updateRunnerVisual
  };
})();
