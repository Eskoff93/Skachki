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

  function addBurst(scene, runner) {
    if (!runner || !runner.sprite) return;

    var angle = runner.sprite.rotation - Math.PI / 2;
    var graphics = scene.add.graphics().setDepth(runner.sprite.depth + 2);
    var backX = runner.sprite.x - Math.cos(angle) * 24;
    var backY = runner.sprite.y - Math.sin(angle) * 24;

    graphics.lineStyle(3, 0x7bd8ff, 0.82);
    graphics.lineBetween(backX, backY, backX - Math.cos(angle) * 28, backY - Math.sin(angle) * 28);
    graphics.lineStyle(2, 0xffffff, 0.55);
    graphics.lineBetween(backX + 8, backY + 6, backX - Math.cos(angle) * 20 + 8, backY - Math.sin(angle) * 20 + 6);
    graphics.lineBetween(backX - 8, backY - 6, backX - Math.cos(angle) * 20 - 8, backY - Math.sin(angle) * 20 - 6);

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 420,
      onComplete: function () { graphics.destroy(); }
    });
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

  function addVisualRaceEvent(scene, runner, type) {
    if (type === 'burst') addBurst(scene, runner);
    else if (type === 'mistake') addMistake(scene, runner);
  }

  return {
    addDust: addDust,
    addVisualRaceEvent: addVisualRaceEvent
  };
})();
