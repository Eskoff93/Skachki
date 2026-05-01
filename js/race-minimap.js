// Race minimap HUD module.
// Draws a compact track overview with all runners, player and leader markers.

window.SKACHKI_RACE_MINIMAP = (function () {
  function sortedRunners(scene) {
    return scene.runners.slice().sort(function (a, b) { return b.progress - a.progress; });
  }

  function minimapPoint(scene, progress, lane) {
    var map = scene.minimap;
    var track = scene.track;
    var relativeLane = track.laneSpacing > 0 ? lane / Math.max(track.laneSpacing, 1) : 0;
    var laneOffset = Math.min(7, Math.max(0, relativeLane * 1.35));
    var rx = map.trackW / 2 - laneOffset;
    var ry = map.trackH / 2 - laneOffset * 0.55;
    var angle = ((progress % 1) + 1) % 1 * Math.PI * 2 - Math.PI / 2;

    return {
      x: map.cx + Math.cos(angle) * rx,
      y: map.cy + Math.sin(angle) * ry
    };
  }

  function setup(scene, width, height) {
    var panelW = 130;
    var panelH = 92;
    var x = Math.max(214, width - panelW - 12);
    var y = Math.max(154, height - panelH - 72);
    var g = scene.add.graphics().setScrollFactor(0).setDepth(325);
    var title = scene.add.text(x + 10, y + 7, 'КАРТА', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: '900',
      color: '#ffe6a2',
      resolution: 2
    }).setScrollFactor(0).setDepth(326);

    scene.minimap = {
      x: x,
      y: y,
      w: panelW,
      h: panelH,
      cx: x + panelW / 2,
      cy: y + 53,
      trackW: 96,
      trackH: 46,
      graphics: g,
      title: title,
      dots: []
    };

    drawBase(scene);

    scene.runners.forEach(function () {
      var dot = scene.add.circle(0, 0, 3.4, 0x7fb8ff, 0.95).setScrollFactor(0).setDepth(330);
      scene.minimap.dots.push(dot);
    });
  }

  function drawBase(scene) {
    var map = scene.minimap;
    var g = map.graphics;
    g.clear();
    g.fillStyle(0x071827, 0.84).fillRoundedRect(map.x, map.y, map.w, map.h, 16);
    g.lineStyle(1, 0xd8a943, 0.36).strokeRoundedRect(map.x, map.y, map.w, map.h, 16);
    g.lineStyle(4, 0x8f5734, 0.92).strokeEllipse(map.cx, map.cy, map.trackW, map.trackH);
    g.lineStyle(2, 0xf1d39a, 0.64).strokeEllipse(map.cx, map.cy, map.trackW - 12, map.trackH - 7);
    g.lineStyle(2, 0xffffff, 0.82).lineBetween(map.cx, map.cy - map.trackH / 2 - 5, map.cx, map.cy - map.trackH / 2 + 9);
  }

  function update(scene) {
    var map = scene.minimap;
    if (!map || !scene.runners || !scene.runners.length) return;

    var leader = sortedRunners(scene)[0];

    scene.runners.forEach(function (runner, index) {
      var dot = map.dots[index];
      var point;
      var color = 0x7fb8ff;
      var radius = 3.4;
      var alpha = 0.92;

      if (!dot) return;
      point = minimapPoint(scene, runner.progress, runner.lane);

      if (runner === leader) {
        color = 0xffffff;
        radius = 4.1;
        alpha = 1;
      }
      if (runner.horse && runner.horse.isPlayer) {
        color = 0xffd34d;
        radius = 5.2;
        alpha = 1;
      }
      if (runner.finished) alpha = 0.5;

      dot.setPosition(point.x, point.y);
      dot.setRadius(radius);
      dot.setFillStyle(color, alpha);
      dot.setStrokeStyle(runner.horse && runner.horse.isPlayer ? 2 : 0, 0x000000, 0.35);
    });
  }

  function destroy(scene) {
    var map = scene && scene.minimap;
    if (!map) return;
    if (map.graphics) map.graphics.destroy();
    if (map.title) map.title.destroy();
    map.dots.forEach(function (dot) { if (dot) dot.destroy(); });
    scene.minimap = null;
  }

  return {
    destroy: destroy,
    setup: setup,
    update: update
  };
})();
