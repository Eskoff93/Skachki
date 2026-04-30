// Breeding inheritance and forecast calculations.

window.SKACHKI_BREEDING_LOGIC = (function () {
  function clampWithGame(G, value, min, max) {
    if (G && typeof G.clamp === 'function') return G.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function randInt(G, min, max) {
    if (G && typeof G.randInt === 'function') return G.randInt(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function qualityValue(horse, key) {
    var qualities = horse && horse.hiddenQualities ? horse.hiddenQualities : {};
    return Number.isFinite(qualities[key]) ? qualities[key] : 8;
  }

  function potentialForecast(stallion, mare) {
    var base = Math.round((stallion.potential + mare.potential) / 2);
    var min = Math.max(50, Math.min(100, base - 4));
    var max = Math.max(50, Math.min(100, base + 5));

    return {
      min: min,
      max: max,
      average: Math.round((min + max) / 2)
    };
  }

  function forecastVisibleStats(stallion, mare) {
    var speed = Math.round((stallion.speed + mare.speed) / 2);
    var stamina = Math.round((stallion.stamina + mare.stamina) / 2);
    var acceleration = Math.round((stallion.acceleration + mare.acceleration) / 2);

    return {
      speed: speed,
      stamina: stamina,
      acceleration: acceleration,
      expectedClass: Math.round((speed + stamina + acceleration) / 3)
    };
  }

  function forecastQualityValues(stallion, mare, key) {
    var base = Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2);

    return {
      min: Math.max(1, Math.min(20, base - 2)),
      max: Math.max(1, Math.min(20, base + 2))
    };
  }

  function inheritQuality(G, stallion, mare, key) {
    var average = Math.round((qualityValue(stallion, key) + qualityValue(mare, key)) / 2);
    var strongest = Math.max(qualityValue(stallion, key), qualityValue(mare, key));
    var base = Math.random() < 0.22 ? Math.round((average + strongest) / 2) : average;

    return clampWithGame(G, base + randInt(G, -2, 2), 1, 20);
  }

  function inheritVisibleStat(G, stallion, mare, key) {
    return clampWithGame(G, Math.round((stallion[key] + mare[key]) / 2) + randInt(G, -5, 6), 10, 100);
  }

  function inheritPotential(G, stallion, mare) {
    var average = Math.round((stallion.potential + mare.potential) / 2);
    var strongest = Math.max(stallion.potential, mare.potential);
    var bonus = 0;

    if (strongest >= 95 && Math.random() < 0.24) bonus += 3;
    if (stallion.potential >= 85 && mare.potential >= 85 && Math.random() < 0.18) bonus += 2;

    return clampWithGame(G, average + bonus + randInt(G, -4, 6), 65, 100);
  }

  function inheritParentTrait(stallion, mare, key) {
    return Math.random() < 0.5 ? stallion[key] : mare[key];
  }

  function createFoal(G, stallion, mare, name) {
    var foal = {
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      breed: inheritParentTrait(stallion, mare, 'breed'),
      coat: inheritParentTrait(stallion, mare, 'coat'),
      speed: inheritVisibleStat(G, stallion, mare, 'speed'),
      stamina: inheritVisibleStat(G, stallion, mare, 'stamina'),
      acceleration: inheritVisibleStat(G, stallion, mare, 'acceleration'),
      agility: inheritVisibleStat(G, stallion, mare, 'agility'),
      power: inheritVisibleStat(G, stallion, mare, 'power'),
      intelligence: inheritVisibleStat(G, stallion, mare, 'intelligence'),
      hiddenQualities: {
        strength: inheritQuality(G, stallion, mare, 'strength'),
        agility: inheritQuality(G, stallion, mare, 'agility'),
        instinct: inheritQuality(G, stallion, mare, 'instinct')
      },
      potential: inheritPotential(G, stallion, mare),
      temperament: inheritParentTrait(stallion, mare, 'temperament')
    };

    return G && typeof G.normalizeHorse === 'function' ? G.normalizeHorse(foal) : foal;
  }

  return {
    qualityValue: qualityValue,
    potentialForecast: potentialForecast,
    forecastVisibleStats: forecastVisibleStats,
    forecastQualityValues: forecastQualityValues,
    inheritQuality: inheritQuality,
    inheritVisibleStat: inheritVisibleStat,
    inheritPotential: inheritPotential,
    inheritParentTrait: inheritParentTrait,
    createFoal: createFoal
  };
})();
