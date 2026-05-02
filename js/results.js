// Race results and rewards.

window.SKACHKI_RESULTS = (function () {
  function game() { return window.SKACHKI_GAME; }

  function statLine(stats) {
    if (!stats) return '';
    return '<div style="font-size:12px;color:var(--muted);margin-top:4px">' +
      'Макс: ' + stats.maxSpeedKmh + ' км/ч • Средняя: ' + stats.averageSpeedKmh + ' км/ч • Выносл.: ' + stats.staminaReserve + '%' +
    '</div>';
  }

  function playerStatsBlock(playerResult) {
    var stats = playerResult && playerResult.stats;
    if (!stats) return '';

    return '<div class="result-item" style="margin-top:10px;border-color:rgba(216,169,67,.36)">' +
      '<div style="font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase;letter-spacing:.04em">Показатели вашей лошади</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">' +
        '<div style="padding:10px;border-radius:14px;background:rgba(255,255,255,.045);text-align:center"><b style="font-size:18px;color:#ffe6a2">' + stats.maxSpeedKmh + '</b><span style="display:block;font-size:10px;color:var(--muted);margin-top:3px">макс км/ч</span></div>' +
        '<div style="padding:10px;border-radius:14px;background:rgba(255,255,255,.045);text-align:center"><b style="font-size:18px;color:#ffe6a2">' + stats.averageSpeedKmh + '</b><span style="display:block;font-size:10px;color:var(--muted);margin-top:3px">средняя</span></div>' +
        '<div style="padding:10px;border-radius:14px;background:rgba(255,255,255,.045);text-align:center"><b style="font-size:18px;color:#ffe6a2">' + stats.staminaReserve + '%</b><span style="display:block;font-size:10px;color:var(--muted);margin-top:3px">остаток</span></div>' +
      '</div>' +
    '</div>';
  }

  function showResults() {
    var G = game();
    var results = G.state.raceResults;
    var resultsList = G.byId('resultsList');
    var resultsModal = G.byId('resultsModal');

    results.sort(function (a, b) { return parseFloat(a.time) - parseFloat(b.time); });

    var playerIndex = results.findIndex(function (result) {
      return result.horse && result.horse.isPlayer;
    });
    var place = playerIndex + 1;
    var reward = 0;
    var raceType = G.state.activeRaceType;

    if (raceType) {
      if (place === 1) reward = raceType.prizeMax;
      else if (place === 2) reward = Math.round((raceType.prizeMin + raceType.prizeMax) / 2);
      else if (place === 3) reward = raceType.prizeMin;
    }

    G.state.coins += reward;

    var playerResult = results[playerIndex];
    if (playerResult && playerResult.horse && playerResult.horse.playerHorseId) {
      var realHorse = G.state.horses.find(function (horse) {
        return String(horse.id) === String(playerResult.horse.playerHorseId);
      });

      if (realHorse) {
        realHorse.racesRun = (realHorse.racesRun || 0) + 1;
        if (place === 1) realHorse.wins = (realHorse.wins || 0) + 1;
        if (place > 0 && place <= 3) realHorse.podiums = (realHorse.podiums || 0) + 1;
        realHorse.earnings = (realHorse.earnings || 0) + reward;
        if (realHorse.racesRun >= realHorse.careerLimit) realHorse.status = 'retired';
      }
    }

    G.saveGame();

    if (resultsList) {
      resultsList.innerHTML =
        '<div class="results-header">' +
          '<div class="winner-banner">' +
            '<div class="winner-crown">🏁</div>' +
            '<div class="winner-main">' +
              '<div class="winner-place">Ваш результат</div>' +
              '<div class="winner-name">' + (place || '—') + ' место</div>' +
              '<div class="winner-time">Награда: +' + reward + ' 🪙</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        playerStatsBlock(playerResult) +
        results.map(function (result, index) {
          var isPlayer = result.horse && result.horse.isPlayer;
          return '<div class="result-item"><div class="result-head"><div>' +
            '<div style="font-size:16px;font-weight:900">' + (index + 1) + '. ' + result.name + (isPlayer ? ' <span class="player-badge">Вы</span>' : '') + '</div>' +
            '<div style="font-size:12px;color:var(--muted);margin-top:4px">Время: ' + result.time + ' сек</div>' +
            statLine(result.stats) +
          '</div></div></div>';
        }).join('') +
        '<button class="btn btn-gold" id="resultRaceMenuBtn" style="width:100%;margin-top:12px">Выбрать новый заезд</button>' +
        '<button class="btn btn-dark" id="resultStableBtn" style="width:100%;margin-top:10px">В Конюшню</button>';
    }

    if (resultsModal) resultsModal.classList.add('active');
    G.showToast(reward ? 'Выигрыш: 🪙 ' + reward : 'Приз не получен');
    G.state.activeRaceType = null;

    setTimeout(bindDynamicResultButtons, 0);
  }

  function closeResultsToRaceMenu() {
    var G = game();
    var modal = G.byId('resultsModal');
    if (modal) modal.classList.remove('active');
    if (G.openRaceMenu) G.openRaceMenu();
    else G.showScreen('raceMenu');
  }

  function closeResultsToStable() {
    var G = game();
    var modal = G.byId('resultsModal');
    if (modal) modal.classList.remove('active');
    G.showScreen('stable');
  }

  function bindDynamicResultButtons() {
    var G = game();
    var raceMenuButton = G.byId('resultRaceMenuBtn');
    var stableButton = G.byId('resultStableBtn');

    if (raceMenuButton) raceMenuButton.onclick = closeResultsToRaceMenu;
    if (stableButton) stableButton.onclick = closeResultsToStable;
  }

  function bind() {
    var G = game();
    var closeResults = G.byId('closeResultsBtn');
    if (closeResults) closeResults.onclick = closeResultsToRaceMenu;
  }

  return {
    showResults: showResults,
    bind: bind
  };
})();
