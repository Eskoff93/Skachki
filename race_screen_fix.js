(function(){
  if (window.__raceScreenSideLeadersOnly) return;
  window.__raceScreenSideLeadersOnly = true;

  var timer = null;
  var originalCreateRaceGame = null;
  var originalDestroyRaceGame = null;

  function byId(id){ return document.getElementById(id); }

  function removeTopOverlay(){
    var top = byId('raceDomBoard');
    if (top) top.remove();

    var bottom = byId('raceBelowBoard');
    if (bottom) bottom.remove();
  }

  function restorePhaserBoard(){
    var scene = window.raceGame && window.raceGame.scene && window.raceGame.scene.scenes && window.raceGame.scene.scenes[0];
    if (!scene) return;

    if (scene.boardBox) scene.boardBox.setVisible(true);
    if (scene.boardLines) {
      scene.boardLines.forEach(function(line){
        if (line) line.setVisible(true);
      });
    }
  }

  function startCleaner(){
    stopCleaner();
    timer = setInterval(function(){
      removeTopOverlay();
      restorePhaserBoard();
    }, 250);
    setTimeout(function(){ removeTopOverlay(); restorePhaserBoard(); }, 100);
    setTimeout(function(){ removeTopOverlay(); restorePhaserBoard(); }, 500);
  }

  function stopCleaner(){
    if (timer) clearInterval(timer);
    timer = null;
    removeTopOverlay();
  }

  function install(){
    if (typeof window.createRaceGame === 'function' && !window.createRaceGame.__sideLeadersOnlyWrapped) {
      originalCreateRaceGame = window.createRaceGame;
      var wrappedCreate = function(){
        originalCreateRaceGame.apply(this, arguments);
        setTimeout(startCleaner, 120);
      };
      wrappedCreate.__sideLeadersOnlyWrapped = true;
      window.createRaceGame = wrappedCreate;
    }

    if (typeof window.destroyRaceGame === 'function' && !window.destroyRaceGame.__sideLeadersOnlyWrapped) {
      originalDestroyRaceGame = window.destroyRaceGame;
      var wrappedDestroy = function(){
        stopCleaner();
        originalDestroyRaceGame.apply(this, arguments);
      };
      wrappedDestroy.__sideLeadersOnlyWrapped = true;
      window.destroyRaceGame = wrappedDestroy;
    }
  }

  document.addEventListener('DOMContentLoaded', install);
  setTimeout(install, 300);
  setTimeout(install, 1000);
})();
