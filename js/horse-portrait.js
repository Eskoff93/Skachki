// Generated horse portrait SVG helpers.

window.SKACHKI_HORSE_PORTRAIT = (function () {
  function slug(value) {
    var map = {
      'Английская': 'english',
      'Арабская': 'arabian',
      'Ахалтекинская': 'akhal',
      'Квотерхорс': 'quarter',
      'Стандартбредная': 'standard',
      'Гнедая': 'bay',
      'Вороная': 'black',
      'Рыжая': 'chestnut',
      'Серая': 'gray',
      'Буланая': 'buckskin',
      'Соловая': 'palomino'
    };
    return map[value] || 'bay';
  }

  function hashString(value) {
    var text = String(value || 'horse');
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function horsePalette(coat) {
    var palettes = {
      bay: { base: '#9B5421', mid: '#BE7034', light: '#E4A762', dark: '#351810', mane: '#101216', blaze: '#FFF4DC' },
      black: { base: '#202127', mid: '#363B44', light: '#777E8B', dark: '#07080B', mane: '#050609', blaze: '#F2F2EC' },
      chestnut: { base: '#B75B23', mid: '#D37633', light: '#EFA461', dark: '#4C1F10', mane: '#713016', blaze: '#FFF3E4' },
      gray: { base: '#BCC3C7', mid: '#D8DDE0', light: '#F4F6F4', dark: '#5F6870', mane: '#626A70', blaze: '#FFFFFF' },
      buckskin: { base: '#C99A45', mid: '#DBAF59', light: '#F2CF7D', dark: '#5F4017', mane: '#11100D', blaze: '#FFF4D9' },
      palomino: { base: '#D4AD55', mid: '#E4C66E', light: '#FFE6A4', dark: '#765720', mane: '#EADBB8', blaze: '#FFF8E8' }
    };
    return palettes[coat] || palettes.bay;
  }

  function breedProfile(breed) {
    var profiles = {
      english: { sx: 1, sy: 1, dx: 0, dy: 0 },
      arabian: { sx: 0.96, sy: 0.98, dx: 1, dy: -1 },
      akhal: { sx: 0.94, sy: 1.08, dx: 2, dy: -4 },
      quarter: { sx: 1.07, sy: 1.02, dx: -2, dy: 1 },
      standard: { sx: 1.01, sy: 1, dx: 0, dy: 0 }
    };
    return profiles[breed] || profiles.english;
  }

  function avatarGenes(horse) {
    var seed = hashString((horse.id || '') + '|' + (horse.name || '') + '|' + (horse.breed || '') + '|' + (horse.coat || ''));
    return {
      mane: seed % 3,
      blaze: (seed >> 3) % 4,
      shade: ((seed >> 7) % 100) / 100,
      tilt: ((seed >> 11) % 3) - 1
    };
  }

  function maneShape(type) {
    var shapes = [
      'M42 116C35 94 37 74 48 58C58 43 71 36 86 38C73 45 64 58 61 76C58 93 63 107 74 120Z',
      'M38 116C30 90 36 63 55 45C69 32 88 31 101 43C82 40 68 51 61 70C55 88 59 104 70 120Z',
      'M44 116C36 89 43 61 64 40C77 29 95 32 105 48C88 42 72 52 64 70C57 88 61 105 75 120Z'
    ];
    return shapes[type] || shapes[0];
  }

  function blazeShape(type, color) {
    var shapes = [
      '',
      '<path d="M72 40C79 48 87 64 96 84C92 89 87 91 81 88C74 69 65 54 55 47C60 42 66 40 72 40Z" fill="' + color + '" opacity=".94"/>',
      '<path d="M70 39C80 50 91 70 103 96C98 104 88 104 80 96C72 75 61 58 49 49C54 43 61 39 70 39Z" fill="' + color + '" opacity=".94"/>',
      '<path d="M69 43C74 47 76 53 75 59C70 63 63 63 58 59C60 51 63 46 69 43Z" fill="' + color + '" opacity=".92"/><ellipse cx="94" cy="88" rx="5" ry="3.4" fill="' + color + '" opacity=".86"/>'
    ];
    return shapes[type] || shapes[0];
  }

  function render(horse) {
    var coat = slug(horse.coat);
    var breed = slug(horse.breed);
    var palette = horsePalette(coat);
    var profile = breedProfile(breed);
    var genes = avatarGenes(horse);
    var uid = 'hp' + hashString(horse.id || horse.name);
    var horseShape = 'M35 116C31 95 34 76 45 61C51 53 58 47 67 44C65 34 68 24 76 17C83 25 85 35 82 44C94 48 105 58 111 72C117 86 116 99 107 106C99 113 87 108 78 98C69 88 63 77 52 78C42 79 37 92 39 116Z';
    var dapples = coat === 'gray'
      ? '<ellipse cx="58" cy="60" rx="2" ry="1.2" fill="#fff" opacity=".22"/><ellipse cx="71" cy="72" rx="1.8" ry="1" fill="#fff" opacity=".2"/><ellipse cx="85" cy="82" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/><ellipse cx="45" cy="91" rx="1.8" ry="1" fill="#fff" opacity=".16"/>'
      : '';

    return '<svg class="horse-portrait-svg generated-horse-avatar coat-' + coat + ' breed-' + breed + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="' + uid + 'Bg" cx="50%" cy="36%" r="74%"><stop offset="0" stop-color="#29415f"/><stop offset=".58" stop-color="#101b2b"/><stop offset="1" stop-color="#040914"/></radialGradient>' +
        '<linearGradient id="' + uid + 'Coat" x1="39" y1="24" x2="103" y2="113"><stop offset="0" stop-color="' + palette.light + '"/><stop offset=".48" stop-color="' + palette.base + '"/><stop offset="1" stop-color="' + palette.dark + '"/></linearGradient>' +
        '<linearGradient id="' + uid + 'Light" x1="43" y1="39" x2="85" y2="104"><stop offset="0" stop-color="' + palette.light + '"/><stop offset="1" stop-color="' + palette.mid + '"/></linearGradient>' +
        '<linearGradient id="' + uid + 'Mane" x1="37" y1="34" x2="70" y2="118"><stop offset="0" stop-color="' + palette.mane + '"/><stop offset=".55" stop-color="#06070a"/><stop offset="1" stop-color="' + palette.mane + '"/></linearGradient>' +
        '<clipPath id="' + uid + 'Round"><circle cx="60" cy="60" r="55"/></clipPath>' +
        '<clipPath id="' + uid + 'HorseClip"><path d="' + horseShape + '"/></clipPath>' +
      '</defs>' +
      '<circle cx="60" cy="60" r="57" fill="url(#' + uid + 'Bg)"/>' +
      '<g clip-path="url(#' + uid + 'Round)">' +
        '<path d="M60 10v100M33 22l54 78M87 22l-54 78M12 60h96M21 36l78 48M99 36L21 84" stroke="#8f682e" stroke-width=".55" opacity=".18"/>' +
        '<g transform="translate(60 63) rotate(' + genes.tilt + ') scale(' + profile.sx + ' ' + profile.sy + ') translate(' + (-60 + profile.dx) + ' ' + (-63 + profile.dy) + ')">' +
          '<path d="' + maneShape(genes.mane) + '" fill="url(#' + uid + 'Mane)" opacity=".98"/>' +
          '<path d="' + horseShape + '" fill="url(#' + uid + 'Coat)"/>' +
          '<g clip-path="url(#' + uid + 'HorseClip)">' +
            '<path d="M45 62C54 48 68 42 84 46C73 53 67 63 65 75C63 89 68 101 80 112C64 114 50 108 42 96C33 83 35 72 45 62Z" fill="url(#' + uid + 'Light)" opacity=".58"/>' +
            '<path d="M76 77C90 82 104 79 114 70C113 86 105 98 92 104C78 110 63 105 50 92C58 84 66 79 76 77Z" fill="' + palette.dark + '" opacity=".24"/>' +
            blazeShape(genes.blaze, palette.blaze) + dapples +
          '</g>' +
          '<path d="M42 54C51 43 62 37 77 36" fill="none" stroke="' + palette.mane + '" stroke-width="4" stroke-linecap="round" opacity=".75"/>' +
          '<path d="M75 56C80 51 89 51 95 57C89 64 80 64 75 56Z" fill="#171015"/>' +
          '<ellipse cx="85" cy="56" rx="5.3" ry="3.8" fill="#4b2b18"/><circle cx="85" cy="56" r="2.2" fill="#100807"/><circle cx="87.1" cy="54.6" r="1" fill="#fff4df"/>' +
          '<ellipse cx="103" cy="92" rx="4.7" ry="6" fill="#111116"/><ellipse cx="104" cy="93" rx="2.6" ry="3.7" fill="#2d292d"/>' +
          '<path d="M49 93C61 101 75 102 88 95" fill="none" stroke="#1b0d08" stroke-width="2.1" stroke-linecap="round" opacity=".34"/>' +
          '<path d="M49 51C61 40 80 40 98 52" fill="none" stroke="#fff" stroke-width="2.1" opacity="' + (0.07 + genes.shade * 0.09).toFixed(2) + '" stroke-linecap="round"/>' +
          '<path d="' + horseShape + '" fill="none" stroke="#07090d" stroke-width="2.2" opacity=".36"/>' +
        '</g>' +
      '</g>' +
    '</svg>';
  }

  return {
    render: render,
    slug: slug,
    hashString: hashString
  };
})();
