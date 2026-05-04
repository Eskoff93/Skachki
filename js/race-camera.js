// Race camera.
// Keeps the race readable on mobile and follows a point ahead of the player's horse without changing zoom.

window.SKACHKI_RACE_CAMERA = (function () {
  function trackApi() { return window.SKACHKI_RACE_TRACK || {}; }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pointAhead(scene, runner) {
    var track = trackApi();
    var current;
    var next;
    var dx;
    var dy;
    var len;
    var ahead = Math.min(135, Math.max(82, scene.viewportWidth * 0.26));
    var verticalBias = Math.min(34, Math.max(18, scene.viewportHeight * 0.045));

    if (!track.pointOnTrack || !runner) return null;

    current = track.pointOnTrack(scene.track, ((runner.progress % 1) + 1) % 1, runner.lane);
    next = track.pointOnTrack(scene.track, (((runner.progress + 0.012) % 1) + 1) % 1, runner.lane);
    dx = next.x - current.x;
    dy = next.y - current.y;
    len = Math.sqrt(dx * dx + dy * dy) || 1;

    return {
      x: current.x + dx / len * ahead,
      y: current.y + dy / len * ahead + verticalBias
    };
  }

  function updateTarget(scene) {
    var runner = scene.playerRunner;
    var target = scene.cameraTarget;
    var point;

    if (!runner || !target) return;

    point = pointAhead(scene, runner);
    if (!point) return;

    target.x = clamp(point.x, 0, scene.worldWidth);
    target.y = clamp(point.y, 0, scene.worldHeight);
  }

  function setup(scene) {
    var camera = scene.cameras.main;
    var startPoint;

    camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    camera.setRoundPixels(false);
    camera.setZoom(1);

    if (scene.playerRunner && scene.playerRunner.sprite) {
      startPoint = pointAhead(scene, scene.playerRunner) || { x: scene.playerRunner.sprite.x, y: scene.playerRunner.sprite.y };
      scene.cameraTarget = scene.add.rectangle(startPoint.x, startPoint.y, 1, 1, 0x000000, 0)
        .setVisible(false)
        .setDepth(-1);

      camera.startFollow(scene.cameraTarget, true, 0.075, 0.075);
      camera.setDeadzone(
        Math.round(scene.viewportWidth * 0.14),
        Math.round(scene.viewportHeight * 0.16)
      );

      scene.events.on('update', function () {
        updateTarget(scene);
      });
    }
  }

  return { setup: setup };
})();
