// Race track geometry and drawing helpers.
// Stage 1 S-track: top start/finish straight, stadium framing and sampled lane paths.

window.SKACHKI_RACE_TRACK = (function () {
  var SAMPLES_PER_CURVE = 30;
  var SAMPLES_PER_LINE = 18;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makePoint(x, y) {
    return { x: x, y: y };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function cubicPoint(p0, p1, p2, p3, t) {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;

    return makePoint(
      p0.x * uuu + 3 * p1.x * uu * t + 3 * p2.x * u * tt + p3.x * ttt,
      p0.y * uuu + 3 * p1.y * uu * t + 3 * p2.y * u * tt + p3.y * ttt
    );
  }

  function pushLine(points, from, to) {
    var i;
    for (i = 0; i < SAMPLES_PER_LINE; i++) {
      points.push(makePoint(
        lerp(from.x, to.x, i / SAMPLES_PER_LINE),
        lerp(from.y, to.y, i / SAMPLES_PER_LINE)
      ));
    }
  }

  function pushCurve(points, p0, p1, p2, p3) {
    var i;
    for (i = 0; i < SAMPLES_PER_CURVE; i++) {
      points.push(cubicPoint(p0, p1, p2, p3, i / SAMPLES_PER_CURVE));
    }
  }

  function buildCenterPath(cx, cy, trackWidth, trackHeight) {
    var left = cx - trackWidth * 0.42;
    var right = cx + trackWidth * 0.42;
    var top = cy - trackHeight * 0.36;
    var midTop = cy - trackHeight * 0.06;
    var midBottom = cy + trackHeight * 0.22;
    var bottom = cy + trackHeight * 0.38;
    var start = makePoint(cx - trackWidth * 0.22, top);
    var topRight = makePoint(right, top);
    var rightMiddle = makePoint(cx + trackWidth * 0.38, midTop);
    var leftMiddle = makePoint(cx - trackWidth * 0.22, midBottom);
    var bottomRight = makePoint(cx + trackWidth * 0.32, bottom);
    var bottomLeft = makePoint(left, bottom);
    var topLeft = makePoint(left, top);
    var points = [];

    pushLine(points, start, topRight);
    pushCurve(points, topRight, makePoint(right + trackWidth * 0.12, top), makePoint(right + trackWidth * 0.1, midTop), rightMiddle);
    pushCurve(points, rightMiddle, makePoint(cx + trackWidth * 0.18, cy + trackHeight * 0.02), makePoint(cx - trackWidth * 0.02, cy + trackHeight * 0.12), leftMiddle);
    pushCurve(points, leftMiddle, makePoint(cx - trackWidth * 0.48, cy + trackHeight * 0.32), makePoint(cx + trackWidth * 0.08, cy + trackHeight * 0.42), bottomRight);
    pushLine(points, bottomRight, bottomLeft);
    pushCurve(points, bottomLeft, makePoint(left - trackWidth * 0.16, bottom), makePoint(left - trackWidth * 0.14, top), topLeft);
    pushLine(points, topLeft, start);

    return points;
  }

  function pathLength(path) {
    var length = 0;
    var i;
    var a;
    var b;

    for (i = 0; i < path.length; i++) {
      a = path[i];
      b = path[(i + 1) % path.length];
      length += Math.hypot(b.x - a.x, b.y - a.y);
    }

    return Math.max(1, length);
  }

  function offsetPath(path, signedOffset) {
    var result = [];
    var i;
    var prev;
    var next;
    var dx;
    var dy;
    var len;
    var nx;
    var ny;

    for (i = 0; i < path.length; i++) {
      prev = path[(i - 1 + path.length) % path.length];
      next = path[(i + 1) % path.length];
      dx = next.x - prev.x;
      dy = next.y - prev.y;
      len = Math.hypot(dx, dy) || 1;
      nx = -dy / len;
      ny = dx / len;
      result.push(makePoint(path[i].x + nx * signedOffset, path[i].y + ny * signedOffset));
    }

    return result;
  }

  function makeTrackGeometry(width, height, trackWidth, trackHeight, laneSpacing, horseCount) {
    var cx = width / 2;
    var cy = height / 2 + 18;
    var laneCount = Math.max(2, horseCount || 4);
    var laneCenterOffset = laneSpacing * (laneCount - 1) / 2;
    var centerPath = buildCenterPath(cx, cy, trackWidth * 0.9, trackHeight * 0.86);
    var lanePaths = [];
    var laneLengths = [];
    var i;
    var signedOffset;
    var path;

    for (i = 0; i < laneCount; i++) {
      signedOffset = i * laneSpacing - laneCenterOffset;
      path = offsetPath(centerPath, signedOffset);
      lanePaths.push(path);
      laneLengths.push(pathLength(path));
    }

    return {
      type: 's-stadium',
      cx: cx,
      cy: cy,
      w: trackWidth,
      h: trackHeight,
      r: Math.max(40, trackHeight * 0.22),
      straight: Math.max(120, trackWidth * 0.58),
      leftCx: cx - trackWidth * 0.32,
      rightCx: cx + trackWidth * 0.42,
      laneSpacing: laneSpacing,
      laneCount: laneCount,
      laneOuter: laneSpacing * Math.max(1, laneCount - 1) + 18,
      laneInner: 24,
      laneCenterOffset: laneCenterOffset,
      roadWidth: laneSpacing * Math.max(1, laneCount - 1) + 42,
      centerPath: centerPath,
      lanePaths: lanePaths,
      laneLengths: laneLengths,
      baseLaneLength: laneLengths[0] || pathLength(centerPath),
      outerRailPath: offsetPath(centerPath, laneCenterOffset + 18),
      innerRailPath: offsetPath(centerPath, -laneCenterOffset - 18)
    };
  }

  function pathPointAt(path, progress) {
    var normalized = ((progress % 1) + 1) % 1;
    var target = normalized * pathLength(path);
    var walked = 0;
    var i;
    var a;
    var b;
    var segment;
    var t;
    var angle;

    for (i = 0; i < path.length; i++) {
      a = path[i];
      b = path[(i + 1) % path.length];
      segment = Math.hypot(b.x - a.x, b.y - a.y);
      if (walked + segment >= target) {
        t = segment > 0 ? (target - walked) / segment : 0;
        angle = Math.atan2(b.y - a.y, b.x - a.x);
        return {
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t),
          angle: angle
        };
      }
      walked += segment;
    }

    a = path[0];
    b = path[1] || a;
    return { x: a.x, y: a.y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  function laneIndexAndBlend(track, lane) {
    var raw = clamp((Number(lane) || 0) / track.laneSpacing, 0, track.laneCount - 1);
    var low = Math.floor(raw);
    var high = Math.min(track.laneCount - 1, low + 1);
    return { low: low, high: high, t: raw - low };
  }

  function interpolateLanePoint(a, b, t) {
    var angle = Math.abs(a.angle - b.angle) > Math.PI ? a.angle : lerp(a.angle, b.angle, t);
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      angle: angle
    };
  }

  function pointOnTrack(track, progress, lane) {
    var laneBlend = laneIndexAndBlend(track, lane);
    var a = pathPointAt(track.lanePaths[laneBlend.low], progress);
    var b = pathPointAt(track.lanePaths[laneBlend.high], progress);
    return interpolateLanePoint(a, b, laneBlend.t);
  }

  function laneDistanceFactor(track, lane) {
    var laneBlend = laneIndexAndBlend(track, lane);
    var lowLength = track.laneLengths[laneBlend.low] || track.baseLaneLength;
    var highLength = track.laneLengths[laneBlend.high] || lowLength;
    var length = lerp(lowLength, highLength, laneBlend.t);
    return Math.max(0.75, length / Math.max(1, track.baseLaneLength));
  }

  function startFinishX(track) {
    return pointOnTrack(track, 0, track.laneCenterOffset).x;
  }

  function startProgress() {
    return 0;
  }

  function drawTrack(scene, width, height) {
    var track = scene.track;
    var g = scene.add.graphics();
    var s;

    drawGround(g, width, height);
    drawStadium(g, track, width, height);
    drawTrackBase(g, track);
    drawDirtTexture(g, track);
    drawInfield(g, track);
    drawLaneLines(g, track);
    drawRails(g, track);
    drawRailPosts(g, track);
    drawFinish(g, track);

    for (s = 0; s < 12; s++) {
      g.lineStyle(1, 0xffffff, 0.014);
      g.lineBetween(0, s * 54, width, s * 54 + 20);
    }
  }

  function drawGround(g, width, height) {
    var i;
    var x;
    var y;

    g.fillStyle(0x07131f, 1).fillRect(0, 0, width, height);
    g.fillStyle(0x0e3729, 1).fillRoundedRect(0, 0, width, height, 18);

    for (i = 0; i < 34; i++) {
      x = (i * 89) % width;
      y = (i * 137) % height;
      g.fillStyle(i % 2 ? 0x14503a : 0x0f442f, 0.18).fillCircle(x, y, 90 + (i % 5) * 14);
    }
  }

  function drawStadium(g, track, width) {
    var standX = track.cx - width * 0.34;
    var standY = track.cy - track.h * 0.56;
    var standW = width * 0.68;
    var i;

    g.fillStyle(0x06111f, 0.86).fillRoundedRect(standX - 14, standY - 12, standW + 28, 86, 16);
    g.fillStyle(0xb9c1c8, 0.9).fillRoundedRect(standX, standY, standW, 68, 12);
    g.fillStyle(0x111923, 0.76).fillRoundedRect(standX + 12, standY + 16, standW - 24, 36, 6);
    g.fillStyle(0x07111d, 0.96).fillRoundedRect(track.cx - 52, standY + 8, 104, 58, 8);
    g.fillStyle(0xd6a23d, 0.96).fillRoundedRect(track.cx - 32, standY + 26, 64, 18, 5);

    for (i = 0; i < 44; i++) {
      g.fillStyle(i % 3 ? 0xf3d4a3 : 0xd14b38, 0.78)
        .fillCircle(standX + 22 + i * (standW - 44) / 43, standY + 25 + (i % 4) * 6, 2.1);
    }

    drawAdBoard(g, track.cx - 160, standY + 72, 112, 'ROYAL');
    drawAdBoard(g, track.cx - 36, standY + 72, 72, 'CUP');
    drawAdBoard(g, track.cx + 70, standY + 72, 118, 'VICTORY');
  }

  function drawAdBoard(g, x, y, w, label) {
    g.fillStyle(0x092238, 0.94).fillRoundedRect(x, y, w, 18, 4);
    g.lineStyle(1, 0xd6a23d, 0.65).strokeRoundedRect(x, y, w, 18, 4);
    g.fillStyle(0xd6a23d, 0.9).fillRect(x + 8, y + 7, w - 16, 3);
  }

  function strokePath(g, path, width, color, alpha) {
    var i;
    var a;
    var b;

    g.lineStyle(width, color, alpha);
    for (i = 0; i < path.length; i++) {
      a = path[i];
      b = path[(i + 1) % path.length];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  function drawTrackBase(g, track) {
    strokePath(g, track.centerPath, track.roadWidth + 34, 0x06111f, 0.38);
    strokePath(g, track.centerPath, track.roadWidth + 24, 0x4f2d1d, 1);
    strokePath(g, track.centerPath, track.roadWidth + 14, 0x8c5737, 1);
    strokePath(g, track.centerPath, track.roadWidth, 0xc47a3f, 1);
    strokePath(g, track.centerPath, track.roadWidth - 20, 0xa9653a, 0.35);
  }

  function drawDirtTexture(g, track) {
    var i;
    var lane;
    var p;

    for (i = 0; i < 74; i++) {
      lane = Math.random() * Math.max(1, track.laneSpacing * (track.laneCount - 1));
      p = pointOnTrack(track, Math.random(), lane);
      g.fillStyle(i % 2 ? 0xe0a05f : 0x6f4028, i % 2 ? 0.09 : 0.07)
        .fillEllipse(p.x, p.y, 8 + Math.random() * 16, 3 + Math.random() * 5);
    }
  }

  function drawInfield(g, track) {
    g.fillStyle(0x12613f, 0.94).fillRoundedRect(track.cx - 95, track.cy - 18, 190, 86, 30);
    g.fillStyle(0x1d7a4d, 0.58).fillRoundedRect(track.cx - 76, track.cy - 4, 152, 56, 22);
    g.fillStyle(0x0c4b68, 0.34).fillEllipse(track.cx - 122, track.cy + 86, 106, 38);
    g.lineStyle(1, 0x83d6ff, 0.22).strokeEllipse(track.cx - 122, track.cy + 86, 106, 38);
    g.fillStyle(0x6b4b2e, 0.92).fillRect(track.cx - 14, track.cy + 15, 28, 26);
    g.fillStyle(0xd6a23d, 0.85).fillCircle(track.cx, track.cy + 12, 13);
  }

  function drawLaneLines(g, track) {
    var i;

    for (i = 0; i < track.laneCount; i++) {
      g.lineStyle(i === 0 ? 2 : 1, 0xf6ddb6, i === 0 ? 0.56 : 0.36);
      strokeThinPath(g, track.lanePaths[i]);
    }
  }

  function strokeThinPath(g, path) {
    var i;
    var a;
    var b;

    for (i = 0; i < path.length; i++) {
      a = path[i];
      b = path[(i + 1) % path.length];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  function drawRails(g, track) {
    g.lineStyle(4, 0xf3e1bd, 0.78);
    strokeThinPath(g, track.outerRailPath);
    g.lineStyle(3, 0xf3e1bd, 0.68);
    strokeThinPath(g, track.innerRailPath);
  }

  function drawRailPosts(g, track) {
    var i;
    var p;

    for (i = 0; i < 44; i++) {
      p = pathPointAt(track.outerRailPath, i / 44);
      g.fillStyle(0xf7e5bd, 0.65).fillCircle(p.x, p.y, 2.2);
      g.fillStyle(0x1b120b, 0.22).fillCircle(p.x + 1, p.y + 1, 2.4);
    }
  }

  function drawFinish(g, track) {
    var p = pointOnTrack(track, 0, track.laneCenterOffset);
    var half = track.roadWidth / 2 + 5;
    var x = p.x;
    var y1 = p.y - half;
    var y2 = p.y + half;
    var cell = 7;
    var y;
    var row = 0;

    for (y = y1; y < y2; y += cell) {
      g.fillStyle(row % 2 ? 0xffffff : 0x111111, 0.92).fillRect(x - 5, y, 5, cell);
      g.fillStyle(row % 2 ? 0x111111 : 0xffffff, 0.92).fillRect(x, y, 5, cell);
      row++;
    }

    g.lineStyle(1, 0xffd34d, 0.72);
    g.lineBetween(x - 7, y1, x - 7, y2);
    g.lineBetween(x + 7, y1, x + 7, y2);
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
