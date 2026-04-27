(function(){
  if (window.__raceScreenFixLoadedV2) return;
  window.__raceScreenFixLoadedV2 = true;

  var timer = null;
  var originalCreateRaceGame = null;
  var originalDestroyRaceGame = null;

  function byId(id){ return document.getElementById(id); }

  function removeTopOverlay(){
    var old = byId('raceDomBoard');
    if (old) old.remove();
  }

  function ensureBelowBoard(){
    var viewport = document.querySelector('#raceScreen .race-viewport');
    var panel = document.querySelector('#raceScreen .race-panel');
    if (!viewport) return null;

    removeTopOverlay();

    var board = byId('raceBelowBoard');
    if (!board) {
      board = document.createElement('div');
      board.id = 'raceBelowBoard';
      board.className = 'race-below-board';
      board.innerHTML = '<div class="race-below-title"><span>Позиции</span><span id="raceBelowPlayer">ВЫ</span></div><div class="race-below-list" id="raceBelowList"></div>';
      if (panel) panel.parentNode.insertBefore(board, panel);
      else viewport.insertAdjacentElement('afterend', board);
    }
    return board;
  }

  function restorePhaserBoard(scene){
    if (!scene) return;
    if (scene.boardBox) scene.boardBox.setVisible(true);
    if (scene.boardLines) scene.boardLines.forEach(function(line){ if (line) line.setVisible(true); });
  }

  function updateBelowBoard(){
    removeTopOverlay();
    ensureBelowBoard();

    var list = byId('raceBelowList');
    var player = byId('raceBelowPlayer');
    var scene = window.raceGame && window.raceGame.scene && window.raceGame.scene.scenes && window.raceGame.scene.scenes[0];
    if (!scene || !scene.runners || !list) return;

    restorePhaserBoard(scene);

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
    stopBoard(false);
    ensureBelowBoard();
    timer = setInterval(updateBelowBoard, 250);
    setTimeout(updateBelowBoard, 100);
    setTimeout(updateBelowBoard, 500);
  }

  function stopBoard(removeBoard){
    if (timer) clearInterval(timer);
    timer = null;
    removeTopOverlay();
    if (removeBoard) {
      var b = byId('raceBelowBoard');
      if (b) b.remove();
    }
  }

  function install(){
    if (typeof window.createRaceGame === 'function' && !window.createRaceGame.__raceFixWrappedV2) {
      originalCreateRaceGame = window.createRaceGame;
      var wrappedCreate = function(){
        originalCreateRaceGame.apply(this, arguments);
        setTimeout(startBoard, 120);
      };
      wrappedCreate.__raceFixWrappedV2 = true;
      window.createRaceGame = wrappedCreate;
    }

    if (typeof window.destroyRaceGame === 'function' && !window.destroyRaceGame.__raceFixWrappedV2) {
      originalDestroyRaceGame = window.destroyRaceGame;
      var wrappedDestroy = function(){
        stopBoard(true);
        originalDestroyRaceGame.apply(this, arguments);
      };
      wrappedDestroy.__raceFixWrappedV2 = true;
      window.destroyRaceGame = wrappedDestroy;
    }
  }

  document.addEventListener('DOMContentLoaded', install);
  setTimeout(install, 300);
  setTimeout(install, 1000);
})();
