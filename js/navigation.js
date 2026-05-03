// Screen navigation and bottom menu.

window.SKACHKI_NAVIGATION = (function () {
  function game() { return window.SKACHKI_GAME; }

  function byId(id) {
    var G = game();
    return G && G.byId ? G.byId(id) : document.getElementById(id);
  }

  function bottomNav(active) {
    return '<div class="bottom-nav">' +
      '<button class="bottom-nav-btn ' + (active === 'stable' ? 'active' : '') + '" data-menu="stable"><span>🐴</span><b>Конюшня</b></button>' +
      '<button class="bottom-nav-btn ' + (active === 'races' ? 'active' : '') + '" data-menu="races"><span>🏁</span><b>Скачки</b></button>' +
      '<button class="bottom-nav-btn ' + (active === 'breed' ? 'active' : '') + '" data-menu="breed"><span>🧬</span><b>Разведение</b></button>' +
      '<button class="bottom-nav-btn ' + (active === 'rating' ? 'active' : '') + '" data-menu="rating"><span>🏆</span><b>Рейтинг</b></button>' +
    '</div>';
  }

  function musicSettingsCard() {
    return '<section class="summary-card rating-music-card">' +
      '<div class="summary-title">Музыка</div>' +
      '<div class="summary-desc">Фоновая музыка играет во всей игре после первого действия игрока.</div>' +
      '<div class="music-control-row">' +
        '<div><b>Состояние</b><span id="musicStatusText">Готова к запуску</span></div>' +
        '<button class="btn btn-dark" id="musicToggleBtn" type="button">Выключить музыку</button>' +
      '</div>' +
      '<label class="music-volume-label" for="musicVolumeInput">Громкость <b id="musicVolumeValue">35%</b></label>' +
      '<input class="music-volume-slider" id="musicVolumeInput" type="range" min="0" max="100" step="1" value="35" />' +
      '<div class="music-file-note">Файл: <code>assets/audio/background-music.mp3</code></div>' +
    '</section>';
  }

  function addScreens() {
    if (!byId('raceMenuScreen')) {
      var raceMenu = document.createElement('div');
      raceMenu.id = 'raceMenuScreen';
      raceMenu.className = 'screen';
      raceMenu.innerHTML = '<div class="topbar"><div class="topbar-row"><button class="icon-btn" id="raceMenuBackBtn">←</button><div class="topbar-title"><h1>СКАЧКИ</h1><p>Выберите заезд и свою лошадь</p></div><div style="width:38px;flex:0 0 auto"></div></div></div><div class="content-scroll" id="raceMenuScroll"></div><div class="race-start-panel"><button class="btn btn-gold" id="raceMenuStartBtn" style="width:100%">Выберите заезд</button>' + bottomNav('races') + '</div>';
      document.body.insertBefore(raceMenu, document.body.firstChild);
    }

    if (!byId('ratingScreen')) {
      var rating = document.createElement('div');
      rating.id = 'ratingScreen';
      rating.className = 'screen';
      rating.innerHTML = '<div class="topbar"><div class="topbar-row"><button class="icon-btn" id="ratingBackBtn">←</button><div class="topbar-title"><h1>РЕЙТИНГ</h1><p>Лидеры сезона</p></div><div style="width:38px;flex:0 0 auto"></div></div></div><div class="content-scroll"><section class="summary-card"><div class="summary-title">Рейтинг</div><div class="summary-desc">Скоро здесь появятся лидеры сезона, друзья и награды.</div></section>' + musicSettingsCard() + '<section class="summary-card rating-settings-card"><div class="summary-title">Настройки</div><div class="summary-desc">Сброс нужен для тестов и начала новой игры.</div><button class="btn reset-progress-btn" id="resetProgressBtn" type="button">Сбросить прогресс</button></section></div><div class="footer-actions">' + bottomNav('rating') + '</div>';
      document.body.insertBefore(rating, document.body.firstChild);
    }
  }

  function openRaceMenu() {
    if (window.SKACHKI_RACE_MENU && window.SKACHKI_RACE_MENU.openRaceMenu) {
      window.SKACHKI_RACE_MENU.openRaceMenu();
      return;
    }
    showScreen('raceMenu');
  }

  function setActiveBottomNav(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.bottom-nav-btn'), function (btn) {
      btn.classList.toggle('active', btn.dataset.menu === name || (name === 'raceMenu' && btn.dataset.menu === 'races'));
    });
  }

  function showScreen(name) {
    var G = game();
    var UI = window.SKACHKI_UI || {};

    if (window.SKACHKI_RACE_ENGINE && name !== 'race') {
      window.SKACHKI_RACE_ENGINE.destroyRaceGame();
    }

    var safeName = name === 'menu' ? 'stable' : name;
    var map = {
      stable: 'stableScreen',
      training: 'trainingScreen',
      breed: 'breedScreen',
      race: 'raceScreen',
      raceMenu: 'raceMenuScreen',
      rating: 'ratingScreen'
    };

    if (UI.showScreenById) UI.showScreenById(map[safeName] || 'stableScreen');
    else {
      Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (screen) {
        screen.classList.remove('active');
      });
      var target = byId(map[safeName] || 'stableScreen');
      if (target) target.classList.add('active');
    }

    setActiveBottomNav(safeName);

    if (G && safeName === 'stable' && window.SKACHKI_STABLE) window.SKACHKI_STABLE.renderStable();
    if (G && safeName === 'raceMenu' && window.SKACHKI_RACE_MENU) window.SKACHKI_RACE_MENU.renderRaceMenu();
    if (safeName === 'rating' && window.SKACHKI_MUSIC) window.SKACHKI_MUSIC.updateControls();
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var tile = event.target.closest('[data-menu]');
      var G = game();
      if (!tile || !G) return;

      var action = tile.getAttribute('data-menu');
      if (action === 'stable') showScreen('stable');
      else if (action === 'races') openRaceMenu();
      else if (action === 'breed' && window.SKACHKI_BREEDING) window.SKACHKI_BREEDING.openBreedScreen();
      else if (action === 'rating') showScreen('rating');
      else if (G.showToast) G.showToast('Скоро');
    });

    document.addEventListener('click', function (event) {
      if (event.target && (event.target.id === 'stableBackMenuBtn' || event.target.id === 'ratingBackBtn')) {
        event.preventDefault();
        showScreen('stable');
      }
    });
  }

  return {
    addScreens: addScreens,
    bind: bind,
    bottomNav: bottomNav,
    openRaceMenu: openRaceMenu,
    setActiveBottomNav: setActiveBottomNav,
    showScreen: showScreen
  };
})();
