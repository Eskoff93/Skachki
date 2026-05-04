// Race runner view.
// Owns horse race sprites, labels, run animation and visual color mapping.

window.SKACHKI_RACE_RUNNER_VIEW = (function () {
  var FRAME_COUNT = 4;
  var TEXTURE_SCALE = 2;
  var TEXTURE_WIDTH = 112;
  var TEXTURE_HEIGHT = 92;

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
    g.lineStyle(4, dark, 0.48);
    g.lineBetween(sx, sy, dx, dy);
    g.lineStyle(2, body, 0.84);
    g.lineBetween(sx, sy, dx, dy);
    g.fillStyle(dark, 0.56).fillEllipse(dx, dy, 4, 2.2);
  }

  function drawLegs(g, body, dark, phase) {
    var p = legPose(phase);

    drawLeg(g, 50, 41, 47 + p.fl, 32, body, dark);
    drawLeg(g, 62, 41, 65 + p.fr, 32, body, dark);
    drawLeg(g, 50, 56, 47 + p.bl, 65, body, dark);
    drawLeg(g, 62, 56, 65 + p.br, 65, body, dark);
  }

  function drawHorseBody(g, body, index, phase) {
    var dark = mixColor(body, 0x000000, body === 0x191919 ? 0.1 : 0.42);
    var light = mixColor(body, 0xffffff, body === 0x191919 ? 0.16 : 0.22);
    var mane = body === 0x191919 ? 0x474747 : 0x20140d;
    var mark = index % 3 === 0 ? 0xf5ead5 : mixColor(body, 0xffffff, 0.28);
    var bob = 0;

    drawLegs(g, body, dark, phase);

    g.fillStyle(mane, 0.62).fillTriangle(47, 57 + bob, 40, 68 + bob, 50, 61 + bob);
    g.fillStyle(body, 1).fillEllipse(56, 49 + bob, 23, 47);
    g.fillStyle(light, 0.24).fillEllipse(60, 44 + bob, 8, 30);
    g.fillStyle(dark, 0.16).fillEllipse(50, 55 + bob, 7, 24);

    g.fillStyle(body, 1).fillEllipse(56, 25 + bob, 15, 20);
    g.fillStyle(body, 1).fillEllipse(56, 16 + bob, 10, 12);
    g.fillStyle(mark, 0.76).fillEllipse(56, 13 + bob, 3.6, 6.8);

    g.fillStyle(body, 1).fillTriangle(50, 17 + bob, 48, 9 + bob, 53, 14 + bob);
    g.fillStyle(body, 1).fillTriangle(62, 17 + bob, 64, 9 + bob, 59, 14 + bob);
    g.fillStyle(dark, 0.28).fillTriangle(50, 16 + bob, 49, 11 + bob, 52, 14 + bob);
    g.fillStyle(dark, 0.28).fillTriangle(62, 16 + bob, 63, 11 + bob, 60, 14 + bob);

    g.fillStyle(mane, 0.9).fillEllipse(49, 32 + bob, 5, 20);
    g.fillStyle(mane, 0.6).fillEllipse(49, 42 + bob, 4, 16);

    g.fillStyle(0x0b0b0b, 0.76).fillCircle(53, 16 + bob, 1.3).fillCircle(59, 16 + bob, 1.3);
  }

  function drawSaddleAndRider(g, saddle, horse, index, phase) {
    var helmet = saddle;
    var trim = horse && horse.isPlayer ? 0x7bd8ff : 0xffffff;
    var numberBg = horse && horse.isPlayer ? 0x0b1e35 : 0xffffff;
    var numberDot = horse && horse.isPlayer ? 0x7bd8ff : 0x06111f;
    var bob = 0;

    g.fillStyle(0x06111f, 0.48).fillRoundedRect(45, 42 + bob, 22, 15, 4);
    g.fillStyle(saddle, 0.96).fillRoundedRect(46, 41 + bob, 20, 13, 4);
    g.fillStyle(trim, 0.68).fillRect(46, 45 + bob, 20, 2);

    g.fillStyle(numberBg, 0.9).fillCircle(67, 49 + bob, 5.6);
    g.fillStyle(numberDot, 0.82).fillCircle(67, 49 + bob, horse && horse.isPlayer ? 2.8 : 2.4);

    g.fillStyle(0xf0d3b1, 0.94).fillEllipse(56, 37 + bob, 7, 8);
    g.fillStyle(helmet, 1).fillEllipse(56, 34 + bob, 8.5, 6);
    g.fillStyle(trim, 0.66).fillRect(52, 33 + bob, 8, 2);

    if (index % 2 === 0) {
      g.lineStyle(2, trim, 0.5);
      g.lineBetween(46, 42 + bob, 66, 54 + bob);
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
      g.scaleCanvas(TEXTURE_SCALE, TEXTURE_SCALE);
      g.fillStyle(0x000000, 0.18).fillEllipse(56, 68, 42, 10);
      drawHorseBody(g, body, index, phase);
      drawSaddleAndRider(g, saddle, horse, index, phase);
      g.generateTexture(frameKey, TEXTURE_WIDTH * TEXTURE_SCALE, TEXTURE_HEIGHT * TEXTURE_SCALE);
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
    var scale = (horse.isPlayer ? 0.94 : 0.87) / TEXTURE_SCALE;

    makeRunnerTexture(scene, key, horse, index);

    var sprite = scene.add.image(p.x, p.y, key + '_0').setScale(scale).setDepth(30 + index);
    var label = scene.add.text(p.x, p.y - 48, labelText, {
      fontFamily: 'Arial',
      fontSize: horse.isPlayer ? '14px' : '10px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: horse.isPlayer ? 'rgba(47,131,255,.88)' : 'rgba(6,17,31,.62)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      resolution: 3
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
    runner.label.y = p.y - 48;
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
