// Race track geometry and drawing helpers.

window.SKACHKI_RACE_TRACK = (function () {
  var TRACK_LANE_COUNT = 8;
  var START_FINISH_STRAIGHT_RATIO = 0.5;
  var S_TRACK_LANE_COUNT = 8;

  function stadiumDecor() { return window.SKACHKI_RACE_STADIUM_DECOR || {}; }
  function game() { return window.SKACHKI_GAME || {}; }

  function activeTrackType() {
    var G = game();
    var raceType = G.state && G.state.activeRaceType ? G.state.activeRaceType : {};
    return raceType.trackType === 's_track' ? 's_track' : 'oval';
  }

  function makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount) {
    if (activeTrackType() === 's_track') return makeSTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing);
    return makeOvalTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing);
  }

  function makeOvalTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing) {
    var cx = width / 2;
    var cy = height / 2 + 12;
    var laneCount = TRACK_LANE_COUNT;
    var radius = trackHeight / 2 - Math.max(32, laneSpacing * laneCount * 0.58);
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
      laneCount: laneCount,
      laneOuter: laneSpacing * Math.max(1, laneCount - 1) + 18,
      laneInner: 24
    };
  }

  function makeSTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing) {
    var cx = width / 2;
    var cy = height / 2 + 18;
    var laneCount = S_TRACK_LANE_COUNT;
    var laneSpan = laneSpacing * (laneCount - 1);
    var pathWidth = laneSpan + 44;
    var left = cx - trackWidth * 0.36;
    var right = cx + trackWidth * 0.36;
    var top = cy - trackHeight * 0.34;
    var middle = cy + trackHeight * 0.02;
    var bottom = cy + trackHeight * 0.34;
    var points = buildSTrackPath(left, right, top, middle, bottom);
    var path = buildPathMetrics(points);

    return {
      type: 's_track',
      cx: cx,
      cy: cy,
      w: trackWidth,
      h: trackHeight,
      laneSpacing: laneSpacing,
      laneCount: laneCount,
      laneOuter: pathWidth / 2,
      laneInner: pathWidth / 2,
      laneSpan: laneSpan,
      pathWidth: pathWidth,
      centerLane: laneSpan / 2,
      sPath: path
    };
  }

  function sampleLine(points, x1, y1, x2, y2, steps) {
    var i;
    var t;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      if (points.length && i === 0) continue;
      points.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  }

  function sampleCubic(points, p0, p1, p2, p3, steps) {
    var i;
    var t;
    var mt;
    var x;
    var y;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      if (points.length && i === 0) continue;
      mt = 1 - t;
      x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      points.push({ x: x, y: y });
    }
  }

  function buildSTrackPath(left, right, top, middle, bottom) {
    var points = [];
    var width = right - left;
    var start = { x: left, y: top };
    var topRight = { x: right, y: top };
    var middleRight = { x: right, y: middle };
    var middleLeft = { x: left, y: middle };
    var bottomLeft = { x: left, y: bottom };
    var finish = { x: right, y: bottom };

    points.push(start);
    sampleLine(points, start.x, start.y, topRight.x, topRight.y, 32);
    sampleCubic(points, topRight,
      { x: right + width * 0.18, y: top + (middle - top) * 0.22 },
      { x: right + width * 0.18, y: middle - (middle - top) * 0.22 },
      middleRight,
      28);
    sampleLine(points, middleRight.x, middleRight.y, middleLeft.x, middleLeft.y, 36);
    sampleCubic(points, middleLeft,
      { x: left - width * 0.18, y: middle + (bottom - middle) * 0.22 },
      { x: left - width * 0.18, y: bottom - (bottom - middle) * 0.22 },
      bottomLeft,
      28);
    sampleLine(points, bottomLeft.x, bottomLeft.y, finish.x, finish.y, 32);

    return points;
  }

  function buildPathMetrics(points) {
    var lengths = [0];
    var total = 0;
    var i;
    var dx;
    var dy;

    for (i = 1; i < points.length; i++) {
      dx = points[i].x - points[i - 1].x;
      dy = points[i].y - points[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
      lengths.push(total);
    }

    return { points: points, lengths: lengths, total: Math.max(1, total) };
  }

  function trackPerimeter(track) {
    if (track.type === 's_track') return track.sPath.total;
    return track.straight * 2 + Math.PI * track.r * 2;
  }

  function laneDistanceFactor(track, lane) {
    var laneOffset;
    var lanePerimeter;
    if (track.type === 's_track') return 1;
    laneOffset = Number(lane) || 0;
    lanePerimeter = track.straight * 2 + Math.PI * Math.max(1, track.r + laneOffset) * 2;
    return Math.max(1, lanePerimeter / trackPerimeter(track));
  }

  function startFinishX(track) {
    if (track.type === 's_track') return track.sPath.points[track.sPath.points.length - 1].x;
    return track.leftCx + track.straight * START_FINISH_STRAIGHT_RATIO;
  }

  function startProgress(track) {
    if (track.type === 's_track') return 0;
    return (track.straight * START_FINISH_STRAIGHT_RATIO) / trackPerimeter(track);
  }

  function segmentAt(track, progress, lane) {
    var perimeter;
    var d;
    var straight;
    var arc;

    if (!track) return { type: 'straight', progress: 0 };
    if (track.type === 's_track') return { type: 'straight', progress: Math.max(0, Math.min(1, Number(progress) || 0)) };

    straight = Number(track.straight) || 1;
    arc = Math.PI * (Number(track.r) || 1);
    perimeter = trackPerimeter(track);
    d = (((Number(progress) || 0) % 1) + 1) % 1 * perimeter;

    if (d < straight) return { type: 'straight', name: 'top_straight', distance: d, progress: d / perimeter };
    if (d < straight + arc) return { type: 'turn', name: 'right_turn', distance: d, progress: d / perimeter };
    if (d < straight * 2 + arc) return { type: 'straight', name: 'bottom_straight', distance: d, progress: d / perimeter };
    return { type: 'turn', name: 'left_turn', distance: d, progress: d / perimeter };
  }

  function drawTrack(scene, width, height) {
    if (scene.track && scene.track.type === 's_track') return drawSTrack(scene, width, height);
    return drawOvalTrack(scene, width, height);
  }

  function drawOvalTrack(scene, width, height) {
    var decor = stadiumDecor();
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
    if (decor.drawBack) decor.drawBack(g, track, width, outerX, outerY, outerW, outerH);
    drawTrackBase(g, track, outer, outerX, outerY, outerW, outerH, outerR);
    drawDirtTexture(g, track);
    drawInfield(g, track, infieldX, infieldY, infieldW, infieldH, infieldR);
    drawLaneLines(g, track);
    drawRails(g, track);
    drawRailPosts(g, track);
    drawFinish(g, track, finishX);
    if (decor.drawFinishArch) decor.drawFinishArch(g, track, finishX);
    if (decor.drawFront) decor.drawFront(g, track, outerX, outerY, outerW, outerH);

    for (s = 0; s < 12; s++) {
      g.lineStyle(1, 0xffffff, 0.018);
      g.lineBetween(0, s * 54, width, s * 54 + 20);
    }
  }

  function drawSTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    var lane;
    var i;
    var centerLane = track.centerLane;

    drawGround(g, width, height);
    drawSTrackDecor(g, track, width, height);

    strokeSTrack(g, track, centerLane, track.pathWidth + 36, 0x07111d, 0.42);
    strokeSTrack(g, track, centerLane, track.pathWidth + 22, 0x4f2d1d, 1);
    strokeSTrack(g, track, centerLane, track.pathWidth + 10, 0x8c5737, 1);
    strokeSTrack(g, track, centerLane, track.pathWidth, 0xc47a3f, 1);
    strokeSTrack(g, track, centerLane, track.pathWidth - 18, 0xa9653a, 0.42);

    for (i = 0; i < 70; i++) {
      lane = Math.random() * track.laneSpan;
      var p = pointOnTrack(track, Math.random(), lane);
      g.fillStyle(i % 2 ? 0xe0a05f : 0x6f4028, i % 2 ? 0.08 : 0.06)
        .fillEllipse(p.x, p.y, 7 + Math.random() * 14, 3 + Math.random() * 5);
    }

    for (i = 0; i < track.laneCount; i++) {
      lane = i * track.laneSpacing;
      g.lineStyle(i === 0 ? 2 : 1, 0xf6ddb6, i === 0 ? 0.58 : 0.36);
      strokeSTrackLine(g, track, lane);
    }

    g.lineStyle(4, 0xf3e1bd, 0.78);
    strokeSTrackLine(g, track, -18);
    strokeSTrackLine(g, track, track.laneSpan + 18);

    drawSTrackGate(g, track, 0, 'СТАРТ');
    drawSTrackGate(g, track, 1, 'ФИНИШ');
  }

  function drawSTrackDecor(g, track, width, height) {
    var top = track.cy - track.h * 0.48;
    var standW = Math.min(width * 0.72, track.w * 0.9);
    var standX = track.cx - standW / 2;

    g.fillStyle(0x06111f, 0.72).fillRoundedRect(standX, Math.max(10, top), standW, 58, 14);
    g.lineStyle(1, 0xd8a943, 0.35).strokeRoundedRect(standX, Math.max(10, top), standW, 58, 14);
    g.fillStyle(0xd8a943, 0.35).fillRoundedRect(track.cx - 38, Math.max(20, top + 12), 76, 28, 8);
    g.fillStyle(0x1d7a4d, 0.55).fillEllipse(track.cx, track.cy + track.h * 0.17, track.w * 0.32, track.h * 0.14);
    g.fillStyle(0x0c4b68, 0.38).fillEllipse(track.cx - track.w * 0.18, track.cy + track.h * 0.19, track.w * 0.16, track.h * 0.09);
    g.lineStyle(1, 0x83d6ff, 0.18).strokeEllipse(track.cx - track.w * 0.18, track.cy + track.h * 0.19, track.w * 0.16, track.h * 0.09);
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

  function sTrackSample(track, progress) {
    var path = track.sPath;
    var target = Math.max(0, Math.min(1, Number(progress) || 0)) * path.total;
    var i;
    var prev;
    var next;
    var span;
    var local;
    var dx;
    var dy;
    var len;

    for (i = 1; i < path.lengths.length; i++) {
      if (path.lengths[i] >= target) break;
    }

    i = Math.max(1, Math.min(path.points.length - 1, i));
    prev = path.points[i - 1];
    next = path.points[i];
    span = Math.max(1, path.lengths[i] - path.lengths[i - 1]);
    local = (target - path.lengths[i - 1]) / span;
    dx = next.x - prev.x;
    dy = next.y - prev.y;
    len = Math.max(1, Math.sqrt(dx * dx + dy * dy));

    return {
      x: prev.x + dx * local,
      y: prev.y + dy * local,
      tx: dx / len,
      ty: dy / len,
      angle: Math.atan2(dy, dx)
    };
  }

  function sLaneOffset(track, lane) {
    return (Number(lane) || 0) - track.centerLane;
  }

  function pointOnSTrack(track, progress, lane) {
    var p = sTrackSample(track, progress);
    var offset = sLaneOffset(track, lane);
    var nx = -p.ty;
    var ny = p.tx;
    return {
      x: p.x + nx * offset,
      y: p.y + ny * offset,
      angle: p.angle
    };
  }

  function strokeSTrack(g, track, lane, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    strokeSTrackLine(g, track, lane);
  }

  function strokeSTrackLine(g, track, lane) {
    var points = track.sPath.points;
    var i;
    var p;
    var progress;
    if (!points.length) return;
    p = pointOnSTrack(track, 0, lane);
    g.beginPath();
    g.moveTo(p.x, p.y);
    for (i = 1; i < points.length; i++) {
      progress = i / (points.length - 1);
      p = pointOnSTrack(track, progress, lane);
      g.lineTo(p.x, p.y);
    }
    g.strokePath();
  }

  function drawSTrackGate(g, track, progress, label) {
    var center = pointOnSTrack(track, progress, track.centerLane);
    var sample = sTrackSample(track, progress);
    var nx = -sample.ty;
    var ny = sample.tx;
    var half = track.pathWidth / 2 + 7;
    var x1 = center.x - nx * half;
    var y1 = center.y - ny * half;
    var x2 = center.x + nx * half;
    var y2 = center.y + ny * half;
    var steps = 8;
    var i;
    var ax;
    var ay;
    var bx;
    var by;

    for (i = 0; i < steps; i++) {
      ax = x1 + (x2 - x1) * i / steps;
      ay = y1 + (y2 - y1) * i / steps;
      bx = x1 + (x2 - x1) * (i + 1) / steps;
      by = y1 + (y2 - y1) * (i + 1) / steps;
      g.lineStyle(5, i % 2 ? 0xffffff : 0x111111, 0.95);
      g.lineBetween(ax, ay, bx, by);
    }

    g.fillStyle(0x06111f, 0.82).fillRoundedRect(center.x - 28, center.y - 34, 56, 18, 6);
    g.lineStyle(1, 0xd8a943, 0.58).strokeRoundedRect(center.x - 28, center.y - 34, 56, 18, 6);
  }

  function pointOnTrack(track, progress, lane) {
    var laneOffset;
    var r;
    var topY;
    var bottomY;
    var straight;
    var centerArc;
    var perimeter;
    var d;
    var x;
    var y;
    var angle;

    if (track.type === 's_track') return pointOnSTrack(track, progress, lane);

    laneOffset = Number(lane) || 0;
    r = track.r + laneOffset;
    topY = track.cy - r;
    bottomY = track.cy + r;
    straight = track.straight;
    centerArc = Math.PI * track.r;
    perimeter = trackPerimeter(track);
    d = ((progress % 1) + 1) % 1 * perimeter;

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
    segmentAt: segmentAt,
    startFinishX: startFinishX,
    startProgress: startProgress
  };
})();
