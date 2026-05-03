// Race effects.
// Visual-only race feedback without text event popups.

window.SKACHKI_RACE_EFFECTS = (function () {
  function addDust(scene, runner, isBursting) {
    if (!runner || !runner.sprite || runner.finished) return;

    var angle = runner.sprite.rotation - Math.PI / 2;
    var backX = runner.sprite.x - Math.cos(angle) * 30;
    var backY = runner.sprite.y - Math.sin(angle) * 30;
    var dust = scene.add.circle(backX, backY, isBursting ? 5 : 3, 0xd9a15c, isBursting ? 0.28 : 0.14)
      .setDepth(Math.max(1, runner.sprite.depth - 4));

    scene.tweens.add({
      targets: dust,
      alpha: 0,
      scale: isBursting ? 2.2 : 1.6,
      duration: isBursting ? 620 : 480,
      onComplete: function () { dust.destroy(); }
    });
  }

  function addTrail(scene, runner, color, alpha, length, width, duration) {
    var angle;
    var graphics;
    var backX;
    var backY;

    if (!runner || !runner.sprite) return;

    angle = runner.sprite.rotation - Math.PI / 2;
    graphics = scene.add.graphics().setDepth(runner.sprite.depth + 2);
    backX = runner.sprite.x - Math.cos(angle) * 24;
    backY = runner.sprite.y - Math.sin(angle) * 24;

    graphics.lineStyle(width, color, alpha);
    graphics.lineBetween(backX, backY, backX - Math.cos(angle) * length, backY - Math.sin(angle) * length);
    graphics.lineStyle(Math.max(1, width - 1), 0xffffff, alpha * 0.42);
    graphics.lineBetween(backX + 7, backY + 5, backX - Math.cos(angle) * length * 0.75 + 7, backY - Math.sin(angle) * length * 0.75 + 5);
    graphics.lineBetween(backX - 7, backY - 5, backX - Math.cos(angle) * length * 0.75 - 7, backY - Math.sin(angle) * length * 0.75 - 5);

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: duration,
      onComplete: function () { graphics.destroy(); }
    });
  }

  function addBurst(scene, runner) {
    addTrail(scene, runner, 0x7bd8ff, 0.82, 28, 3, 420);
  }

  function addStrongFinish(scene, runner) {
    addTrail(scene, runner, 0xffd34d, 0.92, 38, 4, 520);
  }

  function addMistake(scene, runner) {
    if (!runner || !runner.sprite) return;

    runner.sprite.setTint(0xff7979);
    scene.tweens.add({
      targets: runner.sprite,
      x: runner.sprite.x + 5,
      yoyo: true,
      repeat: 3,
      duration: 55,
      onComplete: function () { runner.sprite.clearTint(); }
    });
  }

  function addFatigue(scene, runner) {
    var angle;
    var backX;
    var backY;
    var cloud;

    if (!runner || !runner.sprite) return;

    angle = runner.sprite.rotation - Math.PI / 2;
    backX = runner.sprite.x - Math.cos(angle) * 24;
    backY = runner.sprite.y - Math.sin(angle) * 24;
    cloud = scene.add.circle(backX, backY, 8, 0x5a4a3b, 0.22)
      .setDepth(Math.max(1, runner.sprite.depth - 3));

    runner.sprite.setTint(0xd7c0a8);
    scene.tweens.add({
      targets: cloud,
      alpha: 0,
      scale: 2.1,
      duration: 640,
      onComplete: function () { cloud.destroy(); }
    });
    scene.tweens.add({
      targets: runner.sprite,
      alpha: 0.78,
      yoyo: true,
      repeat: 1,
      duration: 140,
      onComplete: function () {
        runner.sprite.alpha = 1;
        runner.sprite.clearTint();
      }
    });
  }

  function addVisualRaceEvent(scene, runner, type) {
    if (type === 'burst') addBurst(scene, runner);
    else if (type === 'strong_finish') addStrongFinish(scene, runner);
    else if (type === 'mistake') addMistake(scene, runner);
    else if (type === 'fatigue') addFatigue(scene, runner);
  }

  return {
    addDust: addDust,
    addVisualRaceEvent: addVisualRaceEvent
  };
})();
