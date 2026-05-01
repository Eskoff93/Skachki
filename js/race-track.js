// Race track geometry and drawing helpers.

window.SKACHKI_RACE_TRACK = (function () {
  function makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount) {
    var cx = width / 2;
    var cy = height / 2 + 12;
    var radius = trackHeight / 2 - Math.max(32, laneSpacing * horseCount * 0.58);
    var straight = Math.max(120, trackWidth - radius * 2);

    return {
      cx: cx,
      cy: cy,
      w: straight + radius * 2,
      h: radius * 2,
      r: radius,
      straight: straight,
      leftCx: cx - straight / 2,
      rightCx: cx + straight / 2,
      laneSpacing: laneSpacing,
      laneCount: horseCount,
      laneOuter: laneSpacing * Math.max(1, horseCount - 1) + 18,
      laneInner: 24
    };
  }

  function drawTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    var outer = track.laneOuter;
    var inner = track.laneInner;
    var finishX;
    var topY;
    var i;
    var s;

    g.fillStyle(0x0f4c35, 1).fillRoundedRect(0, 0, width, height, 18);

    for (s = 0; s < 18; s++) {
      g.lineStyle(1, 0xffffff, 0.025);
      g.lineBetween(0, s * 36, width, s * 36 + 18);
    }

    g.fillStyle(0x215f3d, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2 + 34) / 2,
      track.cy - (track.h + outer * 2 + 34) / 2,
      track.w + outer * 2 + 34,
      track.h + outer * 2 + 34,
      track.r + outer + 17
    );

    g.fillStyle(0x9a5a35, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2) / 2,
      track.cy - (track.h + outer * 2) / 2,
      track.w + outer * 2,
      track.h + outer * 2,
      track.r + outer
    );

    g.fillStyle(0xd28a48, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2 - 12) / 2,
      track.cy - (track.h + outer * 2 - 12) / 2,
      track.w + outer * 2 - 12,
      track.h + outer * 2 - 12,
      track.r + outer - 6
    );

    g.fillStyle(0x17623f, 1).fillRoundedRect(
      track.cx - (track.w - inner * 2) / 2,
      track.cy - (track.h - inner * 2) / 2,
      track.w - inner * 2,
      track.h - inner * 2,
      Math.max(20, track.r - inner)
    );

    g.lineStyle(2, 0xf3d8aa, 0.54);
    for (i = 0; i < track.laneCount; i++) {
      var lane = i * track.laneSpacing;
      g.strokeRoundedRect(
        track.cx - (track.w + lane * 2) / 2,
        track.cy - (track.h + lane * 2) / 2,
        track.w + lane * 2,
        track.h + lane * 2,
        track.r + lane
      );
    }

    g.lineStyle(4, 0xffffff, 0.94);
    finishX = track.rightCx;
    topY = track.cy - track.r - 4;
    g.lineBetween(finishX, topY - 18, finishX, topY + track.laneOuter + 4);
    g.lineStyle(2, 0x111111, 0.42);
    g.lineBetween(finishX + 6, topY - 18, finishX + 6, topY + track.laneOuter + 4);

    scene.add.text(finishX + 10, topY + 8, 'ФИНИШ', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: '900',
      color: '#ffffff'
    }).setShadow(0, 2, '#000', 3).setDepth(40);
  }

  function pointOnTrack(track, progress, lane) {
    var r = track.r + lane;
    var topY = track.cy - r;
    var bottomY = track.cy + r;
    var straight = track.straight;
    var arc = Math.PI * r;
    var perimeter = straight * 2 + arc * 2;
    var d = ((progress % 1) + 1) % 1 * perimeter;
    var x;
    var y;
    var angle;

    if (d < straight) {
      x = track.rightCx - d;
      y = topY;
      angle = Math.PI;
    } else if (d < straight + arc) {
      var leftArc = (d - straight) / arc;
      var a1 = -Math.PI / 2 - leftArc * Math.PI;
      x = track.leftCx + Math.cos(a1) * r;
      y = track.cy + Math.sin(a1) * r;
      angle = a1 - Math.PI / 2;
    } else if (d < straight * 2 + arc) {
      var bottomD = d - straight - arc;
      x = track.leftCx + bottomD;
      y = bottomY;
      angle = 0;
    } else {
      var rightArc = (d - straight * 2 - arc) / arc;
      var a2 = Math.PI / 2 - rightArc * Math.PI;
      x = track.rightCx + Math.cos(a2) * r;
      y = track.cy + Math.sin(a2) * r;
      angle = a2 - Math.PI / 2;
    }

    return { x: x, y: y, angle: angle };
  }

  return {
    drawTrack: drawTrack,
    makeTrackGeometry: makeTrackGeometry,
    pointOnTrack: pointOnTrack
  };
})();
