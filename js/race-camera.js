// Race camera.
// Keeps the race readable on mobile and follows the player's horse without scaling the HUD.

window.SKACHKI_RACE_CAMERA = (function () {
  function setup(scene) {
    var camera = scene.cameras.main;

    camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    camera.setRoundPixels(false);
    camera.setZoom(1);

    if (scene.playerRunner && scene.playerRunner.sprite) {
      camera.startFollow(scene.playerRunner.sprite, true, 0.1, 0.1);
      camera.setDeadzone(
        Math.round(scene.viewportWidth * 0.08),
        Math.round(scene.viewportHeight * 0.1)
      );
    }
  }

  return { setup: setup };
})();
