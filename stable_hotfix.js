(function(){
  function goMenu(){ if (typeof showScreen === 'function') showScreen('menu'); }

  function ensureStableBack(){
    var screen = document.getElementById('stableScreen');
    var scroll = document.getElementById('stableScroll');
    if (!screen || !scroll) return;

    var footer = screen.querySelector('.footer-actions');
    if (footer) footer.style.display = 'none';

    var oldTopBack = document.getElementById('stableBackMenuBtn');
    if (oldTopBack) {
      oldTopBack.onclick = function(e){ e.preventDefault(); e.stopPropagation(); goMenu(); };
    }

    if (!document.getElementById('stableContentBackBtn')) {
      var btn = document.createElement('button');
      btn.id = 'stableContentBackBtn';
      btn.className = 'stable-menu-back';
      btn.type = 'button';
      btn.innerHTML = '<div class="menu-icon">←</div><div><div class="menu-title">Главное меню</div><div class="menu-desc">Вернуться к разделам игры</div></div>';
      btn.onclick = function(e){ e.preventDefault(); e.stopPropagation(); goMenu(); };
      scroll.insertBefore(btn, scroll.firstChild);
    }
  }

  document.addEventListener('DOMContentLoaded', ensureStableBack);
  setTimeout(ensureStableBack, 300);
  setTimeout(ensureStableBack, 1000);

  var oldShow = window.showScreen;
  if (typeof oldShow === 'function') {
    window.showScreen = function(name){
      oldShow(name);
      if (name === 'stable') setTimeout(ensureStableBack, 0);
    };
  }
})();
