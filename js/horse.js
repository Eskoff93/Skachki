// Horse domain helpers.
// Pure functions only: no DOM, no Phaser, no localStorage.

window.SKACHKI_HORSE = (function () {
  function createHorse(name, randIntFn) {
    var rand = randIntFn || function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var data = window.SKACHKI_DATA || {};
    var temperaments = data.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];

    return normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      speed: rand(54, 78),
      stamina: rand(52, 76),
      acceleration: rand(52, 78),
      agility: rand(48, 74),
      power: rand(48, 74),
      intelligence: rand(50, 76),
      potential: rand(84, 100),
      temperament: temperaments[rand(0, temperaments.length - 1)],
      form: 'normal',
      trainingStreakDays: 0,
      lastTrainingDate: null,
      careerLimit: rand(15, 35),
      racesRun: 0,
      wins: 0,
      podiums: 0,
      earnings: 0,
      offspringLimit: rand(1, 5),
      offspringCount: 0,
      status: 'active'
    }, rand);
  }

  function normalizeHorse(horse, randIntFn) {
    var rand = randIntFn || function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    if (!horse.form) horse.form = 'normal';
    if (!Number.isFinite(horse.trainingStreakDays)) horse.trainingStreakDays = 0;
    if (typeof horse.lastTrainingDate === 'undefined') horse.lastTrainingDate = null;

    if (!Number.isFinite(horse.careerLimit)) horse.careerLimit = rand(15, 35);
    if (!Number.isFinite(horse.racesRun)) horse.racesRun = 0;
    if (!Number.isFinite(horse.wins)) horse.wins = 0;
    if (!Number.isFinite(horse.podiums)) horse.podiums = 0;
    if (!Number.isFinite(horse.earnings)) horse.earnings = 0;

    if (!Number.isFinite(horse.offspringLimit)) horse.offspringLimit = rand(1, 5);
    if (!Number.isFinite(horse.offspringCount)) horse.offspringCount = 0;
    if (!horse.status) horse.status = 'active';

    if (typeof horse.energy !== 'undefined') delete horse.energy;

    return horse;
  }

  function normalizeHorses(horses, randIntFn) {
    if (!Array.isArray(horses)) return [];
    return horses.map(function (horse) {
      return normalizeHorse(horse, randIntFn);
    });
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

  function formLabel(form) {
    if (form === 'excellent') return 'Отличная';
    if (form === 'bad') return 'Плохая';
    return 'Нормальная';
  }

  function formMultiplier(form) {
    if (form === 'excellent') return 1;
    if (form === 'bad') return 0.6;
    return 0.8;
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
    normalizeHorse: normalizeHorse,
    normalizeHorses: normalizeHorses,
    horseClass: horseClass,
    formLabel: formLabel,
    formMultiplier: formMultiplier,
    behaviorLabel: behaviorLabel
  };
})();
