// Race runner view.
// Owns horse race sprites, labels, run animation and visual color mapping.

window.SKACHKI_RACE_RUNNER_VIEW = (function () {
  var FRAME_COUNT = 4;

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

  function legPose(phase) {
    return [
      { fl: -2, fr: 2, bl: 2, br: -2 },
      { fl: 1, fr: -1, bl: -1, br: 1 },
      { fl: 2, fr: -2, bl: -2, br: 2 },
      { fl: -1, fr: 1, bl: 1, br: -1 }
    ][phase % FRAME_COUNT];
  }

  function drawLeg(g, sx, sy, dx, dy, body, dark) {
    g.lineStyle(5, dark, 0.54);
    g.lineBetween(sx, sy, dx, dy);
    g.lineStyle(3, body, 0.86);
    g.lineBetween(sx, sy, dx, dy);
    g.fillStyle(dark, 0.62).fillEllipse(dx, dy, 5, 2.7);
  }

  function drawLegs(g, body, dark, phase) {
    var p = legPose(phase);

    drawLeg(g, 49, 40, 45 + p.fl, 31, body, dark);
    drawLeg(g, 63, 40, 67 + p.fr, 31, body, dark);
    drawLeg(g, 49, 57, 45 + p.bl, 66, body, dark);
    drawLeg(g, 63, 57, 67 + p.br, 66, body, dark);
  }

  function drawHorseBody(g, body, index, phase) {
    var dark = mixColor(body, 0x000000, body === 0x191919 ? 0.1 : 0.42);
    var light = mixColor(body, 0xffffff, body === 0x191919 ? 0.16 : 0.22);
    var mane = body === 0x191919 ? 0x474747 : 0x20140d;
    var mark = index % 3 === 0 ? 0xf5ead5 : mixColor(body, 0xffffff, 0.28);
    var bob = 0;

    drawLegs(g, body, dark, phase);

    g.fillStyle(mane, 0.7).fillTriangle(46, 58 + bob, 38, 70 + bob, 49, 62 + bob);
    g.fillStyle(body, 1).fillEllipse(56, 49 + bob, 29, 51);
    g.fillStyle(light, 0.28).fillEllipse(61, 44 + bob, 11, 34);
    g.fillStyle(dark, 0.18).fillEllipse(49, 55 + bob, 9, 28);

    g.fillStyle(body, 1).fillEllipse(56, 24 + bob, 18, 23);
    g.fillStyle(body, 1).fillEllipse(56, 15 + bob, 12, 14);
    g.fillStyle(mark, 0.8).fillEllipse(56, 12 + bob, 4.8, 8);

    g.fillStyle(body, 1).fillTriangle(49, 16 + bob, 47, 7 + bob, 53, 13 + bob);
    g.fillStyle(body, 1).fillTriangle(63, 16 + bob, 65, 7 + bob, 59, 13 + bob);
    g.fillStyle(dark, 0.34).fillTriangle(49, 15 + bob, 48, 10 + bob, 52, 13 + bob);
    g.fillStyle(dark, 0.34).fillTriangle(63, 15 + bob, 64, 10 + bob, 60, 13 + bob);

    g.fillStyle(mane, 0.94).fillEllipse(47, 31 + bob, 7, 23);
    g.fillStyle(mane, 0.68).fillEllipse(48, 42 + bob, 5, 19);

    g.fillStyle(0x0b0b0b, 0.78).fillCircle(52, 15 + bob, 1.5).fillCircle(60, 15 + bob, 1.5);
  }

  function drawSaddleAndRider(g, saddle, horse, index, phase) {
    var helmet = saddle;
    var trim = horse && horse.isPlayer ? 0x7bd8ff : 0xffffff;
    var numberBg = horse && horse.isPlayer ? 0x0b1e35 : 0xffffff;
    var numberDot = horse && horse.isPlayer ? 0x7bd8ff : 0x06111f;
    var bob = 0;

    g.fillStyle(0x06111f, 0.52).fillRoundedRect(43, 41 + bob, 26, 18, 5);
    g.fillStyle(saddle, 0.98).fillRoundedRect(44, 40 + bob, 24, 16, 5);
    g.fillStyle(trim, 0.75).fillRect(44, 45 + bob, 24, 3);

    g.fillStyle(numberBg, 0.92).fillCircle(68, 49 + bob, 6.5);
    g.fillStyle(numberDot, 0.86).fillCircle(68, 49 + bob, horse && horse.isPlayer ? 3.3 : 2.8);

    g.fillStyle(0xf0d3b1, 0.95).fillEllipse(56, 37 + bob, 8, 9);
    g.fillStyle(helmet, 1).fillEllipse(56, 34 + bob, 10, 7);
    g.fillStyle(trim, 0.72).fillRect(51, 33 + bob, 10, 2);

    if (index % 2 === 0) {
      g.lineStyle(2, trim, 0.58);
      g.lineBetween(45, 42 + bob, 67, 55 + bob);
    }
  }

  function makeRunnerTexture(scene, key, horse, index) {
    var body = coatColor(horse, index);
    var saddle = silkColor(index, horse);
    var phase;
    var frameKey;
    var g;

    for (phase = 0; phase < FRAME_COUNT; phase++) {
      frameKey = key + '_' + phase;
      if (scene.textures.exists(frameKey)) continue;

      g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x000000, 0.2).fillEllipse(56, 68, 48, 12);
      drawHorseBody(g, body, index, phase);
      drawSaddleAndRider(g, saddle, horse, index, phase);
      g.generateTexture(frameKey, 112, 92);
      g.destroy();
    }
  }

  function createRunner(scene, horse, index, physics, raceDistanceMeters, startProgress) {
    var G = game();
    var track = trackApi();
    var key = 'runner_anim_' + index;
    var lane = index * scene.track.laneSpacing;
    var p = track.pointOnTrack(scene.track, startProgress, lane);
    var name = String(horse.name || '').replace(/^Вы:\s*/, '');
    var labelText = horse.isPlayer ? '★' : String(index + 1);
    var scale = horse.isPlayer ? 1.06 : 0.97;

    makeRunnerTexture(scene, key, horse, index);

    var sprite = scene.add.image(p.x, p.y, key + '_0').setScale(scale).setDepth(30 + index);
    var label = scene.add.text(p.x, p.y - 54, labelText, {
      fontFamily: 'Arial',
      fontSize: horse.isPlayer ? '15px' : '11px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: horse.isPlayer ? 'rgba(47,131,255,.88)' : 'rgba(6,17,31,.62)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      resolution: 2
    }).setOrigin(0.5).setDepth(230);

    return {
      horse: horse,
      displayName: name,
      sprite: sprite,
      label: label,
      textureKey: key,
      visualFrame: 0,
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

  function updateAnimationFrame(scene, runner) {
    var speed = runner.physics ? runner.physics.currentSpeedKmh : 30;
    var fps = Math.max(4, Math.min(10, speed / 5.5));
    var frame = Math.floor(scene.time.now / (1000 / fps)) % FRAME_COUNT;

    if (frame !== runner.visualFrame) {
      runner.visualFrame = frame;
      runner.sprite.setTexture(runner.textureKey + '_' + frame);
    }
  }

  function updateRunnerVisual(scene, runner) {
    var track = trackApi();
    var p = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);

    updateAnimationFrame(scene, runner);
    runner.sprite.x = p.x;
    runner.sprite.y = p.y;
    runner.sprite.rotation = p.angle + Math.PI / 2;
    runner.sprite.setDepth(30 + Math.floor(p.y));
    runner.label.x = p.x;
    runner.label.y = p.y - 54;
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
