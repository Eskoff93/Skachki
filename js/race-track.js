// Race track geometry and drawing helpers.

window.SKACHKI_RACE_TRACK = (function () {
  var START_FINISH_STRAIGHT_RATIO = 0.5;

  function makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount) {
    var cx = width / 2;
    var cy = height / 2 + 12;
    var radius = trackHeight / 2 - Math.max(32, laneSpacing * horseCount * 0.58);
    var straight = Math.max(120, trackWidth - radius * 2);

    return {
      type: 'oval',
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

  function trackPerimeter(track) {
    return track.straight * 2 + Math.PI * track.r * 2;
  }

  function laneDistanceFactor(track, lane) {
    var laneOffset = Number(lane) || 0;
    var lanePerimeter = track.straight * 2 + Math.PI * Math.max(1, track.r + laneOffset) * 2;
    return Math.max(1, lanePerimeter / trackPerimeter(track));
  }

  function startFinishX(track) {
    return track.leftCx + track.straight * START_FINISH_STRAIGHT_RATIO;
  }

  function startProgress(track) {
    return (track.straight * START_FINISH_STRAIGHT_RATIO) / trackPerimeter(track);
  }

  function drawTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    var outer = track.laneOuter;
    var inner = track.laneInner;
    var outerX = track.cx - (track.w + outer * 2) / 2;
    var outerY = track.cy - (track.h + outer * 2) / 2;
    var outerW = track.w + outer * 2;
    var outerH = track.h + outer * 2;
    var outerR = track.r + outer;
    var infieldX = track.cx - (track.w - inner * 2) / 2;
    var infieldY = track.cy - (track.h - inner * 2) / 2;
    var infieldW = track.w - inner * 2;
    var infieldH = track.h - inner * 2;
    var infieldR = Math.max(20, track.r - inner);
    var finishX = startFinishX(track);
    var s;

    drawGround(g, width, height);
    drawStadiumBack(g, track, width, outerX, outerY, outerW, outerH);
    drawTrackBase(g, track, outer, outerX, outerY, outerW, outerH, outerR);
    drawDirtTexture(g, track);
    drawInfield(g, track, infieldX, infieldY, infieldW, infieldH, infieldR);
    drawLaneLines(g, track);
    drawRails(g, track);
    drawRailPosts(g, track);
    drawFinish(g, track, finishX);
    drawFinishArch(g, track, finishX);
    drawStadiumFront(g, track, outerX, outerY, outerW, outerH);

    for (s = 0; s < 12; s++) {
      g.lineStyle(1, 0xffffff, 0.018);
      g.lineBetween(0, s * 54, width, s * 54 + 20);
    }
  }

  function drawGround(g, width, height) {
    g.fillStyle(0x07131f, 1).fillRect(0, 0, width, height);
    g.fillStyle(0x0e3729, 1).fillRoundedRect(0, 0, width, height, 18);

    for (var i = 0; i < 34; i++) {
      var x = (i * 89) % width;
      var y = (i * 137) % height;
      g.fillStyle(i % 2 ? 0x14503a : 0x0f442f, 0.18).fillCircle(x, y, 90 + (i % 5) * 14);
    }
  }

  function drawStadiumBack(g, track, width, outerX, outerY, outerW, outerH) {
    var standW = Math.min(width * 0.74, outerW * 0.92);
    var standX = track.cx - standW / 2;
    var standY = Math.max(10, outerY - 92);
    var sideH = Math.min(outerH * 0.64, 190);
    var i;

    g.fillStyle(0x07111d, 0.78).fillRoundedRect(standX - 16, standY - 10, standW + 32, 86, 18);
    g.fillStyle(0xb9c2ca, 0.88).fillRoundedRect(standX, standY, standW, 62, 12);
    g.fillStyle(0x101a24, 0.86).fillRoundedRect(standX + 14, standY + 14, standW - 28, 34, 8);
    g.fillStyle(0x07111d, 0.96).fillRoundedRect(track.cx - 58, standY + 4, 116, 54, 9);
    g.fillStyle(0xd6a23d, 0.94).fillRoundedRect(track.cx - 36, standY + 23, 72, 15, 5);

    for (i = 0; i < 54; i++) {
      g.fillStyle(i % 4 === 0 ? 0xd24a35 : 0xf2d7a5, 0.78)
        .fillCircle(standX + 22 + i * (standW - 44) / 53, standY + 22 + (i % 4) * 6, 2.1);
    }

    drawSideStand(g, outerX - 74, track.cy - sideH / 2, 54, sideH, true);
    drawSideStand(g, outerX + outerW + 20, track.cy - sideH / 2, 54, sideH, false);
  }

  function drawSideStand(g, x, y, w, h, leftSide) {
    var i;
    var cx;

    g.fillStyle(0x07111d, 0.58).fillRoundedRect(x - 6, y - 8, w + 12, h + 16, 12);
    g.fillStyle(0x87949e, 0.8).fillRoundedRect(x, y, w, h, 10);
    g.fillStyle(0x111923, 0.72).fillRoundedRect(x + 8, y + 12, w - 16, h - 24, 7);

    for (i = 0; i < 22; i++) {
      cx = leftSide ? x + 17 + (i % 2) * 16 : x + w - 17 - (i % 2) * 16;
      g.fillStyle(i % 3 ? 0xf3d7a7 : 0x2f83ff, 0.72).fillCircle(cx, y + 20 + i * (h - 40) / 21, 2);
    }
  }

  function drawStadiumFront(g, track, outerX, outerY, outerW, outerH) {
    var boardY = outerY + outerH + 18;
    var topBoardY = Math.max(8, outerY - 18);
    var i;

    for (i = 0; i < 5; i++) {
      drawAdBoard(g, outerX + 22 + i * 82, topBoardY, 64 + (i % 2) * 18);
    }

    for (i = 0; i < 4; i++) {
      drawAdBoard(g, track.cx - 174 + i * 116, boardY, 92);
    }
  }

  function drawAdBoard(g, x, y, w) {
    g.fillStyle(0x06111f, 0.9).fillRoundedRect(x - 2, y - 2, w + 4, 20, 5);
    g.fillStyle(0x092238, 0.96).fillRoundedRect(x, y, w, 16, 4);
    g.lineStyle(1, 0xd6a23d, 0.58).strokeRoundedRect(x, y, w, 16, 4);
    g.fillStyle(0xd6a23d, 0.9).fillRect(x + 8, y + 6, Math.max(10, w - 16), 3);
    g.fillStyle(0xffffff, 0.38).fillRect(x + 10, y + 10, Math.max(8, w - 20), 2);
  }

  function drawTrackBase(g, track, outer, outerX, outerY, outerW, outerH, outerR) {
    g.fillStyle(0x07111d, 0.42).fillRoundedRect(outerX + 10, outerY + 14, outerW, outerH, outerR);

    g.fillStyle(0x163b2c, 1).fillRoundedRect(
      track.cx - (track.w + outer * 2 + 50) / 2,
      track.cy - (track.h + outer * 2 + 50) / 2,
      track.w + outer * 2 + 50,
      track.h + outer * 2 + 50,
      track.r + outer + 25
    );

    g.fillStyle(0x4f2d1d, 1).fillRoundedRect(outerX - 8, outerY - 8, outerW + 16, outerH + 16, outerR + 8);
    g.fillStyle(0x8c5737, 1).fillRoundedRect(outerX, outerY, outerW, outerH, outerR);
    g.fillStyle(0xc47a3f, 1).fillRoundedRect(outerX + 7, outerY + 7, outerW - 14, outerH - 14, Math.max(16, outerR - 7));
    g.fillStyle(0xa9653a, 0.5).fillRoundedRect(outerX + 18, outerY + 18, outerW - 36, outerH - 36, Math.max(16, outerR - 18));
  }

  function drawDirtTexture(g, track) {
    var i;
    var lane;
    var p;

    for (i = 0; i < 68; i++) {
      lane = Math.random() * Math.max(1, track.laneOuter - 6) + 3;
      p = pointOnTrack(track, Math.random(), lane);
      g.fillStyle(i % 2 ? 0xe0a05f : 0x6f4028, i % 2 ? 0.09 : 0.07)
        .fillEllipse(p.x, p.y, 8 + Math.random() * 16, 3 + Math.random() * 5);
    }

    g.lineStyle(1, 0xf5c47b, 0.08);
    strokeTrackLine(g, track, Math.max(0, track.laneOuter - 6));
    g.lineStyle(1, 0x492717, 0.12);
    strokeTrackLine(g, track, Math.max(0, track.laneOuter - 22));
  }

  function drawInfield(g, track, x, y, w, h, r) {
    g.fillStyle(0x061a13, 0.45).fillRoundedRect(x + 4, y + 8, w, h, r);
    g.fillStyle(0x12613f, 1).fillRoundedRect(x, y, w, h, r);
    g.fillStyle(0x1d7a4d, 0.75).fillRoundedRect(x + 12, y + 12, w - 24, h - 24, Math.max(18, r - 12));

    g.lineStyle(1, 0xffffff, 0.05);
    for (var i = 0; i < 7; i++) {
      g.lineBetween(x + 36 + i * 38, y + 14, x + 10 + i * 40, y + h - 18);
    }

    g.fillStyle(0x0c4b68, 0.34).fillEllipse(track.cx, track.cy, Math.max(80, w * 0.22), Math.max(34, h * 0.18));
    g.lineStyle(1, 0x83d6ff, 0.22).strokeEllipse(track.cx, track.cy, Math.max(80, w * 0.22), Math.max(34, h * 0.18));
  }

  function drawLaneLines(g, track) {
    var i;
    var lane;

    for (i = 0; i < track.laneCount; i++) {
      lane = i * track.laneSpacing;
      g.lineStyle(i === 0 ? 2 : 1, 0xf6ddb6, i === 0 ? 0.56 : 0.36);
      strokeTrackLine(g, track, lane);
    }
  }

  function drawRails(g, track) {
    var outerRail = track.laneOuter + 9;
    var innerRail = -track.laneInner + 6;

    g.lineStyle(4, 0xf3e1bd, 0.8);
    strokeTrackLine(g, track, outerRail);
    g.lineStyle(2, 0x26170f, 0.3);
    strokeTrackLine(g, track, outerRail + 5);

    g.lineStyle(3, 0xf3e1bd, 0.7);
    strokeTrackLine(g, track, innerRail);
    g.lineStyle(1, 0x26170f, 0.26);
    strokeTrackLine(g, track, innerRail - 4);
  }

  function strokeTrackLine(g, track, lane) {
    g.strokeRoundedRect(
      track.cx - (track.w + lane * 2) / 2,
      track.cy - (track.h + lane * 2) / 2,
      track.w + lane * 2,
      track.h + lane * 2,
      Math.max(10, track.r + lane)
    );
  }

  function drawRailPosts(g, track) {
    var i;
    var p;

    for (i = 0; i < 34; i++) {
      p = pointOnTrack(track, i / 34, track.laneOuter + 12);
      g.fillStyle(0xf7e5bd, 0.65).fillCircle(p.x, p.y, 2.2);
      g.fillStyle(0x1b120b, 0.22).fillCircle(p.x + 1, p.y + 1, 2.4);
    }
  }

  function drawFinish(g, track, finishX) {
    var innerY = track.cy - track.r + track.laneInner;
    var outerY = track.cy - track.r - track.laneOuter;
    var finishTop = Math.min(innerY, outerY);
    var finishHeight = Math.abs(innerY - outerY);
    var cell = Math.max(5, Math.min(9, finishHeight / 8));
    var row;
    var y;

    for (row = 0; row < Math.ceil(finishHeight / cell); row++) {
      y = finishTop + row * cell;
      g.fillStyle(row % 2 ? 0xffffff : 0x111111, 0.9).fillRect(finishX - 5, y, 5, cell);
      g.fillStyle(row % 2 ? 0x111111 : 0xffffff, 0.9).fillRect(finishX, y, 5, cell);
    }

    g.lineStyle(1, 0xffd34d, 0.72);
    g.lineBetween(finishX - 7, finishTop, finishX - 7, finishTop + finishHeight);
    g.lineBetween(finishX + 7, finishTop, finishX + 7, finishTop + finishHeight);
  }

  function drawFinishArch(g, track, finishX) {
    var topY = track.cy - track.r - track.laneOuter - 20;
    var bottomY = track.cy - track.r + track.laneInner + 18;
    var archW = 42;

    g.lineStyle(5, 0x06111f, 0.86);
    g.lineBetween(finishX - archW / 2, topY, finishX - archW / 2, bottomY);
    g.lineBetween(finishX + archW / 2, topY, finishX + archW / 2, bottomY);
    g.lineBetween(finishX - archW / 2, topY, finishX + archW / 2, topY);

    g.lineStyle(2, 0xd6a23d, 0.88);
    g.lineBetween(finishX - archW / 2 + 3, topY + 4, finishX + archW / 2 - 3, topY + 4);
    g.fillStyle(0xd6a23d, 0.9).fillCircle(finishX, topY + 4, 5);
  }

  function pointOnTrack(track, progress, lane) {
    var laneOffset = Number(lane) || 0;
    var r = track.r + laneOffset;
    var topY = track.cy - r;
    var bottomY = track.cy + r;
    var straight = track.straight;
    var centerArc = Math.PI * track.r;
    var perimeter = trackPerimeter(track);
    var d = ((progress % 1) + 1) % 1 * perimeter;
    var x;
    var y;
    var angle;

    if (d < straight) {
      x = track.leftCx + d;
      y = topY;
      angle = 0;
    } else if (d < straight + centerArc) {
      var rightArc = (d - straight) / centerArc;
      var a1 = -Math.PI / 2 + rightArc * Math.PI;
      x = track.rightCx + Math.cos(a1) * r;
      y = track.cy + Math.sin(a1) * r;
      angle = a1 + Math.PI / 2;
    } else if (d < straight * 2 + centerArc) {
      var bottomD = d - straight - centerArc;
      x = track.rightCx - bottomD;
      y = bottomY;
      angle = Math.PI;
    } else {
      var leftArc = (d - straight * 2 - centerArc) / centerArc;
      var a2 = Math.PI / 2 + leftArc * Math.PI;
      x = track.leftCx + Math.cos(a2) * r;
      y = track.cy + Math.sin(a2) * r;
      angle = a2 + Math.PI / 2;
    }

    return { x: x, y: y, angle: angle };
  }

  return {
    drawTrack: drawTrack,
    laneDistanceFactor: laneDistanceFactor,
    makeTrackGeometry: makeTrackGeometry,
    pointOnTrack: pointOnTrack,
    startFinishX: startFinishX,
    startProgress: startProgress
  };
})();
