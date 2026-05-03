// Horse domain helpers.
// Pure functions only: no DOM, no Phaser, no localStorage.

window.SKACHKI_HORSE = (function () {
  var HORSE_BREEDS = ['Английская', 'Арабская', 'Ахалтекинская', 'Квотерхорс', 'Стандартбредная'];
  var HORSE_COATS = ['Гнедая', 'Вороная', 'Рыжая', 'Серая', 'Буланая', 'Соловая'];

  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function daysBetween(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    var a = new Date(dateA + 'T00:00:00');
    var b = new Date(dateB + 'T00:00:00');
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  function pick(list, rand) { return list[rand(0, list.length - 1)]; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function randomGender(rand) { return rand(0, 1) === 0 ? 'stallion' : 'mare'; }
  function genderLabel(gender) { return gender === 'mare' ? 'Кобыла' : 'Жеребец'; }

  function horseRankFromRating(rating) {
    var score = Number.isFinite(rating) ? rating : 0;
    if (score >= 650) return 'diamond';
    if (score >= 400) return 'platinum';
    if (score >= 220) return 'gold';
    if (score >= 100) return 'silver';
    return 'bronze';
  }

  function horseRankLabel(rank) {
    if (rank === 'diamond') return 'Алмаз';
    if (rank === 'platinum') return 'Платина';
    if (rank === 'gold') return 'Золото';
    if (rank === 'silver') return 'Серебро';
    return 'Бронза';
  }

  function hiddenRankFromValue(value) {
    var score = Number.isFinite(value) ? value : 8;
    if (score >= 16) return 'diamond';
    if (score >= 11) return 'gold';
    if (score >= 6) return 'silver';
    return 'bronze';
  }

  function rankLabel(rank) {
    if (rank === 'diamond') return 'Алмаз';
    if (rank === 'gold') return 'Золото';
    if (rank === 'silver') return 'Серебро';
    return 'Бронза';
  }

  function rankScoreFromStat(stat) {
    var value = Number.isFinite(stat) ? stat : 60;
    return clamp(Math.round((value - 40) / 3), 1, 20);
  }

  function randomHiddenQuality(rand, baseStat) {
    return clamp(rankScoreFromStat(baseStat) + rand(-2, 2), 1, 20);
  }

  function hiddenQualityLabel(key) {
    if (key === 'strength') return 'Сила';
    if (key === 'agility') return 'Ловкость';
    if (key === 'instinct') return 'Чутьё';
    return key;
  }

  function hiddenQualityDescription(key, rank) {
    var descriptions = {
      strength: {
        bronze: 'Тяжело держит плотную борьбу.',
        silver: 'Нормально держится под давлением.',
        gold: 'Уверенно держит борьбу.',
        diamond: 'Почти не проседает в жёсткой борьбе.'
      },
      agility: {
        bronze: 'Часто вязнет в группе.',
        silver: 'Хорошо проходит повороты.',
        gold: 'Легко находит свободную дорожку.',
        diamond: 'Мгновенно открывает себе путь.'
      },
      instinct: {
        bronze: 'Иногда ошибается с рывком.',
        silver: 'Неплохо чувствует гонку.',
        gold: 'Хорошо выбирает момент атаки.',
        diamond: 'Чувствует идеальный момент для рывка.'
      }
    };
    return ((descriptions[key] || {})[rank]) || 'Качество проявится в гонках.';
  }

  function createHorse(name, randIntFn) {
    var rand = randIntFn || function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
    var data = window.SKACHKI_DATA || {};
    var temperaments = data.temperaments || ['Смелая', 'Пугливая', 'Упрямая', 'Резкая', 'Быстрая'];
    var agility = rand(48, 74);
    var power = rand(48, 74);
    var intelligence = rand(50, 76);

    return normalizeHorse({
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      name: name,
      gender: randomGender(rand),
      breed: pick(HORSE_BREEDS, rand),
      coat: pick(HORSE_COATS, rand),
      speed: rand(54, 78),
      stamina: rand(52, 76),
      acceleration: rand(52, 78),
      agility: agility,
      power: power,
      intelligence: intelligence,
      hiddenQualities: {
        strength: randomHiddenQuality(rand, power),
        agility: randomHiddenQuality(rand, agility),
        instinct: randomHiddenQuality(rand, intelligence)
      },
      rating: 0,
      bestRank: 'bronze',
      demotionShield: 0,
      practiceStarts: 0,
      practiceBestPlace: null,
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
    var rand = randIntFn || function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

    if (!horse.gender) horse.gender = randomGender(rand);
    if (!horse.breed) horse.breed = pick(HORSE_BREEDS, rand);
    if (!horse.coat) horse.coat = pick(HORSE_COATS, rand);
    if (!Number.isFinite(horse.rating)) horse.rating = 0;
    if (!horse.currentRank) horse.currentRank = horseRankFromRating(horse.rating);
    if (!horse.bestRank) horse.bestRank = horse.currentRank || 'bronze';
    if (!Number.isFinite(horse.demotionShield)) horse.demotionShield = 0;
    if (!Number.isFinite(horse.practiceStarts)) horse.practiceStarts = 0;
    if (typeof horse.practiceBestPlace === 'undefined') horse.practiceBestPlace = null;
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

    if (!horse.hiddenQualities) horse.hiddenQualities = {};
    if (!Number.isFinite(horse.hiddenQualities.strength)) horse.hiddenQualities.strength = randomHiddenQuality(rand, horse.power);
    if (!Number.isFinite(horse.hiddenQualities.agility)) horse.hiddenQualities.agility = randomHiddenQuality(rand, horse.agility);
    if (!Number.isFinite(horse.hiddenQualities.instinct)) horse.hiddenQualities.instinct = randomHiddenQuality(rand, horse.intelligence);
    if (typeof horse.energy !== 'undefined') delete horse.energy;

    horse.currentRank = horseRankFromRating(horse.rating);
    applyFormDecay(horse);
    return horse;
  }

  function normalizeHorses(horses, randIntFn) {
    if (!Array.isArray(horses)) return [];
    return horses.map(function (horse) { return normalizeHorse(horse, randIntFn); });
  }

  function applyFormDecay(horse, currentDate) {
    var today = currentDate || todayKey();
    var missedDays = daysBetween(horse.lastTrainingDate, today) - 1;
    if (!horse.lastTrainingDate || missedDays <= 0) return horse;
    if (missedDays >= 3) {
      horse.form = 'bad';
      horse.trainingStreakDays = 0;
    } else if (missedDays >= 1) {
      if (horse.form === 'excellent') horse.form = 'normal';
      horse.trainingStreakDays = 0;
    }
    return horse;
  }

  function trainingProgressText(horse, currentDate) {
    var today = currentDate || todayKey();
    var trainedToday = horse.lastTrainingDate === today;
    var streak = Number.isFinite(horse.trainingStreakDays) ? horse.trainingStreakDays : 0;
    var form = horse.form || 'normal';

    if (form === 'excellent') return trainedToday ? 'Сегодня уже тренировалась. Форма отличная.' : 'Поддержите серию сегодня, чтобы сохранить отличную форму.';
    if (form === 'bad') {
      var toNormal = Math.max(1, 3 - streak);
      return trainedToday ? 'Сегодня уже тренировалась. До нормальной формы: ' + toNormal + ' дн.' : 'До нормальной формы: ' + toNormal + ' дн.';
    }
    var toExcellent = Math.max(1, 7 - streak);
    return trainedToday ? 'Сегодня уже тренировалась. До отличной формы: ' + toExcellent + ' дн.' : 'До отличной формы: ' + toExcellent + ' дн.';
  }

  function horseClass(horse) {
    return Math.round(
      (Number(horse.speed) || 0) * 0.4 +
      (Number(horse.stamina) || 0) * 0.35 +
      (Number(horse.acceleration) || 0) * 0.25
    );
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
    applyFormDecay: applyFormDecay,
    trainingProgressText: trainingProgressText,
    horseClass: horseClass,
    genderLabel: genderLabel,
    horseRankFromRating: horseRankFromRating,
    horseRankLabel: horseRankLabel,
    hiddenRankFromValue: hiddenRankFromValue,
    rankLabel: rankLabel,
    hiddenQualityLabel: hiddenQualityLabel,
    hiddenQualityDescription: hiddenQualityDescription,
    formLabel: formLabel,
    formMultiplier: formMultiplier,
    behaviorLabel: behaviorLabel
  };
})();
