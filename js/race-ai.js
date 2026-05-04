// Race AI lane strategy.
// Owns tactical lane choice: blocking, overtaking, inner-line preference and lane efficiency.

window.SKACHKI_RACE_AI = (function () {
  var LANE_SETTLE_THRESHOLD = 0.1;
  var MIN_LANE_CHANGE_COOLDOWN = 1600;
  var MAX_LANE_CHANGE_COOLDOWN = 2400;
  var MIN_THINK_DELAY = 820;
  var MAX_THINK_DELAY = 1300;

  function game() { return window.SKACHKI_GAME; }
  function trackApi() { return window.SKACHKI_RACE_TRACK || {}; }

  function clamp(value, min, max) {
    var G = game();
    if (G && G.clamp) return G.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function laneIndex(scene, lane) {
    return clamp(Math.round(lane / scene.track.laneSpacing), 0, scene.track.laneCount - 1);
  }

  function laneValue(scene, index) {
    return clamp(index, 0, scene.track.laneCount - 1) * scene.track.laneSpacing;
  }

  function runnerLaneIndex(scene, runner) {
    return laneIndex(scene, runner.laneTarget);
  }

  function currentRunnerLaneIndex(scene, runner) {
    return laneIndex(scene, runner.lane);
  }

  function laneIsSettled(scene, runner) {
    return Math.abs((Number(runner.laneTarget) || 0) - (Number(runner.lane) || 0)) <= scene.track.laneSpacing * LANE_SETTLE_THRESHOLD;
  }

  function progressGap(fromRunner, toRunner) {
    return toRunner.progress - fromRunner.progress;
  }

  function sameLane(scene, a, b, targetIndex) {
    var bIndex = laneIndex(scene, b.laneTarget);
    var aIndex = typeof targetIndex === 'number' ? targetIndex : runnerLaneIndex(scene, a);
    return Math.abs(aIndex - bIndex) <= 0;
  }

  function nearbyInLane(scene, runner, targetIndex, minGap, maxGap) {
    return scene.runners.some(function (other) {
      var gap;
      if (other === runner || other.finished) return false;
      if (!sameLane(scene, runner, other, targetIndex)) return false;
      gap = progressGap(runner, other);
      return gap > minGap && gap < maxGap;
    });
  }

  function findBlockingRunner(scene, runner) {
    var currentIndex = currentRunnerLaneIndex(scene, runner);
    var best = null;
    var bestGap = Infinity;

    scene.runners.forEach(function (other) {
      var gap;
      if (other === runner || other.finished) return;
      if (!sameLane(scene, runner, other, currentIndex)) return;
      gap = progressGap(runner, other);
      if (gap > 0.006 && gap < 0.045 && gap < bestGap) {
        best = other;
        bestGap = gap;
      }
    });

    return best;
  }

  function laneIsFree(scene, runner, targetIndex) {
    if (targetIndex < 0 || targetIndex >= scene.track.laneCount) return false;
    if (nearbyInLane(scene, runner, targetIndex, -0.016, 0.036)) return false;
    return true;
  }

  function phase(runner) {
    return ((runner.progress % 1) + 1) % 1;
  }

  function fallbackSegmentType(runner) {
    var p = phase(runner);
    return (p > 0.18 && p < 0.50) || (p > 0.68 && p < 0.98) ? 'turn' : 'straight';
  }

  function segmentType(scene, runner) {
    var api = trackApi();
    var info;
    if (api.segmentAt && scene && scene.track && runner) {
      info = api.segmentAt(scene.track, runner.progress, runner.lane);
      if (info && info.type) return info.type;
    }
    return fallbackSegmentType(runner);
  }

  function nearOrInTurn(scene, runner) {
    return segmentType(scene, runner) === 'turn';
  }

  function aggression(runner) {
    var h = runner.horse || {};
    var accel = Number(h.acceleration) || 50;
    var agility = Number(h.agility || h.hiddenQualities && h.hiddenQualities.agility) || 50;
    var temperamentBonus = h.temperament === 'Резкая' ? 0.1 : h.temperament === 'Быстрая' ? 0.07 : 0;
    return clamp((accel * 0.55 + agility * 0.45) / 100 + temperamentBonus, 0.2, 0.95);
  }

  function innerDesire(scene, runner) {
    var h = runner.horse || {};
    var agility = Number(h.agility || h.hiddenQualities && h.hiddenQualities.agility) || 50;
    var bonus = nearOrInTurn(scene, runner) ? 0.06 : 0.01;
    return clamp(0.1 + agility / 520 + bonus, 0.1, 0.34);
  }

  function chooseOvertakeLane(scene, runner, currentIndex) {
    var outer = currentIndex + 1;
    var inner = currentIndex - 1;

    if (laneIsFree(scene, runner, outer)) return outer;
    if (laneIsFree(scene, runner, inner)) return inner;
    return currentIndex;
  }

  function chooseInnerLane(scene, runner, currentIndex) {
    var inner = currentIndex - 1;
    if (inner >= 0 && laneIsFree(scene, runner, inner)) return inner;
    return currentIndex;
  }

  function setNextThink(runner, time, changedLane) {
    var minDelay = changedLane ? MIN_LANE_CHANGE_COOLDOWN : MIN_THINK_DELAY;
    var maxDelay = changedLane ? MAX_LANE_CHANGE_COOLDOWN : MAX_THINK_DELAY;
    runner.nextLaneThink = time + minDelay + Math.random() * (maxDelay - minDelay);
    if (changedLane) runner.laneChangeLockedUntil = runner.nextLaneThink;
  }

  function updateRunnerLane(scene, runner, time) {
    var currentIndex;
    var blocker;
    var shouldOvertake;
    var desiredIndex;
    var changedLane;

    if (!runner || runner.finished) return;
    if (runner.nextLaneThink && time < runner.nextLaneThink) return;
    if (runner.laneChangeLockedUntil && time < runner.laneChangeLockedUntil) return;
    if (!laneIsSettled(scene, runner)) return;

    currentIndex = currentRunnerLaneIndex(scene, runner);
    blocker = findBlockingRunner(scene, runner);
    desiredIndex = currentIndex;

    if (blocker) {
      shouldOvertake = runner.pace >= blocker.pace * (1 - aggression(runner) * 0.018);
      if (shouldOvertake) desiredIndex = chooseOvertakeLane(scene, runner, currentIndex);
    } else if (currentIndex > 0 && Math.random() < innerDesire(scene, runner)) {
      desiredIndex = chooseInnerLane(scene, runner, currentIndex);
    }

    desiredIndex = clamp(desiredIndex, currentIndex - 1, currentIndex + 1);
    changedLane = desiredIndex !== currentIndex;
    runner.laneTarget = laneValue(scene, desiredIndex);
    setNextThink(runner, time, changedLane);
  }

  function lineEfficiency(scene, runner) {
    var idx = laneIndex(scene, runner.lane);
    var turnBonus = nearOrInTurn(scene, runner) ? 0.006 : 0;
    var blocker = findBlockingRunner(scene, runner);
    var blockedPenalty = blocker ? 0.045 : 0;

    return clamp(1 + (idx === 0 ? turnBonus : 0) - blockedPenalty, 0.88, 1.025);
  }

  function update(scene, runner, time) {
    updateRunnerLane(scene, runner, time);
    return lineEfficiency(scene, runner);
  }

  return {
    findBlockingRunner: findBlockingRunner,
    laneIndex: laneIndex,
    laneIsFree: laneIsFree,
    lineEfficiency: lineEfficiency,
    update: update
  };
})();
