// Phaser race engine.
// Coordinates scene lifecycle and delegates camera, runner visuals, effects, HUD, AI, events and physics to split modules.

window.SKACHKI_RACE_ENGINE = (function () {
  var TRACK_PIXELS_PER_METER = 7;
  var TRACK_ASPECT_RATIO = 2.05;
  var TRACK_LANE_COUNT = 8;
  var TRACK_LANE_SPACING = 19;
  var RENDER_RESOLUTION_CAP = 3;
  var LANE_CHANGE_SPEED_MULTIPLIER = 0.62;

  function game() { return window.SKACHKI_GAME; }
  function raceTrack() { return window.SKACHKI_RACE_TRACK || {}; }
  function raceAudio() { return window.SKACHKI_RACE_AUDIO || {}; }
  function raceAi() { return window.SKACHKI_RACE_AI || {}; }
  function raceEvents() { return window.SKACHKI_RACE_EVENTS || {}; }
  function racePhysics() { return window.SKACHKI_RACE_PHYSICS || {}; }
  function raceCamera() { return window.SKACHKI_RACE_CAMERA || {}; }
  function runnerView() { return window.SKACHKI_RACE_RUNNER_VIEW || {}; }
  function raceEffects() { return window.SKACHKI_RACE_EFFECTS || {}; }
  function raceHud() { return window.SKACHKI_RACE_HUD || {}; }

  function destroyRaceGame() {
    var audio = raceAudio();
    var hud = raceHud();
    var G = game();

    if (audio.stopHoofSound) audio.stopHoofSound();
    if (hud.resetTopProgress) hud.resetTopProgress();

    if (G.state.raceGame) {
      G.state.raceGame.destroy(true);
      G.state.raceGame = null;
    }
  }
  function raceRenderResolution() {
    return Math.max(1, Math.min(RENDER_RESOLUTION_CAP, window.devicePixelRatio || 1));
  }
  function applyCanvasQuality(gameInstance, width, height) {
    var canvas = gameInstance && gameInstance.canvas;
    if (!canvas || !canvas.style) return;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'auto';
    canvas.style.transform = 'translateZ(0)';
    canvas.style.backfaceVisibility = 'hidden';
  }
  function createRaceGame() {
    var G = game();
    var box;
    var rect;
    var width;
    var height;
    var resolution;
    var audio;

    destroyRaceGame();
    if (!window.Phaser) return G.showToast('Phaser не загрузился');

    box = G.byId('phaserBox');
    if (!box) return;

    rect = box.getBoundingClientRect();
    width = Math.max(360, Math.round(rect.width));
    height = Math.max(360, Math.round(rect.height));
    resolution = raceRenderResolution();

    audio = raceAudio();
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
        roundPixels: true,
        pixelArt: false,
        powerPreference: 'high-performance'
      },
      scene: {
        create: function () { setupRaceScene(this, width, height); },
        update: function (time, delta) { updateRaceScene(this, time, delta); }
      }
    });

    applyCanvasQuality(G.state.raceGame, width, height);
  }
  function updateRaceTitle(raceType) {
    var G = game();
    var screen = G.byId('raceScreen');
    var subtitle = screen ? screen.querySelector('.topbar-title p') : null;
    if (subtitle && raceType) subtitle.textContent = 'Вид сверху • фокус на вашей лошади • ' + raceType.distance + ' м';
  }
  function trackSizeForDistance(distanceMeters) {
    var perimeter = Math.max(80, Number(distanceMeters) || 150) * TRACK_PIXELS_PER_METER;
    var radius = perimeter / (4 * TRACK_ASPECT_RATIO - 4 + Math.PI * 2);
    var trackHeight = radius * 2;

    return {
      width: trackHeight * TRACK_ASPECT_RATIO,
      height: trackHeight
    };
  }
  function setupRaceScene(scene, width, height) {
    var G = game();
    var track = raceTrack();
    var physics = racePhysics();
    var view = runnerView();
    var hud = raceHud();
    var camera = raceCamera();
    var raceType = G.state.activeRaceType || {};
    var horseCount = G.state.currentRaceHorses.length;
    var laneSpacing = TRACK_LANE_SPACING;
    var startProgress = 0.006;
    var raceDistanceMeters = Math.max(80, Number(raceType.distance) || 220);
    var trackSize = trackSizeForDistance(raceDistanceMeters);
    var trackPaddingX = laneSpacing * TRACK_LANE_COUNT * 2 + 180;
    var trackPaddingY = laneSpacing * TRACK_LANE_COUNT * 2 + 210;
    var worldWidth = Math.max(width * 1.4, trackSize.width + trackPaddingX);
    var worldHeight = Math.max(height * 1.25, trackSize.height + trackPaddingY);

    updateRaceTitle(raceType);

    scene.viewportWidth = width;
    scene.viewportHeight = height;
    scene.worldWidth = worldWidth;
    scene.worldHeight = worldHeight;
    scene.trackPixelsPerMeter = TRACK_PIXELS_PER_METER;
    scene.track = track.makeTrackGeometry(worldWidth, worldHeight, trackSize.width, trackSize.height, laneSpacing, horseCount);
    if (track.startProgress) startProgress = track.startProgress(scene.track);
    scene.runners = [];
    scene.playerRunner = null;
    scene.startProgress = startProgress;
    scene.raceDistance = 1;
    scene.raceDistanceMeters = raceDistanceMeters;
    scene.pureBalanceTest = !!raceType.pureBalanceTest;
    scene.finishProgress = startProgress + scene.raceDistance;
    scene.finishCount = 0;
    scene.finished = false;
    scene.startTime = scene.time.now;
    scene.lastBoard = 0;
    scene.lastDust = 0;

    if (hud.resetTopProgress) hud.resetTopProgress();
    track.drawTrack(scene, worldWidth, worldHeight);

    G.state.currentRaceHorses.forEach(function (horse, index) {
      var runner = view.createRunner(scene, horse, index, physics, raceDistanceMeters, startProgress, scene.pureBalanceTest);
      scene.runners.push(runner);
      if (horse.isPlayer) scene.playerRunner = runner;
    });

    if (!scene.playerRunner && scene.runners.length) scene.playerRunner = scene.runners[0];
    if (camera.setup) camera.setup(scene);
    if (hud.setup) hud.setup(scene, width, height);
  }
  function runnerLaneDistanceMeters(scene, runner) {
    var track = raceTrack();
    var factor;
    if (scene.pureBalanceTest) return Math.max(1, scene.raceDistanceMeters);
    factor = track.laneDistanceFactor ? track.laneDistanceFactor(scene.track, runner.lane) : 1;
    return Math.max(1, scene.raceDistanceMeters * factor);
  }
  function advanceLane(scene, runner, delta) {
    var laneDelta = (Number(runner.laneTarget) || 0) - (Number(runner.lane) || 0);
    var maxStep = scene.track.laneSpacing * LANE_CHANGE_SPEED_MULTIPLIER * Math.max(0, delta) / 1000;

    if (Math.abs(laneDelta) <= maxStep || maxStep <= 0) {
      runner.lane = runner.laneTarget;
      return;
    }

    runner.lane += Math.sign(laneDelta) * maxStep;
  }
  function updateRaceScene(scene, time, delta) {
    var ai = raceAi();
    var events = raceEvents();
    var physics = racePhysics();
    var view = runnerView();
    var effects = raceEffects();
    var hud = raceHud();
    var deltaSeconds = delta / 1000;

    if (scene.finished) return;

    scene.runners.forEach(function (runner) {
      var lineEfficiency;
      var isBursting;
      var isPenalized;
      var runnerPhysics;
      var laneDistanceMeters;

      if (runner.finished) return;

      lineEfficiency = scene.pureBalanceTest ? 1 : ai.update ? ai.update(scene, runner, time) : 1;
      isBursting = !scene.pureBalanceTest && time < runner.burstUntil;
      isPenalized = !scene.pureBalanceTest && time < runner.penaltyUntil;
      laneDistanceMeters = runnerLaneDistanceMeters(scene, runner);
      runnerPhysics = physics.updateRunner ? physics.updateRunner(runner, {
        deltaSeconds: deltaSeconds,
        raceDistanceMeters: laneDistanceMeters,
        lineEfficiency: lineEfficiency,
        formMultiplier: runner.formMultiplier,
        randomFactor: scene.pureBalanceTest ? 1 : runner.randomFactor,
        pureBalanceTest: scene.pureBalanceTest,
        isBursting: isBursting,
        isPenalized: isPenalized
      }) : null;

      if (!scene.pureBalanceTest && events.update) events.update(scene, runner, time);

      if (!scene.pureBalanceTest) advanceLane(scene, runner, delta);
      else runner.laneTarget = runner.lane;

      laneDistanceMeters = runnerLaneDistanceMeters(scene, runner);
      if (runnerPhysics) runner.progress = scene.startProgress + runnerPhysics.distanceMeters / laneDistanceMeters * scene.raceDistance;
      if (view.updateRunnerVisual) view.updateRunnerVisual(scene, runner);
      if (!scene.pureBalanceTest && effects.addDust && time - scene.lastDust > 110) effects.addDust(scene, runner, isBursting);

      if (runnerPhysics && runnerPhysics.distanceMeters >= laneDistanceMeters) finishRunner(scene, runner, runnerPhysics);
    });

    if (time - scene.lastDust > 110) scene.lastDust = time;
    if (time - scene.lastBoard > 180) {
      if (hud.updateLeaderboard) hud.updateLeaderboard(scene);
      if (hud.updatePlayerHud) hud.updatePlayerHud(scene);
      if (hud.updateTopProgress) hud.updateTopProgress(scene);
      scene.lastBoard = time;
    }

    if (scene.finishCount >= scene.runners.length) finishRace(scene);
  }
  function finishRunner(scene, runner, runnerPhysics) {
    var G = game();
    var physics = racePhysics();
    var hud = raceHud();
    var audio = raceAudio();

    if (runner.finished) return;

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
      if (audio.playFinish) audio.playFinish();
      if (hud.updateSoundButton) hud.updateSoundButton(scene);
    }
  }
  function finishRace(scene) {
    var hud = raceHud();
    scene.finished = true;
    if (hud.updateTopProgress) hud.updateTopProgress(scene);
    setTimeout(function () {
      if (window.SKACHKI_RESULTS) window.SKACHKI_RESULTS.showResults();
    }, 800);
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
