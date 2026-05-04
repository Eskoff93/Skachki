// Race physics.
// Converts horse stats into km/h, acceleration, stamina tank and speed statistics.

window.SKACHKI_RACE_PHYSICS = (function () {
  var KMH_PER_SPEED_POINT = 0.7;
  var KMH_TO_MPS = 1000 / 3600;
  var FORM_TICK_METERS = 20;
  var TANK_PER_STAMINA_POINT = 35;
  var BURST_STAMINA_DRAIN_MULTIPLIER = 2;

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

  function staminaTankMax(effectiveStamina) {
    return Math.max(1, effectiveStat(effectiveStamina, 1) * TANK_PER_STAMINA_POINT);
  }

  function initialRunnerPhysics(horse, raceDistanceMeters) {
    var formFactor = rollFormFactor(horse.form);
    var effectiveSpeed = effectiveStat(horse.speed, formFactor);
    var effectiveAcceleration = effectiveStat(horse.acceleration, formFactor);
    var effectiveStamina = effectiveStat(horse.stamina, formFactor);
    var tankMax = staminaTankMax(effectiveStamina);

    return {
      raceDistanceMeters: Math.max(1, Number(raceDistanceMeters) || 150),
      distanceMeters: 0,
      elapsedSeconds: 0,
      currentSpeedKmh: 0,
      maxSpeedKmh: 0,
      averageSpeedKmh: 0,
      staminaReserve: 100,
      staminaTank: tankMax,
      staminaTankMax: tankMax,
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
    var staminaReserve = clamp(Number(reserve) || 0, 0, 100);

    if (staminaReserve >= 70) return 1;
    if (staminaReserve >= 40) return 0.85 + (staminaReserve - 40) / 30 * 0.15;
    if (staminaReserve >= 15) return 0.6 + (staminaReserve - 15) / 25 * 0.25;
    return 0.5 + staminaReserve / 15 * 0.1;
  }

  function drainStaminaTank(physics, deltaSeconds, isBursting) {
    var drainPerSecond = Math.max(0, Number(physics.currentSpeedKmh) || 0);
    if (isBursting) drainPerSecond *= BURST_STAMINA_DRAIN_MULTIPLIER;

    physics.staminaTank = clamp(physics.staminaTank - drainPerSecond * deltaSeconds, 0, physics.staminaTankMax);
    physics.staminaReserve = physics.staminaTankMax > 0
      ? clamp(physics.staminaTank / physics.staminaTankMax * 100, 0, 100)
      : 0;
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

    physics.raceDistanceMeters = Math.max(1, Number(context.raceDistanceMeters) || physics.raceDistanceMeters || 150);
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

    drainStaminaTank(physics, dt, isBursting);

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
    TANK_PER_STAMINA_POINT: TANK_PER_STAMINA_POINT,
    accelerationToKmhPerSecond: accelerationToKmhPerSecond,
    initialRunnerPhysics: initialRunnerPhysics,
    progressPercent: progressPercent,
    resultStats: resultStats,
    speedToKmh: speedToKmh,
    updateRunner: updateRunner
  };
})();
