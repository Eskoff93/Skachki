// Race physics.
// Converts horse stats into km/h, acceleration, stamina tank and speed statistics.

window.SKACHKI_RACE_PHYSICS = (function () {
  var KMH_PER_SPEED_POINT = 0.7;
  var KMH_TO_MPS = 1000 / 3600;
  var FORM_TICK_METERS = 20;
  var TANK_PER_STAMINA_POINT = 15;
  var BURST_STAMINA_DRAIN_MULTIPLIER = 2;
  var TURN_SLOWDOWN_KMH_PER_SECOND = 18;
  var TURN_SPEED_FACTOR = 0.78;

  var FORM_RANGES = {
    pure: { min: 1, max: 1 },
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

  function speedDrainPerSecond(currentSpeedKmh) {
    var speed = Math.max(0, Number(currentSpeedKmh) || 0);
    return speed * (speed / 100);
  }

  function isPureMode(horse, context) {
    return !!(context && context.pureBalanceTest) || horse.form === 'pure';
  }

  function initialRunnerPhysics(horse, raceDistanceMeters, options) {
    var pure = isPureMode(horse || {}, options || {});
    var formFactor = pure ? 1 : rollFormFactor(horse.form);
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
      pureBalanceTest: pure,
      formFactor: formFactor,
      effectiveSpeed: effectiveSpeed,
      effectiveAcceleration: effectiveAcceleration,
      effectiveStamina: effectiveStamina,
      effectiveMaxSpeedKmh: speedToKmh(effectiveSpeed),
      accelerationKmhPerSecond: accelerationToKmhPerSecond(effectiveAcceleration)
    };
  }

  function updateEffectiveStats(physics, horse) {
    if (physics.pureBalanceTest || horse.form === 'pure') {
      physics.formFactor = 1;
    } else {
      physics.formFactor = rollFormFactor(horse.form);
    }
    physics.effectiveSpeed = effectiveStat(horse.speed, physics.formFactor);
    physics.effectiveAcceleration = effectiveStat(horse.acceleration, physics.formFactor);
    physics.effectiveStamina = effectiveStat(horse.stamina, physics.formFactor);
    physics.effectiveMaxSpeedKmh = speedToKmh(physics.effectiveSpeed);
    physics.accelerationKmhPerSecond = accelerationToKmhPerSecond(physics.effectiveAcceleration);
  }

  function applyFormTicks(physics, horse) {
    if (physics.pureBalanceTest || horse.form === 'pure') return;

    while (physics.distanceMeters >= physics.nextFormTickMeters && physics.distanceMeters < physics.raceDistanceMeters) {
      updateEffectiveStats(physics, horse);
      physics.nextFormTickMeters += physics.formTickMeters;
    }
  }

  function staminaSpeedFactor(reserve) {
    var staminaReserve = clamp(Number(reserve) || 0, 0, 100);

    if (staminaReserve >= 70) return 1;
    if (staminaReserve >= 40) return 0.85 + (staminaReserve - 40) / 30 * 0.15;
    if (staminaReserve >= 15) return 0.5 + (staminaReserve - 15) / 25 * 0.35;
    return 0.3 + staminaReserve / 15 * 0.2;
  }

  function drainStaminaTank(physics, deltaSeconds, isBursting) {
    var drainPerSecond = speedDrainPerSecond(physics.currentSpeedKmh);
    if (isBursting) drainPerSecond *= BURST_STAMINA_DRAIN_MULTIPLIER;

    physics.staminaTank = clamp(physics.staminaTank - drainPerSecond * deltaSeconds, 0, physics.staminaTankMax);
    physics.staminaReserve = physics.staminaTankMax > 0
      ? clamp(physics.staminaTank / physics.staminaTankMax * 100, 0, 100)
      : 0;
  }

  function runnerPhase(runner) {
    return ((runner.progress % 1) + 1) % 1;
  }

  function runnerOnTurn(runner) {
    var phase = runnerPhase(runner);
    return (phase > 0.18 && phase < 0.50) || (phase > 0.68 && phase < 0.98);
  }

  function turnSpeedFactor(context, runner) {
    var explicitFactor = Number(context.turnSpeedFactor);
    if (Number.isFinite(explicitFactor) && explicitFactor > 0) return clamp(explicitFactor, 0.5, 1);
    return runnerOnTurn(runner) ? TURN_SPEED_FACTOR : 1;
  }

  function updateRunner(runner, context) {
    var dt = Math.max(0, Math.min(0.08, Number(context.deltaSeconds) || 0));
    var horse = runner.horse || {};
    var physics = runner.physics || initialRunnerPhysics(horse, context.raceDistanceMeters, context);
    var lineEfficiency = Number(context.lineEfficiency) || 1;
    var randomFactor = context.pureBalanceTest ? 1 : clamp(Number(context.randomFactor) || 1, 0.94, 1);
    var isBursting = !context.pureBalanceTest && !!context.isBursting;
    var isPenalized = !context.pureBalanceTest && !!context.isPenalized;
    var turnFactor = turnSpeedFactor(context || {}, runner);
    var turnSlowdownDelta = TURN_SLOWDOWN_KMH_PER_SECOND * dt;
    var targetSpeedKmh;
    var speedDelta;
    var mps;

    physics.pureBalanceTest = !!context.pureBalanceTest || physics.pureBalanceTest || horse.form === 'pure';
    physics.raceDistanceMeters = Math.max(1, Number(context.raceDistanceMeters) || physics.raceDistanceMeters || 150);
    physics.elapsedSeconds += dt;
    applyFormTicks(physics, horse);

    targetSpeedKmh = physics.effectiveMaxSpeedKmh * randomFactor * lineEfficiency * staminaSpeedFactor(physics.staminaReserve) * turnFactor;
    if (isPenalized) targetSpeedKmh *= 0.72;
    targetSpeedKmh = clamp(targetSpeedKmh, 0, physics.baseMaxSpeedKmh);

    speedDelta = physics.accelerationKmhPerSecond * (isBursting ? 1.28 : 1) * dt;
    if (physics.currentSpeedKmh < targetSpeedKmh) {
      physics.currentSpeedKmh = Math.min(targetSpeedKmh, physics.currentSpeedKmh + speedDelta);
    } else if (turnFactor < 1) {
      physics.currentSpeedKmh = Math.max(targetSpeedKmh, physics.currentSpeedKmh - turnSlowdownDelta);
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
    speedDrainPerSecond: speedDrainPerSecond,
    speedToKmh: speedToKmh,
    updateRunner: updateRunner
  };
})();
