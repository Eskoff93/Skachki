// Race physics.
// Converts horse stats into km/h, acceleration, stamina reserve and speed statistics.

window.SKACHKI_RACE_PHYSICS = (function () {
  var KMH_PER_SPEED_POINT = 0.7;
  var KMH_TO_MPS = 1000 / 3600;
  var FORM_TICK_METERS = 20;

  var FORM_RANGES = {
    excellent: { min: 0.95, max: 1 },
    normal: { min: 0.8, max: 1 },
    bad: { min: 0.7, max: 0.9 }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function speedToKmh(speed) {
    return clamp(Number(speed) || 0, 0, 100) * KMH_PER_SPEED_POINT;
  }

  function accelerationToKmhPerSecond(acceleration) {
    return 3.2 + clamp(Number(acceleration) || 0, 0, 100) * 0.12;
  }

  function formRange(form) {
    return FORM_RANGES[form] || FORM_RANGES.normal;
  }

  function rollFormFactor(form) {
    var range = formRange(form);
    return range.min + Math.random() * (range.max - range.min);
  }

  function effectiveStat(value, factor) {
    return clamp((Number(value) || 0) * factor, 0, 100);
  }

  function initialRunnerPhysics(horse, raceDistanceMeters) {
    var formFactor = rollFormFactor(horse.form);
    var effectiveSpeed = effectiveStat(horse.speed, formFactor);
    var effectiveAcceleration = effectiveStat(horse.acceleration, formFactor);
    var effectiveStamina = effectiveStat(horse.stamina, formFactor);

    return {
      raceDistanceMeters: Math.max(1, Number(raceDistanceMeters) || 150),
      distanceMeters: 0,
      elapsedSeconds: 0,
      currentSpeedKmh: 0,
      maxSpeedKmh: 0,
      averageSpeedKmh: 0,
      staminaReserve: 100,
      baseMaxSpeedKmh: speedToKmh(horse.speed),
      formTickMeters: FORM_TICK_METERS,
      nextFormTickMeters: FORM_TICK_METERS,
      formFactor: formFactor,
      effectiveSpeed: effectiveSpeed,
      effectiveAcceleration: effectiveAcceleration,
      effectiveStamina: effectiveStamina,
      effectiveMaxSpeedKmh: speedToKmh(effectiveSpeed),
      accelerationKmhPerSecond: accelerationToKmhPerSecond(effectiveAcceleration)
    };
  }

  function updateEffectiveStats(physics, horse) {
    physics.formFactor = rollFormFactor(horse.form);
    physics.effectiveSpeed = effectiveStat(horse.speed, physics.formFactor);
    physics.effectiveAcceleration = effectiveStat(horse.acceleration, physics.formFactor);
    physics.effectiveStamina = effectiveStat(horse.stamina, physics.formFactor);
    physics.effectiveMaxSpeedKmh = speedToKmh(physics.effectiveSpeed);
    physics.accelerationKmhPerSecond = accelerationToKmhPerSecond(physics.effectiveAcceleration);
  }

  function applyFormTicks(physics, horse) {
    while (physics.distanceMeters >= physics.nextFormTickMeters && physics.distanceMeters < physics.raceDistanceMeters) {
      updateEffectiveStats(physics, horse);
      physics.nextFormTickMeters += physics.formTickMeters;
    }
  }

  function staminaSpeedFactor(reserve) {
    if (reserve >= 60) return 1;
    if (reserve >= 30) return 0.9 + (reserve - 30) / 30 * 0.1;
    return 0.76 + reserve / 30 * 0.14;
  }

  function staminaDrainPerSecond(effectiveStamina, currentSpeedKmh, baseMaxSpeedKmh, lineEfficiency, isBursting) {
    var stamina = clamp(Number(effectiveStamina) || 0, 0, 100);
    var intensity = baseMaxSpeedKmh > 0 ? clamp(currentSpeedKmh / baseMaxSpeedKmh, 0, 1) : 0;
    var baseDrain = Math.max(0.42, 1.72 - stamina * 0.01);
    var speedDrain = 0.34 + Math.pow(intensity, 1.65) * 1.42;
    var trafficDrain = lineEfficiency < 0.97 ? (0.97 - lineEfficiency) * 7.5 : 0;
    var burstDrain = isBursting ? 0.64 : 0;

    return baseDrain * speedDrain + trafficDrain + burstDrain;
  }

  function updateRunner(runner, context) {
    var dt = Math.max(0, Math.min(0.08, Number(context.deltaSeconds) || 0));
    var horse = runner.horse || {};
    var physics = runner.physics || initialRunnerPhysics(horse, context.raceDistanceMeters);
    var lineEfficiency = Number(context.lineEfficiency) || 1;
    var randomFactor = clamp(Number(context.randomFactor) || 1, 0.94, 1);
    var isBursting = !!context.isBursting;
    var isPenalized = !!context.isPenalized;
    var targetSpeedKmh;
    var speedDelta;
    var mps;
    var drain;

    physics.elapsedSeconds += dt;
    applyFormTicks(physics, horse);

    targetSpeedKmh = physics.effectiveMaxSpeedKmh * randomFactor * lineEfficiency * staminaSpeedFactor(physics.staminaReserve);
    if (isPenalized) targetSpeedKmh *= 0.72;
    targetSpeedKmh = clamp(targetSpeedKmh, 0, physics.baseMaxSpeedKmh);

    speedDelta = physics.accelerationKmhPerSecond * (isBursting ? 1.28 : 1) * dt;
    if (physics.currentSpeedKmh < targetSpeedKmh) {
      physics.currentSpeedKmh = Math.min(targetSpeedKmh, physics.currentSpeedKmh + speedDelta);
    } else {
      physics.currentSpeedKmh = Math.max(targetSpeedKmh, physics.currentSpeedKmh - speedDelta * 1.55);
    }

    drain = staminaDrainPerSecond(
      physics.effectiveStamina,
      physics.currentSpeedKmh,
      physics.baseMaxSpeedKmh,
      lineEfficiency,
      isBursting
    );
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
    FORM_TICK_METERS: FORM_TICK_METERS,
    KMH_PER_SPEED_POINT: KMH_PER_SPEED_POINT,
    accelerationToKmhPerSecond: accelerationToKmhPerSecond,
    initialRunnerPhysics: initialRunnerPhysics,
    progressPercent: progressPercent,
    resultStats: resultStats,
    speedToKmh: speedToKmh,
    updateRunner: updateRunner
  };
})();
