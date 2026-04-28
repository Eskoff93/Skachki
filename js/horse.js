// Horse domain helpers.
// Pure functions only: no DOM, no Phaser, no localStorage.

window.SKACHKI_HORSE = (function () {
  function createHorse(name, randIntFn) {
    var rand = randIntFn || function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var data = window.SKACHKI_DATA || {};
    var temperaments = data.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];

    return {
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      speed: rand(54, 78),
      stamina: rand(52, 76),
      acceleration: rand(52, 78),
      agility: rand(48, 74),
      power: rand(48, 74),
      intelligence: rand(50, 76),
      potential: rand(84, 100),
      energy: rand(74, 100),
      temperament: temperaments[rand(0, temperaments.length - 1)]
    };
  }

  function horseClass(horse) {
    return Math.round((
      horse.speed +
      horse.stamina +
      horse.acceleration +
      horse.agility +
      horse.power +
      horse.intelligence
    ) / 6);
  }

  function behaviorLabel(temperament) {
    if (temperament === 'Смелая') return 'часто идёт на риск и делает рывки';
    if (temperament === 'Пугливая') return 'осторожный старт, сильнее раскрывается позже';
    if (temperament === 'Упрямая') return 'держит свою дорожку и стабильно идёт темпом';
    if (temperament === 'Резкая') return 'быстрее меняет дорожку';
    if (temperament === 'Быстрая') return 'резкий старт, но может просесть к финишу';
    return 'обычный стиль гонки';
  }

  return {
    createHorse: createHorse,
    horseClass: horseClass,
    behaviorLabel: behaviorLabel
  };
})();
