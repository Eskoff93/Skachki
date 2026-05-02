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

  function shortName(name) {
    name = String(name || '').replace(/^Вы:\s*/, '');
    return name.length > 7 ? name.slice(0, 7).toUpperCase() : name.toUpperCase();
  }

  function makeRunnerTexture(scene, key, horse, index) {
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
    g.generateTexture(key, 100, 86);
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
    var scale = horse.isPlayer ? 1.13 : 1;

    makeRunnerTexture(scene, key, horse, index);

    var sprite = scene.add.image(p.x, p.y, key).setScale(scale).setDepth(30 + index);
    var label = scene.add.text(p.x, p.y - 50, labelText, {
      fontFamily: 'Arial',
      fontSize: horse.isPlayer ? '16px' : '12px',
      fontStyle: '900',
      color: '#ffffff',
      backgroundColor: horse.isPlayer ? 'rgba(47,131,255,.92)' : 'rgba(0,0,0,.5)',
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
    runner.label.y = p.y - 50;
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
