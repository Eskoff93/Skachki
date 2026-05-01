// Training screen and training actions.

window.SKACHKI_TRAINING = (function () {
  var PRIMARY_TRAINING_KEYS = ['speed', 'stamina', 'acceleration'];
  var selectedTrainingKey = 'speed';

  var TRAINING_META = {
    speed: {
      icon: '➤',
      short: 'Скорость',
      title: 'Скорость',
      hint: 'Максимальный темп на дистанции.'
    },
    stamina: {
      icon: '♡',
      short: 'Выносливость',
      title: 'Выносливость',
      hint: 'Стабильность ближе к финишу и длинные дистанции.'
    },
    acceleration: {
      icon: '⚡',
      short: 'Ускорение',
      title: 'Ускорение',
      hint: 'Старт, рывки, выход из поворотов и смена темпа.'
    }
  };

  function game() { return window.SKACHKI_GAME; }
  function horseUi() { return window.SKACHKI_HORSE_UI || {}; }

  function installTrainingCenterStyles() {
    if (document.getElementById('skachki-training-center-styles')) return;

    var style = document.createElement('style');
    style.id = 'skachki-training-center-styles';
    style.textContent = '' +
      '#trainingScreen{background:radial-gradient(circle at 50% -8%,rgba(57,91,122,.5),transparent 36%),linear-gradient(180deg,#061526,#030812 74%)!important;}' +
      '#trainingScreen .topbar{display:none!important;}' +
      '#trainingScreen .content-scroll{padding:calc(var(--safe-top) + 18px) 14px calc(34px + var(--safe-bottom))!important;}' +
      '#trainingScreen .training-hero{padding:0!important;margin:0 0 10px!important;background:transparent!important;border:0!important;box-shadow:none!important;}' +
      '.training-center-head{position:relative;margin-bottom:10px;padding:50px 14px 14px;border-radius:26px;background:radial-gradient(circle at 82% 12%,rgba(216,169,67,.2),transparent 33%),linear-gradient(120deg,rgba(6,17,31,.96),rgba(10,29,47,.96));border:1px solid rgba(216,169,67,.34);box-shadow:0 18px 48px rgba(0,0,0,.42),inset 0 0 0 1px rgba(255,255,255,.035);overflow:hidden;}' +
      '.training-center-head:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,rgba(255,230,162,.1),transparent 38%),radial-gradient(circle at 85% 50%,rgba(216,169,67,.12),transparent 30%);pointer-events:none;}' +
      '.training-back-btn{position:absolute;left:12px;top:12px;z-index:2;width:42px;height:42px;border-radius:15px;border:1px solid rgba(216,169,67,.34);background:rgba(4,14,25,.72);color:#fff;font-size:22px;font-weight:950;box-shadow:0 10px 24px rgba(0,0,0,.3);}' +
      '.training-center-title{position:absolute;top:16px;left:64px;right:64px;z-index:2;text-align:center;color:#ffe6a2;font-size:16px;font-weight:950;text-transform:uppercase;letter-spacing:.08em;line-height:1.05;text-shadow:0 2px 18px rgba(216,169,67,.28);}' +
      '.training-center-emblem{position:absolute;right:14px;top:12px;z-index:2;width:42px;height:42px;border-radius:15px;border:1px solid rgba(216,169,67,.34);background:radial-gradient(circle at 50% 0,rgba(255,230,162,.2),transparent 52%),rgba(4,14,25,.72);display:flex;align-items:center;justify-content:center;color:#ffe6a2;font-size:24px;box-shadow:0 10px 24px rgba(0,0,0,.3);}' +
      '.training-profile{position:relative;z-index:1;display:flex;align-items:center;gap:15px;min-height:112px;}' +
      '.training-portrait{position:relative;flex:0 0 112px;width:112px;height:112px;border-radius:50%;padding:5px;background:linear-gradient(135deg,#fff0a8,#d4a341,#5a340f);box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 0 6px rgba(216,169,67,.08);}' +
      '.training-portrait .horse-portrait-svg{position:absolute!important;inset:5px!important;width:calc(100% - 10px)!important;height:calc(100% - 10px)!important;border-radius:50%!important;}' +
      '.training-portrait span{position:absolute;right:-3px;top:9px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#071525;border:1px solid rgba(255,255,255,.18);font-size:19px;font-weight:950;box-shadow:0 8px 16px rgba(0,0,0,.34);}' +
      '.training-sex-stallion span,.training-sex-symbol.training-sex-stallion{color:#77c8ff!important;}' +
      '.training-sex-mare span,.training-sex-symbol.training-sex-mare{color:#ff86c0!important;}' +
      '.training-profile-main{min-width:0;flex:1;}' +
      '.training-horse-name{font-size:30px;font-weight:950;line-height:1.02;color:#fff;text-shadow:0 2px 16px rgba(255,255,255,.12);word-break:break-word;}' +
      '.training-sex-symbol{font-size:23px;vertical-align:middle;}' +
      '.training-profile-main .star-rating{margin-top:8px;font-size:20px;width:106px;height:23px;}' +
      '.training-form-chip{display:inline-flex;margin-top:12px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.055);border:1px solid rgba(216,169,67,.22);color:#dce8f3;font-size:13px;font-weight:850;}' +
      '.training-form-chip b{color:#8de691;margin-left:5px;}' +
      '.training-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0;}' +
      '.training-status-cell{min-height:72px;border-radius:18px;background:linear-gradient(180deg,rgba(15,34,54,.96),rgba(6,18,32,.96));border:1px solid rgba(216,169,67,.24);box-shadow:0 10px 24px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.025);padding:10px;display:grid;grid-template-columns:30px 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;}' +
      '.training-status-cell i{grid-row:1/3;width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,rgba(255,230,162,.95),rgba(216,169,67,.72));color:#1c1004;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:950;}' +
      '.training-status-cell span{color:#aebfd0;font-size:11px;line-height:1.1;font-weight:850;}' +
      '.training-status-cell b{color:#ffe6a2;font-size:15px;line-height:1.1;font-weight:950;}' +
      '.training-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:8px 0 0;}' +
      '.training-tab{min-height:58px;border-radius:18px;border:1px solid rgba(216,169,67,.22);background:linear-gradient(180deg,rgba(13,31,50,.96),rgba(5,16,29,.96));color:#c5d2df;font-weight:950;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 10px 24px rgba(0,0,0,.24);}' +
      '.training-tab i{font-style:normal;color:#d8a943;font-size:18px;}' +
      '.training-tab.active{color:#ffe6a2;border-color:rgba(255,211,77,.72);background:radial-gradient(circle at 50% 0,rgba(255,211,77,.22),transparent 55%),linear-gradient(180deg,rgba(30,48,66,.98),rgba(8,20,34,.98));box-shadow:0 0 0 1px rgba(255,211,77,.2) inset,0 14px 30px rgba(0,0,0,.32);}' +
      '.training-center-panel{position:relative;padding:16px 14px 15px;border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(216,169,67,.14),transparent 34%),linear-gradient(180deg,rgba(10,28,46,.98),rgba(4,14,26,.98));border:1px solid rgba(216,169,67,.38);box-shadow:0 22px 60px rgba(0,0,0,.44),inset 0 0 0 1px rgba(255,255,255,.035);overflow:hidden;}' +
      '.training-center-panel:before{content:"";position:absolute;left:6%;right:6%;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,211,77,.9),transparent);box-shadow:0 0 18px rgba(216,169,67,.36);}' +
      '.training-gauge-title{text-align:center;color:#ffe6a2;font-size:24px;font-weight:950;line-height:1.05;margin:4px 0 10px;text-shadow:0 2px 18px rgba(216,169,67,.2);}' +
      '.training-gauge{position:relative;height:205px;margin:0 auto;max-width:350px;}' +
      '.training-gauge-arc{position:absolute;left:50%;top:16px;width:250px;height:250px;transform:translateX(-50%);border-radius:50%;background:conic-gradient(from 225deg,#3aa0ff 0deg,#6bb7ff 58deg,#d8a943 126deg,#ff8a3d 180deg,transparent 181deg,transparent 360deg);mask:radial-gradient(circle,transparent 0 54%,#000 55% 63%,transparent 64%);-webkit-mask:radial-gradient(circle,transparent 0 54%,#000 55% 63%,transparent 64%);filter:drop-shadow(0 0 12px rgba(95,184,255,.2));}' +
      '.training-gauge:after{content:"";position:absolute;left:50%;top:34px;width:210px;height:210px;transform:translateX(-50%);border-radius:50%;border:1px solid rgba(216,169,67,.2);}' +
      '.training-gauge-needle{position:absolute;left:var(--needle-left);top:50px;width:3px;height:94px;transform:translateX(-50%) rotate(18deg);transform-origin:50% 90%;background:linear-gradient(180deg,#ffe6a2,#d8a943);border-radius:999px;box-shadow:0 0 14px rgba(216,169,67,.45);}' +
      '.training-gauge-value{position:absolute;left:0;right:0;top:80px;text-align:center;font-size:66px;font-weight:300;color:#fff;line-height:1;text-shadow:0 0 18px rgba(255,255,255,.12);}' +
      '.training-gauge-label{position:absolute;left:0;right:0;top:150px;text-align:center;color:#aebfd0;font-size:11px;text-transform:uppercase;font-weight:900;letter-spacing:.05em;}' +
      '.training-potential-track{position:relative;height:18px;margin:0 14px 14px;border-radius:999px;background:linear-gradient(90deg,rgba(43,125,224,.25),rgba(216,169,67,.22),rgba(255,118,58,.22));border:1px solid rgba(255,255,255,.11);overflow:visible;}' +
      '.training-progress-fill{position:absolute;left:0;top:3px;bottom:3px;border-radius:999px;background:linear-gradient(90deg,#3aa0ff,#78caff);box-shadow:0 0 14px rgba(95,184,255,.35);}' +
      '.training-limit-marker{position:absolute;top:-6px;width:20px;height:30px;transform:translateX(-50%);}' +
      '.training-limit-marker:before{content:"";position:absolute;left:8px;top:0;bottom:0;width:3px;border-radius:99px;background:#ffd34d;box-shadow:0 0 15px rgba(255,211,77,.54);}' +
      '.training-limit-marker:after{content:"";position:absolute;left:4px;top:-2px;width:11px;height:11px;border-radius:50%;background:#ffd34d;border:2px solid rgba(5,15,27,.96);}' +
      '.training-zone-row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0 2px 14px;text-align:center;}' +
      '.training-zone-row div{padding:0 4px;border-right:1px solid rgba(216,169,67,.18);}' +
      '.training-zone-row div:last-child{border-right:0;}' +
      '.training-zone-row b{display:block;color:#d8a943;font-size:10px;text-transform:uppercase;line-height:1.15;}' +
      '.training-zone-row span{display:block;color:#9fb3c6;font-size:10px;line-height:1.28;margin-top:4px;}' +
      '.training-plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;}' +
      '.training-plan-cell{min-height:70px;border-radius:18px;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025));border:1px solid rgba(216,169,67,.2);display:grid;grid-template-columns:34px 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;}' +
      '.training-plan-cell i{grid-row:1/3;width:34px;height:34px;border-radius:50%;background:rgba(95,184,255,.12);border:1px solid rgba(95,184,255,.4);color:#8ccfff;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:950;}' +
      '.training-plan-cell span{font-size:11px;color:#aebfd0;font-weight:850;line-height:1.1;}' +
      '.training-plan-cell b{font-size:22px;color:#ffe6a2;font-weight:950;line-height:1.05;}' +
      '.training-plan-eff.training-eff-high b{color:#87e68f;}.training-plan-eff.training-eff-medium b{color:#ffd34d;}.training-plan-eff.training-eff-low b,.training-plan-eff.training-eff-minimal b{color:#ff8a65;}' +
      '.training-info-note{display:flex;align-items:center;gap:11px;margin-top:10px;padding:12px;border-radius:18px;background:rgba(216,169,67,.08);border:1px solid rgba(216,169,67,.22);color:#dfe8f1;font-size:13px;line-height:1.35;}' +
      '.training-info-note i{flex:0 0 30px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(216,169,67,.5);color:#ffe6a2;font-style:normal;font-weight:950;}' +
      '.training-start-btn{width:100%;min-height:58px;margin-top:14px;border-radius:22px!important;font-size:21px!important;color:#211303!important;text-shadow:0 1px rgba(255,255,255,.24);box-shadow:0 18px 36px rgba(0,0,0,.36),0 0 0 1px rgba(255,255,255,.18) inset!important;}' +
      '.training-start-btn span{margin-right:10px;}.training-start-btn:disabled{opacity:.55;filter:grayscale(.35);}' +
      '.training-bottom-note{margin-top:10px;text-align:center;color:#8fa4b8;font-size:11px;line-height:1.32;}' +
      '@media(max-width:420px){#trainingScreen .content-scroll{padding-left:10px!important;padding-right:10px!important}.training-center-head{padding:48px 12px 12px}.training-center-title{font-size:14px;left:58px;right:58px}.training-profile{gap:12px}.training-portrait{width:96px;height:96px;flex-basis:96px}.training-horse-name{font-size:24px}.training-status-grid{gap:6px}.training-status-cell{padding:8px;grid-template-columns:27px 1fr;min-height:66px}.training-status-cell i{width:27px;height:27px}.training-status-cell span{font-size:10px}.training-status-cell b{font-size:13px}.training-tab{font-size:11px;min-height:54px}.training-gauge{height:188px}.training-gauge-arc{width:226px;height:226px}.training-gauge:after{width:190px;height:190px}.training-gauge-value{font-size:56px;top:76px}.training-gauge-label{top:138px}.training-zone-row b{font-size:9px}.training-zone-row span{font-size:9px}.training-plan-cell{grid-template-columns:30px 1fr;min-height:66px}.training-plan-cell i{width:30px;height:30px}.training-plan-cell b{font-size:19px}.training-start-btn{font-size:18px!important}}';
    document.head.appendChild(style);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function progressText(horse) {
    var horseTools = window.SKACHKI_HORSE || {};
    if (horseTools.trainingProgressText) return horseTools.trainingProgressText(horse);
    return 'Серия тренировок: ' + (horse.trainingStreakDays || 0) + ' дн.';
  }

  function naturalLimit(horse) {
    return Math.max(45, Math.min(100, Math.round(Number(horse.potential) || 70)));
  }

  function primaryTrainingTypes() {
    var G = game();
    return (G.DATA.trainingTypes || []).filter(function (type) {
      return PRIMARY_TRAINING_KEYS.indexOf(type.key) !== -1;
    });
  }

  function getTrainingType(key) {
    return primaryTrainingTypes().find(function (type) { return type.key === key; }) || primaryTrainingTypes()[0];
  }

  function normalizeSelectedKey() {
    if (PRIMARY_TRAINING_KEYS.indexOf(selectedTrainingKey) === -1) selectedTrainingKey = 'speed';
    if (!getTrainingType(selectedTrainingKey)) selectedTrainingKey = primaryTrainingTypes()[0] ? primaryTrainingTypes()[0].key : 'speed';
    return selectedTrainingKey;
  }

  function roundCost(value) {
    return Math.max(5, Math.ceil(value / 5) * 5);
  }

  function efficiencyPlan(current, limit, baseCost) {
    var ratio = limit > 0 ? current / limit : 1;

    if (current >= 100) {
      return {
        level: 'max',
        label: 'Максимум',
        tone: 'max',
        gainMin: 0,
        gainMax: 0,
        cost: 0,
        zone: 'Максимальный уровень достигнут.',
        note: 'Показатель уже находится на максимуме.'
      };
    }

    if (ratio < 0.62) {
      return {
        level: 'high',
        label: 'Высокая',
        tone: 'high',
        gainMin: 4,
        gainMax: 6,
        cost: roundCost(baseCost),
        zone: 'Далеко от предела',
        note: 'Лошадь ещё далека от природного предела — тренировка даёт лучший прирост.'
      };
    }

    if (ratio < 0.82) {
      return {
        level: 'medium',
        label: 'Средняя',
        tone: 'medium',
        gainMin: 2,
        gainMax: 4,
        cost: roundCost(baseCost * 1.25),
        zone: 'Средняя зона',
        note: 'Рост становится сложнее: эффективность средняя, стоимость выше базовой.'
      };
    }

    if (ratio < 1) {
      return {
        level: 'low',
        label: 'Низкая',
        tone: 'low',
        gainMin: 1,
        gainMax: 2,
        cost: roundCost(baseCost * 1.75),
        zone: 'Близко к пределу',
        note: 'Показатель близок к природному пределу — прирост слабее, тренировка дороже.'
      };
    }

    return {
      level: 'minimal',
      label: 'Минимальная',
      tone: 'minimal',
      gainMin: 0,
      gainMax: 1,
      cost: roundCost(baseCost * 2.35),
      zone: 'Выше природного предела',
      note: 'Дальше развивать можно, но прирост почти не гарантирован и стоит дорого.'
    };
  }

  function trainingPlan(horse, type) {
    var current = Math.max(0, Math.min(100, Math.round(Number(horse[type.key]) || 0)));
    var limit = naturalLimit(horse);
    var plan = efficiencyPlan(current, limit, Number(type.cost) || 20);
    plan.current = current;
    plan.limit = limit;
    plan.key = type.key;
    plan.type = type;
    plan.progressPercent = Math.max(0, Math.min(100, current));
    plan.limitPercent = Math.max(4, Math.min(96, limit));
    return plan;
  }

  function gainText(plan) {
    if (plan.gainMax <= 0) return '+0';
    if (plan.gainMin === plan.gainMax) return '+' + plan.gainMax;
    return '+' + plan.gainMin + '…' + plan.gainMax;
  }

  function trainButtonText(plan, hasCoins) {
    if (plan.current >= 100) return 'Максимум достигнут';
    if (!hasCoins) return 'Недостаточно монет';
    return 'Начать тренировку';
  }

  function sexSymbol(horse) {
    return horse.gender === 'mare' ? '♀' : '♂';
  }

  function sexClass(horse) {
    return horse.gender === 'mare' ? 'mare' : 'stallion';
  }

  function renderStars(horse) {
    var UI = horseUi();
    if (UI.starRating) return UI.starRating(horse);
    return '';
  }

  function renderPortrait(horse) {
    var UI = horseUi();
    if (UI.horsePortrait) return UI.horsePortrait(horse);
    return '<img src="./horse_icon.png" alt="horse">';
  }

  function renderTopHeader(horse) {
    var G = game();
    return '<section class="training-center-head">' +
      '<button class="training-back-btn" type="button" data-training-back>←</button>' +
      '<div class="training-center-title">Тренировочный центр</div>' +
      '<div class="training-center-emblem">♞</div>' +
      '<div class="training-profile">' +
        '<div class="training-portrait training-sex-' + sexClass(horse) + '">' + renderPortrait(horse) + '<span>' + sexSymbol(horse) + '</span></div>' +
        '<div class="training-profile-main">' +
          '<div class="training-horse-name">' + horse.name + ' <span class="training-sex-symbol training-sex-' + sexClass(horse) + '">' + sexSymbol(horse) + '</span></div>' +
          renderStars(horse) +
          '<div class="training-form-chip">Форма: <b>' + G.formLabel(horse.form) + '</b></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderStatusBar(horse) {
    var G = game();
    return '<section class="training-status-grid">' +
      '<div class="training-status-cell"><i>▦</i><span>Серия</span><b>' + (horse.trainingStreakDays || 0) + ' дн.</b></div>' +
      '<div class="training-status-cell"><i>◉</i><span>Монеты</span><b>' + G.state.coins + '</b></div>' +
      '<div class="training-status-cell"><i>▣</i><span>Тренировочный центр</span><b>Уровень ' + (G.state.stableLevel || 1) + '</b></div>' +
    '</section>';
  }

  function renderTabs(activeKey) {
    return '<div class="training-tabs">' + primaryTrainingTypes().map(function (type) {
      var meta = TRAINING_META[type.key] || {};
      var active = type.key === activeKey;
      return '<button class="training-tab ' + (active ? 'active' : '') + '" type="button" data-train-tab="' + type.key + '"><i>' + (meta.icon || '●') + '</i><span>' + (meta.short || type.label) + '</span></button>';
    }).join('') + '</div>';
  }

  function renderHero(horse, plan) {
    return renderTopHeader(horse) + renderStatusBar(horse) + renderTabs(plan.key);
  }

  function renderGauge(plan) {
    var markerLeft = plan.limitPercent;
    return '<div class="training-gauge-wrap training-eff-' + plan.level + '">' +
      '<div class="training-gauge-title">' + (TRAINING_META[plan.key].title || plan.type.label) + '</div>' +
      '<div class="training-gauge">' +
        '<div class="training-gauge-arc"></div>' +
        '<div class="training-gauge-needle" style="--needle-left:' + markerLeft + '%"></div>' +
        '<div class="training-gauge-value">' + plan.current + '</div>' +
        '<div class="training-gauge-label">Текущий уровень</div>' +
      '</div>' +
      '<div class="training-potential-track">' +
        '<span class="training-progress-fill" style="width:' + plan.progressPercent + '%"></span>' +
        '<span class="training-limit-marker" style="left:' + markerLeft + '%" title="Природный предел"></span>' +
      '</div>' +
      '<div class="training-zone-row">' +
        '<div><b>Далеко от предела</b><span>Высокая эффективность<br>Низкая стоимость</span></div>' +
        '<div><b>Средняя зона</b><span>Средняя эффективность<br>Средняя стоимость</span></div>' +
        '<div><b>Близко к пределу</b><span>Низкая эффективность<br>Высокая стоимость</span></div>' +
      '</div>' +
    '</div>';
  }

  function renderPlanStats(plan) {
    return '<div class="training-plan-grid">' +
      '<div class="training-plan-cell"><i>▥</i><span>Текущий уровень</span><b>' + plan.current + '</b></div>' +
      '<div class="training-plan-cell training-plan-eff training-eff-' + plan.level + '"><i>◎</i><span>Эффективность</span><b>' + plan.label + '</b></div>' +
      '<div class="training-plan-cell"><i>↗</i><span>Ожидаемый прирост</span><b>' + gainText(plan) + '</b></div>' +
      '<div class="training-plan-cell"><i>◉</i><span>Стоимость</span><b>' + plan.cost + ' 🪙</b></div>' +
    '</div>';
  }

  function renderTrainingPanel(horse, plan) {
    var G = game();
    var hasCoins = G.state.coins >= plan.cost;
    var disabled = plan.current >= 100 || !hasCoins;
    var meta = TRAINING_META[plan.key] || {};

    return '<section class="training-center-panel training-eff-' + plan.level + '">' +
      renderGauge(plan) +
      renderPlanStats(plan) +
      '<div class="training-info-note"><i>i</i><span>' + plan.note + '</span></div>' +
      '<button class="btn btn-gold training-start-btn" data-train-key="' + plan.key + '" type="button" ' + (disabled ? 'disabled' : '') + '><span>♞</span>' + trainButtonText(plan, hasCoins) + '</button>' +
      '<div class="training-bottom-note">' + (meta.hint || plan.type.desc || '') + ' ' + progressText(horse) + '</div>' +
    '</section>';
  }

  function renderTrainingScreen() {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(G.state.selectedTrainingHorseId); });
    if (!horse) return;

    installTrainingCenterStyles();

    var hero = G.byId('trainingHero');
    var options = G.byId('trainingScreenOptions');
    var key = normalizeSelectedKey();
    var type = getTrainingType(key);
    var plan = trainingPlan(horse, type);

    if (hero) hero.innerHTML = renderHero(horse, plan);
    if (options) options.innerHTML = renderTrainingPanel(horse, plan);
  }

  function openTraining(id) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(id); });
    if (!horse) return;

    G.state.selectedTrainingHorseId = horse.id;
    normalizeSelectedKey();
    installTrainingCenterStyles();
    renderTrainingScreen();
    G.showScreen('training');
  }

  function updateTrainingForm(horse) {
    var today = todayKey();
    if (horse.lastTrainingDate === today) return false;

    horse.trainingStreakDays = Number.isFinite(horse.trainingStreakDays) ? horse.trainingStreakDays + 1 : 1;
    horse.lastTrainingDate = today;

    if (horse.trainingStreakDays >= 7) horse.form = 'excellent';
    else if (horse.trainingStreakDays >= 3) horse.form = 'normal';
    else if (!horse.form) horse.form = 'normal';

    return true;
  }

  function performTraining(key) {
    var G = game();
    var horse = G.state.horses.find(function (h) { return String(h.id) === String(G.state.selectedTrainingHorseId); });
    var type = getTrainingType(key);
    if (!horse || !type) return;

    var plan = trainingPlan(horse, type);
    if (plan.current >= 100) return G.showToast('Показатель уже на максимуме');
    if (G.state.coins < plan.cost) return G.showToast('Недостаточно монет');

    var rawGain = G.randInt(plan.gainMin, plan.gainMax);
    var gain = Math.min(rawGain, 100 - plan.current);
    horse[key] = Math.min(100, plan.current + gain);
    G.state.coins -= plan.cost;

    var countedToday = updateTrainingForm(horse);
    var resultText = gain > 0 ? ' +' + gain : ': без прироста';

    G.saveGame();
    G.showToast(horse.name + ': ' + type.label + resultText + (countedToday ? ' • серия +' : ''));
    renderTrainingScreen();
  }

  function bind() {
    var G = game();
    var options = G.byId('trainingScreenOptions');
    var hero = G.byId('trainingHero');

    installTrainingCenterStyles();

    if (hero) {
      hero.addEventListener('click', function (event) {
        var back = event.target.closest('[data-training-back]');
        var tab = event.target.closest('[data-train-tab]');
        if (back) {
          event.preventDefault();
          G.showScreen('stable');
          return;
        }
        if (tab) {
          selectedTrainingKey = tab.dataset.trainTab;
          renderTrainingScreen();
        }
      });
    }

    if (options) {
      options.addEventListener('click', function (event) {
        var button = event.target.closest('[data-train-key]');
        if (!button || button.disabled) return;
        performTraining(button.dataset.trainKey);
      });
    }

    var back = G.byId('trainingBackBtn');
    if (back) back.onclick = function () { G.showScreen('stable'); };
  }

  return {
    openTraining: openTraining,
    performTraining: performTraining,
    renderTrainingScreen: renderTrainingScreen,
    bind: bind
  };
})();
