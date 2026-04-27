(function(){
  var HELP = {
    'Скорость':'Максимальный темп лошади на дистанции. Чем выше скорость, тем быстрее лошадь идёт на прямых участках.',
    'Выносливость':'Помогает не проседать ближе к финишу. Особенно важна на длинных заездах.',
    'Ускорение':'Влияет на старт и короткие рывки во время гонки.',
    'Манёвренность':'Помогает менять дорожку, обходить соперников и терять меньше скорости при перестроении.',
    'Сила':'Запас мощности. Помогает держать темп и стабильнее проходить плотную борьбу.',
    'Интеллект':'Влияет на выбор траектории и шанс избежать ошибки или сбоя.',
    'Потенциал':'Запас развития. Чем выше потенциал, тем перспективнее тренировки.',
    'Энергия':'Текущее состояние лошади. Низкая энергия ухудшает результат в гонке.',
    'Характер':'Особый стиль поведения в гонке: рывки, риск, стабильность или частая смена дорожек.',
    'Класс':'Средняя сила лошади по всем основным параметрам.'
  };

  function goMenu(){ if (typeof showScreen === 'function') showScreen('menu'); }

  function injectStyle(){
    if (document.getElementById('stableDetailHelpStyle')) return;
    var style = document.createElement('style');
    style.id = 'stableDetailHelpStyle';
    style.textContent = '#horseModal .helpable:after{display:inline-flex!important}.inline-param-help{grid-column:1/-1;margin-top:8px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#d7e4ef;font-size:13px;line-height:1.35;text-align:left}.inline-param-help b{display:block;color:#fff;margin-bottom:4px}body:not(.details-help-ready) .help-pop{display:none!important}';
    document.head.appendChild(style);
  }

  function ensureStableNavigation(){
    var screen = document.getElementById('stableScreen');
    if (!screen) return;

    var footer = screen.querySelector('.footer-actions');
    if (footer) footer.style.display = 'none';

    var bigBtn = document.getElementById('stableContentBackBtn');
    if (bigBtn) bigBtn.remove();

    var topBack = document.getElementById('stableBackMenuBtn') || document.getElementById('resetBtn');
    if (topBack) {
      topBack.id = 'stableBackMenuBtn';
      topBack.textContent = '←';
      topBack.title = 'В главное меню';
      topBack.onclick = function(e){ e.preventDefault(); e.stopPropagation(); goMenu(); };
    }
  }

  function removeHelpOutsideDetails(){
    document.body.classList.remove('details-help-ready');
    Array.prototype.forEach.call(document.querySelectorAll('.helpable'), function(el){
      if (!el.closest('#horseModal')) {
        el.classList.remove('helpable');
        el.removeAttribute('data-help');
      }
    });
    var bottomPop = document.getElementById('helpPop');
    if (bottomPop) bottomPop.classList.remove('active');
  }

  function enhanceDetailsModal(){
    var modal = document.getElementById('horseModal');
    if (!modal || !modal.classList.contains('active')) return;
    document.body.classList.add('details-help-ready');

    Array.prototype.forEach.call(modal.querySelectorAll('.detail-box .label'), function(label){
      var key = (label.textContent || '').trim();
      if (HELP[key]) {
        label.classList.add('helpable');
        label.setAttribute('data-help', key);
      }
    });
  }

  function showInlineHelp(target){
    var key = target.getAttribute('data-help') || (target.textContent || '').trim();
    if (!HELP[key]) return;

    var bottomPop = document.getElementById('helpPop');
    if (bottomPop) bottomPop.classList.remove('active');

    var box = target.closest('.detail-box') || target.parentElement;
    if (!box) return;

    var old = box.querySelector('.inline-param-help');
    if (old) {
      old.remove();
      return;
    }

    Array.prototype.forEach.call(document.querySelectorAll('#horseModal .inline-param-help'), function(el){ el.remove(); });

    var note = document.createElement('div');
    note.className = 'inline-param-help';
    note.innerHTML = '<b>' + key + '</b>' + HELP[key];
    box.appendChild(note);
  }

  document.addEventListener('click', function(e){
    var target = e.target.closest('#horseModal .helpable');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    setTimeout(function(){ showInlineHelp(target); }, 0);
  }, true);

  document.addEventListener('click', function(e){
    if (e.target.closest('[data-action="details"]')) {
      setTimeout(function(){ removeHelpOutsideDetails(); enhanceDetailsModal(); }, 30);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    injectStyle();
    ensureStableNavigation();
    removeHelpOutsideDetails();
  });

  setTimeout(function(){ injectStyle(); ensureStableNavigation(); removeHelpOutsideDetails(); }, 250);
  setTimeout(function(){ ensureStableNavigation(); removeHelpOutsideDetails(); enhanceDetailsModal(); }, 900);

  var oldShow = window.showScreen;
  if (typeof oldShow === 'function') {
    window.showScreen = function(name){
      oldShow(name);
      setTimeout(function(){
        ensureStableNavigation();
        if (name !== 'stable') removeHelpOutsideDetails();
      }, 0);
    };
  }
})();
