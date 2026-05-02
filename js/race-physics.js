// Race physics.
// Converts horse stats into km/h, acceleration, stamina reserve and speed statistics.

window.SKACHKI_RACE_PHYSICS = (function () {
  var KMH_PER_SPEED_POINT = 0.7;
  var KMH_TO_MPS = 1000 / 3600;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function speedToKmh(speed) {
    return clamp(Number(speed) || 0, 0, 100) * KMH_PER_SPEED_POINT;
  }

  function accelerationToKmhPerSecond(acceleration) {
    return 3.2 + clamp(Number(acceleration) || 0, 0, 100) * 0.12;
  }

  function initialRunnerPhysics(horse, raceDistanceMeters) {
    return {
      raceDistanceMeters: Math.max(1, Number(raceDistanceMeters) || 160),
      distanceMeters: 0,
      elapsedSeconds: 0,
      currentSpeedKmh: 0,
      maxSpeedKmh: 0,
      averageSpeedKmh: 0,
      staminaReserve: 100,
      baseMaxSpeedKmh: speedToKmh(horse.speed),
      accelerationKmhPerSecond: accelerationToKmhPerSecond(horse.acceleration)
    };
  }

  function staminaSpeedFactor(reserve) {
    if (reserve >= 60) return 1;
    if (reserve >= 30) return 0.9 + (reserve - 30) / 30 * 0.1;
    return 0.76 + reserve / 30 * 0.14;
  }

  function staminaDrainPerSecond(horse, currentSpeedKmh, baseMaxSpeedKmh, lineEfficiency, isBursting) {
    var stamina = clamp(Number(horse.stamina) || 0, 0, 100);
    var intensity = baseMaxSpeedKmh > 0 ? currentSpeedKmh / baseMaxSpeedKmh : 0;
    var baseDrain = 2.15 - stamina * 0.0125;
    var trafficDrain = lineEfficiency < 0.97 ? (0.97 - lineEfficiency) * 8 : 0;
    var burstDrain = isBursting ? 0.72 : 0;
    return Math.max(0.35, baseDrain) * (0.72 + intensity * 0.56) + trafficDrain + burstDrain;
  }

  function updateRunner(runner, context) {
    var dt = Math.max(0, Math.min(0.08, Number(context.deltaSeconds) || 0));
    var horse = runner.horse || {};
    var physics = runner.physics || initialRunnerPhysics(horse, context.raceDistanceMeters);
    var lineEfficiency = Number(context.lineEfficiency) || 1;
    var formMultiplier = Number(context.formMultiplier) || 1;
    var randomFactor = Number(context.randomFactor) || 1;
    var isBursting = !!context.isBursting;
    var isPenalized = !!context.isPenalized;
    var targetSpeedKmh;
    var speedDelta;
    var mps;
    var drain;

    physics.elapsedSeconds += dt;

    targetSpeedKmh = physics.baseMaxSpeedKmh * formMultiplier * randomFactor * lineEfficiency * staminaSpeedFactor(physics.staminaReserve);
    if (isBursting) targetSpeedKmh *= 1.14;
    if (isPenalized) targetSpeedKmh *= 0.72;
    targetSpeedKmh = Math.max(0, targetSpeedKmh);

    speedDelta = physics.accelerationKmhPerSecond * dt;
    if (physics.currentSpeedKmh < targetSpeedKmh) {
      physics.currentSpeedKmh = Math.min(targetSpeedKmh, physics.currentSpeedKmh + speedDelta);
    } else {
      physics.currentSpeedKmh = Math.max(targetSpeedKmh, physics.currentSpeedKmh - speedDelta * 1.55);
    }

    drain = staminaDrainPerSecond(horse, physics.currentSpeedKmh, physics.baseMaxSpeedKmh, lineEfficiency, isBursting);
    physics.staminaReserve = clamp(physics.staminaReserve - drain * dt, 0, 100);

    mps = physics.currentSpeedKmh * KMH_TO_MPS;
    physics.distanceMeters = Math.min(physics.raceDistanceMeters, physics.distanceMeters + mps * dt);
    physics.maxSpeedKmh = Math.max(physics.maxSpeedKmh, physics.currentSpeedKmh);
    physics.averageSpeedKmh = physics.elapsedSeconds > 0
      ? physics.distanceMeters / physics.elapsedSeconds * 3.6
      : 0;

    runner.physics = physics;
    return physics;
  }

  function progressPercent(physics) {
    if (!physics || !physics.raceDistanceMeters) return 0;
    return clamp(Math.round(physics.distanceMeters / physics.raceDistanceMeters * 100), 0, 100);
  }

  function resultStats(physics) {
    if (!physics) {
      return {
        maxSpeedKmh: 0,
        averageSpeedKmh: 0,
        staminaReserve: 0,
        distanceMeters: 0
      };
    }

    return {
      maxSpeedKmh: Math.round(physics.maxSpeedKmh * 10) / 10,
      averageSpeedKmh: Math.round(physics.averageSpeedKmh * 10) / 10,
      staminaReserve: Math.round(physics.staminaReserve),
      distanceMeters: Math.round(physics.distanceMeters)
    };
  }

  return {
    KMH_PER_SPEED_POINT: KMH_PER_SPEED_POINT,
    accelerationToKmhPerSecond: accelerationToKmhPerSecond,
    initialRunnerPhysics: initialRunnerPhysics,
    progressPercent: progressPercent,
    resultStats: resultStats,
    speedToKmh: speedToKmh,
    updateRunner: updateRunner
  };
})();
