// Race AI lane strategy.
// Owns tactical lane choice: blocking, overtaking, inner-line preference and lane efficiency.

window.SKACHKI_RACE_AI = (function () {
  function game() { return window.SKACHKI_GAME; }

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
    var currentIndex = runnerLaneIndex(scene, runner);
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

  function nearOrInTurn(runner) {
    var p = phase(runner);
    return (p > 0.18 && p < 0.50) || (p > 0.68 && p < 0.98);
  }

  function aggression(runner) {
    var h = runner.horse || {};
    var accel = Number(h.acceleration) || 50;
    var agility = Number(h.agility || h.hiddenQualities && h.hiddenQualities.agility) || 50;
    var temperamentBonus = h.temperament === 'Резкая' ? 0.18 : h.temperament === 'Быстрая' ? 0.12 : 0;
    return clamp((accel * 0.55 + agility * 0.45) / 100 + temperamentBonus, 0.25, 1.15);
  }

  function innerDesire(runner) {
    var h = runner.horse || {};
    var agility = Number(h.agility || h.hiddenQualities && h.hiddenQualities.agility) || 50;
    var bonus = nearOrInTurn(runner) ? 0.28 : 0.08;
    return clamp(0.35 + agility / 260 + bonus, 0.35, 0.95);
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

  function updateRunnerLane(scene, runner, time) {
    var currentIndex;
    var blocker;
    var shouldOvertake;
    var desiredIndex;

    if (!runner || runner.finished) return;
    if (runner.nextLaneThink && time < runner.nextLaneThink) return;

    currentIndex = runnerLaneIndex(scene, runner);
    blocker = findBlockingRunner(scene, runner);
    desiredIndex = currentIndex;

    if (blocker) {
      shouldOvertake = runner.pace >= blocker.pace * (0.985 - aggression(runner) * 0.035);
      if (shouldOvertake) desiredIndex = chooseOvertakeLane(scene, runner, currentIndex);
    } else if (currentIndex > 0 && Math.random() < innerDesire(runner)) {
      desiredIndex = chooseInnerLane(scene, runner, currentIndex);
    }

    runner.laneTarget = laneValue(scene, desiredIndex);
    runner.nextLaneThink = time + 340 + Math.random() * 460;
  }

  function lineEfficiency(scene, runner) {
    var idx = laneIndex(scene, runner.lane);
    var turnBonus = nearOrInTurn(runner) ? 0.006 : 0;
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
