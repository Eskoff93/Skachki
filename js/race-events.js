// Contextual race events.
// Chooses race events from runner state, track segment, stamina, traffic and hidden horse qualities.

window.SKACHKI_RACE_EVENTS = (function () {
  var EVENT_TICK_METERS = 20;
  var GLOBAL_COOLDOWN_MS = 1800;

  function trackApi() { return window.SKACHKI_RACE_TRACK || {}; }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function stat(value, fallback) {
    return clamp(Number(value) || fallback || 0, 0, 100);
  }

  function quality(value, fallback) {
    return clamp(Number(value) || fallback || 10, 1, 20);
  }

  function progressPercent(scene, runner) {
    if (!runner || !runner.physics || !scene.raceDistanceMeters) return 0;
    return clamp(runner.physics.distanceMeters / scene.raceDistanceMeters, 0, 1);
  }

  function phase(scene, runner) {
    var p = progressPercent(scene, runner);
    if (p < 0.2) return 'start';
    if (p >= 0.75) return 'finish';
    return 'middle';
  }

  function fallbackOvalSegment(scene, runner) {
    var track = scene.track;
    var lane = runner.lane || 0;
    var r = track.r + lane;
    var straight = track.straight;
    var arc = Math.PI * r;
    var perimeter = straight * 2 + arc * 2;
    var d = (((runner.progress - scene.startProgress) % 1) + 1) % 1 * perimeter;

    if (d < straight) return 'straight';
    if (d < straight + arc) return 'turn';
    if (d < straight * 2 + arc) return 'straight';
    return 'turn';
  }

  function segment(scene, runner) {
    var api = trackApi();
    var info;

    if (api.segmentAt && scene && scene.track && runner) {
      info = api.segmentAt(scene.track, runner.progress, runner.lane);
      if (info && info.type) return info.type;
    }

    if (!scene || !scene.track || scene.track.type !== 'oval') return 'straight';
    return fallbackOvalSegment(scene, runner);
  }

  function nearbyContext(scene, runner) {
    var distance = runner.physics ? runner.physics.distanceMeters : 0;
    var lane = runner.lane || 0;
    var frontRival = false;
    var lanePressure = 0;
    var rivalsNearby = 0;

    scene.runners.forEach(function (other) {
      var otherDistance;
      var gap;
      var laneGap;

      if (!other || other === runner || other.finished || !other.physics) return;

      otherDistance = other.physics.distanceMeters || 0;
      gap = otherDistance - distance;
      laneGap = Math.abs((other.lane || 0) - lane);

      if (Math.abs(gap) <= 8 && laneGap <= scene.track.laneSpacing * 1.35) {
        rivalsNearby++;
        lanePressure += 1;
      }

      if (gap > 0 && gap <= 12 && laneGap <= scene.track.laneSpacing * 1.05) {
        frontRival = true;
        lanePressure += 1.4;
      }
    });

    return {
      frontRival: frontRival,
      rivalsNearby: rivalsNearby,
      lanePressure: clamp(lanePressure, 0, 4)
    };
  }

  function formBias(form) {
    if (form === 'excellent') return { good: 1.18, bad: 0.72 };
    if (form === 'bad') return { good: 0.82, bad: 1.28 };
    return { good: 1, bad: 1 };
  }

  function hiddenQualities(horse) {
    return horse.hiddenQualities || {};
  }

  function buildContext(scene, runner, time) {
    var horse = runner.horse || {};
    var physics = runner.physics || {};
    var traffic = nearbyContext(scene, runner);
    var form = formBias(horse.form);
    var qualities = hiddenQualities(horse);

    return {
      time: time,
      phase: phase(scene, runner),
      segment: segment(scene, runner),
      progress: progressPercent(scene, runner),
      staminaReserve: clamp(Number(physics.staminaReserve) || 0, 0, 100),
      speedKmh: Number(physics.currentSpeedKmh) || 0,
      acceleration: stat(horse.acceleration, 50),
      stamina: stat(horse.stamina, 50),
      agility: quality(qualities.agility, 10),
      strength: quality(qualities.strength, 10),
      instinct: quality(qualities.instinct, 10),
      formGoodBias: form.good,
      formBadBias: form.bad,
      frontRival: traffic.frontRival,
      rivalsNearby: traffic.rivalsNearby,
      lanePressure: traffic.lanePressure
    };
  }

  function chance(value) {
    return Math.random() < clamp(value, 0, 0.75);
  }

  function cooldownReady(runner, key, time) {
    runner.eventCooldowns = runner.eventCooldowns || {};
    return time >= (runner.eventCooldowns[key] || 0) && time >= (runner.eventCooldowns.global || 0);
  }

  function setCooldown(runner, key, time, ms) {
    runner.eventCooldowns = runner.eventCooldowns || {};
    runner.eventCooldowns[key] = time + ms;
    runner.eventCooldowns.global = time + GLOBAL_COOLDOWN_MS;
  }

  function burstChance(ctx) {
    var c = 0.025;
    if (ctx.segment === 'straight') c += 0.04;
    if (ctx.frontRival) c += 0.035;
    if (ctx.phase === 'finish') c += 0.02;
    if (ctx.staminaReserve > 65) c += 0.035;
    if (ctx.staminaReserve < 35) c -= 0.055;
    c += (ctx.acceleration - 50) / 1000;
    c += (ctx.instinct - 10) / 420;
    return c * ctx.formGoodBias;
  }

  function mistakeChance(ctx) {
    var c = 0.008;
    if (ctx.segment === 'turn') c += 0.035;
    if (ctx.frontRival) c += 0.018;
    c += ctx.lanePressure * 0.014;
    if (ctx.staminaReserve < 35) c += 0.024;
    if (ctx.staminaReserve < 18) c += 0.025;
    c += Math.max(0, 11 - ctx.agility) * 0.006;
    c -= Math.max(0, ctx.instinct - 10) * 0.002;
    c -= Math.max(0, ctx.strength - 10) * 0.0018;
    return c * ctx.formBadBias;
  }

  function fatigueChance(ctx) {
    var c = 0;
    if (ctx.staminaReserve < 45) c += 0.025;
    if (ctx.staminaReserve < 30) c += 0.05;
    if (ctx.staminaReserve < 15) c += 0.06;
    if (ctx.phase === 'finish') c += 0.018;
    c += Math.max(0, 55 - ctx.stamina) / 1200;
    c -= Math.max(0, ctx.strength - 10) * 0.0015;
    return c * ctx.formBadBias;
  }

  function strongFinishChance(ctx, runner) {
    var c = 0.012;
    if (runner.usedStrongFinish || ctx.phase !== 'finish') return 0;
    if (ctx.staminaReserve < 38) return 0;
    c += (ctx.staminaReserve - 38) / 1100;
    c += (ctx.instinct - 10) / 360;
    c += (ctx.stamina - 50) / 1300;
    if (ctx.frontRival) c += 0.025;
    return c * ctx.formGoodBias;
  }

  function applyEvent(scene, runner, type, time) {
    var audio = window.SKACHKI_RACE_AUDIO || {};
    var effects = window.SKACHKI_RACE_EFFECTS || {};

    if (type === 'strong_finish') {
      runner.burstUntil = time + 1100;
      runner.usedStrongFinish = true;
      setCooldown(runner, type, time, 999999);
      if (audio.playBurst) audio.playBurst();
    } else if (type === 'burst') {
      runner.burstUntil = time + 850;
      setCooldown(runner, type, time, 5400 + Math.random() * 1800);
      if (audio.playBurst) audio.playBurst();
    } else if (type === 'mistake') {
      runner.penaltyUntil = time + 800;
      setCooldown(runner, type, time, 6800 + Math.random() * 2400);
      if (audio.playMistake) audio.playMistake();
    } else if (type === 'fatigue') {
      runner.penaltyUntil = Math.max(runner.penaltyUntil || 0, time + 520);
      setCooldown(runner, type, time, 3600 + Math.random() * 1600);
    }

    if (effects.addVisualRaceEvent) effects.addVisualRaceEvent(scene, runner, type);
  }

  function chooseEvent(ctx, runner, time) {
    if (time < (runner.burstUntil || 0) || time < (runner.penaltyUntil || 0)) return null;

    if (cooldownReady(runner, 'strong_finish', time) && chance(strongFinishChance(ctx, runner))) return 'strong_finish';
    if (cooldownReady(runner, 'mistake', time) && chance(mistakeChance(ctx))) return 'mistake';
    if (cooldownReady(runner, 'fatigue', time) && chance(fatigueChance(ctx))) return 'fatigue';
    if (cooldownReady(runner, 'burst', time) && chance(burstChance(ctx))) return 'burst';

    return null;
  }

  function shouldEvaluate(runner) {
    if (!runner || !runner.physics) return false;
    runner.nextEventMeters = runner.nextEventMeters || EVENT_TICK_METERS;
    return runner.physics.distanceMeters >= runner.nextEventMeters;
  }

  function update(scene, runner, time) {
    var ctx;
    var type;

    if (!shouldEvaluate(runner)) return;

    while (runner.nextEventMeters <= runner.physics.distanceMeters) {
      runner.nextEventMeters += EVENT_TICK_METERS;
    }

    ctx = buildContext(scene, runner, time);
    type = chooseEvent(ctx, runner, time);
    if (type) applyEvent(scene, runner, type, time);
  }

  return {
    EVENT_TICK_METERS: EVENT_TICK_METERS,
    buildContext: buildContext,
    update: update
  };
})();
