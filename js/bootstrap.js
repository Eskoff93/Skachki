// Application bootstrap.

window.addEventListener('error', function (event) {
  var fatal = document.getElementById('fatal');
  if (!fatal) return;
  fatal.style.display = 'block';
  fatal.innerHTML = '<h2>Ошибка</h2><pre>' + String(event.message) + '\n' + String(event.filename || '') + ':' + String(event.lineno || '') + '</pre>';
});

(function initTelegram() {
  try {
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      Telegram.WebApp.disableVerticalSwipes && Telegram.WebApp.disableVerticalSwipes();
      Telegram.WebApp.setHeaderColor && Telegram.WebApp.setHeaderColor('#10263d');
      Telegram.WebApp.setBackgroundColor && Telegram.WebApp.setBackgroundColor('#081423');

      var topInset = 0;
      if (Telegram.WebApp.contentSafeAreaInset && Telegram.WebApp.contentSafeAreaInset.top) {
        topInset = Telegram.WebApp.contentSafeAreaInset.top;
      } else if (Telegram.WebApp.safeAreaInset && Telegram.WebApp.safeAreaInset.top) {
        topInset = Telegram.WebApp.safeAreaInset.top;
      }

      if (topInset) {
        document.documentElement.style.setProperty('--tg-top-offset', Math.max(20, topInset) + 'px');
      }
    }
  } catch (error) {}
})();

(function bootstrap() {
  if (!window.Phaser) {
    var fatal = document.getElementById('fatal');
    if (fatal) {
      fatal.style.display = 'block';
      fatal.innerHTML = '<h2>Phaser не загрузился</h2><p>Проверь файл <b>phaser.min.js</b> рядом с index.html</p>';
    }
    throw new Error('Phaser not loaded');
  }

  if (!window.SKACHKI_GAME) {
    throw new Error('SKACHKI_GAME module not loaded');
  }

  window.SKACHKI_GAME.init();
})();
