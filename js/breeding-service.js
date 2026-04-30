// Breeding service parents and availability helpers.

window.SKACHKI_BREEDING_SERVICE = (function () {
  var STUD_SERVICE_ID = 'external_stud_service_basic';
  var MARE_SERVICE_ID = 'external_mare_service_basic';
  var STUD_SERVICE_FEE = 80;
  var MARE_SERVICE_FEE = 100;

  function createExternalStud() {
    return {
      id: STUD_SERVICE_ID,
      name: 'Племенной жеребец',
      gender: 'stallion',
      breed: 'Английская',
      coat: 'Гнедая',
      speed: 72,
      stamina: 70,
      acceleration: 73,
      agility: 68,
      power: 72,
      intelligence: 67,
      potential: 86,
      temperament: 'Смелая',
      form: 'normal',
      rating: 900,
      racesRun: 0,
      practiceStarts: 0,
      wins: 0,
      podiums: 0,
      earnings: 0,
      offspringCount: 0,
      offspringLimit: '∞',
      status: 'external',
      hiddenQualities: {
        strength: 11,
        agility: 8,
        instinct: 10
      },
      isExternalStud: true,
      isExternalParent: true
    };
  }

  function createExternalMare() {
    return {
      id: MARE_SERVICE_ID,
      name: 'Племенная кобыла',
      gender: 'mare',
      breed: 'Английская',
      coat: 'Серая',
      speed: 70,
      stamina: 72,
      acceleration: 69,
      agility: 70,
      power: 68,
      intelligence: 72,
      potential: 84,
      temperament: 'Смелая',
      form: 'normal',
      rating: 900,
      racesRun: 0,
      practiceStarts: 0,
      wins: 0,
      podiums: 0,
      earnings: 0,
      offspringCount: 0,
      offspringLimit: '∞',
      status: 'external',
      hiddenQualities: {
        strength: 9,
        agility: 10,
        instinct: 10
      },
      isExternalMare: true,
      isExternalParent: true
    };
  }

  function parentId(parentOrId) {
    return typeof parentOrId === 'object' && parentOrId ? parentOrId.id : parentOrId;
  }

  function isExternalStud(parentOrId) {
    return String(parentId(parentOrId)) === STUD_SERVICE_ID;
  }

  function isExternalMare(parentOrId) {
    return String(parentId(parentOrId)) === MARE_SERVICE_ID;
  }

  function isExternalParent(parentOrId) {
    return isExternalStud(parentOrId) || isExternalMare(parentOrId);
  }

  function parentFee(parent) {
    if (isExternalStud(parent)) return STUD_SERVICE_FEE;
    if (isExternalMare(parent)) return MARE_SERVICE_FEE;
    return 0;
  }

  function totalFee(stallion, mare) {
    return parentFee(stallion) + parentFee(mare);
  }

  function serviceLabel(parent) {
    if (isExternalStud(parent)) return 'Племенной жеребец';
    if (isExternalMare(parent)) return 'Племенная кобыла';
    return '';
  }

  function serviceNote(parent) {
    var fee = parentFee(parent);
    if (!fee) return '';
    return '<div class="breed-forecast-note">Племенная станция • Взнос ' + fee + ' 🪙 • Не занимает место в конюшне</div>';
  }

  function ownAvailableParents(horses, gender) {
    if (!Array.isArray(horses)) return [];

    return horses.filter(function (horse) {
      return !isExternalParent(horse) &&
        horse.status !== 'archived' &&
        horse.gender === gender &&
        horse.offspringCount < horse.offspringLimit;
    });
  }

  function availableParents(horses, gender) {
    var own = ownAvailableParents(horses, gender);
    if (own.length) return own;
    if (gender === 'stallion') return [createExternalStud()];
    if (gender === 'mare') return [createExternalMare()];
    return [];
  }

  function findHorse(horses, id) {
    if (isExternalStud(id)) return createExternalStud();
    if (isExternalMare(id)) return createExternalMare();
    if (!Array.isArray(horses)) return null;

    return horses.find(function (horse) {
      return String(horse.id) === String(id);
    });
  }

  function canUseAsParent(horses, horse, gender) {
    if (!horse) return false;
    if (isExternalStud(horse)) return gender === 'stallion' && !ownAvailableParents(horses, 'stallion').length;
    if (isExternalMare(horse)) return gender === 'mare' && !ownAvailableParents(horses, 'mare').length;

    return horse.status !== 'archived' &&
      horse.gender === gender &&
      horse.offspringCount < horse.offspringLimit;
  }

  return {
    STUD_SERVICE_ID: STUD_SERVICE_ID,
    MARE_SERVICE_ID: MARE_SERVICE_ID,
    STUD_SERVICE_FEE: STUD_SERVICE_FEE,
    MARE_SERVICE_FEE: MARE_SERVICE_FEE,
    createExternalStud: createExternalStud,
    createExternalMare: createExternalMare,
    isExternalStud: isExternalStud,
    isExternalMare: isExternalMare,
    isExternalParent: isExternalParent,
    parentFee: parentFee,
    totalFee: totalFee,
    serviceLabel: serviceLabel,
    serviceNote: serviceNote,
    ownAvailableParents: ownAvailableParents,
    availableParents: availableParents,
    findHorse: findHorse,
    canUseAsParent: canUseAsParent
  };
})();
