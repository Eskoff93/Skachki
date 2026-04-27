(function(){
  var timer = null;
  var oldCreate = null;
  var oldDestroy = null;

  function byId(id){ return document.getElementById(id); }

  function removeTopOverlay(){
    var old = byId('raceDomBoard');
    if (old) old.remove();
  }

  function ensureBelowBoard(){
    var box = byId('phaserBox');
    if (!box) return null;
    removeTopOverlay();

    var board = byId('raceBelowBoard');
    if (!board) {
      board = document.createElement('div');
      board.id = 'raceBelowBoard';
      board.className = 'race-below-board';
      board.innerHTML = '<div class="race-below-title"><span>Позиции</span><span id="raceBelowPlayer">ВЫ</span></div><div class="race-below-list" id="raceBelowList"></div>';
      box.insertAdjacentElement('afterend', board);
    }
    return board;
  }

  function hidePhaserBoard(scene){
    if (!scene || !scene.boardHiddenPatched) return;
  }

  function patchScene(scene){
    if (!scene || scene.raceScreenFixed) return;
    scene.raceScreenFixed = true;

    var originalUpdateLeaderboard = scene.updateLeaderboard;
    if (typeof originalUpdateLeaderboard === 'function') {
      scene.updateLeaderboard = function(){
        if (this.boardBox) this.boardBox.setVisible(false);
        if (this.boardLines) this.boardLines.forEach(function(line){ if (line) line.setVisible(false); });
      };
    }

    if (scene.boardBox) scene.boardBox.setVisible(false);
    if (scene.boardLines) scene.boardLines.forEach(function(line){ if (line) line.setVisible(false); });
  }

  function updateBelowBoard(){
    removeTopOverlay();
    var board = ensureBelowBoard();
    var list = byId('raceBelowList');
    var player = byId('raceBelowPlayer');
    var scene = window.raceGame && window.raceGame.scene && window.raceGame.scene.scenes && window.raceGame.scene.scenes[0];
    if (!scene || !scene.runners || !list) return;

    patchScene(scene);

    var sorted = scene.runners.slice().sort(function(a,b){ return b.progress - a.progress; });
    var total = scene.totalLaps || 1;
    var playerRunner = sorted.find(function(r){ return r.horse && r.horse.isPlayer; });
    if (player && playerRunner) {
      var pPlace = sorted.indexOf(playerRunner) + 1;
      var pPc = Math.min(100, Math.round((playerRunner.progress / total) * 100));
      player.textContent = pPlace + ' место • ' + pPc + '%';
    }

    list.innerHTML = sorted.slice(0, 5).map(function(r, i){
      var isYou = r.horse && r.horse.isPlayer;
      var name = String((r.horse && r.horse.name) || 'Лошадь').replace('Вы: ', '');
      var pc = Math.min(100, Math.round((r.progress / total) * 100));
      return '<div class="race-row ' + (isYou ? 'you' : '') + '"><span>' + (i + 1) + '. ' + (isYou ? 'ВЫ: ' : '') + name + '</span><span>' + pc + '%</span></div>';
    }).join('');
  }

  function startBoard(){
    stopBoard();
    ensureBelowBoard();
    timer = setInterval(updateBelowBoard, 250);
    setTimeout(updateBelowBoard, 100);
    setTimeout(updateBelowBoard, 500);
  }

  function stopBoard(){
    if (timer) clearInterval(timer);
    timer = null;
    removeTopOverlay();
  }

  function install(){
    if (typeof window.createRaceGame === 'function' && window.createRaceGame !== oldCreate) {
      oldCreate = window.createRaceGame;
      window.createRaceGame = function(){
        oldCreate.apply(this, arguments);
        setTimeout(startBoard, 120);
      };
    }

    if (typeof window.destroyRaceGame === 'function' && window.destroyRaceGame !== oldDestroy) {
      oldDestroy = window.destroyRaceGame;
      window.destroyRaceGame = function(){
        stopBoard();
        var b = byId('raceBelowBoard');
        if (b) b.remove();
        oldDestroy.apply(this, arguments);
      };
    }
  }

  document.addEventListener('DOMContentLoaded', install);
  setTimeout(install, 300);
  setTimeout(install, 1000);
})();
